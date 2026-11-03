"""Post-bench: chấm elems_v2 (±glossary) cho mọi mode PLUGIN + corr (LLM judge) cho deep/hybrid.

Chạy SAU khi PLUGIN-driver.log có 'ALL DONE'. cwd=/workspace.
  /opt/venv/bin/python /workspace/scripts/score_plugin_v040.py [--corr deep,hybrid]
"""
from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
import sys
from pathlib import Path

REPO = Path("/workspace")
EVAL = REPO / "src/skilltree/eval/t7_element_v2.py"
GLOSSARY = REPO / "corpora/swebok-v4/swebok_vi_en_glossary.json"
MODES = ["deep", "hybrid", "semantic", "lexical"]

if str(REPO / "src") not in sys.path:
    sys.path.insert(0, str(REPO / "src"))


def score(mode: str) -> dict:
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}"
    res = out_dir / "results.jsonl"
    if not res.exists():
        return {"mode": mode, "missing": True}
    sums = {}
    for tag, extra in (("element_v2.json", []), ("element_v2g.json", ["--glossary", str(GLOSSARY)])):
        dst = out_dir / tag
        r = subprocess.run(
            ["/opt/venv/bin/python", str(EVAL), "--results", str(res), "--out", str(dst), *tag_args(tag)],
            capture_output=True, text=True, cwd="/workspace",
        )
        if r.returncode != 0:
            sums[tag] = {"error": r.stderr[-300:]}
            continue
        d = json.loads(dst.read_text(encoding="utf-8"))
        sums[tag] = {
            "n": d["n"], "elems_v2": d["elems_v2_mean"], "by_level": d["by_level_v2"],
            "zero_rows": d["zero_v2_rows"], "corr_mean": d["corr_mean"],
        }
    return {"mode": mode, **sums}


def tag_args(*a):
    return list(a)


async def corr(mode: str) -> dict:
    from skilltree.eval.ab_probe import client_cfg, judge_correctness
    from skilltree.eval.quick_eval import install_key_round_robin, load_env_file, read_keys

    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}"
    rows = [json.loads(l) for l in (out_dir / "results.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    bank = {
        q["id"]: q
        for q in (json.loads(l) for l in (REPO / "corpora/swebok-v4/questions_bank_T7.jsonl").read_text(encoding="utf-8").splitlines() if l.strip())
    }
    scores = []
    for r in rows:
        if "error" in r or not r.get("answer"):
            scores.append(0.0)
            continue
        c = await judge_correctness(cfg, bank[r["id"]]["question"], bank[r["id"]]["gold_answer"], r["answer"])
        scores.append(c["score"])
    corr_mean = round(sum(scores) / len(scores), 3) if scores else None
    (out_dir / "corr.json").write_text(json.dumps({"corr_mean": corr_mean, "n": len(scores), "scores": scores}, ensure_ascii=False), encoding="utf-8")
    return {"mode": mode, "corr_mean": corr_mean, "n": len(scores)}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--corr", default="")
    args = ap.parse_args()

    report = {}
    for mode in MODES:
        report[mode] = score(mode)
        e = report[mode].get("element_v2g.json", {})
        print(f"{mode:9} elems_v2={e.get('elems_v2')} by_level={e.get('by_level')} zeros={e.get('zero_v2_rows')} corr_in_rows={e.get('corr_mean')}", flush=True)
    (REPO / "runs/t7/PLUGIN-elems-summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")

    if args.corr:
        for mode in [m.strip() for m in args.corr.split(",") if m.strip()]:
            r = asyncio.run(corr(mode))
            print(f"corr {mode}: {r}", flush=True)
