"""Control bench — exclude SessionQA (nhiễm bẩn: 54/54 câu bank có sẵn trong DB).

Chạy deep + hybrid với excludeTables=["SessionQAVector_text"], HOME riêng
(/tmp/benchhome) để không đụng registry của driver chính.
Chờ driver chính 'ALL DONE' rồi mới chạy (tranh CPU sẽ làm méo latency).
"""
from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path

REPO = Path("/workspace")
BANK = REPO / "corpora/swebok-v4/questions_bank_T7.jsonl"
HOME2 = Path("/tmp/benchhome/.config/opencode")
REG2 = HOME2 / "cognee-memories.json"
LOG = REPO / "runs/t7/PLUGIN-noqa-driver.log"
MODES = ["deep", "hybrid"]

SUB_ENV = {
    **os.environ,
    "HOME": "/tmp/benchhome",
    "PATH": "/opt/node20/bin:" + os.environ.get("PATH", ""),
    "COGNEE_DEPS_DIR": "/tmp/lbugtest/node_modules",
    "COGNEE_MODELS_DIR": "/tmp/models",
}


def log(msg: str) -> None:
    with LOG.open("a", encoding="utf-8") as f:
        f.write(f"{time.strftime('%H:%M:%S')} {msg}\n")


def set_registry(mode: str) -> None:
    HOME2.mkdir(parents=True, exist_ok=True)
    reg = {
        "defaults": {"graphHops": 2, "topK": 4, "minScore": 0.3, "mode": mode,
                     "excludeTables": ["SessionQAVector_text"]},
        "memories": {"swebok": {"dbDir": "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d",
                                "description": "SWEBOK v4 reference"}},
    }
    REG2.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding="utf-8")


def run_mode(mode: str, questions: list[dict]) -> None:
    out_dir = REPO / "runs/t7" / f"PLUGIN-v040-{mode}-noqa"
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
    log(f"[{mode}-noqa] todo={len(todo)}")
    if not todo:
        return
    set_registry(mode)
    lat: list[float] = []
    with results_path.open("a", encoding="utf-8") as sink:
        for i, q in enumerate(todo, 1):
            t0 = time.time()
            try:
                p = subprocess.run(["node", "/tmp/openmemory-main/cognee-recall.cjs", "swebok", q["question"]],
                                   env=SUB_ENV, capture_output=True, text=True, timeout=180)
                latency = round(time.time() - t0, 1)
                answer = (p.stdout or "").strip()
                row = {"id": q["id"], "level": q.get("level", ""), "ka": q.get("ka", ""),
                       "type": q.get("type", ""), "topology": q.get("topology", ""),
                       "mode": f"PLUGIN-{mode}-noqa", "retrieval": f"plugin-{mode}-noqa",
                       "latency_s": latency, "answer": answer[:2500]}
                if p.returncode != 0 or not answer:
                    row["error"] = f"rc={p.returncode} stderr={p.stderr.strip()[-160:]}"
                (out_dir / "raw").mkdir(exist_ok=True)
                (out_dir / "raw" / f"{q['id']}.txt").write_text(p.stdout or "", encoding="utf-8")
            except subprocess.TimeoutExpired:
                row = {"id": q["id"], "level": q.get("level", ""), "mode": f"PLUGIN-{mode}-noqa", "error": "timeout"}
                latency = 180.0
            lat.append(latency)
            sink.write(json.dumps(row, ensure_ascii=False) + "\n")
            sink.flush()
            if i % 10 == 0 or i == len(todo):
                s = sorted(lat)
                log(f"[{mode}-noqa] {i}/{len(todo)} p50={s[len(s)//2]}s")
    log(f"[{mode}-noqa] DONE p50={sorted(lat)[len(lat)//2]}s")


if __name__ == "__main__":
    drv_log = REPO / "runs/t7/PLUGIN-driver.log"
    log("waiting for main driver ALL DONE ...")
    while True:
        try:
            if "ALL DONE" in drv_log.read_text(encoding="utf-8"):
                break
        except FileNotFoundError:
            pass
        time.sleep(60)
    log("main driver finished — starting noqa control")
    questions = [json.loads(l) for l in BANK.read_text(encoding="utf-8").splitlines() if l.strip()]
    for mode in MODES:
        run_mode(mode, questions)
    log("=== NOQA CONTROL DONE ===")
