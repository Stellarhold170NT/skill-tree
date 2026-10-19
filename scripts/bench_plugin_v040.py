"""Bench plugin openmemory v0.4.0 trên full T7 bank (54 câu × 4 recall mode).

Protocol khớp t7_eval.py: answer = stdout block của plugin, cắt [:2500];
chấm bằng t7_element_v2.py (--glossary và không) => so với baseline cognee
(GRAPH_COMPLETION = 0.499 v2+glossary; hybrid-all = 0.532).

Mỗi câu = 1 process `node cognee-recall.cjs swebok <question>` — đúng UX plugin
(model e5 load mỗi lần như khi user gõ /swe). Registry được ghi mode trước mỗi
vòng; các cfg khác giữ nguyên (topK 4, minScore 0.3, graphHops 2).

Resume-safe: skip (mode, id) đã có trong results.jsonl. Log tự ghi vào
/workspace/runs/t7/PLUGIN-driver.log. Chạy nền: nohup + &.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

REPO = Path("/workspace")
BANK = REPO / "corpora/swebok-v4/questions_bank_T7.jsonl"
REG = Path("/root/.config/opencode/cognee-memories.json")
CLI = "/tmp/openmemory-main/cognee-recall.cjs"
LOG = REPO / "runs/t7/PLUGIN-driver.log"
MODES = ["deep", "hybrid", "semantic", "lexical"]
SUB_ENV = {
    **os.environ,
    "PATH": "/opt/node20/bin:" + os.environ.get("PATH", ""),
    "COGNEE_DEPS_DIR": "/tmp/lbugtest/node_modules",
    "COGNEE_MODELS_DIR": "/tmp/models",
    "COGNEE_RECALL_DEBUG": "",
}

BASE_DEFAULTS = {"graphHops": 2, "topK": 4, "minScore": 0.3}
BASE_MEMORY = {"dbDir": "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d",
               "description": "SWEBOK v4 reference"}


def log(msg: str) -> None:
    line = f"{time.strftime('%H:%M:%S')} {msg}"
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def set_registry(mode: str) -> None:
    reg = {"defaults": {**BASE_DEFAULTS, "mode": mode},
           "memories": {"swebok": dict(BASE_MEMORY)}}
    REG.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding="utf-8")


def run_mode(mode: str, questions: list[dict]) -> None:
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}"
    out_dir.mkdir(parents=True, exist_ok=True)
    results_path = out_dir / "results.jsonl"
    done: set[str] = set()
    if results_path.exists():
        for line in results_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                try:
                    done.add(json.loads(line)["id"])
                except Exception:
                    pass
    todo = [q for q in questions if q["id"] not in done]
    log(f"[{mode}] total={len(questions)} done={len(done)} todo={len(todo)}")
    if not todo:
        return
    set_registry(mode)
    lat: list[float] = []
    with results_path.open("a", encoding="utf-8") as sink:
        for i, q in enumerate(todo, 1):
            t0 = time.time()
            try:
                p = subprocess.run(
                    ["node", CLI, "swebok", q["question"]],
                    env=SUB_ENV, capture_output=True, text=True, timeout=180,
                )
                latency = round(time.time() - t0, 1)
                answer = (p.stdout or "").strip()
                row = {
                    "id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                    "type": q.get("type", ""), "topology": q.get("topology", ""),
                    "mode": f"PLUGIN-{mode}", "dataset": "swebok_v4_full_c5",
                    "retrieval": f"plugin-{mode}", "latency_s": latency,
                    "answer": answer[:2500],
                }
                if p.returncode != 0 or not answer:
                    row["error"] = f"rc={p.returncode} stderr={p.stderr.strip()[-160:]}"
                (out_dir / "raw").mkdir(exist_ok=True)
                (out_dir / "raw" / f"{q['id']}.txt").write_text(p.stdout or "", encoding="utf-8")
                if p.stderr.strip():
                    (out_dir / "raw" / f"{q['id']}.err").write_text(p.stderr, encoding="utf-8")
            except subprocess.TimeoutExpired:
                row = {"id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                       "type": q.get("type", ""), "topology": q.get("topology", ""),
                       "mode": f"PLUGIN-{mode}", "error": "timeout 180s"}
                latency = 180.0
            lat.append(latency)
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
            sink.flush()
            if i % 10 == 0 or i == len(todo):
                lat_sorted = sorted(lat)
                p50 = lat_sorted[len(lat_sorted) // 2]
                log(f"[{mode}] {i}/{len(todo)} last={q['id']} p50={p50}s")
    log(f"[{mode}] DONE n={len(lat)} p50={sorted(lat)[len(lat)//2]}s")


import time  # noqa: E402

if __name__ == "__main__":
    LOG.parent.mkdir(parents=True, exist_ok=True)
    log("=== bench plugin v0.4.0 START ===")
    questions = [json.loads(l) for l in BANK.read_text(encoding="utf-8").splitlines() if l.strip()]
    log(f"bank n={len(questions)}")
    t_start = time.time()
    for mode in MODES:
        run_mode(mode, questions)
    log(f"=== ALL DONE in {round((time.time()-t_start)/60, 1)} min ===")
