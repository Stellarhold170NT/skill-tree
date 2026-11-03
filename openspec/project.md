# Project: SkillTree (Graph RAG for tracking & recommending learners)

## Context

Đồ án "Ứng dụng Graph RAG trong việc hỗ trợ theo dõi và gợi ý người học".
Services M1–M11 (FastAPI, mỗi service một DB) + `skill-tree-service` (M4 —
DeepSeek Harness, port 8104) làm giao diện chính; mọi tính năng UI mới đi vào
harness dưới dạng plugin. Chuẩn công nghiệp: CASE v1.1, QTI v3.0, Caliper v1.2,
LRMI, OneRoster v1.2 (chi tiết `docs/MODULES.md`).

## Goals

- V1 chạy được end-to-end cho giáo viên + học sinh (auth → lớp → lộ trình → RAG).
- Plugin is everything: không sửa lõi harness, thêm plugin mới cho mỗi tính năng.
- Mọi giao diện dùng token từ `DESIGN.md` (brand xanh lá #27A95F, ink #1C3632).

## Constraints

- Mỗi service sở hữu DB riêng; liên kết qua URI/REST, không SELECT chéo.
- REST + JSON versioned `/api/v1`; gateway (M10) miễn trừ; error envelope thống nhất.
- Node workflow: OpenSpec change trước khi code; pytest xanh trước khi DONE.
