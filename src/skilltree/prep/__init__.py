"""prep — chuẩn bị Corpus SWEBOK v4 cho Benchmark (Task 2).

Thành phần:
- download.py       : tải swebok-v4.pdf vào corpora/swebok-v4/ (idempotent)
- extract.py        : PyMuPDF PDF -> swebok-v4.md + metadata.json (idempotent)
                      (docling bị bỏ vì layout model không chạy được trong sandbox)
- chunk.py          : chunk token 512/1024/2048 -> chunks_<size>.jsonl
                      (chỉ dùng cho Benchmark chunk-based, KHÔNG thay chunking của cognee)
- build_questions.py: tạo/kiểm tra question set vàng questions.jsonl (tiếng Việt)

Tất cả script chạy lại được, cwd khuyến nghị = repo root (/workspace).
"""
