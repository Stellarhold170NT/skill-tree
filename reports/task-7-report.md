# Task 7 — SWEBOK QA bank toàn diện: eval trên memory full-book C5, phân tích câu kém, đề xuất tối ưu

**Status:** DONE_WITH_CONCERNS
**Ngày:** 2026-10-18 (báo cáo duyệt sáng 19-10)
**Contract:** Task #1 (taskloop) — "T7: SWEBOK QA bank toàn diện (18 KA × 3 level) → eval full-book → phân tích câu kém → đề xuất tối ưu → báo cáo sáng 19/10"

---

## 1. Mục tiêu và phạm vi

Task này trả lời ba câu hỏi sau khi C5b (full-book graph 11,275 nodes / 48,382 edges) đã hoàn tất:

1. **Độ phủ kiến thức**: bộ câu hỏi cũ (24 stress + 40 basic) có bám sát toàn bộ 18 KA của SWEBOK v4 không? Câu trả lời là **chưa** — stress set thiên về multi-hop cross-chapter, basic set 40 câu không đều theo chương. T7 xây bank mới **54 câu = 18 KA × 3 mức (L1/L2/L3)**, mỗi câu bám sát tiêu đề mục của chương tương ứng trong corpus.
2. **Chất lượng retrieval trên full-book graph**: chạy toàn bộ 54 câu qua pipeline eval chuẩn (GRAPH_COMPLETION trên dataset `swebok_v4_full_c5`) với judge correctness/element/hop như các round trước, đo baseline của bank mới.
3. **Chẩn đoán câu kém**: với mọi câu điểm thấp (bottom quintile), phân loại nguyên nhân và đề xuất hướng tối ưu cụ thể.

## 2. Thiết kế bank câu hỏi

### 2.1 Cấu trúc

| Level | Định nghĩa | Số câu | Kiểu chủ yếu |
|---|---|---|---|
| L1 | Recall định nghĩa/cấu phần từ 1 mục của 1 chương | 18 | recall, linear |
| L2 | So sánh/phân tích trong nội bộ 1 chương (2–3 mục liên quan) | 18 | analysis, tree |
| L3 | Multi-hop xuyên mục hoặc xuyên chương (2–3 KA) | 18 | multi_hop, linear |

Mỗi dòng JSONL gồm: `id` (QA-L{level}-NN), `level`, `ka`, `kas_secondary` (L3), `type` (recall|analysis|multi_hop), `topology` (linear|tree), `question`, `gold_answer` (650–1438 ký tự, kết thúc "Phần tử key: …"), `expected_path` (hop với mũi tên →), `source_section` (trỏ đúng mục Ch.X).

### 2.2 Nguyên tắc soạn

- **Bám sát sách**: mỗi câu soạn sau khi trích `###` outline của chương trong `corpora/swebok-v4/swebok-v4.md`; `source_section` luôn trỏ tới mục có thật.
- **Gold tự chứa**: liệt kê điểm chấm điểm + trailer "Phần tử key:" — cùng format stress set để `ab_probe.judge_*` hoạt động không đổi.
- **Calibration**: L1 ≈ definitional recall, L2 = so sánh trong chương, L3 = multi-hop kiểu stress set nhưng không dùng negative topology (mọi câu đều được chấm elems/hops).
- **Tệp**: 6 part file (`questions_bank_T7_p1..p6.jsonl`, ~16–19KB mỗi file) + file ghép `questions_bank_T7.jsonl` (106KB, 54 dòng JSON hợp lệ, 54 id duy nhất, 18 KA, 18×L1/18×L2/18×L3).

## 3. Phương pháp eval

- **Pipeline**: `src/skilltree/eval/t7_eval.py` — clone stage_b.py với 4 khác biệt: (1) đọc bank T7; (2) dataset mặc định `swebok_v4_full_c5`; (3) **resume support** — row append ngay sau mỗi câu, chạy lại skip id đã có; (4) summary có breakdown theo `level` và `ka`.
- **Cấu hình**: `--mode GRAPH_COMPLETION --top-k 10 --dataset swebok_v4_full_c5` (winner config C5).
- **Judge**: `judge_correctness`, `judge_elements`, `judge_hops` từ `ab_probe.py` — giữ nguyên so với R0→F1 để so sánh được.
- **Chạy**: daemon nền trong container sess-93159cee (pid 5966), log `/tmp/t7.log`; 54 câu × ~50–290s, hoàn tất ~1h50m, **0 lỗi, 0 retry**.

## 4. Kết quả

### 4.1 Tổng thể (54/54 scored)

| Metric | Giá trị | So với stress-set F1 (24 câu) |
|---|---|---|
| Correctness | **0.510** | F1 0.544; R0 0.475 — nằm giữa, chấp nhận được cho bank khó và phủ rộng hơn |
| Element completeness | **0.365** | F1 0.331 — cao hơn dù bank gồm 18 câu L3 nhiều nội dung |
| Hop precision | **0.576** | F1 0.69 — thấp hơn: bank có 36 câu L1/L2 ít hop-oriented |
| p50 latency | **74.1s** | F1 51.8s — chậm hơn ~45% (câu hỏi dài, gold dài hơn) |

### 4.2 Theo level — gradient độ khó PHẲNG về correctness

| Level | n | corr | elems | hop |
|---|---|---|---|---|
| L1 (recall) | 18 | 0.503 | 0.454 | 0.503 |
| L2 (analysis) | 18 | 0.517 | 0.412 | 0.671 |
| L3 (multi_hop) | 18 | 0.511 | **0.231** | 0.528 |

**Quan sát then chốt**: corr gần như không phân biệt level (0.50–0.52), nhưng **elems phân biệt rõ** (L3 chỉ bằng một nửa L1). Hai kết luận: (a) judge correctness bị compress về giữa — kém nhạy; (b) với câu hỏi multi-hop, graph trả lời thiếu nội dung các KA phụ (`kas_secondary`) — đúng vấn đề cần chẩn đoán.

### 4.3 Theo KA — điểm mạnh/điểm yếu

**Top**: Requirements 0.6 (elems 0.83, hop 0.933 — tốt nhất bank); Maintenance 0.667; Computing Foundations 0.667; Professional Practice 0.6; Construction 0.55.

**Bottom**: **SCM 0.333** (L1-08 = 0.0 — câu điểm thấp nhất bank); **Testing 0.417** (elems = 0.0 cả 3 câu); **Process 0.4** (L1-10 corr 0.3 dù elems 0.625); Operations 0.467; Management 0.433.

### 4.4 Điểm đặc biệt

- **Hoàn hảo (1.0)**: QA-L1-07 (4 nhóm bảo trì), QA-L3-14 (trade-off + stakeholder → đàm phán yêu cầu), QA-L3-16 (distributed/parallel → thiết kế → construction).
- **Thất bại**: QA-L1-08 (baseline SCM) = **0.0** dù elems 0.67 — case nghiên cứu judge; QA-L3-05 (testing ↔ activities) = 0.25, elems 0.0.

## 5. Phân tích câu kém — nguyên nhân gốc

### RC1 — Judge correctness nhiễu ở hai cực (ảnh hưởng ~15–19% câu)

Bằng chứng mâu thuẫn hai chiều giữa hai judge trên CÙNG một answer: L1-08 corr=0.0 vs elems=0.67; L1-10 corr=0.3 vs elems=0.625; ngược lại L3-14 corr=1.0 vs elems=0.0; L3-16 corr=1.0 vs elems=0.0, hop=0.0. Corr và elems không nhất quán theo cả hai hướng → corr ở mức câu có noise lớn, không dùng được làm tín hiệu duy nhất. Ghi chú: L1-08 answer thực chất nêu đúng vai trò trung tâm của baseline trong SCM (elems judge đã thấy điều đó).

### RC2 — Element judge false-negative với style trả lời của graph (~20% câu có elems=0)

11/54 câu có elems=0.0 (Testing cả 3 câu, Models&Methods cả 3, L1-03, L2-10, L3-10, L3-15, L3-16, L3-18). Element judge derive key elements 1–4 từ từ gold rồi tìm literal trong answer — nhưng graph trả lời bằng thuật ngữ/viết khác (VD: L1-03 answer nêu đúng "components, interfaces, internal structure" nhưng element judge vẫn 0). Corr của cùng các câu này 0.3–1.0 → elems bị低估 hệ thống khi answer dùng từ khác gold.

### RC3 — GRAPH_COMPLETION trả lời kiểu "định vị" hơn là "liệt kê" (nguyên nhân chất lượng thật sự)

**9/10 câu bottom** mở đầu bằng "## 1. Vị trí: Ch XX …". Answer tốt ở định vị cấu trúc (chương, mục, figure) nhưng thường dừng ở đó thay vì liệt kê nội dung mà gold yêu cầu (VD: L1-09 cần 7 hoạt động quản lý dự án, answer chỉ nêu Figure 9-1 + vài tên đầu). Nguyên nhân sâu: C5b có 39.1% structural edges — search ưu tiên trả về nodes cấu trúc/heading, và prompt GRAPH_COMPLETION mặc định không ép liệt kê đầy đủ.

### RC4 — Multi-hop xuyên chương: elems L3 = 0.231, hop L3 = 0.528

Câu L3 có `kas_secondary` (KA thứ 2, 3) nhưng retrieval chỉ chạy 1 query text — context thường chỉ phủ KA chính. L3 elems thấp hơn L1 hơn một nửa. Hop precision L2 (0.671) > L3 (0.528) củng cố: mỗi hop thêm một KA ngoài phạm vi retrieval là một lần mất nội dung.

### RC5 — Khoảng trống graph/book (ít, ~1–2 KA)

Computing Foundations: corr 0.667 (tốt) nhưng elems 0.047 — phần lớn là RC2 (judge), nhưng L2-16 (hashing vs tree) elems 0.14 + hop 0.2 gợi ý nội dung CS cơ bản của Ch16 mỏng trong graph so với phần SE của sách. Cần kiểm tra riêng trước khi kết luận.

### Phân bổ nguyên nhân cho 10 câu bottom

| Nguyên nhân | Số câu | Câu tiêu biểu |
|---|---|---|
| RC1 (judge corr nhiễu) | ~4 | L1-08, L1-10, L1-03 (một phần), L3-02 |
| RC2 (elems false-negative) | ~6 | L1-03, L3-11, L3-08, L3-05 (một phần) |
| RC3 (locate-vs-enumerate) | ~7 | L1-09, L1-10, L3-11, L2-14 |
| RC4 (multi-hop thiếu KA phụ) | ~5 | L3-05, L3-06, L3-08, L3-11, L3-18 |
| RC5 (graph mỏng) | ~1 | L2-16 |

*(một câu có thể mang nhiều nguyên nhân; tổng > 10 vì vậy)*

## 6. Đề xuất tối ưu (ưu tiên theo ROI)

1. **Sửa element judge trước khi tin elems (RC2 — rẻ nhất, tác động lớn nhất)**: thêm fuzzy matching (lemma/đồng nghĩa EN–VI) hoặc derive key elements từ gold + paraphrase; kỳ vọng elems false-negative giảm mạnh, elems tổng có thể từ 0.365 lên ~0.5+ mà không đụng retrieval.
2. **Recalibrate judge correctness (RC1)**: hiện score compress về 0.4–0.6 ở mọi level. Hai lựa chọn: (a) ensemble 2–3 judge calls với nhiệt độ khác nhau, lấy trung bình; (b) dùng elems (đã sửa) làm primary metric cho QA bank, corr chỉ làm secondary — vì corr hiện kém nhạy hơn elems về độ khó.
3. **Prompt directive chống locate-only (RC3)**: thêm vào prompt GRAPH_COMPLETION chỉ dẫn kiểu "liệt kê đầy đủ các mục/nội dung được hỏi, không dừng ở định vị chương/mục". A/B trên đúng 10 câu bottom (~15 phút chạy) trước khi áp toàn bank.
4. **Query decomposition cho L3 (RC4)**: tách câu multi-hop theo `kas_secondary` thành 2–3 sub-query, merge context rồi trả lời — hoặc viết lại query chứa keyword cả hai KA. Đo trên 18 câu L3 so sánh elems L3 trước/sau.
5. **Kiểm tra Ch16 mỏng (RC5)**: truy vấn trực tiếp vài khái niệm Ch16 (hashing, big-O) để xác nhận gap; nếu có, cân nhắc enrich indexing Ch16 ở lần build sau.
6. **Không đề xuất rebuild graph cho T7**: các gap chính là judge + prompt + retrieval, không phải cấu trúc graph — audit precision 0.885 của C5b vẫn giữ giá trị.

## 7. Tái hiện

```bash
# eval (daemon, resume-safe — chạy lại skip toàn bộ 54 id đã có)
cd /workspace && /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank
# phân tích
/opt/venv/bin/python src/skilltree/eval/t7_analyze.py --label T7-bank
# ghép bank từ 6 part
/opt/venv/bin/python -c "import json; [open('corpora/swebok-v4/questions_bank_T7.jsonl','w').write(''.join(l for p in range(1,7) for l in open(f'corpora/swebok-v4/questions_bank_T7_p{p}.jsonl')))]"
```

**Evidence**: `reports/evidence/t7-summary.json`, `t7-analysis.json`, `t7-results-compact.jsonl` (54 row điểm số); raw results đầy đủ (88KB, kèm answers 1200 ký tự) tại container `runs/t7/T7-bank/results.jsonl` + log `/tmp/t7.log`.

## 8. Concerns

1. **Judge noise (RC1, RC2)** làm con số tuyệt đối của corr/elems chỉ đáng tin ở mức aggregate, không ở mức từng câu — các nhận xét level/KA dựa trên aggregate n=18/n=3 nên ổn định hơn.
2. **Raw results (88KB) chỉ nằm trong container** — container TTL hết thì mất; đã push bản compact + summary + analysis lên VFS/GitHub, raw có thể tạo lại bằng rerun (resume không tốn thêm call nào vì skip hết).
3. Bank 54 câu mới được chạy **1 lần duy nhất** — chưa đo variance giữa các lần chạy; đề nghị giữ điều này làm limitation khi so sánh với stress-set (24 câu, đã chạy nhiều round).

## 9. Checklist

- [x] Bank 54 câu (18 KA × 3 level) soạn, validate JSON, gold có trailer "Phần tử key"
- [x] `t7_eval.py` viết, compile ok, chạy daemon, resume hoạt động
- [x] Eval 54/54 hoàn tất, 0 lỗi — summary có breakdown level/KA
- [x] Phân tích bottom quintile + nguyên nhân (`t7_analyze.py` → `analysis.json`, 5 root causes)
- [x] Đề xuất tối ưu có căn cứ từ dữ liệu (6 đề xuất, ưu tiên ROI)
- [x] Commit + push GitHub (branch agent-swebok-usecase2)
- [x] Contract Task #1 → DONE_WITH_CONCERNS
