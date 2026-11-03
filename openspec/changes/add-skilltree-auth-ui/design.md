# Design: add-skilltree-auth-ui

## Context

M11 auth-service đã có contract thật (đọc từ source `services/auth-service/app/`):

- `POST /api/v1/auth/register` — body `{username, password, role∈student|teacher|admin}`,
  header `X-Admin-Token` cho role ≠ student; **user đầu tiên của DB = admin** dù
  không có token; trả `201 {accessToken, tokenType:"Bearer", expiresIn, user{id, username, role, sourcedId, createdAt}}`.
- `POST /api/v1/auth/login` — `{username, password}` → `200` cùng shape.
- `POST /api/v1/auth/verify` — header `Authorization: Bearer` → `{sub, username, role, exp}`.
- Validation: username 3–100 ký tự, password ≥ 8; lỗi 409 `USERNAME_TAKEN`,
  401 `BAD_CREDENTIALS`, 422 envelope chuẩn.

M10 gateway route `/{prefix}/{rest}` → `{upstream}/api/v1/{rest}` — nhưng
`UPSTREAMS` chưa có `auth` → phải thêm, nếu không "gọi M11 qua gateway" là chết.

## Goals / Non-Goals

- Goals: UI đăng nhập/đăng ký trong Harness; JWT tái sử dụng được bởi plugin khác;
  base URL gateway env-configurable; không mở proxy tùy ý.
- Non-Goals: refresh token, quên mật khẩu, OAuth, rate-limit riêng cho auth
  (V2); JWT decode phía client (chỉ tin `verify` của M11).

## Decisions

1. **Same-origin host proxy thay vì browser gọi thẳng gateway** (theo pattern
   `plugins/roadmap-viewer` + `plugins/secret`): host half mount
   `/skilltree-auth/*` qua `ctx.webServer.register`, forwards qua `fetch()` của
   Node 18+. Tránh CORS, không lộ địa chỉ service, token không nằm trong URL.
2. **Allow-list 3 route** (`login`, `register`, `verify`) + method + same-origin
   POST + body cap 16 KiB; forward chỉ `authorization` / `x-admin-token` /
   `content-type`; không log token. Route `config` (GET) trả base URL để UI hiển thị.
3. **Env `SKILLTREE_GATEWAY_URL`** (mặc định `http://localhost:8000`) ở host half
   (12-factor); UI có ô "Cấu hình nâng cao" override lưu
   `localStorage["skilltree.auth.gateway"]`, gửi kèm field `__baseUrl` (validated
   `^https?://`, bị strip trước khi forward). Không chọn chỉ-env vì không chắc
   bwrap/entrypoint passthrough env; không chọn chỉ-UI vì cần default từ máy chủ.
4. **Storage key `skilltree.auth.v1`** = `{accessToken, tokenType, expiresAt, user}` —
   contract chia sẻ cho plugin khác (roadmap-viewer sẽ đọc để gửi Authorization).
   Verify-on-mount: đọc key → POST verify → hết hạn thì clear + thông báo.
5. **2 vai rõ ràng trên UI**: role select (student mặc định); teacher/admin hiện
   ô X-Admin-Token bắt buộc (client chặn submit khi thiếu) + helper text giải
   thích rule "user đầu tiên = admin" và hành vi "thiếu token → vẫn tạo nhưng
   thành student" (source `service.py register()`).
6. **Gateway `auth` prefix**: thêm `"auth": ("AUTH_BASE_URL", "http://localhost:8108")`
   — đường wire `{base}/auth/auth/login`. Test cập nhật `len(routes)==8`, thêm
   test `POST /auth/auth/login` map đúng `/api/v1/auth/login`.
7. **UI token**: dùng đúng `--st-*` của `DESIGN.md` (khai báo custom properties
   trên root của section, không rò rỉ ra global); nút chính `#167F4D` + chữ trắng
   (5.03:1 AA); heading serif Georgia (tone "bookshop"); không gradient/glass/glow,
   không shadow+hairline cùng element; radius 4/8/12/999; spacing bội số 4px.

## Risks / Trade-offs

- `__baseUrl` cho phép client trỏ proxy sang máy khác — chấp nhận cho V1
  (giống roadmap-viewer cho phép nhập base URL; cần truy cập trình duyệt mới khai
  thác được). Ghi rõ trong README.
- JWT trong localStorage chịu XSS — V1 chấp nhận (pattern chung của harness);
  V2 cân nhắc HttpOnly cookie + CSRF.
- Gateway `auth` chưa gắn JWT hook — cố ý: login/register phải gọi được trước khi
  có token; verify do M11 đảm nhiệm.
