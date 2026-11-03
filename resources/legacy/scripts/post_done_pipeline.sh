#!/usr/bin/env bash
# Pipeline tự động sau khi C5b build DONE (chạy daemon trong container).
# Đợi dòng "=== Run run-00-c5full DONE" rồi lần lượt: analyze → transfer check →
# audit → ledger → tổng hợp RUN-FINAL-STATUS.json. Kết quả nằm trong container
# (sống đến TTL) — agent sẽ sync về VFS ở lượt liên hệ kế.
set -u
RUN_ID="run-00-c5full"
RUN_DIR="/workspace/runs/${RUN_ID}"
LOG="$RUN_DIR/post_done.log"
PY=/opt/venv/bin/python
log() { echo "[$(date -Is)] $*" | tee -a "$LOG"; }

log "post_done_pipeline start — chờ DONE marker"
for i in $(seq 1 1200); do   # tối đa 100 giờ
  if grep -q "=== Run ${RUN_ID} DONE" "$RUN_DIR/ingest.log" 2>/dev/null; then
    log "thấy DONE marker sau $i vòng"
    break
  fi
  # nếu build chết KHÔNG có DONE → supervisor sẽ restart; chỉ cần tiếp tục chờ
  sleep 300
done

log "bước 1/5: analyze_graph"
$PY /workspace/src/skilltree/eval/analyze_graph.py --dataset swebok_v4_full_c5 \
  > "$RUN_DIR/analyze-full.out" 2>&1 || log "analyze_graph FAIL (rc=$?)"

log "bước 2/5: dump_graph"
$PY /workspace/src/skilltree/agent/dump_graph.py --dataset swebok_v4_full_c5 \
  > "$RUN_DIR/dump-full.out" 2>&1 || log "dump_graph FAIL (rc=$?)"

log "bước 3/5: transfer check 24 câu trên graph full"
$PY /workspace/src/skilltree/eval/stage_b.py --label F1-full-c5 \
  --mode GRAPH_COMPLETION --dataset swebok_v4_full_c5 \
  > "$RUN_DIR/stage-b-full.out" 2>&1 || log "stage_b FAIL (rc=$?)"

log "bước 4/5: audit precision"
$PY /workspace/src/skilltree/eval/c5_audit_edges.py --dataset swebok_v4_full_c5 \
  > "$RUN_DIR/audit-full.out" 2>&1 || log "audit FAIL (rc=$?)"

log "bước 5/5: tổng hợp trạng thái"
$PY - <<'PYEOF' | tee -a "$LOG"
import json, glob, os
run_dir = "/workspace/runs/run-00-c5full"
status = {"run_id": "run-00-c5full", "done_marker": True}
# stage_b ghi results.jsonl + ledger; kéo summary từ file mới nhất của label F1-full-c5
for pat, key in [("runs/stage_b/F1-full-c5/results.jsonl", "transfer_results"),
                 ("runs/run-00-c5full/ingest_metrics.json", "build_metrics")]:
    p = "/workspace/" + pat
    try:
        lines = [json.loads(l) for l in open(p) if l.strip()]
        if key == "transfer_results":
            corr = [r.get("correctness") for r in lines if "correctness" in r]
            elems = [r.get("element_completeness") for r in lines if "element_completeness" in r]
            if corr:
                status["transfer"] = {"n": len(corr), "corr_mean": round(sum(corr)/len(corr), 3),
                                      "elems_mean": round(sum(elems)/len(elems), 3) if elems else None}
        else:
            status["build"] = lines[-1] if lines else None
    except Exception as e:
        status[key] = f"ERR {e}"
json.dump(status, open("/workspace/runs/run-00-c5full/RUN-FINAL-STATUS.json", "w"), indent=2, ensure_ascii=False)
print("RUN-FINAL-STATUS.json written")
PYEOF
log "post_done_pipeline DONE — agent sync VFS ở lượt liên hệ kế"
