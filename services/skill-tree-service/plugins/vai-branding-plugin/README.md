# vAiPlatform Branding Plugin (v2)

Plugin rebrand toàn diện cho **DeepSeek Harness (DSH)**: thay màu, logo, wordmark,
favicon, tiêu đề tab và màn hình boot — mà **không cần sửa mã nguồn DeepSeek**, chỉ
qua một file cấu hình duy nhất (`brand.config.json`). Tải lại trang (F5) là áp dụng ngay,
không cần khởi động lại container.

Plugin chạy ở phía host (Node), đăng ký qua `ctx.webServer.tapIndex` để chèn stylesheet
và một boot-script nhỏ vào `index.html`. Toàn bộ bề mặt thương hiệu được "mirror" từ hệ
thống design token của DeepSeek (`--dsw-*`), nên mọi nơi DeepSeek dùng màu xanh thương
hiệu đều chuyển sang màu vAiPlatform tự động.

---

## Cấu trúc thư mục

```text
vai-branding-plugin/
├── package.json          # metadata plugin (chuẩn Cordis/dsh-plugin)
├── brand.config.json     # FILE CẤU HÌNH (logo, wordmark, title, favicon — KHÔNG còn màu)
├── assets/
│   └── logo.svg          # logo vector SVG của vAiPlatform
├── styles/
│   └── design-platform.css  # BẢN SAO token màu DSH — nguồn sự thật duy nhất cho màu
└── lib/
    ├── index.js          # entrypoint: đăng ký tapIndex + REST API
    └── theme-engine.js   # engine sinh CSS/script từ brand.config.json + mirror
```

---

## Cơ chế (Theme Engine v2)

DeepSeek Harness quy định màu qua hệ thống token trong
`@deepseek-ai/dsh-client-ui-theme/src/styles/design-platform.css`:
- **Ramp tĩnh** `--dsw-static-deepseek-50…-900` là nguồn gốc của mọi sắc xanh.
- **Alias** `--dsw-alias-*` (link, business-primary, button-info, bubble, sidebar
  active accent, focus ring, boot arc…) đều tham chiếu ramp đó.

Plugin đặt trong mình một **bản sao y nguyên** của file đó tại
`styles/design-platform.css`, chèn **verbatim vào cuối stylesheet** (mọi
declaration tự động được boost `!important` để luôn thắng). Bản sao này là
**nguồn sự thật duy nhất cho màu sắc** — muốn đổi màu nào thì sửa token/mã màu
ngay tại đó, F5 là áp dụng (Zero-Restart Live Reload).

`brand.config.json` **không còn chứa khóa màu nào** (`theme` đã bị loại bỏ);
nó chỉ còn điều khiển logo, wordmark, tiêu đề tab, favicon và các cờ bật/tắt:
- Logo/wordmark trên sidebar (CSS background-image cho mark + `::after` text cho name).
- Hero/welcome logo.
- Màn hình boot (wordmark tĩnh `'HARNESS'` → tên thương hiệu qua CSS `::after`).
- Tiêu đề tab trình duyệt (boot-script theo dõi `<title>` do React quản) →
  đổi hậu tố sản phẩm thành `brandName`.
- Favicon (boot-script đặt `<link rel="icon">` — DSH vốn không có favicon).

> Trong-app brand surface dùng thuần CSS (không đụng tới React reconciliation);
> chỉ tiêu đề và favicon dùng script vì CSS không chạm tới được.

---

## Hướng dẫn tùy chỉnh nhanh

### 1. Đổi màu thương hiệu (QUAN TRỌNG)
Mở `styles/design-platform.css` và sửa trực tiếp token/mã màu, ví dụ ramp
DeepSeek xanh → màu vAiPlatform:
```css
body {
  --dsw-static-deepseek-500: rgb(253, 80, 90);  /* đèn hiệu chính */
  --dsw-static-deepseek-450: rgb(253, 106, 114);
  /* … các slot 50→900 tùy ý … */
}
```
Các alias (`--dsw-alias-link`, `--dsw-alias-brand-primary`…) tự đổi theo vì
chỉ trỏ vào ramp. **F5 là đổi màu ngay.** `brand.config.json` không có khóa
màu nữa.

### 2. Thay logo
Chép file SVG vào `assets/logo.svg` (hoặc đổi `assets.logo` trỏ tới tên khác). Cỡ hiển
thị điều khiển bởi `ui.logoWidth/logoHeight` (sidebar) và `ui.heroLogoWidth/heroLogoHeight`
(hero/welcome).

### 3. Đổi tên thương hiệu (wordmark + tiêu đề tab + boot)
Sửa `brandName`. Nó lan ra: wordmark sidebar, tiêu đề tab (`Session — <brandName>`),
và màn hình boot.

### 4. Tắt bớt nếu muốn
```json
{
  "ui": { "stylePrimaryButtons": false, "hideOriginalBrandWordmark": false },
  "browser": { "replaceTitle": false, "setFavicon": false, "rewriteBootWordmark": false }
}
```

### 5. Token tùy chọn (escape hatch)
Đè trực tiếp bất kỳ biến CSS nào qua `css` (object → khối `:root`, hoặc chuỗi CSS thô).
Lưu ý: khối mirror `styles/design-platform.css` dùng `!important`, nên muốn đè màu
qua `css` phải tự viết `!important`; màu sắc nên sửa trực tiếp trong mirror:
```json
{
  "css": {
    "--dsw-alias-link": "#FD505A !important"
  }
}
```

---

## REST API

`GET /api/brand/config` — trả về config đang hiệu lực (sau khi merge với default),
hữu ích khi kiểm tra/gỡ lỗi.

---

## Ghi chú triển khai

- Plugin được nạp qua `deepseek-harness/plugins/patch.yml` (mục `insert`).
- Config được đọc lại mỗi request `index.html`, nên **Zero-Restart Live Reload**:
  sửa file rồi F5 là thấy kết quả, không cần `docker compose restart`.
- `theme-engine.js` cam kết giữ tương thích với schema cũ (các khóa v1 như
  `hideOriginalBrandWordmark`, `browser.*`… vẫn hoạt động). Riêng **khối
  `theme` (các khóa màu như `primaryColor`, `brandText`…) đã bị loại bỏ** và
  sẽ bị bỏ qua nếu còn trong config — mọi màu sắc giờ được sửa trực tiếp
  trong `styles/design-platform.css`.
