# Proposal: add-skilltree-auth-ui

## Why

V1 goal 1 (AGENTS.md) — **Đăng ký / đăng nhập**: hiện harness chưa có UI auth;
auth-service (M11, JWT HS256, role teacher/student, user đầu tiên = admin) và
api-gateway (M10) đã dựng sẵn nhưng gateway **chưa có prefix `auth`** nên client
không thể gọi M11 qua điểm vào duy nhất. Người dùng phải đăng nhập được ngay
trong Harness Web UI (Settings) trước khi các tính năng phân vai (lớp, lộ trình)
hoạt động.

## What Changes

- **NEW plugin `skilltree-auth-ui`** (`services/skill-tree-service/plugins/skilltree-auth-ui/`):
  - host half: same-origin proxy routes `/skilltree-auth/{config,login,register,verify}`
    → M10 gateway prefix `auth` (allow-list cố định, không open proxy);
  - client half: Settings section **"Tài khoản"** — Login + Register (2 vai rõ ràng:
    student mặc định; teacher/admin cần X-Admin-Token), JWT lưu
    `localStorage["skilltree.auth.v1"]`, gửi kèm `Authorization: Bearer`, verify lại
    khi reload, đăng xuất;
  - UI theo `DESIGN.md` (token xanh lá/ink/neutral, AA contrast) + anti-slop catalog.
- **Gateway M10**: thêm prefix `auth` → `AUTH_BASE_URL` (default `http://localhost:8108`)
  vào `UPSTREAMS` + test + README.
- **Harness M4**: `patch.yml` thêm row plugin; `.env.example` + `docker-compose.yml`
  thêm `SKILLTREE_GATEWAY_URL` (mặc định `http://localhost:8000`).

## Impact

- Affected specs: `auth-ui` (mới).
- Affected code:
  - `services/skill-tree-service/plugins/skilltree-auth-ui/**` (mới)
  - `services/skill-tree-service/plugins/patch.yml` (+1 row)
  - `services/skill-tree-service/{.env.example,docker-compose.yml}` (+1 env)
  - `services/api-gateway/app/config.py` (+1 prefix), `tests/test_proxy.py`
    (cập nhật số prefix 7→8 + test mới), `README.md` (bảng prefix/env)
- Không đổi API có sẵn nào của M1–M11 (chỉ thêm mapping gateway; hành vi cũ giữ nguyên).
