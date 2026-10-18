"""T7 pilot B2 — hybrid retrieval (GRAPH_COMPLETION + CHUNKS) cho L3 yếu nhất.

 isolate biến retrieval: answer = raw-join của (graph texts + chunk texts),
 cùng cap 2500 chars như baseline; KHÔNG thêm LLM synthesis (B1 đã bị loại).
 Chấm bằng corr (LLM) + elems_v2 (deterministic).

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_pilot_b2.py --label T7-pilot-b2 [--n 5]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.ab_probe import client_cfg, judge_correctness  # noqa: E402
from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"
BANK_V2 = REPO_ROOT / "runs" / "t7" / "T7-bank" / "element_v2.json"


async def run_pilot(label: str, dataset: str, n: int) -> dict:
    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()

    bank_v2 = json.loads(BANK_V2.read_text(encoding="utf-8"))
    l3 = sorted(
        [r for r in bank_v2["rows"] if r["level"] == "L3"],
        key=lambda r: r["elems_v2"] if r["elems_v2"] is not None else 0.0,
    )
    ids = [r["id"] for r in l3[:n]]
    out_dir = REPO_ROOT / "runs" / "t7" / label
    out_dir.mkdir(parents=True, exist_ok=True)
    results_path = out_dir / "results.jsonl"
    done_ids: set[str] = set()
    if results_path.exists():
        for line in results_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    done_ids.add(json.loads(line)["id"])
                except Exception:  # noqa: BLE001
                    pass
    ids = [i for i in ids if i not in done_ids]
    print(f"[{label}] target L3 ({len(ids)}): {ids}", flush=True)

    qs = {
        q["id"]: q
        for q in (json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip())
    }
    base = {r["id"]: r for r in (json.loads(l) for l in (REPO_ROOT / "runs/t7/T7-bank/results.jsonl").read_text(encoding="utf-8").splitlines() if l.strip())}

    import cognee

    with results_path.open("a", encoding="utf-8") as sink:
        for i, qid in enumerate(ids, 1):
            q = qs[qid]
            t0 = time.perf_counter()
            try:
                g = await asyncio.wait_for(
                    cognee.search(query_text=q["question"], query_type=cognee.SearchType.GRAPH_COMPLETION, datasets=[dataset]),
                    timeout=900,
                )
                tg: list[str] = []
                for item in g or []:
                    tg.extend(extract_search_texts(item))
                c = await asyncio.wait_for(
                    cognee.search(query_text=q["question"], query_type=cognee.SearchType.CHUNKS, datasets=[dataset], top_k=8),
                    timeout=900,
                )
                tc: list[str] = []
                for item in c or []:
                    tc.extend(extract_search_texts(item))
                # graph trước (giữ cấu trúc), chunk bổ sung phía sau
                merged = "\n\n".join(tg) + "\n\n=== CHUNKS ===\n\n" + "\n\n".join(tc)
                answer = merged[:2500]
                latency = round(time.perf_counter() - t0, 2)
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {str(exc)[:160]}"
                sink.write(json.dumps({"id": qid, "error": err}, ensure_ascii=False) + "\n")
                sink.flush()
                print(f"[{label}] ({i}/{len(ids)}) {qid} ERROR {err[:80]}", flush=True)
                continue

            corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
            row = {
                "id": qid, "level": q.get("level"), "ka": q.get("ka"),
                "latency_s": latency, "correctness": corr["score"], "answer": answer[:2000],
            }
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
            sink.flush()
            print(f"[{label}] ({i}/{len(ids)}) {qid}: corr={corr['score']} t={latency}s", flush=True)

    print(f"[{label}] done — chay t7_element_v2 --results {results_path} de cham elems_v2", flush=True)
    return {"label": label, "ids": ids}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="T7-pilot-b2")
    ap.add_argument("--dataset", default="swebok_v4_full_c5")
    ap.add_argument("--n", type=int, default=5)
    args = ap.parse_args()
    asyncio.run(run_pilot(args.label, args.dataset, args.n))


if __name__ == "__main__":
    main()
