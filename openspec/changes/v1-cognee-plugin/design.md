# Design — v1-cognee-plugin (skilltree-memory)

## Context

skill-tree-service (M4) đã nối Cognee MCP qua row `mcp-cognee-memory`
(`@deepseek-ai/dsh-mcp-client`, streamable-http, `http://${DEV_HOST}:8021/mcp` —
server dev cognee-mcp-v2). Plugin này KHÔNG thay row đó mà là lớp tool phía trên,
giống pattern `${GITEA_REPO_MEMORY}` (Gitea `${GITEA_REPO_MEMORY}`, chạy production
trong SkillTree): JSON-RPC streamable-HTTP tự viết (initialize → tools/call,
retry 404 một lần), `defineTool` từ `@deepseek-ai/dsh-tools`, `inject: ['tools']`.

## Decisions

1. **MCP client riêng trong plugin** (thay vì gọi qua plugin MCP-client của DSH):
   như `${GITEA_REPO_MEMORY}` — plugin nắm session JSON-RPC, retry khi server restart
   (404), parse được cả JSON lẫn SSE. URL mặc định trùng row `mcp-cognee-memory`
   (`http://${DEV_HOST}:8021/mcp`); override bằng `config.url` trong patch row
   hoặc env `SKILLTREE_MEMORY_MCP_URL`. Khi đổi môi trường, cập nhật cả 2 chỗ
   (đã ghi trong README).

2. **Dataset `student-<candidateId>`** (khớp design của change `v1-scope`):
   candidateId là danh tính ẩn danh từ M6. `sanitizeStudentId` hạ chữ thường,
   chỉ giữ `[a-z0-9._-]` (ký tự khác → `-`, gộp liền, cắt biên, cap 64) — một
   học sinh luôn ra đúng một dataset, id kiểu path bị vô hiệu (`../../etc` →
   `hs..-..-etc` dạng defang). Sự kiện thiếu chủ nhân → bucket `unassigned`
   (có index + reason) trong kết quả tool, KHÔNG nạp — chống lệch dữ liệu im lặng.

3. **Ba tool đúng brief, không thêm**: `memory_ingest` (gom nhóm events theo
   học sinh — fallback `studentId` cho batch 1 học sinh; nhận `text` thay thế),
   `memory_ask` (recall giới hạn `datasets: student-<id>`, alias search_type
   giống hệt quy ước Agent Memory), `memory_evolve` (digest tiến trình + note →
   `remember` với `custom_prompt` giáo dục → `cognify_status`). Evolve không tự
   bịa dữ liệu: chỉ dùng events/note được truyền vào.

4. **Extraction prompt giáo dục** (knob "Graph prompt" trong tài liệu siêu tham
   số): `EVOLUTION_PROMPT` yêu cầu trích Concept, MasteryLevel, StruggleArea,
   ReviewEvent + quan hệ thời gian (mastered_before, struggled_with,
   reviewed_after) kèm timestamp — định hướng cho tri thức tiến hóa theo thời
   gian mà không chỉnh gì server Cognee.

5. **LLM/NetMind tách khỏi plugin**: plugin không cấu hình LLM, không chứa key.
   Cognee MCP server dùng NetMind qua env nạp từ `skilltree-secrets/netmind.json`
   (baseURL/apiKey/models `MiniMax/MiniMax-M3`, `zai-org/GLM-5.3-Flash`) — chỉ
   runtime env, không bao giờ ghi vào repo/report/log (AGENTS.md §8.3, §6.8).

6. **Không đụng lõi harness**: chỉ thêm plugin + 1 row mỗi file patch + 2 chỗ
   README service. Bare-name symlink entrypoint không cần (plugin host-only,
   không có client half / Settings card).

## Risks / Trade-offs

- Plugin giữ URL mặc định trùng với row MCP → 2 chỗ phải sửa cùng lúc khi đổi
  server. Chấp nhận cho V1 (1 server dev duy nhất), có env override.
- `memory_evolve` chạy đồng bộ khi `background=false` — cognify có thể chậm
  (timeout mặc định 120s); SKILL.md khuyến nghị `background: true` cho batch lớn.
- Session JSON-RPC giữ trong bộ nhớ plugin; server restart giữa chừng được xử
  lý bằng 1 lần re-handshake (như tham chiếu), nhiều hơn thì tool báo lỗi rõ.

## Migration

Không có — thêm mới thuần. Rollback: xóa row trong 2 file patch + restart.
