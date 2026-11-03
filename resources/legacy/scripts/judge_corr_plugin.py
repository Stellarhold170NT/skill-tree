"""Corr judge cho các mode PLUGIN — tự ghi log + corr.json. Idempotent per mode (ghi đè).
Chạy: nohup /opt/venv/bin/python scripts/judge_corr_plugin.py deep,hybrid,deep-noqa,hybrid-noqa &
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from pathlib import Path

REPO = Path("/workspace")
LOGF = REPO / "runs/t7/PLUGIN-corr.log"
sys.path.insert(0, str(REPO / "src"))


def log(msg: str) -> None:
    with LOGF.open("a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


async def corr(mode: str) -> dict:
    from skilltree.eval.ab_probe import client_cfg, judge_correctness
    from skilltree.eval.quick_eval import install_key_round_robin, load_env_file, read_keys

    load_env_file()
    keys = read_keys()
    install_key_round_robin(keys)
    cfg = client_cfg()
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}"
    res = out_dir / "results.jsonl"
    if not res.exists():
        log(f"[{mode}] no results.jsonl — skip")
        return {"mode": mode, "skip": True}
    rows = [json.loads(l) for l in res.read_text(encoding="utf-8").splitlines() if l.strip()]
    bank = {q["id"]: q for q in (json.loads(l) for l in (REPO / "corpora/swebok-v4/questions_bank_T7.jsonl").read_text(encoding="utf-8").splitlines() if l.strip())}
    scores = []
    for i, r in enumerate(rows, 1):
        if "error" in r or not r.get("answer"):
            scores.append(0.0)
            continue
        c = await judge_correctness(cfg, bank[r["id"]]["question"], bank[r["id"]]["gold_answer"], r["answer"])
        scores.append(c["score"])
        if i % 10 == 0:
            log(f"[{mode}] {i}/{len(rows)} running_mean={round(sum(scores)/len(scores),3)}")
    corr_mean = round(sum(scores) / len(scores), 3) if scores else None
    (out_dir / "corr.json").write_text(json.dumps({"corr_mean": corr_mean, "n": len(scores), "scores": scores}, ensure_ascii=False), encoding="utf-8")
    log(f"[{mode}] DONE corr={corr_mean}")
    return {"mode": mode, "corr_mean": corr_mean}


if __name__ == "__main__":
    modes = sys.argv[1].split(",") if len(sys.argv) > 1 else ["deep", "hybrid"]
    log(f"=== corr judge START {modes} ===")
    for m in modes:
        r = asyncio.run(corr(m))
        log(f"{m}: {r}")
    log("=== corr judge ALL DONE ===")
