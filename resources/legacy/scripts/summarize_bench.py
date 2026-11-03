"""Tổng hợp toàn bộ bench plugin v0.4.0 -> runs/t7/PLUGIN-bench-final.json
Chạy khi mọi control xong. cwd=/workspace.
"""
from __future__ import annotations

import json
import statistics
from pathlib import Path

REPO = Path("/workspace")
T7 = REPO / "runs/t7"

CONFIGS = [
    # (label, dir, note)
    ("deep", "PLUGIN-v040-deep", "mode deep, registry mặc định (tables *) — CHỨA SessionQA nhiễm bẩn"),
    ("hybrid", "PLUGIN-v040-hybrid", "mode hybrid, tables * — chứa SessionQA"),
    ("semantic", "PLUGIN-v040-semantic", "mode semantic, tables * — chứa SessionQA"),
    ("lexical", "PLUGIN-v040-lexical", "mode lexical, tables * — chứa SessionQA"),
    ("deep-noqa", "PLUGIN-v040-deep-noqa", "deep, excludeTables SessionQA — FAIR"),
    ("hybrid-noqa", "PLUGIN-v040-hybrid-noqa", "hybrid, excludeTables SessionQA — FAIR"),
    ("deep-noqa-k8", "PLUGIN-v040-deep-noqa-k8", "deep noqa topK 8 maxChars 2400"),
    ("deep-noqa-filt", "PLUGIN-v040-deep-noqa-filt", "deep noqa + excludePatterns 'contributing editors'"),
]

REFS = {
    "cognee_baseline_graph_only": {"elems_v2_glossary": 0.499, "corr": 0.510, "by_level": {"L1": 0.540, "L2": 0.525, "L3": 0.434}},
    "cognee_hybrid_all": {"elems_v2_glossary": 0.532, "corr": 0.515, "by_level": {"L1": 0.592, "L2": 0.534, "L3": 0.469}, "latency_p50_s": 71.67},
}


def load_config(label: str, d: str) -> dict:
    base = T7 / d
    res = base / "results.jsonl"
    if not res.exists():
        return {"label": label, "missing": True}
    rows = [json.loads(l) for l in res.read_text(encoding="utf-8").splitlines() if l.strip()]
    lat = [r["latency_s"] for r in rows if "latency_s" in r]
    errs = sum(1 for r in rows if "error" in r)
    out = {
        "label": label,
        "note": dict(CONFIGS)[label] if label in dict(CONFIGS) else "",
        "n": len(rows),
        "errors": errs,
        "latency_p50_s": round(statistics.median(lat), 1) if lat else None,
    }
    for tag in ("element_v2.json", "element_v2g.json"):
        p = base / tag
        if p.exists():
            e = json.loads(p.read_text(encoding="utf-8"))
            out[tag] = {"elems_v2": e["elems_v2_mean"], "by_level": e["by_level_v2"], "zeros": e["zero_v2_rows"]}
    for tag in ("corr.json", "corr_synth.json"):
        p = base / tag
        if p.exists():
            c = json.loads(p.read_text(encoding="utf-8"))
            out[tag] = c.get("corr_mean", c.get("corr_synth_mean"))
    return out


def main() -> None:
    out = {"date": time_str(), "source": "bench qua plugin CLI cognee-recall.cjs v0.4.0, 54 câu T7, protocol answer[:2500], chấm t7_element_v2",
           "references": REFS, "configs": []}
    for label, d, _ in CONFIGS:
        out["configs"].append(load_config(label, d))
    (T7 / "PLUGIN-bench-final.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("written:", T7 / "PLUGIN-bench-final.json")


def time_str():
    import time
    return time.strftime("%Y-%m-%dT%H:%MZ")


if __name__ == "__main__":
    main()
