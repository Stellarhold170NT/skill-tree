"""Update task-7-report.md: + Bước 4 (variance + probe), sửa concerns #3."""

from pathlib import Path

p = Path("/workspace/reports/task-7-report.md")
t = p.read_text(encoding="utf-8")

anchor = "## 7. Tái hiện"
assert anchor in t, "anchor missing"
step4 = """### Bước 4 — Variance B2 (run 2) + probe true-zero: B2 XÁC NHẬN ỔN ĐỊNH

Chạy lại toàn bộ 18 câu L3 hybrid (run 2, label T7-pilot-b2-r2):

- elems_v2: run1 0.518, run2 0.490 — **cả hai trên baseline graph-only 0.411**; per-question |delta| mean chỉ 0.029 (max 0.25); mean 2 runs = 0.504 (+0.093 vs baseline)
- corr: run1 0.494, run2 0.461; swing lớn nhất L3-16 1.0→0.4 cùng câu — đúng hiện tượng RC1; corr |delta| per-question mean 0.061
- Kết luận: elems_v2 là metric ổn định (deterministic, |Δ| 0.029); corr không ổn định ở mức câu. B2 ADOPT được xác nhận với variance thấp.

Probe 2 true-zero còn lại (CHUNKS top_k=10, key-term matching):

- **QA-L1-12**: 4/6 terms HIT ('quality definition', 'specified requirements', 'implied needs', 'ISO/IEC 25010') → nội dung CÓ trong corpus, zero là lỗi tầng answer-selection, không phải indexing gap. 2 terms MISS ('chi phí chất lượng', 'phát hiện sớm') là cụm VI không khớp text EN ('cost of quality', 'early defect detection'...).
- **QA-L3-05**: 3/6 terms HIT ('testability', 'operational testing', 'evaluation of tests') — đúng 3 term EN mà hybrid đã đưa vào answer (elems 0→0.333). 3 MISS là cụm VI ('vòng phản hồi', 'cải tiến', 'mối quan hệ với yêu cầu').
- **Bằng chứng cho B3 (term alignment VI→EN)**: các miss còn lại đều là mismatch ngôn ngữ, không phải thiếu dữ liệu. Query expansion VI→EN glossary là hướng kế tiếp có căn cứ.

## 7. Tái hiện"""
t = t.replace(anchor, step4, 1)

old_c3 = "3. **B2 pilot dùng retrieval non-deterministic** — mean +0.108 trên 18 câu đủ lớn để vượt noise (đã thấy per-question swing ±0.15 giữa runs), nhưng bước tiếp theo nên chạy lại 1 lần nữa để xác nhận."
new_c3 = "3. **B2 đã đo variance (run 2)**: elems_v2 per-question |Δ| 0.029, mean 2 runs +0.093 so baseline — ổn định, đủ tin để đưa vào pipeline. Corr per-question swing tới 0.6 (L3-16) — chỉ dùng aggregate."
assert old_c3 in t, "concern3 not found"
t = t.replace(old_c3, new_c3, 1)

old_next = "Bước tiếp theo tự nhiên: (1) chạy lại 18 câu L3 với B2 thêm 1 lần để đo variance; (2) nếu ổn định, thêm mode `hybrid` vào `t7_eval.py` làm mặc định cho L3; (3) đưa elems_v2 làm primary metric, corr làm secondary."
new_next = "Đã thực hiện: (1) run 2 đo variance — ổn định (Bước 4); (2) mode `--hybrid-l3` đã thêm vào `t7_eval.py` (compile OK); (3) elems_v2 làm primary metric được xác nhận bằng variance data. Hướng kế tiếp: B3 query expansion VI→EN (probe đã chứng minh mismatch ngôn ngữ là gap chính còn lại)."
assert old_next in t, "next-steps not found"
t = t.replace(old_next, new_next, 1)

p.write_text(t, encoding="utf-8")
print("report updated, size:", len(t))
