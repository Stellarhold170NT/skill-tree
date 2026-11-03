# graph-dashboard — Spec Delta

## ADDED Requirements

### Requirement: Chọn môn học từ M1

Dashboard SHALL cho phép chọn môn học (CFDocument của M1) từ danh sách tải về
thay vì nhập documentId thủ công.

#### Scenario: Danh sách môn học hiển thị

- **WHEN** người dùng mở panel và M1 đang chạy
- **THEN** dashboard gọi RPC `skilltree.listSubjects` →
  `GET {M1}/api/v1/documents?limit=200` và render `title` của từng document
  vào dropdown "— Chọn môn học —"

#### Scenario: Tải đồ thị theo môn đã chọn

- **WHEN** người dùng chọn một môn và bấm "Tải dashboard"
- **THEN** dashboard gọi RPC `skilltree.getGraph` →
  `GET {M1}/api/v1/documents/{id}/graph` và vẽ spine từ `nodes`/`edges`

### Requirement: Spine khái niệm dependency-valid

Dashboard SHALL render các CFItem theo thứ tự topology (Kahn) trên cạnh
`isPrerequisiteOf`, node key bằng CASE `identifier`.

#### Scenario: Thứ tự topology đúng

- **WHEN** graph có cạnh prerequisite A→B→C
- **THEN** thứ tự hiển thị là A, B, C; B có 1 tiên đề (A) và mở khóa 1 khái
  niệm (C)

#### Scenario: Fallback khi không có dữ liệu học sinh

- **WHEN** chưa nhập sourcedId học sinh
- **THEN** node gốc hiển thị trạng thái `next`, node có tiên đề hiển thị
  `locked`

### Requirement: Chi tiết khái niệm khi click node

Dashboard SHALL hiển thị thẻ chi tiết khi người dùng click một node.

#### Scenario: Thẻ chi tiết đầy đủ

- **WHEN** node được click
- **THEN** hiển thị fullStatement, humanCodingScheme (nếu có), danh sách tiên
  đề (label), số khái niệm mở khóa; click lần nữa thì thu gọn

### Requirement: Tài liệu liên quan từ M9

Dashboard SHALL hiển thị các chunk của document-service (M9) được gắn alignment
với khái niệm đang chọn.

#### Scenario: Chunk được lọc theo alignment

- **WHEN** M9 trả chunks có `alignments[].conceptUri === node.identifier`
- **THEN** chỉ các chunk đó hiện trong mục "Tài liệu liên quan", kèm
  `alignmentType` và đoạn trích 180 ký tự

#### Scenario: M9 lỗi hoặc trống không phá dashboard

- **WHEN** M9 không phản hồi hoặc không có chunk nào khớp
- **THEN** graph vẫn hiển thị, mục tài liệu hiện thông báo rỗng trang nhã

### Requirement: Độ nhớ học sinh từ M5

Dashboard SHALL hiển thị mức nhớ per-concept khi có sourcedId học sinh.

#### Scenario: Trạng thái màu theo M5

- **WHEN** có sourcedId và M5 trả `MasteryRead[]`
- **THEN** mỗi node map `state` (`green|amber|red|rusty`) thành dot + chip + %,
  kèm Glicko rating ± RD và số lần ôn

#### Scenario: M5 lỗi không làm trắng graph

- **WHEN** M5 không phản hồi
- **THEN** graph vẫn hiển thị với trạng thái cấu trúc (next/locked)

### Requirement: Token DESIGN.md — không còn màu legacy

Cả hai plugin (`roadmap-viewer`, `skilltree-graph-dashboard`) SHALL chỉ dùng
biến `--st-*` của DESIGN.md.

#### Scenario: Legacy palette bị loại bỏ

- **WHEN** quét CSS của 2 plugin
- **THEN** không còn `#4136d6` (và tint legacy), có `--st-primary-500:#27A95F`,
  `--st-danger:#B3261E`, `--st-warn:#8A4B00`; không có `gradient`

### Requirement: Đăng ký UI cộng thêm

Plugin SHALL đăng ký một entry `shell.overlay` cộng thêm, không đè UI có sẵn.

#### Scenario: Entry không shadow

- **WHEN** harness load plugin
- **THEN** entry `shell.overlay` id `skilltree-graph-dashboard` (order 51) tồn
  tại song song với roadmap-viewer (order 50) và các entry gốc khác
