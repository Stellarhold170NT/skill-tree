"""Probe 2 true-zero rows (QA-L1-12, QA-L3-05): key terms có trong CHUNKS/graph không?

Verdict per term:
  CHUNKS_HIT  — term có trong chunks top_k=10 -> retrieval có thể lấy, lỗi ở tầng synthesis/selection
  CHUNKS_MISS — term không có trong chunks -> corpus/indexing gap thật
Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_probe_zeros.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)
from skilltree.eval.t7_element_v2 import key_terms_from_gold, norm, term_in_answer  # noqa: E402

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"
TARGETS = {"QA-L1-12", "QA-L3-05"}
DATASET = "swebok_v4_full_c5"


async def main() -> None:
    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    bank = {
        q["id"]: q
        for q in (json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip())
    }
    import cognee

    for qid in sorted(TARGETS):
        q = bank[qid]
        terms = key_terms_from_gold(q["gold_answer"])
        print(f"\n=== {qid} ({q.get('ka')}) terms={terms}", flush=True)
        for label, texts in (("CHUNKS", None),):
            res = await asyncio.wait_for(
                __import__("cognee").search(
                    query_text=q["question"],
                    query_type=__import__("cognee").SearchType.CHUNKS,
                    datasets=[DATASET],
                    top_k=10,
                ),
                timeout=300,
            )
            chunks: list[str] = []
            for item in res or []:
                chunks.extend(extract_search_texts(item))
            blob = norm("\n".join(chunks))
            tokens = blob.split()
            print(f"[{label}] n_chunks_texts={len(chunks)} blob_chars={len(blob)}", flush=True)
            for t in terms:
                hit = term_in_answer(t, blob, tokens)
                print(f"  {'HIT ' if hit else 'MISS'} {t}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
