# Proposal: add-skilltree-graph-dashboard

## Why

V1 điểm 4 (AGENTS.md §1) yêu cầu **Dashboard graph** — đồ thị khái niệm M1 (CASE)
render kiểu roadmap cho giáo viên/học sinh. Hiện `plugins/roadmap-viewer` chỉ vẽ
spine tuyến tính từ một `documentId` nhập tay, không có bảng chọn môn học, không
có chi tiết khái niệm, không nối tài liệu (M9) và độ nhớ học sinh (M5). Đây là
màn hình chính thể hiện "Graph RAG theo dõi & gợi ý người học".

Kèm theo: bảng màu legacy `#4136d6` của `plugins/roadmap-viewer` phải được thay
bằng token `DESIGN.md` (branch `agent-v1-bootstrap`, PR #6) để UI hài hòa hệ
thống (AGENTS.md §2.3).

## What Changes

- **Recolor** `plugins/roadmap-viewer`: toàn bộ màu chuyển sang biến `--st-*`
  của DESIGN.md (ramp xanh lá `#27A95F`, ink `#1C3632`, danger `#B3261E`,
  warn `#8A4B00`); bỏ hẳn `#4136d6` và các tint legacy; giữ nguyên topology
  spine (Kahn topological order) + trạng thái done/next/locked + localStorage
  progress.
- **Thêm plugin mới** `plugins/skilltree-graph-dashboard` (host + client + smoke
  + README, pattern vai-skilltree):
  - Chọn môn học từ danh sách M1 (`GET /api/v1/documents?limit=200`);
  - Render đồ thị khái niệm CASE theo trục dọc topology (Kahn) — dependency-valid;
  - Click node → chi tiết (fullStatement, humanCodingScheme, tiên đề, số khái
    niệm mở khóa) + tài liệu liên quan (M9 chunks lọc theo
    `alignments[].conceptUri`) + độ nhớ HS (M5 `MasteryRead`: mastery %, state
    green|amber|red|rusty, Glicko rating ± RD, review count);
  - M9/M5 là soft-dependency: lỗi không làm trắng graph.
- Thêm `smoke.js` cho cả hai plugin (kiểm logic thuần + token purity + wiring).

## Impact

- **Affected specs**: `graph-dashboard` (spec mới).
- **Affected code**:
  - `plugins/roadmap-viewer/client.js` (recolor), `plugins/roadmap-viewer/smoke.js` (mới);
  - `plugins/skilltree-graph-dashboard/{README.md,client.js,host.js,smoke.js}` (mới).
- Không đổi services/, không đổi gateway, không đổi schema M1/M9/M5 — chỉ tiêu
  dùng API hiện có (đã đối chiếu `services/opencase-service/app/routes.py`,
  `services/document-service/app/routes.py`, `services/learner-model-service/app/routes.py`).
