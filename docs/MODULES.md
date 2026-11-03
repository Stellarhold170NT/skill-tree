# Module Decomposition — Graph RAG Learning Platform

> Mục tiêu tổng: **Ứng dụng Graph RAG hỗ trợ theo dõi và gợi ý người học** — lộ trình học từ
> syllabus (tài sản số xây 1 lần, dùng nhiều học kỳ), chọn khái niệm kế tiếp theo tiên quyết,
> learner model chuẩn công nghiệp (Glicko-2/IRT thay công thức tự chế), phát hiện quên
> (Ebbinghaus), báo cáo lớp (heatmap, teaching plan), can thiệp trúng đích.
>
> Tài liệu này **phân rã hệ thống thành các module độc lập, phát triển song song được**,
> chuẩn hóa interface trước, tối ưu sau. Mỗi module là một khối lắp ghép (Lego block).

---

## 1. Nguyên tắc thiết kế (áp dụng cho mọi module)

| # | Nguyên tắc | Ý nghĩa thực thi |
|---|------------|------------------|
| 1 | **Database riêng** | Mỗi service sở hữu DB của mình. Không service nào SELECT chéo DB service khác. |
| 2 | **Liên kết bằng URI** | Tham chiếu liên service qua URI/identifier (vd: `conceptUri` của quiz trỏ về `CFItem.identifier` của opencase). Không FK vật lý, không HTTP gọi ngược từ trong service. |
| 3 | **REST + JSON, versioned** | Mọi endpoint dưới prefix `/api/v1`. GATEWAY miễn trừ (nó là điểm vào). |
| 4 | **Error envelope thống nhất** | Mọi lỗi trả `{"error": {"code": "<MACHINE_CODE>", "message": "...", "details": {...}}}`. |
| 5 | **Health endpoint** | `GET /health` → `{"status":"ok","service":"<name>","version":"x.y.z"}`. |
| 6 | **ID & thời gian** | ID: UUIDv4 (hex). Thời gian: ISO-8601 UTC. JSON field: camelCase. |
| 7 | **Không dữ liệu cá nhân ở tầng hành vi** | Dữ liệu hành vi (attempt, event) dùng `candidateId`/`sourcedId` ẩn danh; danh tính chỉ nằm ở profile service. |
| 8 | **Event-first khi ghép** | Khi cần đồng bộ, ưu tiên phát sự kiện (envelope Caliper-aligned, mục 5) hơn là polling. |
| 9 | **Mỗi module có bộ test + README** | Không ghép được module thiếu test. README tiếng Anh bắt buộc. |

---

## 2. Danh sách module

Trạng thái: ✅ = đã dựng sẵn trong repo này · 🔜 = đã định nghĩa interface, chưa code

### Lớp chuẩn dữ liệu (Data Standards)

#### M1. `opencase-service` — Quản lý môn học & đồ thị khái niệm ✅
- **Chuẩn**: 1EdTech CASE v1.1 (subset: CFDocument, CFItem, CFAssociation).
- **Vai trò**: Nguồn sự thật duy nhất của đồ thị khái niệm (asset của Hội đồng bộ môn).
  `isPrerequisiteOf` → DAG mở khóa; `isPartOf` → phân cấp chương/bài; `exactMatchOf` → liên thông khung.
- **Interface cốt lõi**:
  - `POST/GET /api/v1/documents`, `POST /api/v1/documents/{id}/items`, `POST /api/v1/documents/{id}/associations`
  - `GET /api/v1/documents/{id}/package` → CASE JSON-LD export
  - `GET /api/v1/documents/{id}/graph` → `{nodes, edges}` (cho Roadmap Viewer)
  - `GET /api/v1/documents/{id}/topological-order` → thứ tự học an toàn
  - `POST /api/v1/documents/{id}/check-prerequisites` → `{unlocked, missingPrerequisites}` (chọn khái niệm kế tiếp)
- **Port**: 8101 · **Repo path**: `services/opencase-service/`

#### M2. `quiz-service` — Ngân hàng câu hỏi & chấm điểm ✅
- **Chuẩn**: 1EdTech QTI v3.0 (subset: assessment-item choice interaction + match_correct response processing).
- **Vai trò**: Item bank + assembly đề thi + ghi nhận attempt theo candidate ẩn danh.
  Input chuẩn cho learner model (M5) và adaptive test.
- **Interface cốt lõi**:
  - `POST/GET /api/v1/items` (filter theo `conceptUri`), `GET /api/v1/items/{id}/qti` (XML), `POST /api/v1/items/import-qti`
  - `POST /api/v1/tests` (gom đề theo sections)
  - `POST /api/v1/attempts`, `POST /api/v1/attempts/bulk` (chấm match_correct)
  - `GET /api/v1/candidates/{id}/outcomes` (aggregation theo concept)
- **Port**: 8102 · **Repo path**: `services/quiz-service/`

### Lớp học liệu & tri thức

#### M3. `document-service` — Lưu trữ & trích xuất tài liệu ✅
- **Chuẩn**: LRMI (W3C/Schema.org) metadata gắn nhãn chunk; IEEE LOM subset.
- **Interface**: `POST /api/v1/documents` (LRMI fields, `typicalLearningTime` ISO-8601 duration),
  `POST /documents/{id}/upload` (file + SHA-256), `POST /documents/{id}/chunks`, `GET /documents/{id}/chunks?alignmentType=`,
  `POST /chunks/{id}/alignments` (chunk ↔ conceptUri, alignmentType ∈ teaches|assesses|requires|summarizes).
- **Sinh ra**: chunk đã gắn nhãn → đầu vào cho Cognee (M8) và Open Notebook (M13).
- **Render engine (đã dựng sớm)**: [`services/latexml-service/`](../services/latexml-service/)
  (publish :8110) — LaTeX → ar5iv-style HTML qua ar5ivist/LaTeXML, cùng pipeline arXiv
  dùng cho HTML papers. Stateless, không DB; đọc thêm README của service.

#### M8. `cognee-memory-gateway` — Bộ nhớ/tri thức agent 🔜
- **Chuẩn**: Cognee framework (graph + vector), ontology từ CASE.
- **Interface**: `POST /api/v1/students/{sourcedId}/ingest` (chunk + mastery trace), `POST /api/v1/students/{sourcedId}/ask`,
  `POST /api/v1/class/ask` (multi-dataset recall), dataset strategy: `student_{sourcedId}`, `class_graph`, `class_interventions`.
- **Đặc thù**: 1 dataset cô lập/sinh viên; tri thức tiến hóa theo thời gian (append mastery traces).

#### M13. `open-notebook` — Hỏi đáp tài liệu 🔜
- Reuse Open Notebook (RAG vector + full-text, SurrealDB) qua REST API. Không tự viết lại.

### Lớp học tập & đo lường

#### M4. `analytics-service` — Sự kiện học tập ✅
- **Chuẩn**: Caliper Analytics v1.2 (Actor-Action-Object, append-only).
- **Interface**: `POST /api/v1/events` (batch), `GET /api/v1/events?actor=&object=&since=`,
  `GET /api/v1/concepts/{uri}/last-interaction` (Δt cho mô hình quên).
- **Profile**: AssessmentEvent (submit), ViewEvent (đọc tài liệu), ToolUseEvent.

#### M5. `learner-model-service` — Năng lực & gợi ý ✅ (trái tim hệ thống)
- **Chuẩn**: Glicko-2 (thay công thức `w += 0.35(1-w)`); Ebbinghaus `R(t)=e^{-Δt/S}` cho trạng thái Rusty;
  frontier = khái niệm có mọi tiên quyết green (đọc M1 `GET /documents/{id}/graph`).
- **Interface**:
  - `GET /api/v1/students/{sourcedId}/mastery` → danh sách {conceptUri, rating, RD, mastery, state: red|amber|green|rusty}
  - `POST /api/v1/students/{sourcedId}/update` + `/update/bulk` (sau mỗi attempt — do event bus trigger)
  - `GET /api/v1/students/{sourcedId}/next?documentId=` → khái niệm kế tiếp + giải thích (frontier + unlock-value)
  - `GET /api/v1/classes/{id}/heatmap?documentId=` → ma trận [students]×[CFItems] RAG
  - `GET /api/v1/classes/{id}/teaching-plan?documentId=` → plan có giải thích tương phản (dạy Y trước vì Y mở khóa X)
- **Dữ liệu đọc**: đồ thị từ M1, roster từ M6. **Không đọc DB của chúng** — qua API/event.

#### M6. `class-service` — Lớp học & hồ sơ ✅
- **Chuẩn**: OneRoster v1.2 subset (orgs→courses→classes→users→enrollments).
- **Interface**: CRUD orgs/courses/classes/users/enrollments; cấp `sourcedId` ẩn danh cho learner data.

#### M7. `assignment-service` — Giao bài & can thiệp ✅
- **Interface**: `POST /api/v1/assignments` (conceptUri + nhóm Red/Rusty từ M5 heatmap) → sinh ôn tập từ M2;
  `POST /assignments/{id}/quiz` → tạo test M2 từ itemIds; `GET/PATCH/DELETE /assignments/{id}`.

#### M9. `notification-service` — Thông báo 🔜 — email/in-app, consumer của event bus.

### Lớp nền tảng

#### M10. `api-gateway` — Điểm vào duy nhất ✅
- Định tuyến `/{prefix}/*`→service (`/case/*`→8101, `/quiz/*`→8102, ...; bảng route tại `GET /api/v1/routes`);
  rate-limit token-bucket/IP; auth hook (bearer tĩnh, chờ M11); `502 UPSTREAM_UNAVAILABLE` khi service chết.
- **Port**: 8000 · **Repo path**: `services/api-gateway/` (stateless, không DB).

#### M11. `auth-service` — Xác thực & phân quyền ✅
- JWT HS256 tự implement (stdlib, không dependency); PBKDF2 password; role `student|teacher|admin`;
  user đầu tiên = admin bootstrap; đăng ký role cao cần `X-Admin-Token`.
- **Interface**: `POST /api/v1/auth/register`, `POST /auth/login`, `POST /auth/verify`, `GET /users/me`.
- **Port**: 8108 · **Repo path**: `services/auth-service/`.

#### M12. `roadmap-viewer-plugin` — Giao diện Roadmap Viewer 🔜
- Plugin DeepSeek Harness (client slot), render `GET /documents/{id}/graph` của M1 theo kiểu roadmap.sh:
  linearization (topological order từ M1), checkbox tiến độ (mastery từ M5), nhánh phụ mờ (isPartOf taxonomy).

#### M0. `event-bus` (hạ tầng chung) 🔜
- NATS/RabbitMQ/Redis Stream. Envelope sự kiện chuẩn (mục 5). Analytics (M4) là sink mặc định;
  Learner model (M5) và Cognee (M8) là consumer.

---

## 3. Sơ đồ luồng dữ liệu (assembly sau này)

```
                    ┌─────────────────────────────┐
                    │  DeepSeek Harness (UI/Agent)│
                    │  + Roadmap Viewer plugin    │
                    └──────────────┬──────────────┘
                                   │ REST
                          ┌────────▼────────┐
                          │   api-gateway   │ M10 (+auth M11)
                          └───┬─────────┬───┘
        ┌─────────────────────┼─────────┼──────────────────────┐
        ▼                     ▼         ▼                      ▼
┌───────────────┐   ┌────────────┐ ┌───────┐   ┌────────────────────────┐
│ opencase (M1) │   │ quiz (M2)  │ │ class │   │ document-service (M3)  │
│ CASE v1.1     │   │ QTI v3.0   │ │ (M6)  │   │ LRMI chunks            │
│ concept DAG   │   │ item bank  │ │ roster│   └───────┬───────┬────────┘
└───────┬───────┘   └─────┬──────┘ └───┬───┘           │       │
        │ conceptUri      │ conceptUri │ sourcedId     ▼       ▼
        │                 │ attempts   │        ┌──────────┐ ┌──────────────┐
        │                 └─────┬──────┘        │ Cognee   │ │ Open Notebook│
        │                       │ events        │ (M8)     │ │ (M13)        │
        │              ┌────────▼─────────┐     └────▲─────┘ └──────────────┘
        │              │ analytics (M4)   │──event──►┘ (mastery traces)
        │              │ Caliper append   │
        │              └────────┬─────────┘
        │        ┌──────────────▼───────────────┐
        └───────►│ learner-model (M5)           │◄── outcomes/dt (qua API M2/M4)
                 │ Glicko-2 + Ebbinghaus        │
                 │ frontier + teaching-plan     │──► heatmap/plan ──► assignment (M7)
                 └──────────────────────────────┘                    │
                                                    notification (M9)◄┘
```

---

## 4. Bảng tham chiếu liên service (URI contract)

| Trường | Service nguồn | Service tham chiếu | Ý nghĩa |
|--------|--------------|--------------------|---------|
| `conceptUri` | M1 `CFItem.identifier` | M2 items, M3 chunks, M5 mastery, M7 assignments | Khái niệm nguyên tử — "tiền tệ" chung của hệ thống |
| `candidateId` | M6 `user.sourcedId` | M2 attempts, M4 events, M5 mastery, M8 dataset | Danh tính ẩn danh của học sinh |
| `documentUri` | M1 `CFDocument.identifier` | M3, M8, M12 | Một môn học/syllabus |
| `eventId` | M4 | M5, M8 (idempotency) | Sự kiện học tập |

> Quy ước: consumer **không resolve URI ngược** bằng HTTP lúc request-time. Nếu cần chi tiết,
> cache đồng bộ (sync job) hoặc truyền kèm payload trong event.

---

## 5. Envelope sự kiện (chuẩn khi lắp event bus)

```json
{
  "eventId": "uuid4",
  "type": "AssessmentItemResponseSubmitted",
  "occurredAt": "2026-01-15T09:30:00Z",
  "actor": {"id": "<candidateId>", "type": "Person"},
  "object": {"id": "<conceptUri>", "type": "Concept"},
  "payload": {"itemId": "...", "isCorrect": true, "score": 1.0, "attemptId": "..."},
  "producer": "quiz-service"
}
```

`type` đặt theo tên profile Caliper. Consumer phải idempotent theo `eventId`.

---

## 6. Quyết định Build vs Reuse (đã chốt)

| Thành phần | Quyết định | Lý do |
|------------|-----------|-------|
| CASE server | **Tự build lean** (M1) | OpenCASE của 1EdTech là full platform (editor + Keycloak + Traefik) — quá nặng cho 1 mắt xích; TAO tương tự (monolith PHP). Cần đúng 3 entity + graph endpoints. |
| QTI engine | **Tự build subset** (M2) | qti-sdk của OAT là PHP thuần; backend hệ thống là Python. Subset choice-interaction + match_correct đủ cho demo và nâng cấp sau. |
| GraphRAG/memory | **Reuse Cognee** (M8) | Đúng nền tảng đồ án; mỗi SV một dataset. |
| Hỏi đáp tài liệu | **Reuse Open Notebook** (M13) | Có sẵn REST + SurrealDB. |
| Curriculum JSON | **Chuẩn CASE thay format tự chế** | ClassroomMemory dùng `concepts[].requires[]` tự chế — giữ ý tưởng nhưng chuyển sang CFAssociation `isPrerequisiteOf` để hội thẩm chuẩn công nghiệp. |

## 7. Thứ tự ghép khi các module sẵn sàng

1. M1 + M2 (đã dựng) → 2. M6 roster cấp `sourcedId` → 3. M4 + event bus (events thật thay vì gọi API)
→ 4. M5 learner model → 5. M7 + M9 can thiệp → 6. M3 + M8 + M13 tri thức → 7. M10/M11 nền tảng → 8. M12 plugin UI.
