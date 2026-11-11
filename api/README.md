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

### B. `api/quiz-service/` (Cổng 8102)
Module **M2** - Ngân hàng câu hỏi trắc nghiệm & chấm điểm chuẩn **1EdTech QTI v3.0**.
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Items`: Quản lý câu hỏi trắc nghiệm (đơn lựa chọn, đa lựa chọn), nhập xuất chuẩn QTI v3.0 XML (`rptemplates/match_correct`), liên kết khái niệm (`conceptUri`).
* `Tests`: Lắp ráp đề thi (`AssessmentTest`) theo từng phân đoạn (sections).
* `Attempts & Outcomes`: Chấm điểm tự động từng lượt làm bài hoặc theo lô (bulk) và tổng hợp tỷ lệ làm đúng theo từng khái niệm (`byConcept`).

### C. `api/class-service/` (Cổng 8103)
Module **M6** - Quản lý trường học, lớp học & hồ sơ danh sách chuẩn **1EdTech OneRoster v1.2**.
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Orgs`: Quản lý trường học, khoa, phòng ban đào tạo (`orgType`: department, school, district).
* `Courses`: Quản lý học phần, môn học theo niên khóa (`schoolYear`).
* `Classes`: Quản lý các lớp học phần (`term`), danh sách sinh viên (`students`) và giảng viên (`teachers`).
* `Users`: Quản lý người dùng và cấp mã định danh ẩn danh toàn hệ thống `sourcedId` (`candidateId`).
* `Enrollments`: Đăng ký tham gia lớp học phần cho sinh viên và giáo viên (`primary`).

### D. `api/learner-model-service/` (Cổng 8105)
Module **M5** - Năng lực người học, chống quên lãng & Gợi ý lộ trình (**Trái tim hệ thống**).
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Mastery`: Cập nhật năng lực sinh viên bằng thuật toán **Glicko-2** ($r$, $RD$, $\sigma$), ánh xạ Sigmoid sang xác suất thành thạo $[0, 1]$, phát hiện điểm rơi kiến thức rỉ sét (**Ebbinghaus Decay**).
* `Recommendation`: Gợi ý khái niệm tối ưu kế tiếp (**Frontier**) dựa trên các tiên quyết đã mở khóa và tiềm năng mở rộng (*Unlock Value*) từ đồ thị M1.
* `Class Views`: Bản đồ nhiệt ma trận lớp học (**Heatmap**) và kế hoạch giảng dạy sư phạm tương phản (**Contrastive Teaching Plan**) cho giảng viên.

### E. `api/assignment-service/` (Cổng 8106)
Module **M7** - Giao bài tập can thiệp trúng đích (Targeted Practice & Interventions).
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Assignments`: Tạo bài tập can thiệp tự động cho nhóm học sinh gặp khó khăn (`red`, `rusty`, `red_rusty`) từ Heatmap của M5 (`learner-model-service`), liên kết với câu hỏi từ M2 (`quiz-service`), và kích hoạt sinh đề kiểm tra M2 `AssessmentTest` (`ASG-<id>`).

### F. `api/document-service/` (Cổng 8107)
Module **M3** - Kho lưu trữ tài liệu học tập & tri thức chuẩn **W3C/LRMI**.
* `Health`: Kiểm tra trạng thái hoạt động của service.
* `Documents`: Quản lý tài liệu học tập, thời lượng học (`typicalLearningTime` ISO-8601), cấp độ giáo dục.
* `Files`: Tải lên và quản lý tệp nhị phân gốc (PDF, TeX, TXT) với mã băm SHA-256.
* `Chunks & Alignments`: Quản lý các đoạn văn bản (chunks) và gán nhãn căn chỉnh sư phạm (`teaches`, `assesses`, `requires`, `summarizes`) với các concept của `opencase-service`.

### G. `api/rag-service/` (Cổng 8109)
Module **Student Notebook RAG** - Hỏi đáp tài liệu & Trợ lý học tập thông minh.
* `Health`: Kiểm tra trạng thái liveness của service.
* `Documents`: Tải lên tài liệu học tập (`.md`, `.txt`, `.html`, `.tex`, `.zip`), xem cây mục lục ToC, quản lý vòng đời tài liệu.
* `Jobs`: Theo dõi tiến độ nạp tài liệu bất đồng bộ (`stageMs`: parse, chunk, mirror, index).
* `Ask`: Hỏi đáp thông minh với 2 chế độ (`retrieve` siêu tốc qua BM25 FTS5 hoặc `answer` qua LLM).
* `Metrics`: Giám sát hiệu năng và độ trễ truy xuất (p50/p95/max).

### I. pi/auth-service/ (Cổng 8108)
Module **M11** - Xác thực, cấp phát token JWT & phân quyền truy cập (**RBAC**).
* Health: Kiểm tra trạng thái hoạt động của service.
* Auth: Đăng ký tài khoản (POST /api/v1/auth/register - tài khoản đầu tiên tự động thành dmin, các tài khoản sau mặc định student, cần mã token quản trị để kích hoạt 	eacher), đăng nhập lấy mã Bearer JWT (POST /api/v1/auth/login), kiểm tra giải mã tính hợp lệ của token (POST /api/v1/auth/verify).
* Users: Lấy hồ sơ thông tin người dùng hiện tại từ token (GET /api/v1/users/me).

---

## 2. Hướng dẫn mở và kiểm thử trên Bruno

1. Mở ứng dụng **Bruno**.
2. Chọn **Open Collection**.
3. Duyệt và chọn thư mục collection bạn muốn test:
   * `api/opencase-service` (Test đồ thị môn học).
   * `api/quiz-service` (Test ngân hàng câu hỏi QTI & chấm điểm).
   * `api/class-service` (Test tổ chức trường học, lớp học & OneRoster).
   * `api/learner-model-service` (Test tính năng lực Glicko-2, Heatmap & Frontier).
   * `api/assignment-service` (Test giao bài tập can thiệp trúng đích).
   * `api/document-service` (Test kho tài liệu và chunks).
   * `api/rag-service` (Test hỏi đáp sổ tay học tập thông minh).
4. Ở góc trên bên phải của Bruno, chọn Environment tương ứng: **`Local`**.
