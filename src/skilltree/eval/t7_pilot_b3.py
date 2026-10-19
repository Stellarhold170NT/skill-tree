"""T7 pilot B3 — query expansion VI→EN cho các câu còn kém.

Mỗi câu: LLM dịch question -> EN (SWEBOK terminology), query = question + "\n\nEN: " + en
cho cả GRAPH_COMPLETION lẫn CHUNKS (top_k=8) — hybrid giống B2. Answer = raw-join cap 2500.
Translation được cache trong row để tái dùng. Chấm bằng t7_element_v2 --glossary (metric
giống hệt baseline rescore) nên delta thuần túy là biến retrieval.

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_pilot_b3.py --label T7-pilot-b3 \
      --ids QA-L1-12,QA-L3-05,QA-L1-02,QA-L1-03,QA-L2-06,QA-L3-09
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

from skilltree.eval.ab_probe import client_cfg, judge_correctness, litellm_text  # noqa: E402
from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"
TRANSLATE_PROMPT = (
    "Translate this software-engineering question from Vietnamese into concise English "
    "using standard SWEBOK v4 terminology. Output ONLY the English translation, one paragraph.\n\n"
    "{q}"
)


async def translate_question(cfg, question: str) -> str:
    for attempt in range(3):
        try:
            text = await litellm_text(cfg, TRANSLATE_PROMPT.format(q=question))
            return text.strip()[:1200]
        except Exception as exc:  # noqa: BLE001
            print(f"    translate attempt {attempt + 1} failed: {type(exc).__name__}", flush=True)
            await asyncio.sleep(5)
    return ""


async def run_pilot(label: str, dataset: str, ids: list[str]) -> dict:
    load_env_file()
    install_key_round_robin(read_keys())
    cfg = client_cfg()

    out_dir = REPO_ROOT / "runs" / "t7" / label
    out_dir.mkdir(parents=True, exist_ok=True)
    results_path = out_dir / "results.jsonl"
    done: dict[str, dict] = {}
    if results_path.exists():
        for line in results_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    r = json.loads(line)
                    done[r["id"]] = r
                except Exception:  # noqa: BLE001
                    pass
    todo = [i for i in ids if i not in done or "error" in done.get(i, {})]
    print(f"[{label}] targets ({len(todo)}): {todo}", flush=True)

    qs = {
        q["id"]: q
        for q in (json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip())
    }

    import cognee

    with results_path.open("a", encoding="utf-8") as sink:
        for i, qid in enumerate(todo, 1):
            q = qs[qid]
            t0 = time.perf_counter()
            try:
                en = await translate_question(cfg, q["question"])
                query = q["question"] + "\n\nEN: " + en if en else q["question"]
                g = await asyncio.wait_for(
                    cognee.search(query_text=query, query_type=cognee.SearchType.GRAPH_COMPLETION, datasets=[dataset]),
                    timeout=900,
                )
                tg: list[str] = []
                for item in g or []:
                    tg.extend(extract_search_texts(item))
                c = await asyncio.wait_for(
                    cognee.search(query_text=query, query_type=cognee.SearchType.CHUNKS, datasets=[dataset], top_k=8),
                    timeout=900,
                )
                tc: list[str] = []
                for item in c or []:
                    tc.extend(extract_search_texts(item))
                merged = "\n\n".join(tg) + "\n\n=== CHUNKS ===\n\n" + "\n\n".join(tc)
                answer = merged[:2500]
                latency = round(time.perf_counter() - t0, 2)
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {str(exc)[:160]}"
                sink.write(json.dumps({"id": qid, "error": err}, ensure_ascii=False) + "\n")
                sink.flush()
                print(f"[{label}] ({i}/{len(todo)}) {qid} ERROR {err[:80]}", flush=True)
                continue

            corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
            row = {
                "id": qid, "level": q.get("level"), "ka": q.get("ka"),
                "en_translation": en, "latency_s": latency,
                "correctness": corr["score"], "answer": answer[:2000],
            }
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
            sink.flush()
            print(f"[{label}] ({i}/{len(todo)}) {qid}: corr={corr['score']} t={latency}s", flush=True)

    print(f"[{label}] done — chay t7_element_v2 --results {results_path}", flush=True)
    return {"label": label, "ids": todo}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="T7-pilot-b3")
    ap.add_argument("--dataset", default="swebok_v4_full_c5")
    ap.add_argument("--ids", default="QA-L1-12,QA-L3-05,QA-L1-02,QA-L1-03,QA-L2-06,QA-L3-09")
    args = ap.parse_args()
    ids = [s.strip() for s in args.ids.split(",") if s.strip()]
    asyncio.run(run_pilot(args.label, args.dataset, ids))


if __name__ == "__main__":
    main()
