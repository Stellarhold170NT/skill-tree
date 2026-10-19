"""T7 analysis — phân tích câu trả lời kém từ runs/t7/T7-bank/results.jsonl.

Output (stdout + runs/t7/analysis.json):
- tổng hợp theo level / ka / type
- bottom quintile (câu kém nhất) kèm error/answer head để phân loại nguyên nhân
- error rows

Chạy: cwd=/workspace
  /opt/venv/bin/python src/skilltree/eval/t7_analyze.py [--label T7-bank]
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]


def mean(xs: list) -> float | None:
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 3) if xs else None


def group(rows: list, key: str) -> dict:
    buckets: dict[str, list] = defaultdict(list)
    for r in rows:
        buckets[r.get(key) or "unk"].append(r)
    return {
        k: {
            "n": len(v),
            "corr": mean([r.get("correctness") for r in v]),
            "elems": mean([r.get("element_completeness") for r in v]),
            "hop": mean([r.get("hop_precision") for r in v]),
            "err": sum(1 for r in v if "error" in r),
        }
        for k, v in sorted(buckets.items())
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", default="T7-bank")
    ap.add_argument("--quintile", type=float, default=0.2,
                    help="tỉ lệ câu kém nhất để phân tích sâu (mặc định 0.2)")
    args = ap.parse_args()

    results = REPO_ROOT / "runs" / "t7" / args.label / "results.jsonl"
    rows = [
        json.loads(l) for l in results.read_text(encoding="utf-8").splitlines() if l.strip()
    ]
    scored = [r for r in rows if "error" not in r]
    errors = [r for r in rows if "error" in r]

    print(f"total={len(rows)} scored={len(scored)} errors={len(errors)}")
    print("\n== BY LEVEL ==")
    for k, v in group(scored, "level").items():
        print(f"  {k}: {v}")
    print("\n== BY TYPE ==")
    for k, v in group(scored, "type").items():
        print(f"  {k}: {v}")
    print("\n== BY KA ==")
    for k, v in group(scored, "ka").items():
        print(f"  {k}: {v}")

    # bottom quintile
    n_bottom = max(1, int(len(scored) * args.quintile))
    bottom = sorted(scored, key=lambda r: r.get("correctness") or 0.0)[:n_bottom]
    print(f"\n== BOTTOM {n_bottom} (quintile) ==")
    for r in bottom:
        ans_head = (r.get("answer") or "")[:220].replace("\n", " ")
        print(f"  {r['id']} [{r.get('level')}|{r.get('ka')}|{r.get('type')}] "
              f"corr={r.get('correctness')} elems={r.get('element_completeness')} "
              f"hop={r.get('hop_precision')}")
        print(f"    Q: {r.get('question', '')[:150]}")
        print(f"    A: {ans_head}")

    if errors:
        print(f"\n== ERRORS ({len(errors)}) ==")
        for r in errors:
            print(f"  {r['id']} [{r.get('level')}|{r.get('ka')}] {r['error'][:120]}")

    analysis = {
        "label": args.label,
        "total": len(rows),
        "scored": len(scored),
        "errors": len(errors),
        "overall": {
            "corr": mean([r.get("correctness") for r in scored]),
            "elems": mean([r.get("element_completeness") for r in scored]),
            "hop": mean([r.get("hop_precision") for r in scored]),
            "p50_lat": sorted([r["latency_s"] for r in scored if r.get("latency_s")])[len(scored) // 2] if scored else None,
        },
        "by_level": group(scored, "level"),
        "by_ka": group(scored, "ka"),
        "by_type": group(scored, "type"),
        "bottom": [
            {
                "id": r["id"], "level": r.get("level"), "ka": r.get("ka"),
                "type": r.get("type"), "corr": r.get("correctness"),
                "elems": r.get("element_completeness"), "hop": r.get("hop_precision"),
                "question": (r.get("question") or "")[:300],
                "answer_head": (r.get("answer") or "")[:500],
            }
            for r in bottom
        ],
        "error_rows": [{"id": r["id"], "error": r["error"][:200]} for r in errors],
    }
    out = REPO_ROOT / "runs" / "t7" / args.label / "analysis.json"
    out.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
