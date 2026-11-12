#!/bin/bash
set -e

# Shared logs: mirror toàn bộ stdout/stderr container vào logs/container.log
# (host: ./logs, mount rw qua /app/data/logs) — xem được không cần docker logs.
mkdir -p /app/data/logs 2>/dev/null || true
if [ -w /app/data/logs ]; then
  exec > >(tee -a /app/data/logs/container.log) 2>&1
fi

# Cleanup child processes on exit
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

echo "=========================================================="
echo " Applying Security Hardening & Network Firewall Rules..."
echo "=========================================================="

# 1. Network Firewall:
# - Allow Loopback
iptables -F OUTPUT 2>/dev/null || true
iptables -A OUTPUT -o lo -j ACCEPT 2>/dev/null || true

# - Allow existing/established connections (essential for incoming Web UI responses to Docker Bridge)
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true

# - Block Cloud Metadata Endpoint (AWS/GCP/Azure)
iptables -A OUTPUT -d 169.254.169.254/32 -j DROP 2>/dev/null || true

# - Whitelist Gitea Internal Git Server & TestForge AI Broker (LAN port 9099)
iptables -A OUTPUT -d ${DEV_HOST}/32 -j ACCEPT 2>/dev/null || true
iptables -A OUTPUT -p tcp --dport 9099 -j ACCEPT 2>/dev/null || true

# - Block NEW outgoing scans / connections to private LAN subnets
iptables -A OUTPUT -m conntrack --ctstate NEW -d 10.0.0.0/8 -j DROP 2>/dev/null || true
iptables -A OUTPUT -m conntrack --ctstate NEW -d 192.168.0.0/16 -j DROP 2>/dev/null || true

# 2. Strict Permissions & Clear Cache:
mkdir -p /app/workspace /app/data
rm -rf /app/workspace/.dsh/profiles/web/cache 2>/dev/null || true
# NOTE (local Windows/Docker Desktop): `chown -R` qua bind-mount ổ E: cực chậm với
# workspace lớn (hàng chục nghìn file, kẹt 10+ phút ở state D) → chỉ chạy lần đầu,
# các boot sau skip qua marker. Ownership trên Docker Desktop do VM map, DSH vẫn chạy tốt.
if [ ! -f /app/data/.perm-marker ]; then
  chown -R node:node /app/workspace /app/data 2>/dev/null || true
  touch /app/data/.perm-marker 2>/dev/null || true
  chown node:node /app/data/.perm-marker 2>/dev/null || true
fi
chmod 755 /app/workspace /app/data 2>/dev/null || true
[ -f /app/workspace/.dsh/.credentials.yaml ] && chmod 600 /app/workspace/.dsh/.credentials.yaml 2>/dev/null || true

# 2b. Sync agent presets tu /app/plugins/agent-presets/ sang user preset root
# (<dshHome>/.agent-presets — noi DSH discovery quet; /app/plugins KHONG duoc doc
# lam preset root). Ghi de bang ban moi trong repo/commit; preset xoa khoi plugins/
# van con lai o workspace (discovery first-root-wins theo id).
if [ -d /app/plugins/agent-presets ]; then
  mkdir -p /app/workspace/.dsh/.agent-presets
  cp -r /app/plugins/agent-presets/. /app/workspace/.dsh/.agent-presets/ 2>/dev/null || true
  chown -R node:node /app/workspace/.dsh/.agent-presets 2>/dev/null || true
fi

# 3. Port Forwarder — DSH lang 3081 (UI) + 3092 (webhook listener). Chay both mode:
#    - bridge/deploy chuan: publish 8104:3080/8105:3082 → relay 3080→3081, 3082→3092
#    - host-net (DinD): UI vao thang 8104 → relay 8104→3081, 8105→3092
socat TCP-LISTEN:3080,fork,reuseaddr TCP:127.0.0.1:3081 &        # bridge mode entry
socat TCP-LISTEN:8104,fork,reuseaddr TCP:127.0.0.1:3081 &        # host-net UI entry
socat TCP-LISTEN:3082,fork,reuseaddr TCP:127.0.0.1:3092 &
socat TCP-LISTEN:8105,fork,reuseaddr TCP:127.0.0.1:3092 &

# 3b. Link cac plugin co client-half vao profile node_modules (bare-name rows)
#     de client-modules registry compose duoc bundle client (tab Settings...).
#     Chi link khi profile da ton tai (boot dau tien tao profile truoc).
PROFILE_NM="/app/workspace/.dsh/profiles/web/node_modules"
if [ -d "$PROFILE_NM" ]; then
  for pd in /app/plugins/*/; do
    [ -f "${pd}package.json" ] || continue
    ln -sfn "$pd" "$PROFILE_NM/$(basename "$pd")" 2>/dev/null || true
  done
fi

# 3c. Host-half plugins import @deepseek-ai/* (dsh-tools, dsh-credentials...).
#     /app/plugins co the ro-bind → symlink thay vao /app/node_modules (RW)
#     de Node ESM resolve tu /app/plugins/<p>/lib/ di len /app/node_modules.
#     (Kenh bwrap van ro-bind giong nhu cu; direct mode can nhom symlink nay.)
VENDORED_NM="/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai"
if [ -d "$VENDORED_NM" ]; then
  mkdir -p /app/node_modules/@deepseek-ai 2>/dev/null || true
  for vd in "$VENDORED_NM"/*/; do
    [ -d "$vd" ] || continue
    ln -sfn "$vd" "/app/node_modules/@deepseek-ai/$(basename "$vd")" 2>/dev/null || true
  done
fi

echo "=========================================================="
echo " Starting DSH (launch mode: ${DSH_LAUNCH:-bwrap})"
echo " User: node (UID 1000) | Session: isolated"
echo "=========================================================="

# 4. Watchdog: Auto-reload DSH when a plugin is installed from Web UI (package.json modified)
PKG_FILE="/app/workspace/.dsh/profiles/web/package.json"
(
  LAST_MTIME=$(stat -c %Y "$PKG_FILE" 2>/dev/null || echo 0)
  while true; do
    sleep 2
    if [ -f "$PKG_FILE" ]; then
      CURR_MTIME=$(stat -c %Y "$PKG_FILE" 2>/dev/null || echo 0)
      if [ "$CURR_MTIME" != "$LAST_MTIME" ] && [ "$LAST_MTIME" != "0" ]; then
        echo "[watchdog] Detected plugin install in profile package.json! Auto-reloading DSH..."
        LAST_MTIME=$CURR_MTIME
        pkill -f "dsh --profile" 2>/dev/null || pkill -f "bwrap" 2>/dev/null || true
      else
        LAST_MTIME=$CURR_MTIME
      fi
    fi
  done
) &

# 5. Launch DSH with self-healing while-loop (keeps container alive & supports auto-reload)
# Giu stdin mo vinh vien (FIFO co writer khong bao gio tat) -> dsh khong thay EOF
# DSH_LAUNCH=bwrap (mac dinh, hardened) | direct — cho DinD/VM noi bwrap khong chay duoc:
#   setpriv (khong PAM, su bi "Session terminated") + HOME=/app/workspace.
#   Da chay that thanh cong 2026-11-01 (sandbox sess-40e2cf5b).
rm -f /tmp/dsh-stdin; mkfifo /tmp/dsh-stdin
sleep infinity > /tmp/dsh-stdin &

TRUSTED_HOSTS_DYNAMIC="localhost:3080 127.0.0.1:3080 localhost:3081 127.0.0.1:3081 127.0.0.1 localhost"
[ -n "${DEV_HOST:-}" ] && TRUSTED_HOSTS_DYNAMIC="$TRUSTED_HOSTS_DYNAMIC ${DEV_HOST}:3080 ${DEV_HOST}:3082"
[ -n "${EDGE_HOST:-}" ] && TRUSTED_HOSTS_DYNAMIC="$TRUSTED_HOSTS_DYNAMIC ${EDGE_HOST}:9982"
[ -n "${EXTRA_TRUSTED_HOSTS:-}" ] && TRUSTED_HOSTS_DYNAMIC="$TRUSTED_HOSTS_DYNAMIC ${EXTRA_TRUSTED_HOSTS}"

while true; do
  echo "=========================================================="
  echo " Starting DSH (launch mode: ${DSH_LAUNCH:-bwrap})"
  echo "=========================================================="
  if [ "${DSH_LAUNCH:-bwrap}" = "direct" ]; then
    # Direct: khong bwrap (DinD chi ap dung isolate o lop container/ngoai).
    setpriv --reuid=1000 --regid=1000 --init-groups \
      env HOME=/app/workspace bash -c \
      "exec 0</tmp/dsh-stdin; exec dsh --profile web --patch /app/plugins/patch.yml --port 3081 --no-open --trusted-host $TRUSTED_HOSTS_DYNAMIC" || true
  else
    # bwrap: hardened sandbox nhu cu.
    su -s /bin/bash node -c "exec 0</tmp/dsh-stdin;
    exec bwrap \
      --ro-bind /usr /usr \
      --ro-bind /lib /lib \
      --ro-bind-try /lib64 /lib64 \
      --dev-bind-try /dev/null /dev/null \
      --dev-bind-try /dev/urandom /dev/urandom \
      --ro-bind-try /proc /proc \
      --ro-bind /bin /bin \
      --ro-bind /sbin /sbin \
      --ro-bind-try /etc/alternatives /etc/alternatives \
      --ro-bind /etc/resolv.conf /etc/resolv.conf \
      --ro-bind /etc/ssl /etc/ssl \
      --ro-bind /etc/hosts /etc/hosts \
      --ro-bind /etc/passwd /etc/passwd \
      --ro-bind /etc/group /etc/group \
      --ro-bind /usr/local/lib/node_modules /app/node_modules \
      --ro-bind /usr/local/lib/node_modules /node_modules \
      --setenv DSH_GITHUB_WEBHOOK_SECRET '${DSH_GITHUB_WEBHOOK_SECRET}' \
      --dir /tmp --tmpfs /tmp \
      --ro-bind-try /app/plugins /app/plugins \
      --ro-bind-try /usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai /app/plugins/node_modules/@deepseek-ai \
      --bind /app/data /app/data \
      --bind /app/workspace /app/workspace \
      --chdir /app/workspace \
      --setenv HOME /app/workspace \
      --setenv PATH '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
      --setenv NODE_PATH '/app/workspace/.dsh/profiles/web/node_modules:/usr/local/lib/node_modules' \
      --unshare-user-try \
      --unshare-pid \
      --unshare-uts \
      --unshare-ipc \
      --new-session \
      --cap-drop ALL \
      --die-with-parent \
      dsh --profile web --patch /app/plugins/patch.yml --port 3081 --no-open --trusted-host $TRUSTED_HOSTS_DYNAMIC" || true
  fi

  echo "[entrypoint] DSH exited. Restarting sandbox in 1 second..."
  sleep 1
done
