# Deployment Guide — Core Data Services (M1–M7)

Hướng dẫn dựng **7 microservice lõi** của đồ án *Graph RAG trong việc hỗ trợ theo dõi
và gợi ý người học*:

| Service | Chuẩn | Port | Vai trò |
|---------|-------|------|---------|
| `opencase-service` (M1) | 1EdTech CASE v1.1 | 8101 | Quản lý môn học, đồ thị khái niệm + tiên quyết (nguồn sự thật duy nhất) |
| `quiz-service` (M2) | 1EdTech QTI v3.0 | 8102 | Ngân hàng câu hỏi trắc nghiệm, gom đề, chấm điểm, outcomes theo học sinh |
| `class-service` (M6) | IMS OneRoster v1.2 (subset) | 8103 | Orgs → courses → classes → users → enrollments; cấp `sourcedId` ẩn danh |
| `analytics-service` (M4) | Caliper 1.2 (aligned) | 8104 | Sự kiện học tập append-only (Actor-Action-Object) |
| `learner-model-service` (M5) | Glicko-2 + Ebbinghaus | 8105 | Mastery, trạng thái rusty, frontier gợi ý, heatmap & teaching-plan |
| `assignment-service` (M7) | custom | 8106 | Giao bài nhóm Red/Rusty, sinh test ôn tập từ M2 |
| `document-service` (M3) | LRMI + LOM subset | 8107 | Tài liệu LRMI, chunks gắn concept, file upload |
| `latexml-service` (M3 render engine) | LaTeXML (ar5ivist) | 8110 | LaTeX → arxiv-style HTML (stateless, không DB) |
| `api-gateway` (M10) | custom | 8000 | Điểm vào duy nhất, định tuyến + rate-limit (stateless, không DB) |
| `auth-service` (M11) | JWT HS256 | 8108 | Tài khoản, cấp/verify JWT, role student/teacher/admin |
| `rag-service` | custom (SQLite FTS5 + STAIR-style chunking) | 8109 | Notebook RAG học sinh: upload → parse (latexml M3 cho LaTeX) → chunk cấu trúc → FTS5 → `/ask` kèm citation |

Bản đồ đầy đủ 13 module và hợp đồng interface: [`docs/MODULES.md`](../docs/MODULES.md).
Quyết định kiến trúc build-vs-reuse: [`docs/adr/0001-standards-based-service-decomposition.md`](../docs/adr/0001-standards-based-service-decomposition.md).

---

## 1. Kiến trúc triển khai

```
        host (developer / api-gateway sau này)
             │ :8101   │ :8102   │ :8103   │ :8104   │ :8105   │ :8106
     ┌───────▼──┐ ┌────▼─────┐ ┌─▼──────┐ ┌▼────────┐ ┌▼─────────┐ ┌▼───────────┐
     │ opencase │ │   quiz   │ │ class  │ │analytics│ │ learner- │ │ assignment │   FastAPI + uvicorn
     │ (CASE)   │ │  (QTI)   │ │(Roster)│ │(Caliper)│ │  model   │ │            │
     └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬────┘ └────┬─────┘ └─────┬──────┘
          │            │           │           │           │             │
     [own-db]     [own-db]     [own-db]     [own-db]    [own-db]      [own-db]      postgres:16-alpine
          └────────────┴───── platform-net ───────┴───────────┴─────────────┘
     DB: network riêng từng service · API: mạng chung `platform-net`
```

- Mỗi service **sở hữu DB riêng** (nguyên tắc số 1 trong MODULES.md), DB nằm trên network riêng.
- Các service **gọi API của nhau qua `platform-net`** (tham chiếu URI + HTTP, không bao giờ
  đụng DB của service khác): M5 đọc graph M1 + roster M6; M7 đọc heatmap M5 + item bank M2.
- SQL: dev/test dùng SQLite; compose dùng Postgres. Cùng code, đổi bằng `DATABASE_URL`.

## 2. Yêu cầu

- Docker Engine 24+ với Compose v2 (`docker compose version`)
- (dev) Python 3.11, hoặc dùng luôn Docker

## 3. Quickstart (Docker Compose)

```bash
cd deploy
cp .env.example .env          # chỉnh password/port nếu cần
docker compose up -d --build  # lần đầu build image ~1-2 phút
```

Kiểm tra sức khỏe:

```bash
curl -s http://localhost:8101/api/v1/health
# {"status":"ok","service":"opencase-service","version":"0.1.0"}
for p in 8101 8102 8103 8104 8105 8106 8107 8108; do curl -s http://localhost:$p/api/v1/health; echo; done
curl -s http://localhost:8000/health      # api-gateway
curl -s http://localhost:8110/health      # latexml-service (stateless)
curl -s http://localhost:8109/api/v1/health  # rag-service (sau khi merge `agent-v1-rag-service`)
```

Dừng / xóa dữ liệu:

```bash
docker compose down           # giữ volume dữ liệu
docker compose down -v        # xóa cả dữ liệu
```

## 4. Cấu hình (biến môi trường)

| Biến | Service | Mặc định (dev) | Ghi chú |
|------|---------|----------------|---------|
| `DATABASE_URL` | cả hai | `sqlite:///./data/<service>.db` | Compose set sang Postgres. Prefix driver: `sqlite:///` hoặc `postgresql+psycopg://` |
| `CASE_BASE_URI` | opencase | `http://localhost:8101/api/v1/case` | Tiền tố sinh URI `CFItem.identifier`. **Đặt URL công khai khi prod** — identifier đã cấp là bất biến |
| `OPENCASE_PORT` / `QUIZ_PORT` | compose | 8101 / 8102 | Port publish ra host |
| `OPENCASE_DB_PASSWORD` / `QUIZ_DB_PASSWORD` | compose | giá trị dev | Bắt buộc đổi khi triển khai thật |

## 5. Chạy không qua Docker (dev)

```bash
# Mỗi service tự đứng, ví dụ opencase:
cd services/opencase-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --port 8101 --reload

# test (cả hai service đều dùng pytest):
pytest -q
```

Swagger UI tự sinh: `http://localhost:8101/docs` và `http://localhost:8102/docs`.

## 6. Tour API nhanh (kịch bản 2 phút)

```bash
# 1) Tạo khung môn học + 3 khái niệm A→B→C
DOC=$(curl -s -X POST localhost:8101/api/v1/documents -H 'Content-Type: application/json' \
  -d '{"title":"CS101 — Nhập môn Lập trình","creator":"Bộ môn Khoa học Máy tính"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

A=$(curl -s -X POST localhost:8101/api/v1/documents/$DOC/items -H 'Content-Type: application/json' \
  -d '{"fullStatement":"Biến và kiểu dữ liệu","humanCodingScheme":"1.1"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
B=$(curl -s ... '{"fullStatement":"Cấu trúc điều khiển","humanCodingScheme":"1.2"}')
C=$(curl -s ... '{"fullStatement":"Hàm và đệ quy","humanCodingScheme":"1.3"}')

# 2) Khai báo tiên quyết A→B, B→C (tạo chu kỳ sẽ bị chặn 409 CYCLE_DETECTED)
curl -s -X POST localhost:8101/api/v1/documents/$DOC/associations -H 'Content-Type: application/json' \
  -d "{\"associationType\":\"isPrerequisiteOf\",\"originItemId\":\"$A\",\"destinationItemId\":\"$B\"}"

# 3) Hỏi: SV đã mastered A, có học được C chưa? → missing = [B]
curl -s -X POST localhost:8101/api/v1/documents/$DOC/check-prerequisites -H 'Content-Type: application/json' \
  -d "{\"targetItemId\":\"$C\",\"masteredItemIds\":[\"$A\"]}"

# 4) Quiz: tạo câu hỏi gắn vào khái niệm A (conceptUri = CFItem identifier)
curl -s -X POST localhost:8102/api/v1/items -H 'Content-Type: application/json' \
  -d '{"title":"Khởi tạo biến","prompt":"Kiểu của `x = 5/2` trong Python 3?","choices":[{"identifier":"A","text":"int"},{"identifier":"B","text":"float"}],"correctResponse":["B"],"conceptUri":"<CFItem-identifier-của-A>"}'

# 5) SV trả lời → chấm tự động + outcomes theo concept
curl -s -X POST localhost:8102/api/v1/attempts -H 'Content-Type: application/json' \
  -d "{\"itemId\":\"<item-id>\",\"candidateId\":\"stu-anon-001\",\"response\":[\"B\"]}"
curl -s localhost:8102/api/v1/candidates/stu-anon-001/outcomes
```

## 7. Chạy test & xác minh container

```bash
cd services/opencase-service && pytest -q     # 3 file test: documents, items, graph
cd services/quiz-service     && pytest -q     # 3 file test: items, qti, scoring
```

Bên trong DinD/CI (tùy chọn) kiểm tra compose config trước khi build:

```bash
docker compose -f deploy/docker-compose.yml config --quiet
```

## 8. Dữ liệu & vận hành

- **Persistence**: volume `opencase-data`, `quiz-data` (Postgres). SQLite dev nằm ở `services/*/data/` (đã gitignore).
- **Logs**: `docker compose logs -f opencase-service quiz-service`.
- **Backup**: `docker compose exec opencase-db pg_dump -U opencase opencase > opencase.sql` (tương tự quiz).
- **Không có state chia sẻ**: nâng cấp 1 service không ảnh hưởng service kia; schema migrate bằng
  Alembic khi cần (roadmap, hiện `create_all` khởi tạo lần đầu).

## 9. Đường ray tích hợp tiếp theo (không làm trong giai đoạn này)

1. `class-service` (M6) cấp `sourcedId` → dùng làm `candidateId` ở quiz.
2. `analytics-service` (M4) + event bus nhận Caliper events (quiz sẽ publish
   `AssessmentItemResponseSubmitted`).
3. `learner-model-service` (M5) đọc outcomes (M2) + Δt (M4) + đồ thị (M1) → Glicko-2,
   heatmap lớp, teaching plan.
4. `api-gateway` (M10) gom mọi service sau 1 cổng; Harness + Roadmap Viewer plugin (M12) gọi qua gateway.

Chi tiết interface từng module: `docs/MODULES.md` (mục 2, 4, 5).

## 10. Troubleshooting

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| 8101/8102 không lên, log `connection refused` tới db | DB chưa healthy | Chờ healthcheck (~5s) hoặc `docker compose ps` xem trạng thái |
| `sqlalchemy.exc.OperationalError` SQLite | thiếu thư mục `data/` | Service tự tạo; nếu mount volume lạ, kiểm tra `DATABASE_URL` |
| URI `CFItem.identifier` sai domain sau khi đổi `CASE_BASE_URI` | identifier sinh lúc create | `CASE_BASE_URI` chỉ áp dụng cho item tạo sau; cũ giữ nguyên (bất biến theo chuẩn) |
| Import QTI báo `PARSE_ERROR` | XML ngoài subset hỗ trợ | Xem `services/quiz-service/README.md` mục "QTI support" — chỉ choice interaction + match_correct |

---

## 11. SkillTree harness (M4, :8104) + plugin V1

Harness agent chạy riêng tại [`services/skill-tree-service/`](../services/skill-tree-service/)
(`docker compose up -d --build` trong thư mục đó; web UI :8104). Plugin V1 ghép qua
`plugins/patch.yml` + `plugins/patch.local.yml` (quy tắc 2 bước — KHÔNG `dsh plugin add` + `docker exec`):

| Plugin | Loại | Phụ thuộc | Vai trò |
|---|---|---|---|
| `skilltree-auth-ui` | UI | M11 :8108 (qua M10 :8000) | Đăng nhập/tạo tài khoản, JWT `skilltree.auth.v1` |
| `skilltree-class-ui` | UI | M6 :8103 (qua M10) | Quản lý lớp cá nhân giáo viên (OneRoster subset) |
| `skilltree-teacher-ui` | UI | M5/M6/M1/M4/M7 (qua M10) | Heatmap RAG, teaching plan, giao ôn tập, Class Ask |
| `skilltree-memory` | Tools | Cognee MCP :8021 | Memory per-student `student-<candidateId>` (M8) |
| `skilltree-graph-dashboard` | UI | M1 :8101, M9 :8107, M5 :8105 | Dashboard đồ thị khái niệm CASE |

Mỗi plugin có README chuẩn EGM (role/INPUT/OUTPUT/env/run/test/deps + ví dụ thật) ngay trong
thư mục plugin. `rag-service` (8109) thêm vào `deploy/docker-compose.yml` (service `rag-service`
+ volume `rag-data`) khi merge branch `agent-v1-rag-service`.
