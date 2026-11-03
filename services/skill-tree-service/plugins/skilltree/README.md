# skilltree — plugin nghiệp vụ đồ án (SKELETON, chưa code)

Chỗ dành trước cho plugin SkillTree. Khi viết plugin thật, tách thành các package
riêng theo tính năng (mỗi package 1 thư mục + 1 row trong `plugins/patch.yml`):

## Tool dự kiến

| Tool (id gợi ý) | Nguồn dữ liệu | Chức năng |
|---|---|---|
| `opencase_next_concepts` | M1 opencase-service `GET /api/v1` | Cho 1 candidateId + concept: trả danh sách khái niệm kế tiếp mà **tất cả tiên quyết đều đạt ngưỡng** (đồ thị có hướng `required: [...]`) |
| `quiz_adaptive` | M2 quiz-service `GET/POST /api/v1` | Lấy câu hỏi thích ứng QTI cho khái niệm kế tiếp, nhận kết quả → cập nhật mastery `w ← w + α(1−w)` (α=0.35, ngưỡng Red/Amber/Green 0.35/0.75) |
| `cognee_ask` | MCP `cognee-memory` (đã nối trong patch.yml) | Hỏi đáp Graph RAG trên corpus môn học (chunking/extraction/retrieval params tinh chỉnh theo tài liệu hyperparameters của đồ án) |

## Skills (cho agent, không cần code)

Thả vào `skills/<tên>/SKILL.md`:
- `skill-dag` — node contract + risk tiers (tham khảo `agent-harness-server/skill/dag/`)
- `workloop` — quy trình taskloop (tham khảo `agent-harness-server/skill/workloop/`)

## Cấu trúc 1 plugin DSH tối thiểu (tham khảo vai-secrets)

```
<plugin>/
├── package.json          # main → lib/index.js; nếu có UI: dsh.client.platform="web"
├── lib/index.js          # server half — đăng ký tools/routes
└── client/               # (tuỳ chọn) client half — bundle + settings card (cần key:)
```

Sau đó: thêm row vào `plugins/patch.yml` (đường dẫn tuyệt đối in-sandbox
`/app/plugins/<tên>/lib/index.js`) → `docker compose restart skill-tree-harness`.
