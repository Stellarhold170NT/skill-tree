"""Async session wrapper for DSH."""
from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any, AsyncIterator

from .errors import DshError, DshSessionError


def _extract_final_text(records: list[dict]) -> tuple[str | None, int]:
    """Newest assistant text + its seq from a page of records."""
    best_text: str | None = None
    best_seq = -1
    for record in records:
        event = record.get("event") or {}
        if event.get("type") != "assistant/message":
            continue
        seq = event.get("seq", -1)
        if seq <= best_seq:
            continue
        data = event.get("data") or {}
        message = data.get("message") or data
        content = message.get("content") or []
        parts = [
            block.get("text", "")
            for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        ]
        text = "\n".join(p for p in parts if p)
        if text:
            best_text, best_seq = text, seq
    return best_text, best_seq


class DshSession:
    """One remote session on the server (async)."""

    def __init__(
        self,
        client: "DshClient",
        session_id: str,
        agent_preset: str | None,
        cwd: str | None = None,
    ) -> None:
        self.client = client
        self.session_id = session_id
        self.agent_preset = agent_preset
        self.cwd = cwd

    # ---- information -------------------------------------------------

    async def summary(self) -> dict:
        """Row from session/list."""
        for item in await self.client.list_sessions():
            if item.get("sessionId") == self.session_id:
                return item
        raise DshSessionError(f"session {self.session_id} not visible in list")

    async def is_running(self) -> bool:
        try:
            return bool((await self.summary()).get("running"))
        except DshError:
            return False

    async def cursor(self) -> int:
        """Latest committed seq."""
        records = await self._page(2_000_000_000, max_messages=1)
        if records:
            return max((r.get("event") or {}).get("seq", 0) for r in records)
        return -1

    async def history(
        self,
        max_messages: int = 50,
        *,
        event_type: str | None = None,
    ) -> list[dict]:
        """Recent event log (single page). Use stream() for full history."""
        top = await self.cursor()
        if top < 0:
            return []
        records = await self._page(top, max_messages=max_messages)
        if event_type is None:
            return [r.get("event") or {} for r in records]
        return [
            r.get("event") or {}
            for r in records
            if (r.get("event") or {}).get("type") == event_type
        ]

    async def stream(
        self,
        *,
        since_seq: int = 0,
        page_size: int = 50,
        poll_interval: float = 1.0,
        max_idle: float = 5.0,
    ) -> AsyncIterator[dict]:
        """Async iterator over events (NHÓM 3.2 + NHÓM 5.3).

        Polls the server and yields new events as they appear. Stops
        after `max_idle` seconds with no new events AND session not running.
        """
        last_seq = since_seq
        last_event_at = time.monotonic()
        while True:
            top = await self.cursor()
            if top > last_seq:
                records = await self._page(top, max_messages=page_size)
                for r in records:
                    event = r.get("event") or {}
                    seq = event.get("seq", 0)
                    if seq > last_seq:
                        yield event
                        last_seq = seq
                        last_event_at = time.monotonic()
            # Stop condition: no new events + session idle
            if not await self.is_running():
                if time.monotonic() - last_event_at >= max_idle:
                    return
            await asyncio.sleep(poll_interval)

    async def final_text(self) -> str | None:
        text, _ = _extract_final_text(
            [{"event": e} for e in await self.history()]
        )
        return text

    # ---- actions ------------------------------------------------------

    async def prompt(
        self,
        text: str,
        *,
        mode: str = "queue",
        timeout: float = 15.0,
    ) -> bool:
        """Send one user prompt."""
        return await self.client._prompt(
            self.session_id, text, mode=mode, timeout=timeout
        )

    async def cancel(self) -> bool:
        value = await self.client.rpc(
            "session/cancel",
            {"request": {"sessionId": self.session_id}},
            timeout=10.0,
        )
        return value.get("accepted") is True

    async def wait(
        self,
        *,
        timeout_s: float = 600.0,
        poll_s: float = 3.0,
        idle_s: float = 8.0,
        on_event: Any = None,
    ) -> dict:
        """Wait for the agent to finish this session."""
        deadline = time.monotonic() + timeout_s
        idle_deadline: float | None = None
        last_seq = -1
        while time.monotonic() < deadline:
            running = await self.is_running()
            seq = await self.cursor()
            if seq > last_seq:
                last_seq = seq
                if on_event:
                    for event in await self.history(max_messages=5):
                        if asyncio.iscoroutinefunction(on_event):
                            await on_event(event)
                        else:
                            on_event(event)
            if running:
                idle_deadline = None
            else:
                if idle_deadline is None:
                    idle_deadline = time.monotonic() + idle_s
                elif time.monotonic() >= idle_deadline:
                    return {
                        "finished": True,
                        "running": False,
                        "final_text": await self.final_text(),
                        "timeout": False,
                    }
            await asyncio.sleep(poll_s)
        return {
            "finished": not await self.is_running(),
            "running": await self.is_running(),
            "final_text": await self.final_text(),
            "timeout": True,
        }

    async def run(
        self,
        text: str,
        *,
        timeout_s: float = 600.0,
        on_event: Any = None,
    ) -> dict:
        """prompt() + wait() in one call."""
        mode = "steer" if await self.is_running() else "queue"
        await self.prompt(text, mode=mode)
        return await self.wait(timeout_s=timeout_s, on_event=on_event)

    # ---- task-contract helpers (vai-taskloop) ---------------------------

    async def task_status(self, n: str = "1", *, dir: str | None = None) -> dict:
        """Read one stored task contract (defaults to this session's cwd)."""
        from . import taskloop
        return await taskloop.get_task(self.client, dir or self.cwd, n)

    async def wait_task_done(
        self,
        n: str = "1",
        *,
        dir: str | None = None,
        timeout_s: float = 3600.0,
        poll_s: float = 3.0,
        on_status: Any = None,
    ) -> dict:
        """Poll the contract until a terminal status (DONE/BLOCKED/...)."""
        from . import taskloop
        return await taskloop.wait_task_done(
            self.client, dir or self.cwd, n,
            timeout_s=timeout_s, poll_s=poll_s, on_status=on_status,
        )

    async def run_task(self, prompt: str, n: str = "1", *,
                       dir: str | None = None, timeout_s: float = 3600.0,
                       poll_s: float = 3.0, on_status: Any = None) -> dict:
        """Send the implementer prompt, then poll the contract to the end."""
        mode = "steer" if await self.is_running() else "queue"
        await self.prompt(prompt, mode=mode)
        return await self.wait_task_done(
            n, dir=dir or self.cwd, timeout_s=timeout_s, poll_s=poll_s, on_status=on_status,
        )

    # ---- internals ----------------------------------------------------

    async def _page(
        self, through_seq: int, max_messages: int = 50
    ) -> list[dict]:
        return await self.client._page(
            self.session_id, through_seq, max_messages=max_messages
        )
