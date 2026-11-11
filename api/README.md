# SkillTree API Collections (Bruno)

Thư mục chứa các API Collection theo chuẩn [Bruno](https://www.usebruno.com/) cho các microservice trong hệ sinh thái SkillTree.

Mỗi collection đều được viết đầy đủ tài liệu API bằng Markdown ngay trong tab **Docs** theo chuẩn của Bruno ([Bruno API Documentation Overview](https://docs.usebruno.com/api-docs/overview)).

---

## 1. Danh sách Collections

* **`api/opencase-service/`**: Module M1 - Quản lý đồ thị khái niệm môn học theo chuẩn 1EdTech CASE v1.1.
  * `Health`: Kiểm tra trạng thái hoạt động của service.
  * `Documents`: Quản lý các khung chương trình học thuật (`CFDocument`).
  * `Items`: Quản lý các điểm kiến thức nguyên tử (`CFItem`).
  * `Associations`: Quản lý các cạnh đồ thị (`CFAssociation` - điều kiện tiên quyết, phân cấp).
  * `Graph & Learning Order`: Xuất đồ thị, gói CASE JSON-LD, thứ tự topo và kiểm tra mở khóa concept.

---

## 2. Hướng dẫn mở và kiểm thử trên Bruno

1. Mở ứng dụng **Bruno**.
2. Chọn **Open Collection**.
3. Duyệt và chọn thư mục collection bạn muốn test (ví dụ: `api/opencase-service`).
4. Ở góc trên bên phải của Bruno, chọn Environment: **`Local`** (URL: `http://localhost:8101/api/v1`).
5. Luồng kiểm thử đề xuất:
   * **B1 (Documents)**: Chạy `Create Document` $\rightarrow$ Bruno tự động lưu `documentId` vào biến môi trường.
   * **B2 (Items)**: Chạy `Create Item 1 (Prerequisite)` và `Create Item 2 (Dependent)` $\rightarrow$ Lưu `originItemId` và `destinationItemId`.
   * **B3 (Associations)**: Chạy `Create Prerequisite Edge` $\rightarrow$ Nối 2 concept lại với nhau.
   * **B4 (Cycle Test)**: Chạy `Create Cycle Edge (Expect 409)` $\rightarrow$ Kiểm tra cơ chế chống chu trình lặp của đồ thị.
   * **B5 (Graph)**: Chạy `Get Topological Order` và `Check Prerequisites` $\rightarrow$ Xem thứ tự học và kiểm tra mở khóa.
