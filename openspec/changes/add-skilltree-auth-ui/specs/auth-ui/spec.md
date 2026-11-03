# auth-ui Specification (delta)

## ADDED Requirements

### Requirement: Đăng nhập trong Harness Web UI

Harness SkillTree SHALL cung cấp UI đăng nhập (username + password) tại
Settings → "Tài khoản", gọi auth-service (M11) **qua api-gateway (M10)**.

#### Scenario: Đăng nhập thành công

- **WHEN** người dùng nhập username/password hợp lệ và bấm "Đăng nhập"
- **THEN** UI gọi `POST /skilltree-auth/login` (host half) → gateway prefix
  `auth` → M11 `POST /api/v1/auth/login`
- **AND** UI nhận `{accessToken, tokenType, expiresIn, user}`, lưu vào
  `localStorage["skilltree.auth.v1"]` và hiển thị profile (username + vai)

#### Scenario: Sai thông tin đăng nhập

- **WHEN** M11 trả `401 BAD_CREDENTIALS`
- **THEN** UI hiển thị thông báo lỗi tiếng Việt, không lưu token, không chuyển
  sang trạng thái đã đăng nhập

### Requirement: Đăng ký với phân vai rõ ràng

UI đăng ký SHALL cho chọn vai: học sinh (mặc định) hoặc giáo viên/quản trị;
vai khác học sinh SHALL yêu cầu X-Admin-Token và UI SHALL giải thích quy tắc
"user đầu tiên của hệ thống là admin".

#### Scenario: Đăng ký học sinh

- **WHEN** người dùng đăng ký username (≥3 ký tự) + password (≥8 ký tự) + confirm khớp, vai học sinh
- **THEN** UI gọi `POST /skilltree-auth/register` với body `{username, password, role:"student"}`
- **AND** thành công → tự đăng nhập (lưu JWT, hiện profile vai "Học sinh")

#### Scenario: Đăng ký giáo viên cần admin token

- **WHEN** người dùng chọn vai "Giáo viên" và để trống mã admin
- **THEN** UI chặn submit với thông báo yêu cầu X-Admin-Token
- **WHEN** người dùng nhập mã admin đúng
- **THEN** UI gửi header `X-Admin-Token` và tài khoản nhận vai `teacher`
- **WHEN** mã admin sai/thiếu
- **THEN** M11 vẫn tạo tài khoản vai `student`; UI hiển thị cảnh báo rõ việc này

### Requirement: JWT lưu localStorage và gửi kèm Authorization

Plugin SHALL lưu JWT vào `localStorage["skilltree.auth.v1"]`
(`{accessToken, tokenType, expiresAt, user}`) và gửi
`Authorization: Bearer <token>` trên các lời gọi auth tiếp theo.

#### Scenario: Reload giữ phiên

- **WHEN** người dùng reload trang (hoặc mở lại Settings) với JWT còn hạn trong localStorage
- **THEN** UI tự gọi `POST /skilltree-auth/verify` kèm header Authorization
- **AND** token hợp lệ → hiển thị profile; token hết hạn/sai → clear localStorage + hiện form đăng nhập

#### Scenario: Đăng xuất

- **WHEN** người dùng bấm "Đăng xuất"
- **THEN** xóa `localStorage["skilltree.auth.v1"]` và quay lại form đăng nhập

### Requirement: Gateway định tuyến prefix auth

Api-gateway (M10) SHALL định tuyến prefix `auth` tới auth-service (M11) theo
contract `/{prefix}/{rest}` → `{upstream}/api/v1/{rest}`.

#### Scenario: Đường wire của login qua gateway

- **WHEN** client gọi `POST {gateway}/auth/auth/login`
- **THEN** gateway forward tới `{AUTH_BASE_URL}/api/v1/auth/login`
  (mặc định `http://localhost:8108`, env-configurable)

#### Scenario: Route table công bố prefix auth

- **WHEN** client gọi `GET /api/v1/routes`
- **THEN** bảng prefixes có entry `auth` → upstream 8108

### Requirement: Proxy host-half an toàn (allow-list)

Host half của plugin SHALL chỉ forward 3 endpoint M11 cho phép
(login/register/verify), chỉ nhận POST same-origin, body ≤ 16 KiB, và SHALL
KHÔNG log token/mật khẩu.

#### Scenario: Gateway chết

- **WHEN** gateway/auth-service không phản hồi
- **THEN** proxy trả `502` envelope `{"error":{"code":"UPSTREAM_UNAVAILABLE",...}}`
  và UI hiển thị thông báo lỗi thân thiện

#### Scenario: POST chéo origin bị chặn

- **WHEN** POST tới `/skilltree-auth/login` với `origin` khác `host`
- **THEN** proxy trả `403 UNTRUSTED_ORIGIN` và không gọi upstream
