#!/usr/bin/env bash
# F1 Transfer Check — chạy NGAY khi F0 full-book build xong (sess-ffcbbd99).
# 24 câu stress trên memory swebok_v4_full, mode GRAPH_COMPLETION (champion).
# So với baseline S2: B1 0.456/0.322/hop~0.73 (ADR 0003).
set -e
cd /workspace
export OMP_NUM_THREADS=2 ORT_INTRA_OP_NUM_THREADS=2
/opt/venv/bin/python src/skilltree/agent/analyze_graph.py --dataset swebok_v4_full \
  2>&1 | tail -5
/opt/venv/bin/python src/skilltree/agent/dump_graph.py --dataset swebok_v4_full 2>&1 | tail -3
cp runs/graph_probe/structure_swebok_v4_full.json reports/evidence/structure-full.json \
  2>/dev/null || true
echo "=== NEXT: stage_b F1 ==="
SKILLTREE_QUESTIONS=corpora/swebok-v4/questions_stress.jsonl \
  /opt/venv/bin/python src/skilltree/eval/stage_b.py --label F1 --mode GRAPH_COMPLETION \
  --dataset swebok_v4_full 2>&1 | tail -8
cp runs/stage_b/F1/* reports/evidence/ 2>/dev/null || true
echo "=== F1 DONE — copy results vào reports/evidence rồi commit ==="
