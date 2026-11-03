# Structurizr workspace — paste-and-view cho playground

Bộ file này sinh ra từ cùng nguồn sự thật với bộ PlantUML C4 trong thư mục cha
([`l1-context.md`](../l1-context.md), [`l2-container.md`](../l2-container.md),
[`l3-component.md`](../l3-component.md)) nhưng ở định dạng **Structurizr DSL** để
dán trực tiếp vào <https://playground.structurizr.com/>.

## File

| File | Nội dung |
|---|---|
| `workspace.dsl` | Toàn bộ model C4 của SkillTree (5 views: L1, L2, 3×L3) — file chính để paste |
| `workspace.json` | Bản JSON biên dịch sẵn từ `workspace.dsl` (v2025.11.09 của Structurizr CLI, đã validate) — paste vào tab **JSON** của playground nếu thích |

## Cách xem trên playground

1. Mở <https://playground.structurizr.com/>.
2. Xoá nội dung DSL mẫu trong editor, dán toàn bộ `workspace.dsl` vào (hoặc
   dán `workspace.json` vào tab JSON).
3. Playground tự biên dịch — chọn view ở dropdown góc trên:
   - **L1-Context** — C1 System Context (tương ứng `l1-context.md`)
   - **L2-Container** — C2 Containers (tương ứng `l2-container.md`)
   - **L3-Harness** — C3 bên trong skill-tree-harness (M4)
   - **L3-Rag** — C3 bên trong rag-service ([V1 planned])
   - **L3-TeacherUi** — C3 bên trong skilltree-teacher-ui plugin ([V1 planned])
4. Export PNG/SVG/JSON ngay trong playground nếu cần (menu export).

Không cần cài Structurizr CLI — playground tự compile DSL.

## Quy ước trong workspace

- Tag **`V1 planned`** (viền nét đứt): thiết kế đã duyệt nhưng chưa có code trên
  `main` — `rag-service`, `skilltree-teacher-ui`, business plugin, wiring
  gateway→auth. Tương ứng `[V1 planned]` trong file PlantUML.
- Tag **`Database`** (hình trụ): DB riêng của từng service (DB-per-service).
- Tag **`External`** (xám): `NetMind LLM Gateway`, `cognee-memory (M8)`.

## Lưu ý khác biệt nhỏ so với PlantUML

- Trong PlantUML L1, cognee MCP được vẽ như external system; L2 vẽ nó nằm trong
  boundary platform. Model Structurizr chỉ cho phép một vị trí, nên cognee được
  model là **external softwareSystem** một lần duy nhất: L1 hiển thị đúng như
  PlantUML, còn L2 sẽ hiển thị nó **ngoài** khối platform (thay vì trong) nhưng
  vẫn giữ nguyên quan hệ MCP streamable-http :8021 với harness.
- Chú thích evidence không đưa vào DSL (DSL không có chỗ cho bảng evidence) —
  xem bảng bằng chứng trong các file `.md` ở thư mục cha.
