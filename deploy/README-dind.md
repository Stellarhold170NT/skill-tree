# Deploy (DinD sandbox / VM) — SkillTree V1

Sự thật: compose chuẩn (`docker-compose.yml`) dùng bridge networks + DNS nhúng
127.0.0.11. Trong sandbox DinD (dind-sandbox:29) bridge của daemon KHÔNG hoạt
động ("network bridge not found" khi build, DNS 127.0.0.11 refused khi chạy) —
mọi service phải chạy **host networking** với cổng tách biệt.

## Cách dựng trong DinD (đã chạy thật 2026-11-01)

```sh
# 1) build từng service với network host (compose build cũng được qua override)
docker compose -f docker-compose.yml -f compose.build-net.yml build <svc>...
docker build --network host -t skill-tree/<svc>:0.1.0 ../services/<svc>   # cách 2

# 2) up theo host-net (DB 5433..5440, analytics 8111, latexml 8110)
docker compose -f docker-compose.yml -f compose.host-deploy.yml up -d

# 3) nếu compose CLI của môi trường không ổn định — dùng script docker run
#    trực tiếp + vòng lặp tự phục hồi (survive wrapper kill cycles):
nohup sh boot-loop.sh > /dev/null 2>&1 &
```

## Bảng cổng host-net

| Thành phần | Cổng | Ghi chú |
|---|---|---|
| api-gateway | 8000 | entry point duy nhất cho UI |
| opencase | 8101 | |
| quiz | 8102 | |
| class | 8103 | |
| **harness UI (DSH)** | **8104** | cloudflared trỏ vào đây |
| learner-model | 8105 | |
| assignment | 8106 | |
| document | 8107 | |
| auth | 8108 | user đầu tiên đăng ký = admin |
| rag | 8109 | |
| **analytics** | **8111** | dời từ 8104 vì trùng harness |
| **latexml** | **8110** | dời từ 8103 vì trùng class |
| postgres x8 | 5433–5440 | mỗi DB một cổng riêng |

## Lỗi hay gặp khi dựng (đã gặp thật)

1. **Compose/Docker CLI wrapper gián đoạn giữa chừng** (`fetch failed`,
   container ở trạng thái `Created`): dùng vòng lặp ensure — `docker start`
   nếu container tồn tại, `docker run` nếu chưa; chạy `nohup` nền. Script:
   `boot-loop.sh`.
2. **Ghost container giữ tên** sau lần `up` chết: đổi tên mới (hậu tố `-svc2`)
   thay vì cố `rm -f`.
3. **DB "database X does not exist"**: volume được init trước khi env
   POSTGRES_DB áp dụng → `docker exec <db> psql -U <user> -d postgres -p <port>
   -c "CREATE DATABASE <name>"` rồi `docker restart <svc>`.
4. **bwrap không chạy được trong DinD** (Can't mkdir /app/plugins/node_modules,
   `su` PAM kill session): entrypoint hỗ trợ chế độ **direct-DSH** — chạy
   `setpriv --reuid=1000 --regid=1000 --init-groups env HOME=/app/workspace
   bash -c 'exec dsh --profile web ...'` thay bwrap. Cần tạo sẵn
   `plugins/node_modules/@deepseek-ai/` (placeholder `.keep` trong repo) và
   symlink vendored packages vào `/app/node_modules/@deepseek-ai/` trong
   container:
   ```sh
   docker exec <harness> bash -c 'mkdir -p /app/node_modules/@deepseek-ai && \
     for d in /usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/*/; do \
     ln -sfn "$d" "/app/node_modules/@deepseek-ai/$(basename "$d")"; done'
   ```
5. **DSH UI trả 401**: mở `<origin>/?token=<launch-token>` — token nằm trong
   `/app/workspace/.dsh/.credentials.yaml` (client-connection/launch-token);
   browser nhận cookie session rồi dùng UI bình thường.
6. **latexml build lâu (~30–60 phút trên ar5ivist base ~5GB)**: chạy nền
   `nohup`, trong lúc đó dựng phần còn lại của stack (`--scale
   latexml-service=0` / bỏ service latexml khỏi vòng lặp) rồi
   `docker start latexml-svc` khi image xong.

## Disk cần để dựng toàn bộ (đo thật)

- Base images (postgres 16-alpine ×8 dùng chung, node 22, python slim): ~1.2GB
- 11 service images (skill-tree/*): ~1.9GB
- `latexml/ar5ivist:2512.17` base + image latexml: ~5.0GB
- Harness image (skilltree/harness): ~1.6GB
- Build cache: ~1.2GB
- Volumes (12 DB/upload/rag) + runtime: <1GB
- **Tổng working set: ~11–12GB** (khuyến nghị host ≥ 30GB free cho build cache
  + layer tạm + log)

## Smoke E2E nhanh sau khi dựng

```sh
curl -X POST http://127.0.0.1:8000/auth/auth/register -H 'content-type: application/json' \
  -d '{"username":"gv-demo","password":"Skilltree@2026","role":"teacher"}'
TOKEN=$(curl -X POST http://127.0.0.1:8000/auth/auth/login -H 'content-type: application/json' \
  -d '{"username":"gv-demo","password":"Skilltree@2026"}' | sed -E 's/.*"accessToken":"([^"]+)".*/\1/')
curl -X POST http://127.0.0.1:8000/class/classes -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"title":"Lop Demo V1 - Toan 12"}'
curl -X POST http://127.0.0.1:8000/rag/documents/upload -H "Authorization: Bearer $TOKEN" \
  -F file=@smoke/pythagoras.txt -F title=Pythagoras   # → 202 + jobId
curl http://127.0.0.1:8000/rag/jobs/<jobId> -H "Authorization: Bearer $TOKEN"   # → ready
curl -X POST http://127.0.0.1:8000/rag/ask -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"question":"Dinh ly Pythagoras noi gi?","documentIds":["<docId>"]}'   # → citations
```
