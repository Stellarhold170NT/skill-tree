"""Stage B — retrieval-side tuning rounds trên memory S2 (KHÔNG rebuild).

Mỗi vòng: recall 24 câu stress với 1 cấu hình retrieval → judge → append
runs/stage_b/<label>/results.jsonl + 1 dòng vào runs/ledger.jsonl.

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/stage_b.py --label R0-baseline
      [--mode GRAPH_COMPLETION|CHUNKS|GRAPH_COMPLETION_CONTEXT_EXTENSION|HYBRID_COMPLETION]
      [--top-k 10] [--rag-structured]
Mặc định --label R0-baseline --mode GRAPH_COMPLETION.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
if str(REPO_ROOT / "src") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "src"))

from skilltree.eval.ab_probe import (  # noqa: E402
    client_cfg,
    judge_correctness,
    judge_elements,
    judge_hops,
    litellm_text,
)
from skilltree.eval.quick_eval import (  # noqa: E402
    extract_search_texts,
    install_key_round_robin,
    load_env_file,
    read_keys,
)

QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_stress.jsonl"
LEDGER = REPO_ROOT / "runs" / "ledger.jsonl"
DATASET = "swebok_v4"

STRUCTURED_RAG_PROMPT = (
    "Bạn là trợ lý trả lời câu hỏi về SWEBOK v4. Chỉ dùng các đoạn trích dưới đây. "
    "TRẢ LỜI THEO CẤU TRÚC: (1) liệt kê dạng danh sách MỌI kỹ thuật/thành phần mà các "
    "đoạn trích nêu (không bỏ sót, không bịa thêm); (2) với mỗi mục, ghi rõ nó đo/định "
    "nghĩa điều gì; (3) nếu đoạn trích thiếu thông tin cho phần nào của câu hỏi, ghi rõ "
    "'thiếu: ...'.\n\nCâu hỏi: {q}\n\nCác đoạn trích:\n{chunks}"
)


async def rag_answer(cfg, question, chunks, structured: bool) -> str:
    if structured:
        prompt = STRUCTURED_RAG_PROMPT.format(q=question, chunks=chunks[:6000])
        system = "Bạn là trợ lý SWEBOK. Chỉ trả lời dựa trên đoạn trích. Liệt kê đầy đủ, không bịa."
    else:
        prompt = (f"Câu hỏi: {question}\n\nCác đoạn trích:\n{chunks[:6000]}\n\n"
                  "Trả lời ngắn gọn bằng tiếng Việt. Nếu thiếu thông tin, nói rõ.")
        system = "Bạn là trợ lý SWEBOK. Chỉ trả lời dựa trên đoạn trích."
    return await litellm_text(cfg, prompt, system=system)


async def run_round(label: str, mode: str, top_k: int, structured_rag: bool,
                    dataset: str = "swebok_v4") -> dict:
    global DATASET
    DATASET = dataset
    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()
    out_dir = REPO_ROOT / "runs" / "stage_b" / label
    out_dir.mkdir(parents=True, exist_ok=True)
    questions = [json.loads(l) for l in QUESTIONS.read_text(encoding="utf-8").splitlines() if l.strip()]

    import cognee
    from cognee.api.v1.search import SearchType

    rows = []
    for i, q in enumerate(questions, 1):
        t0 = time.perf_counter()
        try:
            res = await asyncio.wait_for(
                cognee.search(query_text=q["question"], query_type=getattr(cognee.SearchType, mode, None) or mode,
                              datasets=[DATASET], **({"top_k": top_k} if mode in ("CHUNKS", "RAG_COMPLETION") else {})),
                timeout=900)
            texts: list[str] = []
            for item in res or []:
                texts.extend(extract_search_texts(item))
            latency = round(time.perf_counter() - t0, 2)
            if mode == "CHUNKS":
                joined = "\n\n---\n\n".join(t[:1200] for t in texts[:top_k])
                answer = await rag_answer(cfg, q["question"], joined, structured_rag) if joined else ""
            else:
                answer = "\n".join(texts)[:2500]
        except Exception as exc:  # noqa: BLE001
            rows.append({"id": q["id"], "topology": q.get("topology", ""), "mode": mode,
                         "error": f"{type(exc).__name__}: {str(exc)[:120]}"})
            print(f"[{label}] {q['id']} ERROR {type(exc).__name__}", flush=True)
            continue
        corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
        row = {"id": q["id"], "topology": q.get("topology", ""), "mode": mode, "top_k": top_k,
               "latency_s": latency, "correctness": corr["score"], "answer": answer[:1000]}
        if q.get("topology") != "negative":
            elems = await judge_elements(cfg, q["question"], q["gold_answer"], answer)
            hops = await judge_hops(cfg, q["question"], q.get("expected_path", ""), answer)
            row.update({"element_completeness": elems["completeness"],
                        "hop_precision": round(hops["hops_correct"] / hops["hops_total"], 2)
                        if hops["hops_total"] else None})
        rows.append(row)
        print(f"[{label}] {q['id']}: corr={corr['score']} t={latency}s", flush=True)

    ok = [r for r in rows if "error" not in r]
    by_topo: dict[str, list] = defaultdict(list)
    for r in ok:
        by_topo[r.get("topology") or "unk"].append(r)
    metrics = {
        "n_scored": len(ok), "n_errors": len(rows) - len(ok),
        "correctness_mean": round(sum(r["correctness"] for r in ok) / max(1, len(ok)), 3),
        "element_completeness_mean": round(
            sum(r.get("element_completeness", 0) for r in ok) / max(1, len(ok)), 3),
        "hop_precision_mean": round(
            sum(r["hop_precision"] for r in ok if r.get("hop_precision") is not None)
            / max(1, sum(1 for r in ok if r.get("hop_precision") is not None)), 3)
            if any(r.get("hop_precision") is not None for r in ok) else None,
        "latency_p50": sorted(r["latency_s"] for r in ok)[max(0, len(ok) - 1) // 2] if ok else None,
        "by_topology": {t: {"n": len(rs),
                            "corr": round(sum(r["correctness"] for r in rs) / len(rs), 3)}
                        for t, rs in sorted(by_topo.items())},
    }
    (out_dir / "results.jsonl").write_text(
        "\n".join(json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    (out_dir / "summary.json").write_text(json.dumps(
        {"label": label, "mode": mode, "top_k": top_k, "structured_rag": structured_rag,
         "generated_at": datetime.now(timezone.utc).isoformat(), **metrics},
        ensure_ascii=False, indent=2), encoding="utf-8")
    with LEDGER.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({"round": label, "kind": "retrieval", "config":
                             {"mode": mode, "top_k": top_k, "structured_rag": structured_rag,
                              "memory": "S2 run-00-s2"}, **metrics,
                             "ts": datetime.now(timezone.utc).isoformat()},
                            ensure_ascii=False) + "\n")
    print(f"[{label}] DONE {json.dumps({k: metrics[k] for k in ('correctness_mean', 'element_completeness_mean')}, ensure_ascii=False)}", flush=True)
    return 0


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="R0-baseline")
    ap.add_argument("--mode", default="GRAPH_COMPLETION")
    ap.add_argument("--top-k", type=int, default=10)
    ap.add_argument("--rag-structured", action="store_true")
    ap.add_argument("--dataset", default="swebok_v4")
    args = ap.parse_args()
    raise SystemExit(asyncio.run(run_round(args.label, args.mode, args.top_k,
                                           args.rag_structured, args.dataset)))
