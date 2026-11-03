"""End-to-end: create a task contract on the server, run the agent to DONE.

Requires the vai-taskloop plugin (v1.3.0+) on the DSH server.
Env: DSH_BASE_URL, DSH_TOKEN (or pass args to DshClient).
"""
import asyncio

from dsh_web_sdk import DshClient, TaskContract

WORKSPACE = "/app/workspace/sdk-demo"


async def main() -> None:
    async with DshClient() as client:
        # One call: contract+brief lands in the workspace BEFORE the prompt,
        # the plugin renders the implementer prompt, the session runs it, and
        # the SDK polls the contract until a terminal status.
        def on_status(contract: dict) -> None:
            print(f"[status] {contract.get('status')}")

        result = await client.run_contract_task(
            WORKSPACE,
            TaskContract(
                n="1",
                name="Viết hàm tính Fibonacci",
                model="sonnet",
                brief="docs/plans/task-1-brief.md",
                report="reports/task-1-report.md",
                ctx="Project trống, tạo cấu trúc tối thiểu.",
                status="PENDING",
            ),
            brief_text="# Task 1: Fibonacci\n- Tạo fib.py với hàm fib(n)\n- In 10 số đầu tiên ra stdout\n- Viết report vào reports/task-1-report.md",
            reuse=True,
            timeout_s=3600,
            on_status=on_status,
        )

        print("session   :", result["session_id"])
        print("contract  :", result["file"])
        final = result["task"]
        print("status    :", final.get("status"))
        print("report    :", final.get("report"))


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
