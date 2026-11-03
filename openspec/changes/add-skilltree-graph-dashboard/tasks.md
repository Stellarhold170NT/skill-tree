# Tasks — add-skilltree-graph-dashboard

## 1. Recolor roadmap-viewer theo DESIGN.md

- [x] 1.1 Thay toàn bộ màu legacy `#4136d6`/`#f3f2ff` bằng `--st-*` của DESIGN.md trên `.rmv-root`
- [x] 1.2 Giữ topology spine (Kahn) + trạng thái done/next/locked + localStorage progress
- [x] 1.3 Ưu tiên cặp `sourceIdentifier/targetIdentifier` khi map edge (shape M1 thật)
- [x] 1.4 Thêm `plugins/roadmap-viewer/smoke.js` (4 check: token, states, edges, wiring)

## 2. Plugin skilltree-graph-dashboard

- [x] 2.1 `host.js`: 4 RPC (listSubjects/getGraph/getMaterials/getMastery) qua `ctx.get('web')`, guard URL + encodeURIComponent
- [x] 2.2 `client.js`: chọn môn học M1 → spine Kahn → click node → chi tiết + M9 materials + M5 mastery
- [x] 2.3 M9/M5 soft-dependency (fail → mảng rỗng, graph không trắng)
- [x] 2.4 Token `--st-*` DESIGN.md, anti-slop (không gradient/glassmorphism/nested card), UI tiếng Việt
- [x] 2.5 `smoke.js`: 9 check logic thuần + token purity + wiring
- [x] 2.6 `README.md` đạt chuẩn EGM (vai trò, INPUT, OUTPUT, env, run, test, deps)
- [x] 2.7 Sửa sau khi đối chiếu source: `getMaterials` resolve document M9 theo `documentUri` (M1↔M9 không chia sẻ primary key)

## 3. Kiểm chứng (bằng chứng thật)

- [x] 3.1 `node --check` 6 file JS → SYNTAX OK
- [x] 3.2 `node smoke.js` cả 2 plugin → 4/4 + 9/9 PASS
- [x] 3.3 E2E thật: M1+M9+M5 chạy uvicorn (sqlite tạm) → gọi 4 RPC logic của host.js → 8/8 PASS khớp schema thật
- [x] 3.4 Đối chiếu source-over-fact: endpoint/schema/port/state với `services/{opencase,document,learner-model}-service`
- [x] 3.5 `openspec validate add-skilltree-graph-dashboard --strict` (CLI 1.16.0) → valid

## 4. Vận hành repo

- [x] 4.1 Commit đúng rule AGENTS.md §3 (`feat: [GRAP-61008] …`, author Nguyễn Việt Huy) — `d8747e1`
- [x] 4.2 Push branch `agent-v1-graph` (origin head đã verify = `d8747e1`) + URL so sánh PR
- [ ] 4.3 Merge PR (thuộc quyền chủ dự án — ngoài phạm vi node này)
