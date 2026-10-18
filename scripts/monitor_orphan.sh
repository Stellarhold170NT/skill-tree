#!/usr/bin/env bash
# monitor_orphan.sh — trống một build process đang chạy NGOÀI supervisor (orphan,
# sinh ra trước khi supervisor triển khai hoặc sau khi supervisor bị kill).
#   - Build xong (thấy "=== Run <run_id> DONE" trong ingest.log) → thoát.
#   - Build chết chưa DONE → bàn giao cho run_supervised.sh để preflight + resume
#     (singleton lock trong build_memory.py chặn đè nhau nếu còn process sống).
#
# Dùng: nohup bash scripts/monitor_orphan.sh <pid> <run-id> <preset> > /dev/null 2>&1 &

set -u
WATCH_PID="${1:?Dùng: monitor_orphan.sh <pid> <run-id> <preset>}"
RUN_ID="${2:?run-id}"
PRESET="${3:-c5_full_book}"
cd "$(dirname "$0")/.." || exit 1

RUN_DIR="runs/${RUN_ID}"
mkdir -p "$RUN_DIR"
log() { echo "[monitor $(date -Is)] $*" | tee -a "$RUN_DIR/supervisor.log"; }

any_build_alive() {
  for p in /proc/[0-9]*; do
    c=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null)
    case "$c" in /opt/venv/bin/python*build_memory*) return 0 ;; esac
  done
  return 1
}

log "bắt đầu trông pid=${WATCH_PID} (run=${RUN_ID})"
while kill -0 "$WATCH_PID" 2>/dev/null; do
  sleep 300
done
log "pid ${WATCH_PID} đã kết thúc — kiểm tra kết quả"
sleep 5

if grep -q "Run ${RUN_ID} DONE" "$RUN_DIR/ingest.log" 2>/dev/null; then
  log "build DONE — thoát"
  exit 0
fi

# WATCH_PID chết nhưng có thể còn process build khác (con sinh thế) — chờ hết.
if any_build_alive; then
  log "còn process build khác đang chạy — chờ tiếp"
  while any_build_alive; do sleep 300; done
  if grep -q "Run ${RUN_ID} DONE" "$RUN_DIR/ingest.log" 2>/dev/null; then
    log "build DONE — thoát"
    exit 0
  fi
fi

log "build chết chưa DONE — bàn giao supervisor (preflight + resume)"
exec bash scripts/run_supervised.sh "$PRESET" "$RUN_ID"
