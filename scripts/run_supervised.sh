#!/usr/bin/env bash
# run_supervised.sh — supervisor chịu lỗi cho build_memory.py (cognify chạy nhiều giờ).
#
# Bài học C5b 2026-10-17: process chết 23:31 vì gateway ServiceUnavailableError,
# không ai restart, chết lặng tới khi người ta kiểm tra thủ công. Supervisor này
# khóa lại khoảng trống đó ở tầng process:
#
#   1. Preflight gateway: trước MỖI lần start, kiểm tra ĐÚNG path build cần
#      (POST /chat/completions 1-token qua từng key). Chỉ start khi có key trả
#      2xx/429. Poll mỗi PREFLIGHT_POLL giây, tối đa PREFLIGHT_MAX.
#   2. Chạy build_memory.py. Exit 0 = thành công → ghi ledger, thoát.
#   3. Chết (rc != 0) → backoff 300s × 2^k cap 30 phút, restart tối đa
#      MAX_RESTARTS lần. Preset dùng incremental_loading=true nên mỗi lần chạy
#      TIẾP TỤC phần chunk chưa xong, không build lại từ đầu.
#   4. Watchdog treo: STALL_SEC liên tiếp (1) không LLM call nào
#      (runs/<id>/llm_activity.json cũ hơn STALL_SEC) VÀ (2) không file nào dưới
#      .cognee_system/databases được ghi → kill process để vòng lặp restart.
#      (Case chết im không traceback như C5b.)
#
# Dùng (cwd tùy ý, script tự cd về repo root):
#   nohup bash scripts/run_supervised.sh c5_full_book run-00-c5full \
#     > /dev/null 2>&1 &
#
# Env tùy chọn: MAX_RESTARTS=8 STALL_SEC=5400 PREFLIGHT_MAX=43200 PREFLIGHT_POLL=300

set -u
cd "$(dirname "$0")/.." || exit 1   # repo root

PRESET="${1:?Dùng: run_supervised.sh <preset> <run-id>}"
RUN_ID="${2:?Dùng: run_supervised.sh <preset> <run-id>}"
MAX_RESTARTS="${MAX_RESTARTS:-8}"
STALL_SEC="${STALL_SEC:-5400}"            # 90 phút không có tín hiệu = treo
PREFLIGHT_MAX="${PREFLIGHT_MAX:-43200}"   # chờ gateway hồi phục tối đa 12h (outage qua đêm)
PREFLIGHT_POLL="${PREFLIGHT_POLL:-300}"

RUN_DIR="runs/${RUN_ID}"
SUPERVISOR_LOG="${RUN_DIR}/supervisor.log"
ACT_FILE="${RUN_DIR}/llm_activity.json"
PYTHON_STDOUT="${RUN_DIR}/python-stdout.log"
LOCK_DIR="/tmp/skilltree-supervisor-${RUN_ID}"
PY=/opt/venv/bin/python

mkdir -p "$RUN_DIR"
log() { echo "[supervisor $(date -Is)] $*" | tee -a "$SUPERVISOR_LOG"; }

# Singleton: chỉ 1 supervisor cho 1 run-id (mkdir là atomic; flock có thể thiếu).
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "supervisor khác đang chạy cho ${RUN_ID} (lock ${LOCK_DIR}) — thoát"
  exit 2
fi
PID=""
cleanup() {
  [ -n "$PID" ] && kill "$PID" 2>/dev/null
  rmdir "$LOCK_DIR" 2>/dev/null
}
# TERM/INT: dọn dẹp rồi THOẬT (bài học: trap không exit → supervisor "chết giả",
# tiếp tục vòng lặp và đẻ process build đè lên orphan).
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM
trap cleanup EXIT

# Nạp .env để có LLM_ENDPOINT/LLM_API_KEY cho preflight (python build tự nạp lại).
set -a; [ -f .env ] && . ./.env; set +a
if [ -z "${LLM_ENDPOINT:-}" ]; then
  log "LLM_ENDPOINT thiếu trong .env — không preflight được"
  exit 3
fi

# Preflight ĐÚNG path mà build cần: POST /chat/completions 1-token qua TỪNG key,
# coi gateway HEALTHY chỉ khi có key trả 2xx (hoặc 429 — auth OK, mới bị throttle).
# GET /models trên gateway này treo vĩnh viễn → KHÔNG dùng làm health check.
gw_alive() {
  $PY - <<'PYEOF'
import os, sys, json, urllib.error, urllib.request
base = os.environ.get("LLM_ENDPOINT", "").rstrip("/")
model = os.environ.get("LLM_MODEL", "gpt-4o-mini")
payload = json.dumps({"model": model,
                      "messages": [{"role": "user", "content": "ping"}],
                      "max_tokens": 1}).encode()
keys = [k for k in (os.environ.get("LLM_API_KEY", ""),
                    os.environ.get("LLM_API_KEY_2", ""),
                    os.environ.get("LLM_API_KEY_3", "")) if k]
notes = []
for i, key in enumerate(keys, 1):
    req = urllib.request.Request(
        base + "/chat/completions", data=payload,
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=75) as r:
            print(f"HEALTHY key#{i} HTTP {r.status}")
            sys.exit(0)
    except urllib.error.HTTPError as e:
        notes.append(f"key#{i}=HTTP{e.code}")
        if e.code == 429:
            print(f"HEALTHY key#{i} HTTP 429 (throttle nhưng auth OK)")
            sys.exit(0)
    except Exception as e:
        notes.append(f"key#{i}={type(e).__name__}")
print("SICK |", "; ".join(notes) if notes else "không có key nào trong .env")
sys.exit(1)
PYEOF
}

wait_gateway() {
  local deadline=$(( $(date +%s) + PREFLIGHT_MAX )) out
  while :; do
    if out=$(gw_alive 2>&1); then
      log "preflight OK: ${out:0:160}"
      return 0
    fi
    echo "[$(date -Is)] $out" >> "$RUN_DIR/preflight.log"
    if [ "$(date +%s)" -ge "$deadline" ]; then return 1; fi
    log "preflight: gateway CHƯA healthy (${out:0:160}) — thử lại sau ${PREFLIGHT_POLL}s"
    sleep "$PREFLIGHT_POLL"
  done
}

attempt=0
while :; do
  attempt=$((attempt + 1))

  if ! wait_gateway; then
    log "gateway không hồi phục sau ${PREFLIGHT_MAX}s — bỏ cuộc (attempt ${attempt})"
    exit 4
  fi

  log "=== START attempt=${attempt}/${MAX_RESTARTS} preset=${PRESET} run=${RUN_ID} ==="
  rm -f "$ACT_FILE"
  SKILLTREE_ATTEMPT="$attempt" \
    $PY src/skilltree/ingest/build_memory.py --preset "$PRESET" --run-id "$RUN_ID" \
    >> "$PYTHON_STDOUT" 2>&1 &
  PID=$!

  # Watchdog treo: chỉ kill khi CẢ hai tín hiệu đều câm (LLM call + db write).
  (
    while kill -0 "$PID" 2>/dev/null; do
      sleep 300
      kill -0 "$PID" 2>/dev/null || exit 0
      act=$(stat -c %Y "$ACT_FILE" 2>/dev/null || echo 0)
      now=$(date +%s)
      if [ $((now - act)) -gt "$STALL_SEC" ]; then
        recent=$(find .cognee_system/databases -type f -newermt "@$((now - STALL_SEC))" 2>/dev/null | head -1)
        if [ -z "$recent" ]; then
          log "WATCHDOG: ${STALL_SEC}s không LLM call + không db write → kill pid ${PID}"
          kill -TERM "$PID" 2>/dev/null
          sleep 30
          kill -KILL "$PID" 2>/dev/null
          exit 0
        fi
      fi
    done
  ) &
  WATCHDOG=$!

  wait "$PID"
  RC=$?
  kill "$WATCHDOG" 2>/dev/null
  wait "$WATCHDOG" 2>/dev/null
  PID=""

  if [ "$RC" -eq 0 ]; then
    log "=== SUCCESS sau attempt=${attempt} ==="
    echo "{\"run_id\":\"${RUN_ID}\",\"kind\":\"build\",\"result\":\"success\",\"attempts\":${attempt},\"ts\":\"$(date -Is)\"}" >> runs/ledger.jsonl
    exit 0
  fi

  if [ "$attempt" -ge "$MAX_RESTARTS" ]; then
    log "=== FAILURE: hết ${MAX_RESTARTS} attempts, rc cuối=${RC} ==="
    echo "{\"run_id\":\"${RUN_ID}\",\"kind\":\"build\",\"result\":\"failure\",\"attempts\":${attempt},\"rc\":${RC},\"ts\":\"$(date -Is)\"}" >> runs/ledger.jsonl
    exit 1
  fi

  DELAY=$(( 300 * (2 ** (attempt - 1)) ))
  [ "$DELAY" -gt 1800 ] && DELAY=1800
  log "rc=${RC} — restart sau ${DELAY}s (còn $((MAX_RESTARTS - attempt)) lần)"
  sleep "$DELAY"
done
