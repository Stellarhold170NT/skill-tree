"""Async HTTP client for DSH web server.

Uses urllib (stdlib) wrapped in asyncio.to_thread() for non-blocking I/O.
Zero third-party dependencies.
"""
from __future__ import annotations

import asyncio
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from http.cookiejar import CookieJar
from typing import Any

from .config import DshConfig, RetryConfig
from .errors import (
    DshAuthError,
    DshConfigError,
    DshError,
    DshProtocolError,
    DshTimeoutError,
    DshTransportError,
)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Block auto-redirects so the auth 303's Set-Cookie is captured."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class DshClient:
    """Async client for one DSH web server.

    Usage:
        async with DshClient(base_url, token) as client:
            session = await client.create_session()
            result = await session.run("Hello")
            print(result["final_text"])
    """

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        *,
        timeout: float = 30.0,
        retry: RetryConfig | None = None,
        local_fs: bool = False,
    ) -> None:
        # Allow env vars as fallback
        import os
        self.base_url = (
            base_url or os.environ.get("DSH_BASE_URL", "")
        ).rstrip("/")
        self.token = token or os.environ.get("DSH_TOKEN", "")
        self.timeout = timeout
        self.retry = retry or RetryConfig()
        # local_fs=True validates cwd against the CLIENT filesystem (SDK runs
        # inside the server container). Default False: cwd paths are resolved
        # by the SERVER, so missing local paths are fine for remote use.
        self.local_fs = local_fs

        if not self.base_url:
            raise DshConfigError("base_url required (arg or DSH_BASE_URL env)")
        if not self.token:
            raise DshConfigError("token required (arg or DSH_TOKEN env)")

        self._jar = CookieJar()
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._jar),
            _NoRedirect(),
        )
        self._rpc_seq = 0
        self._lock = asyncio.Lock()

    async def __aenter__(self) -> "DshClient":
        await self._auth_async()
        return self

    async def __aexit__(self, *exc: Any) -> None:
        # urllib opener has no close; nothing to clean up
        pass

    # ---- auth ---------------------------------------------------------

    async def _auth_async(self) -> None:
        await asyncio.to_thread(self._auth)

    def _auth(self) -> None:
        url = f"{self.base_url}/?token={urllib.parse.quote(self.token)}"
        req = urllib.request.Request(url, method="GET")
        try:
            with self._opener.open(req, timeout=self.timeout) as res:
                if res.status not in (200, 303):
                    raise DshAuthError(f"auth failed: HTTP {res.status}")
        except urllib.error.HTTPError as err:
            # The auth endpoint 303-redirects to / with the Set-Cookie header;
            # with redirects blocked the cookie is already in the jar.
            if err.code in (301, 302, 303, 307, 308):
                if any(c.name.startswith("dsh-auth-") for c in self._jar):
                    self._check_cookie()
                    return
                raise DshAuthError("auth redirect without dsh-auth cookie (bad token?)") from err
            raise DshAuthError(
                f"auth failed: HTTP {err.code} — token stale?"
            ) from err
        except urllib.error.URLError as err:
            raise DshTransportError(
                f"cannot connect to {self.base_url}: {err.reason}"
            ) from err
        except ConnectionResetError as err:
            raise DshTransportError(
                f"connection reset by {self.base_url} (server not DSH? firewall?)"
            ) from err
        self._check_cookie()

    def _check_cookie(self) -> None:
        if not any(c.name.startswith("dsh-auth-") for c in self._jar):
            raise DshAuthError("no dsh-auth cookie set (bad token?)")

    async def reauth(self) -> None:
        self._jar.clear()
        await self._auth_async()

    # ---- core RPC with retry ------------------------------------------

    async def rpc(
        self,
        method: str,
        args: dict[str, Any],
        *,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """Call POST /api/<method> with retry on transient failures."""
        async with self._lock:
            self._rpc_seq += 1
            rpc_id = f"py-{self._rpc_seq}-{uuid.uuid4().hex[:8]}"

        last_exc: Exception | None = None
        for attempt in range(1, self.retry.max_attempts + 1):
            try:
                return await asyncio.to_thread(
                    self._rpc_sync, method, args, timeout or self.timeout, rpc_id
                )
            except DshAuthError:
                # Reauth once, then retry
                if attempt == 1:
                    await self.reauth()
                    continue
                raise
            except (DshTransportError, DshTimeoutError) as exc:
                last_exc = exc
                if attempt < self.retry.max_attempts:
                    delay = min(
                        self.retry.initial_backoff
                        * (self.retry.backoff_multiplier ** (attempt - 1)),
                        self.retry.max_backoff,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise
        raise last_exc or DshError("rpc failed")

    def _rpc_sync(
        self, method: str, args: dict, timeout: float, rpc_id: str
    ) -> dict[str, Any]:
        envelope = {
            "type": "client-request",
            "rpcId": rpc_id,
            "method": method,
            "payload": {"args": args},
        }
        req = urllib.request.Request(
            f"{self.base_url}/api/{method}",
            data=json.dumps(envelope).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with self._opener.open(req, timeout=timeout) as res:
                body = json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 401:
                raise DshAuthError(f"{method}: HTTP 401") from err
            raise DshTransportError(f"{method}: HTTP {err.code}") from err
        except urllib.error.URLError as err:
            raise DshTransportError(f"{method}: {err}") from err
        except TimeoutError as err:
            raise DshTimeoutError(f"{method}: timed out") from err
        except OSError as err:
            # ConnectionResetError và các lỗi socket thô urllib không wrap
            raise DshTransportError(
                f"{method}: {type(err).__name__}: {err}"
            ) from err
        if not isinstance(body, dict):
            raise DshProtocolError(
                f"{method}: not a JSON object", request_id=rpc_id
            )
        result = body.get("result") or {}
        if result.get("ok") is not True:
            error = result.get("error") or body.get("error") or {}
            raise DshError(
                error.get("message", f"{method}: {json.dumps(result)[:300]}"),
                code=error.get("code"),
                details=error.get("details") or {},
                request_id=rpc_id,
            )
        return result.get("value") or {}

    # ---- session helpers ----------------------------------------------

    async def list_sessions(self) -> list[dict]:
        value = await self.rpc("session/list", {"_request": {}})
        return value.get("items", [])

    async def create_session(
        self,
        *,
        cwd: str | None = None,
        session_id: str | None = None,
        agent_preset: str | None = None,
        workspace_id: str | None = None,
    ) -> "DshSession":
        from .session import DshSession
        from pathlib import Path

        # Server rule: session.create accepts workspaceId or cwd, not both.
        if workspace_id is not None and cwd is not None:
            raise DshConfigError("workspace_id and cwd are mutually exclusive")
        if cwd is not None and self.local_fs:
            path = Path(cwd).expanduser().resolve()
            if not path.exists():
                raise DshConfigError(f"cwd does not exist: {cwd}")
            if not path.is_dir():
                raise DshConfigError(f"cwd is not a directory: {cwd}")
            cwd = str(path)

        request: dict = {}
        if workspace_id is not None:
            # Attaches the session to the workspace group (web UI sidebar).
            request["workspaceId"] = workspace_id
        elif cwd is not None:
            request["cwd"] = cwd
        if session_id is not None:
            request["sessionId"] = session_id  # existing ids are adopted
        if agent_preset is not None:
            request["agentPreset"] = agent_preset
        value = await self.rpc("session/create", {"request": request})
        return DshSession(
            self,
            value["sessionId"],
            value.get("agentPreset"),
            cwd=cwd,
        )

    async def ensure_workspace(self, path: str) -> dict:
        """Register (or look up) a Workspace for a directory — idempotent."""
        value = await self.rpc("workspace/create", {"request": {"path": path}})
        return value.get("workspace") or {}

    async def create_session_for_workspace(
        self,
        path: str,
        *,
        session_id: str | None = None,
        agent_preset: str | None = None,
    ) -> "DshSession":
        """Ensure the Workspace exists, then create/adopt a session in it.

        Sessions created this way appear under the workspace's group in the
        web UI. Passing an existing `session_id` adopts that session and
        attaches it to the workspace.
        """
        ws = await self.ensure_workspace(path)
        session = await self.create_session(
            workspace_id=ws["workspaceId"],
            session_id=session_id,
            agent_preset=agent_preset,
        )
        session.cwd = ws.get("path") or path
        return session

    async def create_project(
        self,
        name: str,
        parent_dir: str,
        *,
        agent_preset: str | None = None,
    ) -> "DshSession":
        """Create a new project directory + session in one call.

        NHÓM project: mục A — helper tạo thư mục + session.
        """
        from pathlib import Path
        parent = Path(parent_dir).expanduser().resolve()
        if not parent.exists():
            raise DshConfigError(f"parent_dir does not exist: {parent_dir}")
        project_path = parent / name
        if project_path.exists():
            raise DshConfigError(f"project already exists: {project_path}")
        project_path.mkdir(parents=True)
        return await self.create_session(
            cwd=str(project_path), agent_preset=agent_preset
        )

    # ---- internals shared with DshSession -------------------------------

    async def _prompt(
        self, session_id: str, text: str, mode: str, timeout: float
    ) -> bool:
        args = {
            "request": {
                "requestId": f"py-{uuid.uuid4().hex[:16]}",
                "sessionId": session_id,
                "mode": mode,
                "content": [{"type": "text", "text": text}],
                "clientTimeZone": "Asia/Ho_Chi_Minh",
            }
        }
        value = await self.rpc("session/prompt", args, timeout=timeout)
        return value.get("accepted") is True

    async def _page(
        self, session_id: str, through_seq: int, max_messages: int = 50
    ) -> list[dict]:
        args = {
            "request": {
                "address": {"kind": "session", "sessionId": session_id},
                "throughSeq": through_seq,
                "maxMessages": max_messages,
            }
        }
        try:
            value = await self.rpc("session/page", args)
            return value.get("records") or []
        except DshError as err:
            # Probe form: "session page through seq N is past cursor C"
            if err.code == "gateway/bad-request" and "past cursor" in str(err):
                import re
                m = re.search(r"past cursor (\d+)", str(err))
                if m:
                    real = int(m.group(1))
                    if real != through_seq:
                        args["request"]["throughSeq"] = real
                        value = await self.rpc("session/page", args)
                        return value.get("records") or []
            raise

    def session(self, session_id: str) -> "DshSession":
        from .session import DshSession
        return DshSession(self, session_id, None)

    # ---- raw HTTP (plugin routes; plain JSON, no RPC envelope) ---------

    async def http_get(self, path: str, *, timeout: float | None = None) -> dict[str, Any]:
        return await asyncio.to_thread(self._http_raw_sync, "GET", path, None, timeout or self.timeout)

    async def http_post(self, path: str, body: dict[str, Any], *, timeout: float | None = None) -> dict[str, Any]:
        return await asyncio.to_thread(self._http_raw_sync, "POST", path, body, timeout or self.timeout)

    async def http_patch(self, path: str, body: dict[str, Any], *, timeout: float | None = None) -> dict[str, Any]:
        return await asyncio.to_thread(self._http_raw_sync, "PATCH", path, body, timeout or self.timeout)

    def _http_raw_sync(self, method: str, path: str, body: dict | None, timeout: float) -> dict[str, Any]:
        # Transport-level retry (resets through the tunnel are common);
        # deterministic HTTP errors (4xx except 429) are never retried.
        import time
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Content-Type": "application/json"} if body is not None else {}
        attempts = max(1, self.retry.max_attempts)
        delay = self.retry.initial_backoff
        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            req = urllib.request.Request(
                f"{self.base_url}{path}", data=data, headers=headers, method=method
            )
            try:
                with self._opener.open(req, timeout=timeout) as res:
                    return json.loads(res.read().decode("utf-8"))
            except urllib.error.HTTPError as err:
                detail = ""
                try:
                    detail = err.read().decode("utf-8")[:300]
                except Exception:
                    pass
                if err.code == 401:
                    raise DshAuthError(f"{method} {path}: HTTP 401") from err
                if err.code in (429, 502, 503) and attempt < attempts:
                    last_error = DshError(f"{method} {path}: HTTP {err.code}", code=f"http/{err.code}")
                else:
                    raise DshError(
                        f"{method} {path}: HTTP {err.code} {detail}",
                        code=f"http/{err.code}",
                    ) from err
            except (urllib.error.URLError, ConnectionResetError, TimeoutError) as err:
                last_error = err
                if attempt >= attempts:
                    break
            time.sleep(delay)
            delay = min(delay * self.retry.backoff_multiplier, self.retry.max_backoff)
        if isinstance(last_error, DshError):
            raise last_error
        if isinstance(last_error, urllib.error.URLError):
            raise DshTransportError(f"{method} {path}: {last_error}") from last_error
        if isinstance(last_error, ConnectionResetError):
            raise DshTransportError(f"{method} {path}: connection reset by peer") from last_error
        raise DshTimeoutError(f"{method} {path}: timed out") from last_error

    # ---- task-contract control plane (vai-taskloop plugin) -------------

    async def create_task(self, workspace_dir: str, contract: Any, brief_text: str | None = None,
                          *, session_id: str | None = None) -> dict[str, Any]:
        """Create a task contract file (plus brief) inside the workspace."""
        from . import taskloop
        return await taskloop.create_task(self, workspace_dir, contract, brief_text, session_id=session_id)

    async def get_task(self, workspace_dir: str, n: str = "1") -> dict[str, Any]:
        from . import taskloop
        return await taskloop.get_task(self, workspace_dir, n)

    async def list_tasks(self, workspace_dir: str) -> list[dict[str, Any]]:
        from . import taskloop
        return await taskloop.list_tasks(self, workspace_dir)

    async def update_task(self, workspace_dir: str, n: str, patch: dict | None = None,
                          comment: dict | None = None, *, session_id: str | None = None) -> dict[str, Any]:
        from . import taskloop
        return await taskloop.update_task(self, workspace_dir, n, patch, comment, session_id=session_id)

    async def session_for_workspace(self, workspace_dir: str, *, create: bool = True,
                                    agent_preset: str | None = None) -> "DshSession":
        from . import taskloop
        return await taskloop.session_for_workspace(self, workspace_dir, create=create, agent_preset=agent_preset)

    async def run_contract_task(self, workspace_dir: str, contract: Any, brief_text: str | None = None,
                                *, reuse: bool = True, agent_preset: str | None = None,
                                timeout_s: float = 3600.0, poll_s: float = 3.0,
                                on_status: Any = None) -> dict[str, Any]:
        """Create + run a task contract to a terminal status in one call."""
        from . import taskloop
        return await taskloop.run_contract_task(
            self, workspace_dir, contract, brief_text, reuse=reuse,
            agent_preset=agent_preset, timeout_s=timeout_s, poll_s=poll_s, on_status=on_status,
        )