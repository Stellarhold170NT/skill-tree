"""T7 eval — chạy 54 câu QA bank (18 KA × L1/L2/L3) trên memory full-book C5.

Mỗi câu: cognee.search GRAPH_COMPLETION trên dataset swebok_v4_full_c5 → judge
correctness (ab_probe.judge_correctness) → element/hop completeness (không negative).
Rows append NGAY sau mỗi câu (resume an toàn: skip id đã có trong results.jsonl).

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank \
      [--mode GRAPH_COMPLETION] [--top-k 10] [--dataset swebok_v4_full_c5]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.ab_probe import (  # noqa: E402
    client_cfg,
    judge_correctness,
    judge_elements,
    judge_hops,
)
from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"


async def run_eval(label: str, mode: str, top_k: int, dataset: str, hybrid_l3: bool = False) -> dict:
    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()
    out_dir = REPO_ROOT / "runs" / "t7" / label
    out_dir.mkdir(parents=True, exist_ok=True)
    results_path = out_dir / "results.jsonl"

    done_ids: set[str] = set()
    if results_path.exists():
        for line in results_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    done_ids.add(json.loads(line)["id"])
                except Exception:  # noqa: BLE001
                    pass

    questions = [
        json.loads(l)
        for l in QUESTIONS.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    todo = [q for q in questions if q["id"] not in done_ids]
    print(f"[{label}] total={len(questions)} done={len(done_ids)} todo={len(todo)}", flush=True)

    import cognee

    results_path.parent.mkdir(parents=True, exist_ok=True)
    rows: list[dict] = []
    with results_path.open("a", encoding="utf-8") as sink:
        for i, q in enumerate(todo, 1):
            t0 = time.perf_counter()
            try:
                res = await asyncio.wait_for(
                    cognee.search(
                        query_text=q["question"],
                        query_type=getattr(cognee.SearchType, mode, None) or mode,
                        datasets=[dataset],
                        **({"top_k": top_k} if mode in ("CHUNKS", "RAG_COMPLETION") else {}),
                    ),
                    timeout=900,
                )
                texts: list[str] = []
                for item in res or []:
                    texts.extend(extract_search_texts(item))
                retrieval_kind = mode
                if hybrid_l3 and q.get("level") == "L3":
                    cres = await asyncio.wait_for(
                        cognee.search(
                            query_text=q["question"],
                            query_type=cognee.SearchType.CHUNKS,
                            datasets=[dataset],
                            top_k=8,
                        ),
                        timeout=900,
                    )
                    ct: list[str] = []
                    for item in cres or []:
                        ct.extend(extract_search_texts(item))
                    if ct:
                        texts = texts + ["=== CHUNKS ==="] + ct
                        retrieval_kind = f"{mode}+CHUNKS"
                latency = round(time.perf_counter() - t0, 2)
                answer = "\n".join(texts)[:2500]
            except Exception as exc:  # noqa: BLE001
                row = {
                    "id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                    "type": q.get("type", ""), "topology": q.get("topology", ""),
                    "mode": mode, "dataset": dataset,
                    "error": f"{type(exc).__name__}: {str(exc)[:160]}",
                }
                rows.append(row)
                sink.write(json.dumps(row, ensure_ascii=False) + "\n")
                sink.flush()
                print(f"[{label}] ({i}/{len(todo)}) {q['id']} ERROR {type(exc).__name__}", flush=True)
                continue

            corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
            row = {
                "id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                "type": q.get("type", ""), "topology": q.get("topology", ""),
                "mode": mode, "dataset": dataset, "top_k": top_k,
                "retrieval": retrieval_kind,
                "latency_s": latency, "correctness": corr["score"],
                "answer": answer[:1200],
            }
            if q.get("topology") != "negative":
                elems = await judge_elements(cfg, q["question"], q["gold_answer"], answer)
                hops = await judge_hops(cfg, q["question"], q.get("expected_path", ""), answer)
                row.update({
                    "element_completeness": elems["completeness"],
                    "hop_precision": round(hops["hops_correct"] / hops["hops_total"], 2)
                    if hops["hops_total"] else None,
                })
            rows.append(row)
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
            sink.flush()
            print(
                f"[{label}] ({i}/{len(todo)}) {q['id']}: corr={corr['score']} "
                f"t={latency}s",
                flush=True,
            )

    # summary — đọc lại toàn bộ results (kể cả run trước đó)
    all_rows = [
        json.loads(l)
        for l in results_path.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    ok = [r for r in all_rows if "error" not in r]
    by_level: dict[str, list] = defaultdict(list)
    by_ka: dict[str, list] = defaultdict(list)
    for r in ok:
        by_level[r.get("level") or "unk"].append(r)
        by_ka[r.get("ka") or "unk"].append(r)

    def agg(rs: list) -> dict:
        if not rs:
            return {"n": 0}
        corr = [r["correctness"] for r in rs if r.get("correctness") is not None]
        elems = [r["element_completeness"] for r in rs if r.get("element_completeness") is not None]
        hops = [r["hop_precision"] for r in rs if r.get("hop_precision") is not None]
        lat = [r["latency_s"] for r in rs if r.get("latency_s") is not None]
        return {
            "n": len(rs),
            "corr": round(sum(corr) / len(corr), 3) if corr else None,
            "elems": round(sum(elems) / len(elems), 3) if elems else None,
            "hop": round(sum(hops) / len(hops), 3) if hops else None,
            "p50_lat": sorted(lat)[len(lat) // 2] if lat else None,
        }

    summary = {
        "label": label,
        "mode": mode,
        "dataset": dataset,
        "total": len(questions),
        "n_scored": len(ok),
        "n_errors": len(all_rows) - len(ok),
        "overall": agg(ok),
        "by_level": {k: agg(v) for k, v in sorted(by_level.items())},
        "by_ka": {k: agg(v) for k, v in sorted(by_ka.items())},
        "rows": [
            {"id": r["id"], "corr": r.get("correctness"), "err": r.get("error", "")[:80]}
            for r in all_rows
        ],
    }
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[{label}] DONE overall={summary['overall']}", flush=True)
    return summary


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="T7-bank")
    ap.add_argument("--mode", default="GRAPH_COMPLETION")
    ap.add_argument("--top-k", type=int, default=10)
    ap.add_argument("--dataset", default="swebok_v4_full_c5")
    ap.add_argument("--hybrid-l3", action="store_true",
                    help="L3: merge CHUNKS top_k=8 vào context (pilot B2, elems_v2 +0.108)")
    args = ap.parse_args()
    asyncio.run(run_eval(args.label, args.mode, args.top_k, args.dataset, args.hybrid_l3))


if __name__ == "__main__":
    main()
