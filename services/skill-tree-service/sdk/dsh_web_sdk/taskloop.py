"""Task-contract control plane for vai-taskloop (dsh_web_sdk).

The workspace `<dir>/taskloop/task-N.task.json` file is the single source of
truth: the plugin tools, the web form and this SDK all read and write it.
Contract files are created through the plugin's file-scoped routes
(create-only, briefs stay inside the workspace dir), so a task exists on the
server BEFORE the first prompt is sent.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field, asdict
from typing import Any, Awaitable, Callable

CONTRACT_PATH = "/api/taskloop/contract"
TASK_PATH = "/api/taskloop/task"
TASKS_PATH = "/api/taskloop/tasks"

#: Statuses at which wait_task_done() returns.
TERMINAL_STATUSES = ("DONE", "DONE_WITH_CONCERNS", "BLOCKED", "NEEDS_CONTEXT")


@dataclass
class TaskContract:
    """One Subagent Task Contract (mirrors vai-taskloop's engine fields)."""

    n: str = "auto"  # 'auto' -> next free number within the workspace
    name: str = ""
    model: str = "sonnet"
    brief: str = ""
    dir: str = ""
    report: str = ""
    ctx: str = ""
    status: str = "PENDING"
    comments: list[dict[str, Any]] = field(default_factory=list)

    def to_payload(self) -> dict[str, Any]:
        data = asdict(self)
        data["n"] = str(self.n)
        return data


async def next_n(client: Any, workspace_dir: str) -> str:
    """Next free task number inside the workspace's shared contract store."""
    tasks = await list_tasks(client, workspace_dir)
    nums = []
    for t in tasks:
        try:
            nums.append(int(str(t.get("n", "0"))))
        except (TypeError, ValueError):
            continue
    return str(max(nums, default=0) + 1)


async def create_task(
    client: Any,
    workspace_dir: str,
    contract: TaskContract | dict[str, Any],
    brief_text: str | None = None,
    *,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Write the contract (and its brief) into `<workspace>/taskloop/`.

    Returns `{ok, file, contract, prompt}` — `prompt` is the implementer
    prompt rendered by the plugin itself, ready for `session.prompt()`.
    Raises DshError with a 409-coded message when the task already exists.
    """
    payload = contract.to_payload() if isinstance(contract, TaskContract) else dict(contract)
    if str(payload.get("n", "auto")).strip() in ("", "auto"):
        payload["n"] = await next_n(client, workspace_dir)
    body: dict[str, Any] = {"dir": workspace_dir, "contract": payload}
    if brief_text is not None:
        body["brief"] = brief_text
    path = CONTRACT_PATH
    if session_id:
        path += f"?session={session_id}"
    return await client.http_post(path, body)


async def get_task(client: Any, workspace_dir: str, n: str = "1") -> dict[str, Any]:
    """Read one stored contract (raises DshError 404 when absent)."""
    from urllib.parse import quote

    value = await client.http_get(f"{TASK_PATH}?dir={quote(workspace_dir, safe='')}&n={quote(str(n), safe='')}")
    return value.get("contract") or {}


async def list_tasks(client: Any, workspace_dir: str) -> list[dict[str, Any]]:
    """List every stored contract of one workspace."""
    from urllib.parse import quote

    value = await client.http_get(f"{TASKS_PATH}?dir={quote(workspace_dir, safe='')}")
    return value.get("tasks") or []


async def update_task(
    client: Any,
    workspace_dir: str,
    n: str,
    patch: dict[str, Any] | None = None,
    comment: dict[str, str] | None = None,
    *,
    session_id: str | None = None,
) -> dict[str, Any]:
    """Merge `patch` (fields/status) and/or append a review comment."""
    from urllib.parse import quote

    body: dict[str, Any] = {"dir": workspace_dir, "n": str(n)}
    if patch:
        body["patch"] = patch
    if comment:
        body["comment"] = comment
    path = CONTRACT_PATH
    if session_id:
        path += f"?session={quote(session_id, safe='')}"
    return await client.http_patch(path, body)


async def session_for_workspace(
    client: Any,
    workspace_dir: str,
    *,
    create: bool = True,
    agent_preset: str | None = None,
) -> Any:
    """Return a live session whose cwd matches the workspace, or create one.

    Sessions created here are registered under the workspace (web UI groups
    them by Workspace, not cwd — cwd-only sessions land in Ungrouped).
    """
    for item in await client.list_sessions():
        if item.get("cwd") == workspace_dir:
            from .session import DshSession

            return DshSession(client, item["sessionId"], item.get("agentPreset"), cwd=workspace_dir)
    if not create:
        raise LookupError(f"no session for workspace {workspace_dir}")
    return await client.create_session_for_workspace(workspace_dir, agent_preset=agent_preset)


async def wait_task_done(
    client: Any,
    workspace_dir: str,
    n: str = "1",
    *,
    timeout_s: float = 3600.0,
    poll_s: float = 3.0,
    on_status: Callable[[dict[str, Any]], Any] | None = None,
) -> dict[str, Any]:
    """Poll the stored contract until it reaches a terminal status.

    Terminal: DONE, DONE_WITH_CONCERNS, BLOCKED, NEEDS_CONTEXT. Returns the
    final contract dict; `{"timeout": True, ...}` when the deadline passes.
    """
    contract = await get_task(client, workspace_dir, n)
    last_status = contract.get("status")
    if on_status and last_status:
        _notify(on_status, contract)
    if last_status in TERMINAL_STATUSES:
        return contract
    deadline = asyncio.get_event_loop().time() + timeout_s
    while asyncio.get_event_loop().time() < deadline:
        await asyncio.sleep(poll_s)
        try:
            contract = await get_task(client, workspace_dir, n)
        except Exception:
            continue  # transient HTTP/404 — keep polling until the deadline
        status = contract.get("status")
        if status != last_status:
            last_status = status
            if on_status and status:
                _notify(on_status, contract)
        if status in TERMINAL_STATUSES:
            return contract
    return {"timeout": True, "n": str(n), "status": last_status}


def _notify(on_status: Callable[..., Any], contract: dict[str, Any]) -> None:
    outcome = on_status(contract)
    if isinstance(outcome, Awaitable):
        asyncio.ensure_future(outcome)


async def run_contract_task(
    client: Any,
    workspace_dir: str,
    contract: TaskContract | dict[str, Any],
    brief_text: str | None = None,
    *,
    reuse: bool = True,
    agent_preset: str | None = None,
    timeout_s: float = 3600.0,
    poll_s: float = 3.0,
    on_status: Callable[[dict[str, Any]], Any] | None = None,
) -> dict[str, Any]:
    """Full orchestrator pipeline in one call.

    1. Create the contract + brief on the server (this also creates the
       workspace dir, so a brand-new workspace works).
    2. Ensure a session on the workspace (reuse an existing one when asked)
       and sync the in-memory engine so the web form mirrors the task.
    3. Send the plugin-rendered implementer prompt.
    4. Poll the contract until a terminal status and return everything.
    """
    contract_data = contract.to_payload() if isinstance(contract, TaskContract) else dict(contract)
    created = await create_task(client, workspace_dir, contract_data, brief_text)
    n = (created.get("contract") or {}).get("n", "1")
    session = await session_for_workspace(
        client, workspace_dir, create=True, agent_preset=agent_preset
    )
    if not reuse:
        session = await client.create_session(cwd=workspace_dir, agent_preset=agent_preset)
    await update_task(client, workspace_dir, n, patch={}, session_id=session.session_id)
    await session.prompt(created["prompt"])
    final = await wait_task_done(
        client, workspace_dir, n,
        timeout_s=timeout_s, poll_s=poll_s, on_status=on_status,
    )
    return {
        "session_id": session.session_id,
        "file": created.get("file"),
        "prompt": created.get("prompt"),
        "task": final,
    }
