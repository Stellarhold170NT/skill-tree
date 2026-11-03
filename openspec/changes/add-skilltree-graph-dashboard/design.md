# Design — add-skilltree-graph-dashboard

## Context

Plugin DSH tĩnh nằm ở `plugins/skilltree-graph-dashboard/` (cùng homes với
`plugins/roadmap-viewer`). Hai half: `host.js` (Host RPC) + `client.js` (Client
UI React, không build). Browser KHÔNG gọi service trực tiếp — mọi fetch đi qua
Host `web` service để tránh CORS/daemon networking từ page.

## Goals / Non-Goals

- Goals: dashboard 3-nguồn trên 1 màn hình (M1 graph + M9 tài liệu + M5 độ nhớ);
  recolor roadmap-viewer theo DESIGN.md.
- Non-Goals: không viết service mới, không đổi schema, không sửa gateway,
  không glicko/sửa thuật toán M5 (V2), không realtime/websocket.

## Decisions

### D1 — Host RPC pattern (giữ như roadmap-viewer đã chứng minh)

4 method đóng gói qua `harness.handle`:
`skilltree.listSubjects | getGraph | getMaterials | getMastery`, mỗi method trả
`{ ok, data } | { ok, error }`. Base URL do browser truyền, được guard
`^https?://`; path + id được compose và `encodeURIComponent` phía Host.
Fetch qua `ctx.get('web').fetch({ url })` — cùng pattern
`plugins/roadmap-viewer/host.js` (đã chạy thật trên harness).

### D2 — Soft dependency M9/M5

M1 là hard dependency (không có graph thì không có dashboard). M9/M5 fail → trả
mảng rỗng, UI vẫn vẽ graph + trạng thái cấu trúc (next/locked theo tiên đề).
Lý do: dashboard phải dùng được ngay cả khi chỉ M1 đang chạy (đúng tinh thần
"đủ chức năng, không over-engineer" của V1).

### D3 — Keying: CASE identifier là chốt hợp nhất

M1 `build_graph` trả node `{id, identifier, fullStatement, humanCodingScheme}`
và edge `{source, target, type, sourceIdentifier, targetIdentifier}` — node key
bằng `identifier` (URI `{CASE_BASE_URI}/CFItems/{id}`), ưu tiên cặp
`*Identifier` của edge (fallback `source/target` giữ shape cũ). M5
`MasteryRead.conceptUri` và M9 `AlignmentRead.conceptUri` dùng cùng quy ước
CFItem identifier (M5 `/next-concept` đã tự match graph adjacency với
mastery_by_concept theo cùng key) → một map duy nhất `conceptUri → mastery`,
lọc tài liệu theo `alignments[].conceptUri === node.identifier`.

### D4 — Trạng thái node

- Có dữ liệu M5: `state` của M5 (`green|amber|red|rusty`) là trạng thái hiển thị
  (dot + chip AA + %).
- Không có M5: fallback cấu trúc — `next` (không tiên đề) / `locked`.
- Cycle fallback của Kahn: node không thăm được vẫn hiển thị cuối danh sách
  (degraded but visible).

### D5 — Token DESIGN.md, anti-slop

Toàn bộ màu khai báo `--st-*` trên root riêng (`.gd-root` / `.rmv-root`),
không rò global; không gradient, không glassmorphism, card phẳng 1 lớp,
font system-ui, radius 8/12/999, contrast AA theo bảng DESIGN.md §2. Chip màu
mastery: green→`--st-success-*`, amber→`--st-warn-*`, red→`--st-danger-*`,
rusty→neutral. Smoke check cấm `#4136d6` và mọi `gradient`.

### D6 — Slot additive

Đăng ký `shell.overlay` id `skilltree-graph-dashboard` order 51 (roadmap-viewer
giữ order 50) — cộng thêm, không đè UI có sẵn.

## Risks / Trade-offs

- [Base URL thủ công] → chấp nhận cho V1 (giống roadmap-viewer); gateway wiring
  tự động là việc của node deploy sau.
- [Danh sách môn giới hạn 200] → đủ demo V1; phân trang là V2.
- [conceptUri lệch chuẩn nếu M9/M5 nhập key khác] → chỉ mất phần join (hiển thị
  rỗng), không crash; đã khớp convention của M5 frontier (D3).

## Open Questions

- Không có — mọi quyết định đã chốt theo source hiện hành của M1/M9/M5.
