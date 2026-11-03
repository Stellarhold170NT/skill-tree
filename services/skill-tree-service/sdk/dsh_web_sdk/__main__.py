"""CLI demo: python -m dsh_web_sdk [--base URL] [--token T] "prompt..."

Reads DSH_BASE_URL / DSH_TOKEN from the environment when flags are omitted.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

from .client import DshClient
from .errors import DshError


async def run(args) -> int:
    async with DshClient(args.base, args.token) as client:
        if args.session_id:
            session = client.session(args.session_id)
        else:
            session = await client.create_session()
            print(f"* session: {session.session_id}")
            print(f"* view:    {args.base}/?token={args.token}")

        def on_event(ev):
            print(f"  [seq {ev.get('seq')}] {ev.get('type')}")

        result = await session.run(
            " ".join(args.prompt),
            timeout_s=args.timeout,
            on_event=on_event,
        )
        print()
        if result["final_text"]:
            print(f"ASSISTANT: {result['final_text']}")
        else:
            print(f"(no final text; finished={result['finished']} timeout={result['timeout']})")
        return 0 if result["finished"] else 1


def main() -> int:
    parser = argparse.ArgumentParser(prog="dsh_web_sdk")
    parser.add_argument("--base", default=os.environ.get("DSH_BASE_URL", "http://${DEV_HOST}:3080"))
    parser.add_argument("--token", default=os.environ.get("DSH_TOKEN", ""))
    parser.add_argument("--session-id", default=None, help="reuse a session id")
    parser.add_argument("--timeout", type=float, default=900.0)
    parser.add_argument("prompt", nargs="+")
    args = parser.parse_args()

    if not args.token:
        print("token required: --token or DSH_TOKEN", file=sys.stderr)
        return 2

    try:
        return asyncio.run(run(args))
    except DshError as err:
        print(f"ERROR [{err.code or '-'}]: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())