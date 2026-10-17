"""Chuỗi tự động các vòng retrieval-side Stage B (chạy sau R1, tuần tự)."""
import subprocess

ROUNDS = [
    ["--label", "R1b-chunks-k20", "--mode", "CHUNKS", "--top-k", "20"],
    ["--label", "R2-graph-context-ext", "--mode", "GRAPH_COMPLETION_CONTEXT_EXTENSION", "--top-k", "10"],
    ["--label", "R3-hybrid", "--mode", "HYBRID_COMPLETION", "--top-k", "10"],
    ["--label", "R4-chunks-structured", "--mode", "CHUNKS", "--top-k", "10", "--rag-structured"],
]

for r in ROUNDS:
    print("=== ROUND", r[1], flush=True)
    try:
        subprocess.run(["/opt/venv/bin/python", "src/skilltree/eval/stage_b.py"] + r,
                       cwd="/workspace", timeout=7200)
    except Exception as exc:  # noqa: BLE001
        print("ROUND FAILED", r, exc, flush=True)
print("ALL RETRIEVAL ROUNDS DONE", flush=True)
