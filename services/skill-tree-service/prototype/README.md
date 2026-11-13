# SkillTree Interactive Prototype (Standalone)

Bộ giao diện Prototype tương tác độc lập (Client-side HTML5/CSS3/Vanilla JS) cho hệ thống **SkillTree**, mô phỏng trọn vẹn 3 giao diện cốt lõi theo tinh thần ClassroomMemory và công thức chuẩn Glicko-2 / Ebbinghaus decay / DAG Frontier.

---

## 1. Cách mở xem ngay lập tức

Bạn có thể mở trực tiếp tệp `index.html` bằng bất kỳ trình duyệt nào:

1. **Cách 1 (Nhanh nhất - Double Click):**
   - Mở File Explorer tới thư mục `E:\nt170\SkillTree\services\skill-tree-service\prototype`
   - Nhấp đúp vào `index.html` (hoặc kéo thả vào Chrome / Edge / Firefox).

2. **Cách 2 (Chạy HTTP Server cục bộ):**
   ```bash
   cd E:\nt170\SkillTree\services\skill-tree-service\prototype
   python -m http.server 3000
   ```
   Sau đó truy cập trình duyệt: [http://localhost:3000](http://localhost:3000)

---

## 2. Các chức năng có trong Prototype

Bộ prototype được thiết kế tương tác trực tiếp (Real-time reactivity) với công thức toán học chuẩn:

### 🎓 1. Góc nhìn Học sinh (Student View)
- **Frontier Card (Bước tiếp theo)**: Tự động tính toán các node đã mở khoá (tất cả tiên quyết đều đạt Mastered) nhưng chưa làm chủ. Gợi ý bài học có tỷ lệ sẵn sàng cao nhất.
- **Thử làm Quiz tương tác (Live Glicko-2)**:
  - Bấm nút **"Luyện tập bài này"** hoặc làm quiz trên bất kỳ node nào.
  - Chọn đáp án Đúng hoặc Sai -> Bấm **"Nộp bài & Cập nhật Rating"**.
  - Xem điểm số **Rating** và **RD (Rating Deviation)** nhảy trực tiếp theo công thức Glicko-2 canonical.
  - Trạng thái kỹ năng đổi màu ngay lập tức: `Chưa mở khoá (LOCKED)` ➔ `Cần học (RED)` ➔ `Đang ôn (AMBER)` ➔ `Làm chủ (GREEN)`.
- **Ebbinghaus Decay Simulator**: Nút bấm **"Tua nhanh thời gian +14 ngày"** để xem các kỹ năng màu xanh bị quên lãng chuyển sang màu gỉ sét (Rusty) và cần ôn tập.

### 👩‍🏫 2. Bảng điều khiển Giáo viên (Teacher Dashboard)
- **Heatmap Matrix (Ma trận Lớp học)**:
  - Trực quan hoá toàn bộ học sinh trong lớp (Minh, An, Bảo, Châu, Đức, Hoa) theo từng kỹ năng toán học CASE.
  - Mỗi ô thể hiện rõ trạng thái màu và điểm Rating (ví dụ: `1580`).
- **Drawer Chi tiết Học sinh**: Nhấp vào bất kỳ hàng học sinh nào để mở Drawer trượt từ bên phải hiển thị chi tiết lịch sử học tập, mức độ suy giảm trí nhớ, và các kỹ năng đang bị kẹt.
- **Teaching Plan (Kế hoạch can thiệp)**:
  - Tự động quét toàn bộ lớp để phát hiện nút nghẽn (Bottleneck).
  - Áp dụng triết lý ClassroomMemory: *"Dạy tiên quyết còn hổng, không dạy triệu chứng bề mặt. Ưu tiên theo Độ sẵn sàng x Sức mạnh khai phóng."*
- **Class Ask (AI Tra cứu)**: Gõ câu hỏi như `"Ai yếu nhất?"`, `"Nên dạy gì tuần tới?"` để xem phản hồi thông minh phân tích dữ liệu lớp học.

### 🌳 3. Cây tri thức & Lộ trình (Curriculum Graph / CASE)
- Danh mục 10 kỹ năng chuẩn CASE Toán học: Từ Số học nguyên, Lũy thừa, Phân số cho đến Giải phương trình bậc hai và Đồ thị Parabol.
- Hiển thị đầy đủ điều kiện tiên quyết (Prerequisites), cấp độ Bloom, và chỉ số khai phóng (Unblocking Power) của từng kỹ năng.

---

## 3. Cấu trúc thư mục

```
prototype/
├── index.html   # Giao diện HTML5 ngữ nghĩa, responsive, tích hợp Modal & Drawer
├── styles.css   # Hệ thống Design Tokens của SkillTree (Forest Green, Emerald, Dark Teal)
├── app.js       # Engine toán học Glicko-2, Ebbinghaus decay, CASE graph, state management
└── README.md    # Tài liệu hướng dẫn sử dụng
```
