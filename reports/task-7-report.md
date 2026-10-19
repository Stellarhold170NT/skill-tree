# Task 7 — SWEBOK QA bank toàn diện: eval trên memory full-book C5, phân tích câu kém, đề xuất tối ưu

**Status:** DONE_WITH_CONCERNS
**Ngày:** 2026-10-18 (báo cáo duyệt sáng 19-10; cập nhật đêm: A2 glossary + B3 pilot)
**Contract:** Task #1 (taskloop) — "T7: SWEBOK QA bank toàn diện (18 KA × 3 level) → eval full-book → phân tích câu kém → đề xuất tối ưu → báo cáo sáng 19/10"; Task #2 — "B3 pilot: query expansion VI→EN"

---

## 1. Mục tiêu và phạm vi

Task này trả lời ba câu hỏi sau khi C5b (full-book graph 11,275 nodes / 48,382 edges) đã hoàn tất:

1. **Độ phủ kiến thức**: bộ câu hỏi cũ (24 stress + 40 basic) có bám sát toàn bộ 18 KA của SWEBOK v4 không? Câu trả lời là **chưa** — stress set thiên về multi-hop cross-chapter, basic set 40 câu không đều theo chương. T7 xây bank mới **54 câu = 18 KA × 3 mức (L1/L2/L3)**, mỗi câu bám sát tiêu đề mục của chương tương ứng trong corpus.
2. **Chất lượng retrieval trên full-book graph**: chạy toàn bộ 54 câu qua pipeline eval chuẩn (GRAPH_COMPLETION trên dataset `swebok_v4_full_c5`) với judge correctness/element/hop như các round trước, đo baseline của bank mới.
3. **Chẩn đoán câu kém**: với mọi câu điểm thấp (bottom quintile), phân loại nguyên nhân và đề xuất hướng tối ưu cụ thể — kèm **pilot thực nghiệm từng hướng** (mục 6b, 6 bước).

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
- **Gold tự chứa**: liệt kê điểm chấm điểm + trailer "Phần tử key:" — cùng format stress set để `ab_probe.judge_*` hoạt động không đổi, và là đầu vào cho metric v2 (mục 6b/A1).
- **Calibration**: L1 ≈ definitional recall, L2 = so sánh trong chương, L3 = multi-hop kiểu stress set nhưng không dùng negative topology (mọi câu đều được chấm elems/hops).
- **Tệp**: 6 part file (`questions_bank_T7_p1..p6.jsonl`, ~16–19KB mỗi file) + file ghép `questions_bank_T7.jsonl` (106KB, 54 dòng JSON hợp lệ, 54 id duy nhất, 18 KA, 18×L1/18×L2/18×L3).

## 3. Phương pháp eval

- **Pipeline**: `src/skilltree/eval/t7_eval.py` — clone stage_b.py với 4 khác biệt: (1) đọc bank T7; (2) dataset mặc định `swebok_v4_full_c5`; (3) **resume support** — row append ngay sau mỗi câu, chạy lại skip id đã có; (4) summary có breakdown theo `level` và `ka`.
- **Cấu hình**: `--mode GRAPH_COMPLETION --top-k 10 --dataset swebok_v4_full_c5` (winner config C5); mode `--hybrid-l3` mới (B2, mục 6b).
- **Judge**: `judge_correctness`, `judge_elements`, `judge_hops` từ `ab_probe.py` — giữ nguyên so với R0→F1 để so sánh được.
- **Chạy**: daemon nền trong container sess-93159cee, log `/tmp/t7.log`; 54 câu × ~50–290s, hoàn tất ~1h50m, **0 lỗi, 0 retry**.

## 4. Kết quả

### 4.1 Tổng thể (54/54 scored)

| Metric | Giá trị | So với stress-set F1 (24 câu) |
|---|---|---|
| Correctness | **0.510** | F1 0.544; R0 0.475 — nằm giữa, chấp nhận được cho bank khó và phủ rộng hơn |
| Element completeness v1 (LLM judge) | **0.365** | F1 0.331 |
| Element completeness v2 (deterministic) | 0.468 | — |
| Element completeness **v2 + glossary VI→EN (metric chuẩn cuối, xem 6b)** | **0.499** | — |
| Hop precision | **0.576** | F1 0.69 — thấp hơn: bank có 36 câu L1/L2 ít hop-oriented |
| p50 latency | **74.1s** | F1 51.8s — chậm hơn ~45% (câu hỏi dài, gold dài hơn) |

### 4.2 Theo level (elems v2+glossary)

| Level | n | corr | elems v2 | elems **v2+glossary** | hop |
|---|---|---|---|---|---|
| L1 (recall) | 18 | 0.503 | 0.523 | **0.540** | 0.503 |
| L2 (analysis) | 18 | 0.517 | 0.470 | **0.525** | 0.671 |
| L3 (multi_hop) | 18 | 0.511 | 0.411 | **0.434** | 0.528 |

Gradient hợp lý L1 > L2 > L3 khớp thiết kế độ khó. Glossary cải thiện mọi stratum, mạnh nhất ở L2 (+0.055 — nhiều key term VI được map sang EN chuẩn).

### 4.3 Theo KA — điểm mạnh/điểm yếu

**Top**: Requirements 0.6 (elems 0.83, hop 0.933 — tốt nhất bank); Maintenance 0.667; Computing Foundations 0.667; Professional Practice 0.6; Construction 0.55.

**Bottom**: **SCM 0.333** (L1-08 = 0.0 — case nghiên cứu judge); **Testing 0.417** (elems v1 = 0.0 cả 3 câu — instrument artifact, v2 không còn zero); **Process 0.4** (L1-10 corr 0.3 dù elems 0.625); Operations 0.467; Management 0.433.

### 4.4 Điểm đặc biệt

- **Hoàn hảo (1.0)**: QA-L1-07 (4 nhóm bảo trì), QA-L3-14 (trade-off + stakeholder → đàm phán yêu cầu), QA-L3-16 (distributed/parallel → thiết kế → construction).
- **Thất bại thật (v2 xác nhận)**: QA-L3-05 (elems = 0.0), QA-L1-12 (elems = 0.0) — chi tiết probe ở Bước 4, pilot B3 ở Bước 6.
- **Case judge**: QA-L1-08 (baseline SCM) corr = 0.0 dù elems 0.67 (v1) / 0.5 (v2) — answer đúng vai trò trung tâm của baseline trong SCM nhưng corr judge chấm 0.

## 5. Phân tích câu kém — nguyên nhân gốc

### RC1 — Judge correctness nhiễu ở hai cực (ảnh hưởng ~15–19% câu)

Bằng chứng mâu thuẫn hai chiều giữa các judge trên CÙNG một answer: L1-08 corr=0.0 vs elems 0.67/0.5; ngược lại L3-14 corr=1.0 vs elems_v1=0.0. Variance run (Bước 4) còn cho thấy corr swing 1.0→0.4 trên cùng câu L3-16 giữa 2 runs. Corr ở mức câu có noise lớn — chỉ dùng ở mức aggregate.

### RC2 — Element judge v1 (LLM) false-negative với style trả lời của graph (~20% câu elems_v1=0)

18/54 câu elems_v1=0.0, trong đó v2 (deterministic) xác nhận chỉ **2 câu** là thiếu thật. Phần còn lại là LLM judge quá khắt khe với style trả lời của graph — elems_v1 bị đánh giá thấp hệ thống. Metric v2 (mục 6b) xử lý triệt để.

### RC3 — Giả thuyết "locate-only" answer style: pilot BỊ BÁC

9/10 câu bottom mở đầu "## 1. Vị trí: Ch XX …". Giả thuyết ban đầu cho rằng đây là nguyên nhân chính; pilot B1 (mục 6b) kiểm chứng: directive LLM synthesis chỉ cho +0.03 elems_v2 → **không phải nguyên nhân chính**. Giữ quan điểm: style định vị là đặc tính dữ liệu graph, không phải lỗi cần sửa.

### RC4 — Multi-hop xuyên chương: elems_v2 L3 = 0.434 (thấp nhất 3 level)

Câu L3 có `kas_secondary` nhưng retrieval 1 query text thường chỉ phủ KA chính. **Pilot B2 (mục 6b) đã chứng minh hybrid retrieval cộng +0.108** — đây là khoảng trống retrieval thật sự, và variance run xác nhận ổn định.

### RC5 → RC6 — Khoảng trống graph/book BỊ BÁC; nguyên nhân thật là VI↔EN term mismatch

Probe (Bước 4) cho thấy nội dung của cả 2 câu true-zero đều CÓ trong chunks top_k=10; các term còn miss là cụm VI không khớp text EN của sách ('chi phí chất lượng' ↔ cost of quality, 'vòng phản hồi' ↔ feedback loop...). Không cần enrich indexing — cần **glossary VI→EN** (A2 cho metric, B3 cho retrieval — cả hai đã pilot ở Bước 5–6).

### Phân bổ nguyên nhân cho 10 câu bottom (sau khi có instrument v2 + probe)

| Nguyên nhân | Số câu | Câu tiêu biểu |
|---|---|---|
| RC1 (judge corr nhiễu) | ~4 | L1-08, L1-10, L3-02 (một phần) |
| RC2 (elems_v1 artifact) | ~6 | L1-03, L3-11, L3-08, L1-05, L2-05, L1-06 |
| RC4 (multi-hop thiếu KA phụ) | ~5 | L3-05, L3-06, L3-08, L3-11, L3-18 |
| RC6 (VI↔EN term mismatch) | ~2 | L1-12, L3-05 (một phần) |

## 6. Đề xuất tối ưu (đã cập nhật sau pilot — chi tiết thực nghiệm ở mục 6b)

1. ~~Sửa element judge~~ → **ĐÃ LÀM (A1)**: metric v2 deterministic, elems 0.365→0.468, adopt làm metric chuẩn.
2. ~~Ensemble judge correctness~~ → **HẠ ƯU TIÊN**: pilot cho thấy corr noise lớn nhưng elems_v2 mới là metric phân biệt độ khó tốt; corr chỉ dùng aggregate.
3. ~~Prompt directive chống locate-only~~ → **PARKED (B1 pilot âm)**: +0.03 chỉ, không đáng thêm 1 LLM call/câu.
4. ~~Hybrid retrieval cho L3 (B2)~~ → **ĐÃ LÀM**: adopt sau variance run (+0.093 mean 2 runs), mode `--hybrid-l3` đã vào t7_eval.py.
5. ~~Kiểm tra Ch12 indexing~~ → **ĐÃ PROBE**: nội dung có trong corpus; gap thật là VI↔EN term mismatch.
6. ~~Glossary VI→EN~~ → **ĐÃ LÀM (A2 + B3)**: 65 terms LLN-dịch + spot-check; A2 metric elems 0.468→0.499; B3 query expansion +0.245 trên nhóm 6 câu yếu nhất (chi tiết Bước 5–6).
7. **Không rebuild graph** — gap chính nằm ở retrieval strategy + judge + language, không phải cấu trúc graph.

## 6b. Vòng tối ưu nâng dần — kết quả pilot (18-19/10 đêm)

Thực hiện theo nguyên tắc "thử nâng dần": mỗi bước pilot trước khi adopt.

### Bước 1 — Pilot B1 (prompt directive chống locate-only): KHÔNG ADOPT

Thiết kế: 10 câu kém nhất, cùng retrieval GRAPH_COMPLETION, answer thay raw-concat bằng LLM synthesis với directive "liệt kê đầy đủ, không mô tả vị trí chương/mục".

- Kết quả bằng metric v1 (LLM elems): d_corr +0.035, d_elems −0.015 — noise-level
- Bằng metric v2: d_elems_v2 +0.033 — marginal
- Kết luận: RC3 (locate-only style) KHÔNG phải nguyên nhân chính. Parked.
- Ghi chú kỹ thuật: GRAPH_COMPLETION của cognee không nhận prompt tùy chỉnh — can thiệp thực tế là thêm lớp LLM synthesis sau retrieval, tốn ~2.5s/câu.

### Bước 2 — A1: instrument element metric v2 (deterministic): ADOPT

Phát hiện khi pilot: `judge_elements` là LLM judge → 18/54 câu elems=0.0 và flip giữa runs (L1-08: 0.67→0.0 cùng câu hỏi, giữa 2 retrieval runs). v2 thay bằng deterministic key-term matching từ trailer "Phần tử key:" của gold (`t7_element_v2.py`): normalize NFD-bỏ-dấu, substring OR sliding-window fuzzy ratio ≥ 0.8.

- elems 0.365 → **0.468** (+0.103, đúng trần dự đoán +0.12)
- Gradient level hợp lý: L1 0.523 > L2 0.47 > L3 0.411 (v1 làm L3 sụp 0.231 là judge artifact)
- Chỉ còn **2/54 câu true-zero** (L3-05, L1-12) so với 18 zero v1
- Chi phí: 0 LLM call, <1s toàn bank, tái lập được 100%

### Bước 3 — Pilot B2 (hybrid GRAPH+CHUNKS cho L3): VALIDATED, ADOPT cho L3

Thiết kế isolate biến retrieval: answer = raw-join (graph texts + chunk texts top_k=8), cùng cap 2500 chars, KHÔNG thêm LLM synthesis. Chạy toàn bộ 18 câu L3 với resume support.

- **Kết quả 18/18: elems_v2 L3 0.411 → 0.518 (mean delta +0.108)**; 10/18 cải thiện, corr trung tính (không regression tổng thể)
- Trên 5 câu yếu nhất: +0.201 (L3-05 0.0→0.333 — true-zero recovered; L3-16 0.25→0.5)
- Chi phí: +1 retrieval call/câu (~1–2s)
- Dự phóng toàn bank nếu áp 18 câu L3: elems_v2 0.468 → ~0.504

### Bước 4 — Variance B2 (run 2) + probe true-zero: B2 XÁC NHẬN ỔN ĐỊNH

Chạy lại toàn bộ 18 câu L3 hybrid (run 2, label T7-pilot-b2-r2):

- elems_v2: run1 0.518, run2 0.490 — **cả hai trên baseline graph-only 0.411**; per-question |delta| mean chỉ 0.029 (max 0.25); mean 2 runs = 0.504 (+0.093 so baseline)
- corr: run1 0.494, run2 0.461; swing lớn nhất L3-16 1.0→0.4 cùng câu — đúng hiện tượng RC1; corr |delta| per-question mean 0.061
- Kết luận: elems_v2 là metric ổn định (deterministic, |Δ| 0.029/câu); corr không ổn định ở mức câu. B2 ADOPT được xác nhận với variance thấp.

Probe 2 true-zero còn lại (CHUNKS top_k=10, key-term matching — `t7_probe_zeros.py`):

- **QA-L1-12**: 4/6 terms HIT ('quality definition', 'specified requirements', 'implied needs', 'ISO/IEC 25010') → nội dung CÓ trong corpus, zero là lỗi tầng answer-selection, không phải indexing gap. 2 terms MISS ('chi phí chất lượng', 'phát hiện sớm') là cụm VI không khớp text EN.
- **QA-L3-05**: 3/6 terms HIT ('testability', 'operational testing', 'evaluation of tests') — đúng 3 term EN mà hybrid đã đưa vào answer (elems 0→0.333). 3 MISS là cụm VI ('vòng phản hồi', 'cải tiến', 'mối quan hệ với yêu cầu').
- **Bằng chứng cho A2/B3 (glossary + query expansion VI→EN)**: các miss còn lại đều là mismatch ngôn ngữ, không phải thiếu dữ liệu.

### Bước 5 — A2: glossary VI→EN cho metric (Task #2): ADOPT

Xây `swebok_vi_en_glossary.json` — 65 term VI trong key terms của bank, dịch sang EN SWEBOK chuẩn bằng LLM (retry 3×/batch, batch 20 terms), spot-check 100%: bản dịch đúng chuẩn ('cost of quality', 'root cause', 'corrective action', 'trade-off'...). `t7_element_v2.py` nhận `--glossary`: term HIT nếu term hoặc biến thể EN có trong answer.

- elems_v2 bank: 0.468 → **0.499** (+0.031); L1 0.540 / L2 0.525 / L3 0.434 — mọi stratum tăng, mạnh nhất L2 (+0.055)
- B2 runs rescore: 0.518→0.581, 0.490→0.552 — B2 vẫn dương (+0.082/+0.053 so baseline 0.499... baseline graph-only rescore là 0.499)
- 2 true-zero **vẫn 0.0** — cả 6 concepts (kể cả biến thể EN) đều vắng trong answer graph → xác nhận lỗi nằm ở retrieval, mở đường B3

### Bước 6 — Pilot B3 (query expansion VI→EN, Task #2): ADOPT (chờ run 2 variance)

Thiết kế: 6 câu yếu nhất sau A2 (2 zero + 4 câu 0.429). Mỗi câu LLM dịch question→EN (SWEBOK terms, cache per-question), query = VI + "\n\nEN: " + bản dịch, hybrid GRAPH+CHUNKS như B2, chấm v2+glossary (metric giống hệt baseline rescore → delta thuần retrieval).

| Câu | base | B3 | Δ |
|---|---|---|---|
| QA-L1-12 | 0.0 | 0.333 | +0.333 (true-zero recovered) |
| QA-L3-05 | 0.0 | 0.0 | 0 — expansion không cứu được |
| QA-L1-02 | 0.429 | 0.571 | +0.142 |
| QA-L1-03 | 0.429 | 0.714 | +0.285 |
| QA-L2-06 | 0.429 | 0.857 | +0.428 |
| QA-L3-09 | 0.429 | 0.714 | +0.285 |
| **Mean** | **0.286** | **0.531** | **+0.245** |

- **5/6 câu cải thiện** — gain lớn nhất trong mọi intervention đã pilot (B2 +0.108, B1 +0.033)
- corr nhóm 6 câu: 0.533 — đồng thuận với elems (không regression)
- Hiệu quả rõ nhất ở L1 recall: dịch chính xác term định nghĩa VI→EN giúp retrieval trúng đúng mục sách
- **L3-05 là case tồn dư**: content có trong chunks (probe) nhưng không lọt top retrieval dù query mở rộng — cần điều tra ranking riêng
- Chi phí: +1 LLM call/câu (~1–2s) — có thể cache; deployable trong production (không dùng gold)

### Bảng tổng hợp vòng nâng dần (6 bước)

| Bước | Intervention | elems Δ | corr Δ | Quyết định |
|---|---|---|---|---|
| B1 | Directive LLM synthesis (10 câu kém nhất) | +0.033 | +0.035 | PARKED |
| A1 | Element metric v2 (instrument fix) | +0.103 (đo lại) | — | ADOPT (metric) |
| B2 | Hybrid GRAPH+CHUNKS (18 câu L3, run 1) | +0.108 (stratum) | ~0 | ADOPT (chỉ L3) |
| B2-r2 | Variance run 2 | −0.028 (so run 1) | −0.033 | XÁC NHẬN ổn định |
| A2 | Glossary VI→EN cho metric (65 terms) | +0.031 (bank) | — | ADOPT (metric) |
| B3 | Query expansion VI→EN (6 câu yếu nhất) | **+0.245** | +0.53 nhóm | **ADOPT** (chờ run 2) |

**Kết luận vòng nâng dần**: 6 bước — 2 instrument fix (A1, A2), 2 retrieval gain có bằng chứng (B2 +variance, B3 +0.245), 1 giả thuyết bị bác (B1, tiết kiệm 1 sửa đổi vô ích), 1 nguyên nhân được định vị lại 2 lần (RC5→RC6). elems_v2+glossary làm primary metric; corr secondary. Hướng còn mở: run 2 variance B3, tích hợp `--expand-vi-en` vào t7_eval.py, điều tra riêng L3-05.

## 7. Tái hiện

```bash
# eval (daemon, resume-safe)
cd /workspace && /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank
# hybrid cho L3 (B2 đã adopt)
cd /workspace && /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank-hybrid --hybrid-l3
# phân tích + element v2 (metric chuẩn, có glossary)
/opt/venv/bin/python src/skilltree/eval/t7_analyze.py --label T7-bank
/opt/venv/bin/python src/skilltree/eval/t7_element_v2.py  # --glossary mặc định corpora/swebok-v4/swebok_vi_en_glossary.json
# pilot B1 (parked) / B2 (+ run 2 variance) / B3 / probe zeros / variance / build glossary
/opt/venv/bin/python src/skilltree/eval/t7_pilot_b1.py
/opt/venv/bin/python src/skilltree/eval/t7_pilot_b2.py --n 18
/opt/venv/bin/python src/skilltree/eval/t7_pilot_b3.py
/opt/venv/bin/python src/skilltree/eval/t7_probe_zeros.py
/opt/venv/bin/python src/skilltree/eval/t7_variance_b2.py
/opt/venv/bin/python src/skilltree/eval/t7_build_glossary.py
```

**Evidence**: `reports/evidence/t7-summary.json`, `t7-analysis.json`, `t7-results-compact.jsonl`, `t7-element-v2-summary.json`, `t7-pilot-b2-element_v2.json`, `t7-variance.json`, `t7-b3-pilot.json`; container `runs/t7/T7-bank/`, `T7-pilot-b1/`, `T7-pilot-b2/`, `T7-pilot-b2-r2/`, `T7-pilot-b3/` (results + element_v2*.json mỗi label); `corpora/swebok-v4/swebok_vi_en_glossary.json`.

## 8. Concerns

1. **Judge noise (RC1)**: corr chỉ đáng tin ở mức aggregate (swing 0.6/câu giữa runs — L3-16); elems_v2 là metric dùng được ở mức câu (|Δ| 0.029).
2. **Bank 54 câu chạy 1 lần** — chưa đo variance toàn bank; đề nghị giữ limitation khi so stress-set.
3. **B2 đã đo variance (run 2)**: elems_v2 per-question |Δ| 0.029, mean 2 runs +0.093 so baseline — ổn định, đủ tin để đưa vào pipeline (`--hybrid-l3`).
4. **B3 mới chạy 1 lần trên 6 câu** — selection bias nhóm yếu nhất; cần run 2 variance + toàn bank trước khi là mặc định. L3-05 tồn dư: content có trong chunks nhưng retrieval không kéo được — gap ranking, không phải language.
5. **Raw results (88KB) chỉ nằm trong container** — đã push compact + summary + analysis + element_v2 lên VFS/GitHub; raw tái tạo được bằng rerun (resume skip hết, 0 call).

## 9. Checklist

- [x] Bank 54 câu (18 KA × 3 level) soạn, validate JSON, gold có trailer "Phần tử key"
- [x] `t7_eval.py` viết, compile ok, chạy daemon, resume hoạt động; **+ mode `--hybrid-l3` (B2)**
- [x] Eval 54/54 hoàn tất, 0 lỗi — summary có breakdown level/KA
- [x] Phân tích bottom quintile + nguyên nhân (RC1/RC2/RC4/RC6; RC3 bị bác, RC5 được định vị lại)
- [x] Vòng tối ưu nâng dần 6 bước: B1 parked, A1 adopt, B2 adopt + variance, probe zeros, A2 glossary adopt, B3 pilot +0.245
- [x] Commit + push GitHub (branch agent-swebok-usecase2)
- [x] Contract Task #1 → DONE_WITH_CONCERNS; Task #2 (B3) → DONE
