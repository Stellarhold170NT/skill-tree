# HANDOVER — Run-final Full-book (sandbox tiếp theo)

Trạng thái đêm 16–17/10: Stage A ✅, A/B probe ✅, Stage B ✅ (7 vòng, B1 winner),
Task 4 MVP ✅ (mentor + reviewer + graph→chunk grounding), Task 5 harness ✅ (3 tầng).
Việc còn lại: **run-final full-book + transfer check + báo cáo cuối.**

## 1. Khởi động sandbox mới

1. `sandbox_create` image python:3.11-slim, **8Gi / 4CPU**, ttl 86400, project_path=swebok-cognee
2. `sandbox_git_clone` (workspace đã có đủ code + corpus + presets — KHÔNG cần regen corpus)
3. Re-bootstrap venv: `/opt/venv` python -m venv + `pip install -r requirements.txt`
   (đồng bộ trong ~5 phút); PyMuPDF đã thay doclink/pypdf nếu cần PDF
4. `sandbox_vfs_write` .env (KHÔNG commit — keys trong Secrets): LLM_MODEL/ENDPOINT/3 keys,
   COGNEE_SKIP_CONNECTION_TEST=true
5. Anti-OOM env TRƯỚC khi import onnxruntime (setdefault trong code đã xử lý):
   OMP_NUM_THREADS=2, ORT_INTRA_OP_NUM_THREADS=2

## 2. Preset run-final (TẠO MỚI theo b1_semantic_boost.yaml)

- **dataset: swebok_v4_full** (ĐỪNG tái sử dụng swebok_v4_b1 — tránh nhầm memory 4-KA với full-book)
- **reset: true** — LƯU Ý QUAN TRỌNG đã học đêm nay: prune_system(metadata=True) xoá TOÀN BỘ
  registry các dataset cũ (S2, b1, b2 đều mất tên đăng ký). Chấp nhận vì: (a) toàn bộ số liệu
  Stage A/B đã ghi JSON evidence; (b) graph dump `artifacts/graph_swebok_v4_b1.json.gz`
  (313KB, 3,511n/13,429e) giữ tri thức B1; (c) rebuild b1 luôn làm lại được trong 80 phút.
- files: swebok-v4.md KHÔNG subsets (toàn sách ~14 KA)
- chunk_size 512, chunks_per_batch 25, extractor llm, custom_prompt = như b1 (semantic boost)
- Dự kiến thời lượng: full book ~3.5× S2 (86 trang → ~300 trang?) → **4–6 giờ**. Chạy detached
  Popen + poll log `[mem]` mỗi 9 phút; MemoryGuard log MemAvailable.
- Sau build: `analyze_graph.py --dataset swebok_v4_full` → so semantic_pct (kỳ vọng ≥30%),
  `dump_graph.py --dataset swebok_v4_full` → artifacts/graph_full.json.gz commit

## 3. Transfer check (đo khái niệm Stage B còn đúng trên full-book)

- Chạy `stage_b.py --label F1-full-baseline --mode GRAPH_COMPLETION --dataset swebok_v4_full`
  (24 câu stress) → so với R0-baseline 0.475/0.273: kỳ vọng corr ≈ ngang hoặc cao hơn
  (các câu out-of-corpus giờ IN-corpus → nhóm đó phải tăng rõ), elems tăng.
- Chọn 3 câu out-of-corpus cũ (S06 SCM, S09 Security, S14 Quality) so chi tiết trước/sau.
- Lưu ý judge: nhóm out cũ giờ có gold đúng → điểm phải lên; nếu không lên = graph full
  pha loãng → ghi nhận vào báo cáo (finding, không phải thất bại).

## 4. Báo cáo benchmark cuối (reports/benchmark-final.md)

Cấu trúc đề xuất:
1. Tóm tắt điều hành (1 trang): use case, kiến trúc, kết quả chính
2. Stage A: subset selection (S2 winner, bảng S1 vs S2)
3. A/B Graph Reasoning: bảng 3 chế độ × 5 topology + faithfulness analysis
   (probe_notes.md đã có sẵn số liệu)
4. Stage B: 7 vòng + B1 winner + lý do loại B3 (ADR 0003)
5. Agent MVP: mentor + reviewer + graph→chunk grounding (Task 4) — kèm 2 demo output
6. Transfer check full-book (mục 3)
7. Hạn chế & hướng tiếp: judge tự soạn gold, GLM-Flash là nút thắt (COT 0.46 ≈ GRAPH 0.475
   nhưng 7.5× đắt), TRIPLET không có SPO index, semantic ratio 42% cần verify trên full-book
8. Phụ lục: chỉ lệnh tái tạo (preset + lệnh build + eval)

## 5. Việc nhỏ còn treo

- taskloop: task 5 chuyển DONE (harness 3 tầng + README nếu cần), task 6 DONE khi
  run-final + transfer xong, task 4 DONE (MVP đã chạy) — cập nhật status từng task.
- Memory dài hạn (memory_remember): lưu bài học chính vào dataset platform
  (cognee reset gotcha, B1 winner config, graph vs chunk con số) sau khi báo cáo xong.
- Sandbox hiện tại (sess-69aeb4be) có thể die ~10:52 — mọi thứ quan trọng đã commit
  lên branch `agent-swebok-usecase1` (mới nhất: 786f36a2).
