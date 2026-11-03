# Proposal: v1-cognee-plugin — skilltree-memory (classroom memory per student)

## Why

V1 mục tiêu 6 (AGENTS.md §1) yêu cầu **pipeline Cognee là trọng tâm của classroom
memory**: dataset CỘT LỖI theo học sinh (`<candidateId>`), tri thức tiến hóa theo
thời gian, tích hợp qua cognee MCP trong skill-tree-service. Hiện tại harness M4
chỉ nối thẳng Cognee MCP (row `mcp-cognee-memory` trong `plugins/patch.yml`) —
agent phải tự nhớ URL/dataset, không có quy ước cách ly dữ liệu theo học sinh và
không có pipeline cập nhật định kỳ. Tham chiếu năng lực tối thiểu §1.1
(`classroom-memory` / `openmemory-v040`): nạp tri thức, memory theo học sinh,
hỏi đáp recall hybrid vector+graph.

## What Changes

Thêm plugin DSH mới `services/skill-tree-service/plugins/skilltree-memory/`:

1. **3 model tools** cho agent:
   - `memory_ingest` — sự kiện học tập (Caliper v1.2 / progress) → dataset
     Cognee của đúng học sinh đó.
   - `memory_ask` — hỏi đáp tri thức tiến hóa per-student (hybrid vector+graph).
   - `memory_evolve` — pipeline cập nhật định kỳ (digest tiến trình + ghi chú →
     extraction prompt giáo dục → cognify + status).
2. **Cách ly dataset theo studentId**: `student-<candidateId>` (candidateId từ
   class-service M6); sự kiện không xác định được chủ nhân bị trả về `unassigned`,
   không nạp nhầm dataset của học sinh khác.
3. **Ghép plugin theo đúng quy trình 2 bước** của service README:
   `plugins/skilltree-memory/` (commit cả `lib/`) + row trong `plugins/patch.yml`
   và `plugins/patch.local.yml`; KHÔNG cài qua `docker exec`.
4. **Unit test logic gom nhóm dataset** (`node --test`, 23 test) + hướng dẫn
   verify thủ công (restart compose → grep log → dùng thử 3 tool).
5. README chuẩn EGM cho module + SKILL.md cho agent.

LLM cho cognee là NetMind, nạp qua env từ `skilltree-secrets/netmind.json` ở
server Cognee MCP — plugin KHÔNG chứa và KHÔNG gọi LLM, không có key nào trong
repo.

## Impact

- **Affected specs**: capability `v1` (delta mới — xem `specs/v1/spec.md`).
- **Affected code**:
  - `services/skill-tree-service/plugins/skilltree-memory/**` (mới)
  - `services/skill-tree-service/plugins/patch.yml`, `patch.local.yml` (+1 row mỗi file)
  - `services/skill-tree-service/README.md` (bảng thư mục + mục hợp đồng M1/M2)
- Không sửa lõi harness, không đụng các service khác; agent hiện có không bị
  phá vỡ (plugin chỉ thêm tool).
