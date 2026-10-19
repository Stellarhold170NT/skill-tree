"""T7 pilot — B1: GRAPH_COMPLETION retrieval + directive LLM synthesis (anti locate-only).

Canh bài so với T7-bank baseline: đúng top câu kém nhất (bottom-N từ analysis.json),
cùng retrieval (GRAPH_COMPLETION, top_n ngầm của cognee), cùng 3 judge.
Khác biệt duy nhất: answer thay vì raw-concat sẽ được LLM tổng hợp với directive:
(i) đi thẳng vào nội dung, không mô tả vị trí chương/mục; (ii) liệt kê ĐẦY ĐỦ;
(iii) khai báo thiếu thông tin.

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_pilot_b1.py --label T7-pilot-b1 \
      [--dataset swebok_v4_full_c5] [--quintile-file runs/t7/T7-bank/analysis.json]
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

BASE_DIR = REPO_ROOT / "runs" / "t7" / "T7-bank"
QUESTIONS = REPO_ROOT / "corpora" / "swebok-v4" / "questions_bank_T7.jsonl"

DIRECTIVE_PROMPT = (
    "Bạn là chuyên gia trả lời câu hỏi về SWEBOK v4, CHỈ dựa trên các đoạn trích dưới đây.\n"
    "QUY TẮC BẮT BUỘC:\n"
    "- (1) Đi thẳng vào NỘI DUNG: định nghĩa, liệt kê, so sánh các khái niệm. "
    "TUYỆT ĐỐI KHÔNG dành dòng nào mô tả vị trí của chương/mục/figure trong sách.\n"
    "- (2) LIỆT KÊ ĐẦY ĐỦ mọi thành phần/kỹ thuật/đặc tính mà câu hỏi yêu cầu và có trong trích dẫn: "
    "không bỏ sót, không bịa thêm.\n"
    "- (3) Với MỖI mục: nêu rõ định nghĩa, vai trò, hoặc điểm phân biệt.\n"
    "- (4) Nếu trích dẫn thiếu thông tin cho phần nào của câu hỏi, ghi rõ 'thiếu: ...'.\n"
    "- (5) Trả lời tiếng Việt, cô đọng, dưới 400 từ.\n\n"
    "CÂU HỎI: {q}\n\nTRÍCH DẪN:\n{chunks}"
)


async def run_pilot(label: str, dataset: str, quintile_file: Path) -> dict:
    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()

    # bottom-N ids từ analysis của baseline
    qinfo = json.loads(quintile_file.read_text(encoding="utf-8"))
    bottom_ids = [r["id"] for r in qinfo["bottom"]]
    all_q = [
        json.loads(l)
        for l in QUESTIONS.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    qs = {q["id"]: q for q in all_q}
    print(f"[{label}] bottom ids ({len(bottom_ids)}): {bottom_ids}", flush=True)

    # baseline scores để so
    base_rows = [
        json.loads(l)
        for l in (BASE_DIR / "results.jsonl").read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]
    base = {r["id"]: r for r in base_rows}

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

    import cognee

    todo = [qid for qid in bottom_ids if qid not in done_ids]
    print(f"[{label}] done={len(done_ids)} todo={len(todo)}", flush=True)

    todo_order = [qid for qid in bottom_ids if qid in todo]
    with results_path.open("a", encoding="utf-8") as sink:
        for i, qid in enumerate(todo_order, 1):
            q = qs[qid]
            t0 = time.perf_counter()
            try:
                res = await asyncio.wait_for(
                    cognee.search(
                        query_text=q["question"],
                        query_type=cognee.SearchType.GRAPH_COMPLETION,
                        datasets=[dataset],
                    ),
                    timeout=900,
                )
                texts: list[str] = []
                for item in res or []:
                    texts.extend(extract_search_texts(item))
                joined = "\n\n---\n\n".join(t[:1200] for t in texts)
                retrieval_s = round(time.perf_counter() - t0, 2)
                answer = ""
                if joined:
                    t1 = time.perf_counter()
                    answer = await litellm_text(
                        cfg,
                        DIRECTIVE_PROMPT.format(q=q["question"], chunks=joined[:6000]),
                        system=(
                            "Bạn là trợ lý SWEBOK. Chỉ trả lời dựa trên trích dẫn. "
                            "Liệt kê đầy đủ, ngắn gọn, đi thẳng vào nội dung."
                        ),
                    )
                    llm_s = round(time.perf_counter() - t1, 2)
                else:
                    llm_s = 0.0
                latency = round(time.perf_counter() - t0, 2)

                corr = await judge_correctness(cfg, q["question"], q["gold_answer"], answer)
                row = {
                    "id": qid, "level": q.get("level", ""), "ka": q.get("ka", ""),
                    "type": q.get("type", ""), "topology": q.get("topology", ""),
                    "retrieval_s": retrieval_s, "llm_s": llm_s, "latency_s": latency,
                    "correctness": corr["score"], "answer": answer[:1200],
                }
                if q.get("topology") != "negative":
                    elems = await judge_elements(cfg, q["question"], q["gold_answer"], answer)
                    hops = await judge_hops(cfg, q["question"], q.get("expected_path", ""), answer)
                    row.update({
                        "element_completeness": elems["completeness"],
                        "hop_precision": round(hops["hops_correct"] / hops["hops_total"], 2)
                        if hops["hops_total"] else None,
                    })
                sink.write(json.dumps(row, ensure_ascii=False) + "\n")
                sink.flush()
                print(
                    f"[{label}] ({i}/{len(todo)}) {qid}: corr={corr['score']} "
                    f"elems={row.get('element_completeness')} hop={row.get('hop_precision')} t={latency}s",
                    flush=True,
                )
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {str(exc)[:160]}"
                sink.write(json.dumps(
                    {"id": qid, "level": q.get("level", ""), "ka": q.get("ka", ""),
                     "type": q.get("type", ""), "topology": q.get("topology", ""),
                     "error": err}, ensure_ascii=False) + "\n")
                sink.flush()
                print(f"[{label}] ({i}/{len(todo)}) {qid} ERROR {err[:80]}", flush=True)

    # so sánh với baseline
    pilot_rows = [
        json.loads(l)
        for l in results_path.read_text(encoding="utf-8").splitlines()
        if l.strip()
    ]

    def _mean(vals):
        vals = [v for v in vals if v is not None]
        return round(sum(vals) / len(vals), 3) if vals else None

    cmp_rows = []
    for r in pilot_rows:
        if "error" in r:
            continue
        b = base.get(r["id"], {})
        cmp_rows.append({
            "id": r["id"],
            "corr_base": b.get("correctness"), "corr_pilot": r.get("correctness"),
            "elems_base": b.get("element_completeness"),
            "elems_pilot": r.get("element_completeness"),
            "hop_base": b.get("hop_precision"), "hop_pilot": r.get("hop_precision"),
        })

    deltas = {
        "n": len(cmp_rows),
        "d_corr": round(
            _mean([(c["corr_pilot"] or 0) - (c["corr_base"] or 0) for c in cmp_rows]), 3),
        "d_elems": round(
            _mean([(c["elems_pilot"] or 0) - (c["elems_base"] or 0) for c in cmp_rows]), 3),
        "d_hop": round(_mean([
            (c["hop_pilot"] - c["hop_base"]) for c in cmp_rows
            if c["hop_pilot"] is not None and c["hop_base"] is not None]), 3),
        "per_row": cmp_rows,
    }
    summary = {
        "label": label, "dataset": dataset, "n": len(pilot_rows),
        "base_mean": {
            "corr": _mean([b.get("correctness") for b in base.values() if b["id"] in bottom_ids]),
        },
        "comparison": deltas,
    }
    (out_dir / "comparison.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{label}] SUMMARY {json.dumps({k: v for k, v in deltas.items() if k != 'per_row'})}",
          flush=True)
    return summary


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="T7-pilot-b1")
    ap.add_argument("--dataset", default="swebok_v4_full_c5")
    ap.add_argument("--quintile-file", type=Path, default=BASE_DIR / "analysis.json")
    args = ap.parse_args()
    asyncio.run(run_pilot(args.label, args.dataset, args.quintile_file))


if __name__ == "__main__":
    main()
