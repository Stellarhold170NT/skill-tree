# Tasks: add-skilltree-auth-ui

## 1. Gateway M10 — prefix auth

- [x] 1.1 Thêm `"auth": ("AUTH_BASE_URL", "http://localhost:8108")` vào `UPSTREAMS`
      (`services/api-gateway/app/config.py`)
- [x] 1.2 Cập nhật `tests/test_proxy.py`: route table 7→8, thêm `auth` vào vòng
      test prefix, thêm test `POST /auth/auth/login` → `/api/v1/auth/login`
- [x] 1.3 Cập nhật `services/api-gateway/README.md` (bảng prefix + env `AUTH_BASE_URL`)

## 2. Plugin skilltree-auth-ui

- [x] 2.1 `package.json` — `dsh.client.platform: "web"`, `exports: {".", "./client"}` (pattern `secret`)
- [x] 2.2 Host half `lib/index.js` — 4 route same-origin `/skilltree-auth/*`,
      allow-list, forward Authorization/X-Admin-Token, env `SKILLTREE_GATEWAY_URL`,
      502 envelope khi gateway chết, không log token
- [x] 2.3 Client half `client/client.js` — React.createElement (không JSX),
      Settings section "Tài khoản": tab Đăng nhập / Tạo tài khoản, role select
      + X-Admin-Token khi teacher/admin, JWT localStorage + Authorization,
      verify khi reload, Kiểm tra phiên, Đăng xuất, ô gateway URL nâng cao
- [x] 2.4 UI theo DESIGN.md (token `--st-*`, AA contrast, anti-slop checklist)
- [x] 2.5 `README.md` plugin (vai trò, INPUT/OUTPUT, env, cách chạy/test, phụ thuộc)
- [x] 2.6 FIX lần 2: `handleRegister` gửi header `X-Admin-Token` qua `authCall(..., extraHeaders)`
      — trước đây mã admin chỉ được kiểm tra phía client, không bao giờ tới M11 nên
      teacher/admin luôn bị xếp vai student dù mã đúng (vi phạm spec scenario
      "Đăng ký giáo viên cần admin token")

## 3. Gắn vào harness M4

- [x] 3.1 `plugins/patch.yml` — thêm row `skilltree-auth-ui`
- [x] 3.2 `.env.example` + `docker-compose.yml` — biến `SKILLTREE_GATEWAY_URL`

## 4. Kiểm chứng

- [x] 4.1 `node --check` cả 2 file JS (bằng chứng trong report)
- [x] 4.2 `pytest -q services/api-gateway` xanh (bằng chứng trong report)
- [x] 4.3 Smoke curl thủ công qua proxy host-half (bằng chứng trong report)
- [x] 4.4 `node tests/client.mjs` — test hành vi nửa client 6/6 (login lưu JWT,
      verify-on-reload gửi Authorization, teacher register gửi X-Admin-Token,
      student không gửi, token rỗng bị chặn, verify 401 xóa token) — RED trước fix
      (C4 fail: header=undefined), GREEN sau fix

## 5. Commit

- [x] 5.1 Commit `feat: [AUTH-61004] add skilltree-auth-ui plugin (login/register, JWT flow)`
      scopes: skill-tree-service,plugins; push branch `agent-v1-auth-ui`; tạo PR
- [x] 5.2 Commit `fix: [FIX-61101]` — UI gửi X-Admin-Token + tests/client.mjs;
      push tiếp lên `agent-v1-auth-ui` (cùng PR)
