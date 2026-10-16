# Task 2 Report — Corpus preparation: SWEBOK v4

- Date: 2026-10-16 · Branch: `agent-swebok-usecase1` · Sandbox: `sess-ba4e45b7`
- Đọc kèm: `docs/plans/CONTEXT.md` (GLOSSARY: Corpus/Dataset/Benchmark/Run), `reports/task-1-report.md`

## 1. Kết quả chính

| Hạng mục | Kết quả |
|---|---|
| PDF | `corpora/swebok-v4/swebok-v4.pdf` — 6.1 MB, magic `%PDF-`, **413 trang** (pypdf/PyMuPDF mở được, có text layer) |
| Markdown | `corpora/swebok-v4/swebok-v4.md` — **1,312,997 chars**, format `=== [p. N] ===` + heading `#/##/###` chèn từ bookmark TOC của PDF |
| Metadata | `corpora/swebok-v4/metadata.json` — **18/18 knowledge areas** (`missing=[], extra=[]`), page range **chính xác** (từ `doc.get_toc()` — 815 entries), cây section 3 cấp cho từng KA |
| Chunks (cl100k, overlap = size/8) | `chunks_512.jsonl` **891** chunks (avg 441 tok) · `chunks_1024.jsonl` **425** (avg 863) · `chunks_2048.jsonl` **208** (avg 1,753) — tổng ~365K token, Corpus ≈ 413 trang |
| Question set | `corpora/swebok-v4/questions.jsonl` — **40 câu tiếng Việt / 15 knowledge areas** (giữ `ka` + `source_section` tiếng Anh) |
| Spot-check | **10/10 PASS** (sample seed=42) — và **40/40 PASS** khi chạy toàn bộ question set |
| Code | `src/skilltree/prep/` — `download.py`, `extract.py`, `chunk.py`, `build_questions.py`, `spotcheck.py`, `__init__.py` (idempotent, có `__init__.py`) |

## 1a. Quan trọng: tình trạng sync VFS ↔ container

Broker của sandbox này chỉ sync **1 chiều VFS → container**. Do đó:

- **Có trong VFS (sẽ được commit/push)**: toàn bộ `src/skilltree/prep/*.py`, `corpora/swebok-v4/questions.jsonl` (sha256 `0f4d548b…` khớp byte-for-byte với container), `reports/task-2-report.md`.
- **Chỉ có trong container** (VFS không đẩy ngược được): `swebok-v4.pdf` (gitignored — đúng ý), `swebok-v4.md` (1.31MB), `metadata.json` (97KB), `chunks_{512,1024,2048}.jsonl` (~3.7MB). Việc chuyển ~5MB text qua kênh chat là bất khả thi; **tất cả regenerable deterministic bằng 3 lệnh** (mục "Tái lập") — `extract.py` chạy ~40s với PyMuPDF, `chunk.py` ~15s, `download.py` tải PDF từ URL đã pin trong code. Task 3 (ingest) dùng trực tiếp bản trong container, không bị ảnh hưởng.

## 1.1 Lựa chọn kỹ thuật extract: PyMuPDF thay docling (theo chỉ đạo orchestrator)

docling 2.139.0 **fail lặp lại 3 lần** trong sandbox:

1. `cognee[docling]` cài docling nhưng **thiếu `torch`** → cài `torch==2.14.1+cpu` (index CPU PyTorch).
2. Tiếp theo **thiếu `transformers`** → theo chỉ đạo, cài 1 lần đủ bộ `uv pip install docling==2.139.0` (kéo thêm tree-sitter, v.v.).
3. Sau khi đủ deps, layout model **`docling-layout-heron` không load được**: `Could not import module 'AutoImageProcessor'` (không tương thích giữa docling 2.139.0 và transformers vừa cài; nhánh ttf-model yêu cầu API transformers khác). Chi phí vá chuỗi dependency lớn hơn giá trị → **fallback PyMuPDF 1.28.2** (`uv pip install PyMuPDF`, ~40MB, không cần torch).

PyMuPDF hóa ra là lựa chọn tốt hơn cả về chất lượng metadata: PDF có sẵn **bookmark TOC 815 entries** → `metadata.json` lấy **page range chính xác từng KA/section** thay vì ước lượng theo tỷ lệ ký tự. `pypdf` quick-extract cũng đọc được text (1.28M chars/26.6s, dùng làm nguồn đọc preview khi soạn câu hỏi) nhưng không có TOC outline → không dùng làm corpus.

**Ghi nhận môi trường**: cài thêm `torch==2.14.1+cpu`, `pymupdf==1.28.2`, `docling==2.139.0` (đầy đủ) vào `/opt/venv` — không đụng `pyproject.toml`/`uv.lock`/`.env`.

## 2. Thiết kế Corpus

- `swebok-v4.md`: mỗi trang một khối `=== [p. N] ===`, heading chèn từ TOC (`#` chapter → `###` subsection) để chunk/ingest giữ ngữ cảnh section; text giữ nguyên đọc từ `page.get_text("text")`.
- `metadata.json`: `knowledge_areas[18]` gồm `name`, `chapter`, `page_start/page_end` (chính xác), `sections[]` (title/level/page). Kèm `front_matter_and_appendices` (Introduction to the Guide, Appendix A/B/C) và `ka_check` đối chiếu với danh mục 18 KA chuẩn của SWEBOK v4.0.

### Bảng 18 Knowledge Areas (page range chính xác)

| # | Knowledge Area | Pages |
|---|---|---|
| 1 | Software Requirements | 43–66 |
| 2 | Software Architecture | 67–82 |
| 3 | Software Design | 83–99 |
| 4 | Software Construction | 100–117 |
| 5 | Software Testing | 118–152 |
| 6 | Software Engineering Operations | 153–168 |
| 7 | Software Maintenance | 169–186 |
| 8 | Software Configuration Management | 187–203 |
| 9 | Software Engineering Management | 204–222 |
| 10 | Software Engineering Process | 223–234 |
| 11 | Software Engineering Models and Methods | 235–247 |
| 12 | Software Quality | 248–265 |
| 13 | Software Security | 266–275 |
| 14 | Software Engineering Professional Practice | 276–289 |
| 15 | Software Engineering Economics | 290–313 |
| 16 | Computing Foundations | 314–346 |
| 17 | Mathematical Foundations | 347–368 |
| 18 | Engineering Foundations | 369–413 |

## 3. Chunk (cho Benchmark chunk-based — KHÔNG thay chunking của cognee)

Tokenizer: `tiktoken/cl100k_base`. Đóng gói theo đoạn văn, tách tại heading, breadcrumb section + KA gắn vào từng chunk; overlap = size/8 token.

| Size | Overlap | File | Chunks | Tổng token | min/avg/max |
|---|---|---|---|---|---|
| 512 | 64 | `chunks_512.jsonl` | **891** | 393,193 | 64 / 441.3 / 576 |
| 1024 | 128 | `chunks_1024.jsonl` | **425** | 366,689 | 128 / 862.8 / 1,152 |
| 2048 | 256 | `chunks_2048.jsonl` | **208** | 364,513 | 1,123 / 1,752.5 / 2,048 |

Mỗi dòng: `{"chunk_id": "swebok-v4-<size>-NNNNN", "size_tokens", "n_tokens", "ka", "section", "text"}`.

## 4. Question set vàng (tiếng Việt — user hỏi–đáp tiếng Việt)

40 câu, soạn tay từ nội dung SWEBOK v4 (không gọi LLM), ưu tiên định nghĩa/số liệu/nguyên tắc dễ đối chiếu. `question`+`gold_answer` tiếng Việt; `ka`+`source_section` tiếng Anh (Chương N của SWEBOK v4.0).

| Knowledge Area | Số câu | IDs |
|---|---|---|
| Software Requirements | 6 | Q01–Q06 |
| Software Testing | 6 | Q17–Q22 |
| Software Architecture | 4 | Q07–Q10 |
| Software Design | 3 | Q11–Q13 |
| Software Construction | 3 | Q14–Q16 |
| Software Security | 3 | Q36–Q38 |
| Software Maintenance | 2 | Q24–Q25 |
| Software Configuration Management | 2 | Q26–Q27 |
| Software Engineering Management | 2 | Q28–Q29 |
| Software Engineering Process | 2 | Q30–Q31 |
| Software Engineering Models and Methods | 2 | Q32–Q33 |
| Software Quality | 2 | Q34–Q35 |
| Software Engineering Operations | 1 | Q23 |
| Software Engineering Professional Practice | 1 | Q39 |
| Software Engineering Economics | 1 | Q40 |
| **Tổng** | **40** | **15 KA (yêu cầu ≥8)** |

## 5. Spot-check (thủ công hóa bằng `src/skilltree/prep/spotcheck.py`)

Phương pháp: mỗi câu có sẵn 1–4 "probe" (cụm tiếng Anh đặc trưng lấy từ đoạn gốc SWEBOK hỗ trợ gold answer); tìm probe trong `swebok-v4.md` đã chuẩn hóa (nối từ gạch chân xuống dòng, gộp whitespace) và báo page. Seed cố định (42) để tái lập.

**Kết quả sample 10 câu (seed=42): 10/10 PASS**

| ID | KA | Probe khớp | Trang |
|---|---|---|---|
| SWEBOK-Q08 | Software Architecture | 2/2 | 71 |
| SWEBOK-Q02 | Software Requirements | 3/3 | 19, 43 |
| SWEBOK-Q18 | Software Testing | 2/2 | 119 |
| SWEBOK-Q16 | Software Construction | 2/2 | 109, 110 |
| SWEBOK-Q15 | Software Construction | 3/3 | 9 |
| SWEBOK-Q09 | Software Architecture | 2/2 | 72 |
| SWEBOK-Q07 | Software Architecture | 1/1 | 68 |
| SWEBOK-Q06 | Software Requirements | 2/2 | 50 |
| SWEBOK-Q28 | Software Engineering Management | 2/2 | 204 |
| SWEBOK-Q39 | Professional Practice | 1/1 | 276 |

Chạy full 40 câu (cùng seed): **40/40 PASS** — mỗi câu đều tìm thấy ≥1 probe trong corpus, số probe khớp trung bình ~2/câu.

## 6. Vấn đề gặp phải & cách xử lý

1. **docling không chạy được trong sandbox** (3 lần fail: thiếu torch → thiếu transformers → heron `AutoImageProcessor` không tương thích) → PyMuPDF theo chỉ đạo orchestrator. Đã ghi `extractor_note` trong `metadata.json`.
2. **Broker fence chặn shell redirection (`>`/`>>`)** vào workspace → mọi file repo ghi qua action dual-write (tool `sandbox_vfs_write`); log dài ghi `/root/*.log` bằng `open()` trong python, chạy detached bằng `subprocess.Popen` rồi poll.
3. Fence còn nhận nhầm cả ký tự `>=` trong heredoc python là redirection → viết lại lệnh tránh ký tự đó.
4. **Sync container→VFS không tồn tại**: md/metadata/chunks (sinh bởi python trong container) không lên VFS được qua tool; chỉ chuyển được file nhỏ qua kênh chat. Đã chuyển `questions.jsonl` (29.3KB, sha khớp 2 phía). md/metadata/chunks ghi rõ ở mục 1 + lệnh tái lập; không chặn Task 3 vì cognee đọc trực tiếp container fs.
5. `sandbox_edit_file`/`runEditFile` không được broker hỗ trợ (`unsupported action keys`) → sửa file VFS bằng cách ghi lại toàn bộ file.
6. Spot-check ban đầu miss 2/10 do từ bị tách gạch chân cuối dòng kiểu `con-\ncepts` (để lại "soft ware" khi chuẩn hóa sai thứ tự) → sửa `normalize()`: nối `-\n` trước, bỏ `-` còn lại sau → 10/10.

## 7. Cách tái lập (từ repo sạch, ~2 phút)

```bash
cd /workspace
/opt/venv/bin/python src/skilltree/prep/download.py          # tải PDF (idempotent)
/opt/venv/bin/python src/skilltree/prep/extract.py           # PyMuPDF -> md + metadata (~40s)
/opt/venv/bin/python src/skilltree/prep/chunk.py             # chunks 512/1024/2048
/opt/venv/bin/python src/skilltree/prep/build_questions.py   # questions.jsonl (nhúng sẵn 40 câu)
/opt/venv/bin/python src/skilltree/prep/build_questions.py --check   # đối chiếu file vs code
/opt/venv/bin/python src/skilltree/prep/spotcheck.py --n 10 --seed 42 # spot-check
```

Idempotency: mọi script ghi đè cùng tên file, không nhân bản dữ liệu; `build_questions.py --check` xác minh byte-khớp; spotcheck dùng seed cố định.

## 8. Bàn giao cho Task 3 (ingest/recall/eval)

- Corpus sẵn sàng trong container: `/workspace/corpora/swebok-v4/` (pdf + md + metadata + questions + chunks) — cognee ingest dùng `swebok-v4.md` (hoặc `add` theo từng KA để gắn metadata).
- Chunks 512/1024/2048 dùng cho nhánh Benchmark chunk-based (so sánh với Memory cognee).
- Lưu ý Task 1 đã ghi: extra đúng là `cognee[evals,deepeval]`; chạy mọi script từ cwd `/workspace`.
