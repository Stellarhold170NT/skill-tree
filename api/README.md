# SkillTree API Collections (Bruno)

Thư mục chứa các API Collection theo chuẩn [Bruno](https://www.usebruno.com/) cho các microservice trong hệ sinh thái SkillTree.

Mỗi collection đều được viết đầy đủ tài liệu API bằng Markdown ngay trong tab **Docs** theo chuẩn của Bruno ([Bruno API Documentation Overview](https://docs.usebruno.com/api-docs/overview)).

---

## 1. Danh sách Collections

### A. `api/opencase-service/` (Cổng 8101)
Module **M1** - Quản lý đồ thị khái niệm môn học theo chuẩn **1EdTech CASE v1.1**.
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Documents`: Quản lý các khung chương trình học thuật (`CFDocument`).
* `Items`: Quản lý các điểm kiến thức nguyên tử (`CFItem`).
* `Associations`: Quản lý các cạnh đồ thị (`CFAssociation` - điều kiện tiên quyết, phân cấp).
* `Graph & Learning Order`: Xuất đồ thị, gói CASE JSON-LD, thứ tự topo và kiểm tra mở khóa concept.

### B. `api/document-service/` (Cổng 8107)
Module **M3** - Kho lưu trữ tài liệu học tập & tri thức chuẩn **W3C/LRMI**.
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Documents`: Quản lý tài liệu học tập, thời lượng học (`typicalLearningTime` ISO-8601), cấp độ giáo dục.
* `Files`: Tải lên và quản lý tệp nhị phân gốc (PDF, TeX, TXT) với mã băm SHA-256.
* `Chunks & Alignments`: Quản lý các đoạn văn bản (chunks) và gán nhãn căn chỉnh sư phạm (`teaches`, `assesses`, `requires`, `summarizes`) với các concept của `opencase-service`.

---

## 2. Hướng dẫn mở và kiểm thử trên Bruno

1. Mở ứng dụng **Bruno**.
2. Chọn **Open Collection**.
3. Duyệt và chọn thư mục collection bạn muốn test:
   * `api/opencase-service` (Test đồ thị môn học).
   * `api/document-service` (Test kho tài liệu và chunks).
4. Ở góc trên bên phải của Bruno, chọn Environment tương ứng: **`Local`**.
