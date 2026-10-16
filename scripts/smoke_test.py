"""Smoke test cognee: remember -> recall -> forget.

Chay: .venv\\Scripts\\python.exe scripts\\smoke_test.py
Lan chay dau se tai model fastembed (~120MB) + goi LLM nen mat vai phut.
"""

import asyncio
import sys

import cognee

# Console Windows mac dinh cp1252 -> khong in duoc tieng Viet
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8")


async def main():
    # 1. INGESTION - nap du lieu vao memory (add + cognify + improve)
    await cognee.remember(
        "Cognee bien tai lieu thanh AI memory. SkillTree la workspace quan ly skill cho agent.",
        dataset_name="smoke_test",
    )

    # 2. RETRIEVAL - truy xuat tu memory
    results = await cognee.recall(
        "SkillTree la gi?",
        datasets=["smoke_test"],
    )
    print("=== KET QUA RECALL ===")
    print(results)


if __name__ == "__main__":
    asyncio.run(main())
