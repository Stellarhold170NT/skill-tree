---
name: skilltree-memory
description: >
  Bộ nhớ lớp học của SkillTree: nạp sự kiện học tập và hỏi đáp tri thức tiến hóa
  RIÊNG CHO TỪNG học sinh qua Cognee GraphRAG. Dùng khi agent cần ghi nhớ tiến
  trình học, ôn lại kiến thức của một học sinh cụ thể, hoặc chạy pipeline cập
  nhật định kỳ. Dataset được cách ly: student-<candidateId> (candidateId từ
  class-service M6) — câu trả lời không bao giờ trộn dữ liệu học sinh khác.
---

# skilltree-memory — Cẩm nang bộ nhớ lớp học (per-student Cognee)

## Khi nào dùng tool nào

| Tình huống | Tool | Ghi nhớ |
|---|---|---|
| Học sinh vừa học xong / làm bài / xem tài liệu — cần ghi vào bộ nhớ | `memory_ingest` | Truyền `studentId` (candidateId M6) + `events` (mảng JSON) hoặc `text` |
| Hỏi “em đã nắm gì / yếu phần nào / học gì hôm trước?” cho 1 học sinh | `memory_ask` | Luôn truyền `studentId` + `query`; mặc định `search_type=hybrid` |
| Kết thúc buổi học / định kỳ hằng tuần — tổng hợp tri thức dài hạn | `memory_evolve` | Truyền `studentId` + `events` (từ lần evolve trước) và/hoặc `note` |

## Quy ước bắt buộc

1. **Luôn có studentId.** Mọi tool đều cần `candidateId` (danh tính ẩn danh của
   học sinh trong class-service M6). Không biết candidateId → hỏi lại người dùng
   hoặc tra lớp học trước, KHÔNG đoán.
2. **Sự kiện dạng tuple (Actor, Action, Object, timestamp)** — khuyến khích dạng
   Caliper: `{candidateId, action: "attempted"|"mastered"|"practiced"|"viewed",
   object: "<khái niệm/tài liệu>", timestamp: "ISO-8601"}`. Trường hợp dùng được:
   `candidateId|studentId|actor.id`, `action|type`, `object|concept|conceptId`,
   `timestamp|eventTime|ts`.
3. **Batch trộn nhiều học sinh là hợp lệ**: `memory_ingest` tự gom nhóm thành
   một document mỗi dataset `student-<id>`. Kết quả trả `unassigned` — đó là các
   sự kiện KHÔNG xác định được chủ nhân: báo lại cho người dùng, đừng bỏ qua.
4. **`memory_evolve` là nhịp dài hạn**: chạy sau mỗi buổi học; nó nén tiến trình
   + ghi chú thành tài liệu "Knowledge evolution" với extraction prompt giáo dục
   (Concept, MasteryLevel, StruggleArea, ReviewEvent). Batches lớn: `background: true`.
5. **Riêng tư**: `memory_ask` chỉ đọc dataset của đúng học sinh đó. Câu trả lời
   không được suy diễn từ dữ liệu học sinh khác — nếu thiếu dữ liệu, nói thẳng
   “chưa có dữ liệu về phần này của học sinh X” và gợi ý `memory_ingest` trước.

## Chuỗi thao tác mẫu (1 buổi học)

```
1. memory_ingest {studentId: "hs-demo", events: JSON.stringify([...sự kiện buổi học...])}
2. memory_ask    {studentId: "hs-demo", query: "Hôm nay con đã nắm và còn vướng khái niệm nào?"}
3. memory_evolve {studentId: "hs-demo", note: "Giáo viên nhận xét: cần luyện lại đệ quy cơ bản"}
```

## Kiểm chứng nhanh

- Tool không thấy trong agent → xem boot log: `docker logs skill-tree-harness 2>&1 | grep skilltree-memory`
  (phải thấy “3 tools registered”). Thiếu → kiểm tra row `skilltree-memory` trong
  `plugins/patch.yml` đã có và `docker compose restart skill-tree-harness`.
- Lỗi “MCP unreachable” → Cognee MCP server chưa sống: kiểm tra row
  `mcp-cognee-memory` trong patch.yml và URL (mặc định http://${DEV_HOST}:8021/mcp).
