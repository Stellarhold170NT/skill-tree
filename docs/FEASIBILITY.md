# Đánh giá khả thi kiến trúc & Phân tích thiếu hụt tài liệu

> Đối tượng: bản thiết kế "Ứng dụng Graph RAG trong việc hỗ trợ theo dõi và gợi ý người học"
> (syllabus-as-asset, frontier theo tiên quyết, learner model, heatmap lớp, teaching plan,
> can thiệp trúng đích, Cognee mỗi SV một dataset, Harness làm giao diện).
> Kết cấu module: xem [`MODULES.md`](MODULES.md).

## 1. Kết luận: **KHẢ THI** — với 3 điều kiện

1. **Hướng tiếp cận đúng về mặt học máy**: bài toán "không có dữ liệu train trước" buộc phải
   dùng mô hình hóa đồ thị + cập nhật trạng thái online. Việc nâng công thức PoC
   (`w += 0.35(1-w)`) lên Glicko-2/Elo và phân tích nút thắt (betweenness) là nâng cấp
   **trong cùng interface** (mastery theo conceptUri) — không phải viết lại hệ thống.
   Điều kiện: module M5 tách riêng ngay từ đầu (không nhúng công thức vào quiz service).
2. **Chọn chuẩn 1EdTech là đúng và đủ**: CASE v1.1 (đồ thị tiên quyết), QTI v3.0 (item bank),
   Caliper v1.2 (Δt cho mô hình quên), OneRoster v1.2 (trục lớp học) đều là chuẩn máy đọc được,
   hợp lệ trước hội đồng. Điều kiện: **subset được khai báo rõ** (ta làm subset của subset —
   thấy `services/quiz-service` README mục QTI support) và có lộ trình import đầy đủ sau.
3. **Kiến trúc module hóa kiểm chứng được bằng thực tế**: M1 (CASE) + M2 (QTI) đã dựng độc lập,
   có test, không đụng chéo DB — đúng triết lý "mắt xích ghép sau". Điều kiện duy nhất còn lại:
   giữ kỷ luật interface (envelope lỗi, health, URI reference) cho các module tiếp theo.

## 2. Điểm mạnh nổi bật so với các dự án cùng loại

| Điểm | Vì sao là lợi thế |
|---|---|
| Syllabus là **tài sản số** (xây 1 lần, dùng nhiều kỳ) | Trùng đúng triết lý CASE: khung năng lực thuộc về hội đồng, không thuộc về app |
| **Mỗi SV một dataset cô lập** (Cognee) | Multi-tenancy từ ngày đầu; reset/xóa dữ liệu 1 SV không đụng người khác |
| Tách **lớp chuẩn dữ liệu** khỏi **lớp giao diện** | Roadmap Viewer chỉ là plugin (M12); đổi UI không đụng engine |
| Kế hoạch upgrade PoC → công nghiệp đã **định danh đúng chỗ cần thay** | Rescorla-Wagner + step-size RL là nền tảng hợp lệ; chỉ thay hằng số heuristic bằng Glicko-2 + giữa nguyên frontier logic |
| Học từ ClassroomMemory nhưng **không copy** | Giữ frontier/heatmap/teaching-plan, thay format tự chế bằng CASE CFAssociation |

## 3. Rủi ro lớn nhất & cách hóa giải (quyết định sớm)

| # | Rủi ro | Hóa giải đề xuất |
|---|--------|------------------|
| R1 | **LLM extraction sinh node cạnh tranh với CFItem** (đồ thị "rác" ngoài chuẩn) | Ràng buộc: LLM chỉ **align chunk vào CFItem có sẵn** (LRMI teaches/assesses), không được tự tạo node. Node mới chỉ qua luồng soạn thảo của M1 |
| R2 | **Event bus chưa chọn** (M0) — M4/M5/M8 đều treo vào nó | ADR-0002: chọn NATS JetStream hoặc Redis Stream trước khi code M4; envelope đã chuẩn trong MODULES.md mục 5 |
| R3 | **Cognee recall latency + chi phí LLM** mỗi lần ask | Fire-and-forget cho write (như ClassroomMemory), cache cho read; ask của SV không chặn quiz flow |
| R4 | **Glicko-2 cold-start** (mới ít trận đấu, RD lớn) | Pha 1 dùng heuristic (giữ công thức PoC làm fallback), pha 2 bật Glicko-2 khi mỗi concept-candidate ≥ N tương tác. Ghi rõ trong M5 README |
| R5 | **Δt đo quên** cần event đều đặn — nếu SV im lặng thì R(t) tự giảm đúng nghĩa, nhưng phải có cơ chế nhắc (M9) | Rusty detection chạy batch nightly trên Caliper logs, không tính lúc request |
| R6 | **Privacy**: candidateId ẩn danh nhưng cần map ngược khi thông báo | Mapping sourcedId↔danh tính chỉ nằm ở M6, access qua auth (M11); hành vi (M2/M4/M5) không thấy danh tính |

## 4. Tài liệu còn thiếu (gap analysis) — thứ tự ưu tiên

| # | Thiếu | Mức độ | Nơi bổ sung đề xuất |
|---|-------|--------|---------------------|
| 1 | **Thiết kế CSDL từng service** (ERD: cf_documents/cf_items/cf_associations; items/tests/attempts; events; mastery_states) | Cao | `docs/tkcsdl/` — một trang/service |
| 2 | **Mô hình trạng thái năng lực** (Red/Amber/Green/Rusty, ngưỡng, state machine, công thức Glicko-2 chi tiết) | Cao | design doc M5 trước khi code |
| 3 | **Quyết định event bus + topology** (delivery, retry, idempotency theo eventId) | Cao | ADR-0002 |
| 4 | **Auth & role matrix** (teacher-of-class / student-self / admin), JWT flow giữa Harness ↔ gateway ↔ service | Cao | design doc M10/M11 |
| 5 | **OpenAPI contract đầy đủ** cho module tương lai (M3–M9) — hiện mới là bảng tóm tắt | Trung bình | mở rộng MODULES.md mục 2 thành spec từng module |
| 6 | **Chiến lược eval GraphRAG** (Cognee có sẵn benchmark HotPotQA/TwoWikiMultiHop — chưa có kế hoạch dùng cho corpus môn học) | Trung bình | design doc M8 + bộ corpus thật 1 môn |
| 7 | **Protocol tinh chỉnh siêu tham số** (đã liệt kê 4 nhóm knobs nhưng chưa có cách chọn giá trị: grid/Bayesian trên objective nào) | Trung bình | kế thừa framework eval Cognee làm objective function |
| 8 | **Non-functional requirements**: số SV/lớp mục tiêu, p95 latency quiz, token budget/chi phí LLM/tháng | Trung bình | thêm mục NFR vào deployment doc |
| 9 | **Retention/backup/consent** (dữ liệu học tập của SV giữ bao lâu, xóa khi nào) | Trung bình | policy doc + cron trong M6 |
| 10 | **Deployment topology prod** (VM hay K8s, TLS, secret management, CI/CD) — deployment.md hiện là mức compose | Thấp-TRB | nâng cấp deployment.md khi có server |
| 11 | **Nhập dữ liệu ban đầu** (ai soạn CFDocument đầu tiên? tool soạn thảo hay import JSON?) — giao diện soạn thảo M12 mới có viewer | Thấp | import endpoint JSON-CASE đã có (package export); thêm import tương tự ở M1 |
| 12 | **SLA cho runtime demo** (DinD sandbox, DSH plugin) khi bảo vệ | Thấp | deployment.md mục DinD khi cần |

## 5. Traceability: yêu cầu → module

| Tính năng trong bản thiết kế | Module | Trạng thái |
|---|---|---|
| Chuẩn format roadmap + tool + giao diện | M1 (format CASE) + M12 (viewer) | M1 ✅ · M12 🔜 |
| Tự tìm khái niệm kế tiếp (đủ tiên quyết mới mở khóa) | M1 `check-prerequisites` + M5 frontier | M1 ✅ (API sẵn) · M5 🔜 |
| Thay công thức tự chế bằng Glicko-2 / betweenness | M5 | 🔜 (interface đã chốt) |
| Xác định SV đang quên (Ebbinghaus, Δt) | M4 (Caliper Δt) + M5 (Rusty state) | 🔜 |
| Class Heatmap RAG | M5 heatmap + M6 roster | 🔜 |
| Graph-Reasoned Teaching Plan + giải thích tương phản | M5 teaching-plan | 🔜 |
| One-Click Targeted Intervention | M7 + M5 + M2 (sinh đề ôn) | 🔜 |
| Class Ask `/api/class/ask` | M8 multi-dataset recall | 🔜 |
| Quản lý câu hỏi trắc nghiệm + chấm | M2 | ✅ |
| Hỏi đáp tài liệu | M13 (Open Notebook reuse) | 🔜 |
| Dữ liệu SV cô lập / lý lịch / snapshot / vết | M8 (dataset/SV) + M6 (profile) | 🔜 |
| Xác thực, phân quyền, event bus, DB riêng | M11 / M0 / nguyên tắc thiết kế | DB riêng ✅ (M1/M2), còn lại 🔜 |

## 6. Bước tiếp theo gợi ý (2 sprint)

1. **Sprint A**: tkcsdl ERD cho M1/M2/M4/M5 (#1) + ADR-0002 chọn event bus (#3) + design doc M5 (#2).
2. **Sprint B**: code M6 (roster, cấp sourcedId) + M4 (Caliper sink) — đủ để M5 có dữ liệu thật;
   song song viết corpus 1 môn thật (CFDocument JSON) để demo end-to-end M1→M2→M5.
