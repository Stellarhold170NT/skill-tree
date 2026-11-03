# skill-tree-service — M4 Agent Harness (mini DSH)

Service agent harness của đồ án **SkillTree** (Graph RAG hỗ trợ theo dõi & gợi ý
người học). Đóng vai trò **M4** trong kiến trúc microservice `services/`:

| Module | Service | Port | Vai trò |
|--------|---------|------|---------|
| M1 | opencase-service | 8101 | Quản lý môn học & đồ thị khái niệm (1EdTech CASE) |
| M2 | quiz-service | 8102 | Ngân hàng câu hỏi, trắc nghiệm (1EdTech QTI) |
| M3 | latexml-service | 8103 | LaTeX → HTML |
| **M4** | **skill-tree-service (đây)** | **8104** | **Agent harness — điều phối agent/LLM cho Graph RAG** |

Nguồn: copy phần lõi từ `agent-harness-server` (vAi), đã lược bỏ toàn bộ runtime
state + plugin vAi không liên quan (~3,8 GB → ~35 MB).

## Kiến trúc

```
┌────────────────────────────┐
│  skill-tree-harness        │  Docker container
│  ├─ DSH web UI/API :3080   │◄── host :8104  (SDK dsh_web_sdk / browser)
│  ├─ bwrap sandbox          │  agent chạy user node(1000), cap-drop ALL
│  ├─ iptables firewall      │  chặn metadata endpoint + LAN scan
│  └─ plugins/  (bind :ro)   │  patch.yml = loader entries
└────────────────────────────┘
        │ MCP (streamable-http)          │ REST /api/v1
        ▼                                ▼
  cognee-mcp (Graph RAG)          M1 opencase / M2 quiz
```

## Chạy nhanh

```bash
cd services/skill-tree-service
docker compose up -d --build
# Lấy token từ stdout (nguồn đúng — logs/ trên host có thể stale):
docker logs skill-tree-harness 2>&1 | grep -oP 'token=\K[A-Za-z0-9_-]+' | tail -1
# Mở: http://localhost:8104/?token=<token>  (303 = token đúng, 401 = sai/stale)
```

Yêu cầu: Docker Desktop, port 8104/8105 rảnh. Nếu muốn cho máy khác trong LAN
truy cập: `EXTRA_TRUSTED_HOSTS="localhost:8104 192.168.1.50:8104" docker compose up -d`.

### 2 chế độ chạy — dùng CHUNG `runtime/` (đổi mode không mất gì)

| | Docker (mặc định) | Local (không Docker) |
|---|---|---|
| Lệnh | `docker compose up -d --build` | `.\run-local.ps1` (port 8114) |
| Sandbox | bwrap + iptables (production) | ❌ không có — agent chạy trần trên Windows |
| Patch plugin | `plugins/patch.yml` (path in-sandbox) | `plugins/patch.local.yml` (path Windows) |
| Profile/session/workspace | `runtime/workspace/.dsh` | **cùng thư mục** (`DSH_HOME` trỏ vào đây) |

Quy tắc: **chỉ chạy 1 chế độ cùng lúc** (trùng profile + port). Đổi chế độ:
`docker compose stop` → `.\run-local.ps1`, hoặc ngược lại (Ctrl+C local → `docker compose up -d`).
Khi thêm plugin mới, giữ 2 file patch đồng bộ (row giống nhau, khác tiền tố path).

Local mode cần Node ≥ 22 trên PATH; lần chạy đầu npx tải package (1–3 phút).

## Thư mục

| Đường dẫn | Nội dung |
|---|---|
| `Dockerfile` | Frozen core: node:22 + bwrap/socat/iptables + `@deepseek-ai/dsh` 0.1.5-rc.3 + dsh-plugin + pnpm |
| `entrypoint.sh` | Hardened entrypoint (đã vá: chown-guard qua marker — tránh kẹt recursive chown trên bind-mount Windows) |
| `docker-compose.yml` | Service `skill-tree-harness`, port 8104/8105, healthcheck |
| `plugins/patch.yml` | **Loader entries — nơi ghép plugin** |
| `plugins/dsh-client-connection/` | Core plugin đã vá (bắt buộc, COPY vào image) |
| `plugins/secret/` | Plugin mẫu — pattern tham chiếu (Settings Secrets tab, routes `/secret/*`) |
| `plugins/skilltree-memory/` | Classroom memory — Cognee per-student: 3 tools `memory_ingest` / `memory_ask` / `memory_evolve`, dataset cách ly `student-<candidateId>` (README bên trong) |
| `plugins/skilltree/` | Skeleton plugin nghiệp vụ đồ án (chưa code — xem README bên trong) |
| `plugins/skilltree/skills/` | Skills cho agent (`<tên>/SKILL.md`) — agent tự thấy, không cần restart |
| `plugins/skilltree-auth-ui/` | UI plugin — Đăng nhập/Tạo tài khoản (M11 qua M10), JWT `skilltree.auth.v1` (branch `agent-v1-auth-ui`) |
| `plugins/skilltree-class-ui/` | UI plugin — quản lý lớp cá nhân giáo viên (M6 qua M10) (branch `agent-v1-class-ui`) |
| `plugins/skilltree-teacher-ui/` | UI plugin — dashboard GV: heatmap RAG, teaching plan, giao ôn tập (M5/M6/M1/M4/M7) (branch `agent-v1-teacher-ui`) |
| `plugins/skilltree-memory/` | Tool plugin — classroom memory Cognee per-student, dataset `student-<candidateId>` (branch `agent-v1-cognee-plugin`) |
| `plugins/skilltree-graph-dashboard/` | UI plugin — dashboard đồ thị khái niệm CASE (M1/M9/M5) (branch `agent-v1-graph`, thư mục root `plugins/`) |
| `runtime/` | Data/logs/workspace/dsh-home — gitignored, tự sinh khi chạy |
| `sdk/` | `dsh_web_sdk` — Python async SDK điều khiển harness từ ngoài |

## Ghép plugin mới (2 bước)

1. Thả source vào `plugins/<tên>/` — package.json khai `main` trỏ `lib/index.js`,
   **commit cả `lib/`** (plugin qua git không build lúc install).
2. Thêm row vào `- insert:` trong `plugins/patch.yml`:
   ```yaml
   - id: <tên>
     name: '/app/plugins/<tên>/lib/index.js'
   ```
3. `docker compose restart skill-tree-harness` → xem log boot:
   `docker logs skill-tree-harness 2>&1 | grep -E '<tên>|dsh web:'`

Plugin có UI client: cần `dsh.client.platform: "web"` + `exports["./client"]` trỏ
bundle có trên đĩa; card Settings đăng ký slot `settings.plugin.item` **bắt buộc
có `key:`** trùng namespace host.

## Hợp đồng với M1/M2 (đồ án)

- Agent gọi **M1 opencase** (`OPENCASE_URL`, mặc định `http://opencase-service:8101`)
  để đọc đồ thị khái niệm CASE → tool gợi ý khái niệm kế tiếp (tiên quyết đã đạt).
- Agent gọi **M2 quiz** (`QUIZ_URL`, mặc định `http://quiz-service:8102`) để
  lấy/đề xuất câu hỏi QTI → cập nhật mastery `w ← w + α(1−w)`.
- Agent gọi **cognee MCP** (row `mcp-cognee-memory` trong `plugins/patch.yml`)
  cho Graph RAG ask/pipeline. Plugin `skilltree-memory` bọc 3 tool classroom
  memory (`memory_ingest` / `memory_ask` / `memory_evolve`) trên cùng MCP đó,
  dataset cách ly theo học sinh `student-<candidateId>`.
- Dataset mỗi sinh viên cô lập theo workspace: `runtime/workspace/<candidateId>/`.
- `GET /api/v1/health` (contract chung của `services/`) sẽ thêm bằng plugin —
  hiện healthcheck compose đã có (kiểm tra HTTP server sống, 401 tính là sống).

## Ghi chú vận hành

- Token web: nguồn đúng = `docker logs` stdout; image có stable launch-token
  nên token **không đổi qua restart**.
- **Không cài plugin qua `dsh plugin add` bằng `docker exec`** — `HOME=/root`
  khiến nó cài vào cây "ghost" `/root/.dsh` mà runtime không bao giờ thấy.
  Chỉ dùng cách 2 bước ở trên.
- Restart đúng cách: `docker compose restart skill-tree-harness`
  (nút Restart trên hub UI không đáng tin).
- Nhật ký: `runtime/logs/container.log` (mirror của stdout; nếu file bị khóa
  trên Windows sẽ thấy `tee: Input/output error` — vô hại, stdout vẫn OK).
- Tài liệu vận hành hệ gốc đầy đủ: `<internal-agent-harness-repo>\docs\deployment.md`
  và `WIKI.md`.
