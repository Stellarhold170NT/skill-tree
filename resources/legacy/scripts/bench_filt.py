"""Tạo /tmp/om-filt/ = copy CLI + graph.cjs với excludePatterns (lọc 'contributing editors').
Sau đó chờ K8 DONE rồi bench deep topK4 + excludePatterns.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
from pathlib import Path

REPO = Path("/workspace")
BANK = REPO / "corpora/swebok-v4/questions_bank_T7.jsonl"
HOME3 = Path("/tmp/benchhome3/.config/opencode")
REG3 = HOME3 / "cognee-memories.json"
LOG = REPO / "runs/t7/PLUGIN-filt-driver.log"
SRC_DIR = Path("/tmp/openmemory-main")
DST_DIR = Path("/tmp/om-filt")

SUB_ENV = {
    **os.environ,
    "HOME": "/tmp/benchhome3",
    "PATH": "/opt/node20/bin:" + os.environ.get("PATH", ""),
    "COGNEE_DEPS_DIR": "/tmp/lbugtest/node_modules",
    "COGNEE_MODELS_DIR": "/tmp/models",
}


def log(msg: str) -> None:
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


def build_filtered_cli() -> None:
    DST_DIR.mkdir(exist_ok=True)
    shutil.copy(SRC_DIR / "graph.cjs", DST_DIR / "graph.cjs")
    src = (SRC_DIR / "cognee-recall.cjs").read_text(encoding="utf-8")
    # thêm đọc cfg.excludePatterns cạnh excludeTables
    old1 = '  const excludeTables = Array.isArray(cfg.excludeTables) ? cfg.excludeTables : []'
    new1 = old1 + '\n  const excludePatterns = (Array.isArray(cfg.excludePatterns) ? cfg.excludePatterns : []).map((p) => String(p).toLowerCase())'
    assert old1 in src
    src = src.replace(old1, new1)
    # lọc trong vòng vector hits
    old2 = '        if (!text || text.length < 20) continue'
    new2 = old2 + '\n        if (excludePatterns.length && excludePatterns.some((p) => text.toLowerCase().includes(p))) continue'
    assert old2 in src, "anchor2 missing"
    src = src.replace(old2, new2)
    # lọc trong lexical scan docs
    old3 = '              if (text && text.length >= 20) docs.push({ text, doc, chunk, table })'
    new3 = '              if (text && text.length >= 20 && !(excludePatterns.length && excludePatterns.some((p) => text.toLowerCase().includes(p)))) docs.push({ text, doc, chunk, table })'
    assert old3 in src, "anchor3 missing"
    src = src.replace(old3, new3)
    (DST_DIR / "cognee-recall.cjs").write_text(src, encoding="utf-8")
    log(f"filtered CLI built at {DST_DIR}")


def set_registry() -> None:
    HOME3.mkdir(parents=True, exist_ok=True)
    reg = {
        "defaults": {"graphHops": 2, "topK": 4, "minScore": 0.3, "mode": "deep",
                     "excludeTables": ["SessionQAVector_text"],
                     "excludePatterns": ["contributing editors"]},
        "memories": {"swebok": {"dbDir": "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d",
                                "description": "SWEBOK v4 reference"}},
    }
    REG3.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    k8log = REPO / "runs/t7/PLUGIN-k8-driver.log"
    log("building filtered CLI ...")
    build_filtered_cli()
    log("waiting for K8 CONTROL DONE ...")
    while True:
        try:
            if "K8 CONTROL DONE" in k8log.read_text(encoding="utf-8"):
                break
        except FileNotFoundError:
            pass
        time.sleep(45)
    out_dir = REPO / "runs/t7" / "PLUGIN-v040-deep-noqa-filt"
    out_dir.mkdir(parents=True, exist_ok=True)
    results_path = out_dir / "results.jsonl"
    done: set[str] = set()
    if results_path.exists():
        for line in results_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    done.add(json.loads(line)["id"])
                except Exception:
                    pass
    questions = [json.loads(l) for l in BANK.read_text(encoding="utf-8").splitlines() if l.strip()]
    todo = [q for q in questions if q["id"] not in done]
    log(f"[deep-noqa-filt] todo={len(todo)}")
    if todo:
        set_registry()
        lat = []
        with results_path.open("a", encoding="utf-8") as sink:
            for i, q in enumerate(todo, 1):
                t0 = time.time()
                try:
                    p = subprocess.run(["node", str(DST_DIR / "cognee-recall.cjs"), "swebok", q["question"]],
                                       env=SUB_ENV, capture_output=True, text=True, timeout=180)
                    latency = round(time.time() - t0, 1)
                    answer = (p.stdout or "").strip()
                    row = {"id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                           "type": q.get("type", ""), "topology": q.get("topology", ""),
                           "mode": "PLUGIN-deep-noqa-filt", "retrieval": "plugin-deep-noqa-filt",
                           "latency_s": latency, "answer": answer[:2500]}
                    if p.returncode != 0 or not answer:
                        row["error"] = f"rc={p.returncode} stderr={p.stderr.strip()[-160:]}"
                    (out_dir / "raw").mkdir(exist_ok=True)
                    (out_dir / "raw" / f"{q['id']}.txt").write_text(p.stdout or "", encoding="utf-8")
                except subprocess.TimeoutExpired:
                    row = {"id": q["id"], "level": q.get("level", ""), "mode": "PLUGIN-deep-noqa-filt", "error": "timeout"}
                    latency = 180.0
                lat.append(latency)
                sink.write(json.dumps(row, ensure_ascii=False) + "\n")
                sink.flush()
                if i % 10 == 0 or i == len(todo):
                    s = sorted(lat)
                    log(f"[deep-noqa-filt] {i}/{len(todo)} p50={s[len(s)//2]}s")
        log(f"[deep-noqa-filt] DONE p50={sorted(lat)[len(lat)//2]}s")
    log("=== FILT CONTROL DONE ===")
