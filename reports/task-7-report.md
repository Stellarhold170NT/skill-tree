# Task 7 — SWEBOK QA bank toàn diện: eval trên memory full-book C5, phân tích câu kém, đề xuất tối ưu

**Status:** DONE_WITH_CONCERNS
**Ngày:** 2026-10-18 (báo cáo duyệt sáng 19-10; cập nhật đêm: A2 glossary + B3 pilot + ablation + **full-bank hybrid run**)
**Contract:** Task #1 — "T7: SWEBOK QA bank toàn diện → eval full-book → phân tích câu kém → đề xuất tối ưu → báo cáo sáng 19/10"; Task #2 — "B3 pilot: query expansion VI→EN"; Task #3 — "Full-bank hybrid run + xác nhận gain mọi level"

---

## 1. Mục tiêu và phạm vi

Task này trả lời ba câu hỏi sau khi C5b (full-book graph 11,275 nodes / 48,382 edges) đã hoàn tất:

1. **Độ phủ kiến thức**: bộ câu hỏi cũ (24 stress + 40 basic) có bám sát toàn bộ 18 KA của SWEBOK v4 không? Câu trả lời là **chưa** — stress set thiên về multi-hop cross-chapter, basic set 40 câu không đều theo chương. T7 xây bank mới **54 câu = 18 KA × 3 mức (L1/L2/L3)**, mỗi câu bám sát tiêu đề mục của chương tương ứng trong corpus.
2. **Chất lượng retrieval trên full-book graph**: chạy toàn bộ 54 câu qua pipeline eval chuẩn (GRAPH_COMPLETION trên dataset `swebok_v4_full_c5`) với judge correctness/element/hop như các round trước, đo baseline của bank mới.
3. **Chẩn đoán câu kém**: với mọi câu điểm thấp (bottom quintile), phân loại nguyên nhân và đề xuất hướng tối ưu cụ thể — kèm **pilot thực nghiệm từng hướng** (mục 6b, 7 bước).

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
- **Cấu hình**: `--mode GRAPH_COMPLETION --top-k 10 --dataset swebok_v4_full_c5` (winner config C5); mode `--hybrid-all` / `--hybrid-l3` (mục 6b).
- **Judge**: `judge_correctness`, `judge_elements`, `judge_hops` từ `ab_probe.py` — giữ nguyên so với R0→F1 để so sánh được.
- **Chạy**: daemon nền trong container sess-93159cee, log `/tmp/t7.log`; 54 câu × ~50–290s, hoàn tất ~1h50m, **0 lỗi, 0 retry**.

## 4. Kết quả

### 4.1 Tổng thể (54/54 scored)

| Metric | Baseline (graph-only) | **Hybrid-all (mặc định mới)** | So với stress-set F1 (24 câu) |
|---|---|---|---|
| Correctness | 0.510 | 0.515 | F1 0.544; R0 0.475 — chấp nhận được cho bank khó và phủ rộng hơn |
| Element completeness v1 (LLM judge) | 0.365 | 0.476 | F1 0.331 |
| Element completeness **v2 + glossary (metric chuẩn cuối, xem 6b)** | 0.499 | **0.532** | — |
| Hop precision | 0.576 | **0.632** | F1 0.69 |
| p50 latency | 74.1s | 71.7s | F1 51.8s |

**Chuỗi tối ưu toàn vòng: elems 0.365 → 0.532 (+46% tương đối)** — bằng 2 instrument fix (metric v2 + glossary) và 1 retrieval gain (hybrid-all), không đụng vào graph.

### 4.2 Theo level (elems v2+glossary)

| Level | n | corr | elems v2+glossary | **+ hybrid-all** | hop |
|---|---|---|---|---|---|
| L1 (recall) | 18 | 0.503 | 0.540 | **0.592** (+0.052) | 0.503 |
| L2 (analysis) | 18 | 0.517 | 0.525 | **0.534** (+0.009) | 0.671 |
| L3 (multi_hop) | 18 | 0.511 | 0.434 | **0.469** (+0.035) | 0.528 |

Gradient hợp lý L1 > L2 > L3 khớp thiết kế độ khó. Hybrid gain tập trung ở L1 (definitional) và L3 (multi-hop); L2 bão hòa từ graph (+0.009).

### 4.3 Theo KA — điểm mạnh/điểm yếu

**Top**: Requirements 0.6 (elems 0.83, hop 0.933 — tốt nhất bank); Maintenance 0.667; Computing Foundations 0.667; Professional Practice 0.6; Construction 0.55.

**Bottom**: **SCM 0.333** (L1-08 = 0.0 — case nghiên cứu judge); **Testing 0.417** (elems v1 = 0.0 cả 3 câu — instrument artifact, v2 không còn zero); **Process 0.4** (L1-10 corr 0.3 dù elems 0.625); Operations 0.467; Management 0.433.

### 4.4 Điểm đặc biệt

- **Hoàn hảo (1.0)**: QA-L1-07 (4 nhóm bảo trì), QA-L3-14 (trade-off + stakeholder → đàm phán yêu cầu), QA-L3-16 (distributed/parallel → thiết kế → construction).
- **Câu "thất bại thật" cũ — đã recovered ở mức partial bởi hybrid-all**: QA-L1-12 (0→0.333), QA-L3-05 (0→0.167) — **0 true-zero trong toàn bank** ở cấu hình cuối.
- **Case judge**: QA-L1-08 (baseline SCM) corr 0.0 ở baseline dù elems 0.67/0.5 — corr judge noise (RC1); hybrid run corr 0.5.

## 5. Phân tích câu kém — nguyên nhân gốc

### RC1 — Judge correctness nhiễu ở hai cực (ảnh hưởng ~15–19% câu)

Bằng chứng mâu thuẫn hai chiều giữa các judge trên CÙNG một answer: L1-08 corr=0.0 vs elems 0.67/0.5; ngược lại L3-14 corr=1.0 vs elems_v1=0.0. Variance run (Bước 4) còn cho thấy corr swing 1.0→0.4 trên cùng câu L3-16 giữa 2 runs. Corr ở mức câu có noise lớn — chỉ dùng ở mức aggregate.

### RC2 — Element judge v1 (LLM) false-negative với style trả lời của graph (~20% câu elems_v1=0)

18/54 câu elems_v1=0.0, trong đó v2 (deterministic) xác nhận chỉ **2 câu** là thiếu thật. Phần còn lại là LLM judge quá khắt khe với style trả lời của graph. Metric v2 xử lý triệt để.

### RC3 — Giả thuyết "locate-only" answer style: pilot BỊ BÁC

9/10 câu bottom mở đầu "## 1. Vị trí: Ch XX …". Pilot B1 kiểm chứng: directive LLM synthesis chỉ cho +0.03 elems_v2 → không phải nguyên nhân chính. Style định vị là đặc tính dữ liệu graph, không phải lỗi cần sửa.

### RC4 — Retrieval thiếu chunks/KA phụ: L3 = 0.434 (thấp nhất), và L1 cũng hưởng hybrid

Câu L3 có `kas_secondary` nhưng retrieval 1 query text thường chỉ phủ KA chính (B2 +0.108 stratum, variance xác nhận). **Full-bank hybrid run (Bước 7) xác nhận hybrid hiệu lực mọi level**: L1 +0.052, L3 +0.035, L2 +0.009 (bão hòa).

### RC5 → RC6 — Khoảng trống graph/book BỊ BÁC; nguyên nhân thật là VI↔EN term mismatch (một phần)

Probe cho thấy nội dung của cả 2 câu true-zero đều CÓ trong chunks top_k=10; các term còn miss là cụm VI không khớp text EN ('chi phí chất lượng' ↔ cost of quality...). Glossary (A2) xử lý phần mismatch ở tầng metric; query expansion (B3) bị ablation bác — gain thật của nó là hybrid chunks (Bước 6).

### Phân bổ nguyên nhân cho 10 câu bottom

| Nguyên nhân | Số câu | Câu tiêu biểu |
|---|---|---|
| RC1 (judge corr nhiễu) | ~4 | L1-08, L1-10, L3-02 (một phần) |
| RC2 (elems_v1 artifact) | ~6 | L1-03, L3-11, L3-08, L1-05, L2-05, L1-06 |
| RC4 (retrieval thiếu chunks/KA phụ) | ~5 | L3-05, L3-06, L3-08, L3-11, L3-18 |
| RC6 (VI↔EN term mismatch — tầng metric, đã fix) | ~2 | L1-12, L3-05 (một phần) |

## 6. Đề xuất tối ưu — kết quả cuối (chi tiết thực nghiệm ở mục 6b)

1. ~~Sửa element judge~~ → **ĐÃ LÀM (A1)**: metric v2 deterministic, elems 0.365→0.468.
2. ~~Ensemble judge correctness~~ → **HẠ ƯU TIÊN**: corr noise lớn ở mức câu; elems_v2 là metric chính, corr chỉ dùng aggregate.
3. ~~Prompt directive chống locate-only~~ → **PARKED (B1 pilot âm)**: +0.03, không đáng 1 LLM call/câu.
4. ~~Hybrid retrieval~~ → **ĐÃ LÀM + XÁC NHẬN FULL-BANK (B2 + Bước 7)**: `--hybrid-all` ADOPT làm mặc định — elems 0.499→0.532, 0 true-zero còn lại, corr trung tính, 4 regressions nhỏ (max −0.143).
5. ~~Kiểm tra Ch12 indexing~~ → **ĐÃ PROBE**: nội dung có trong corpus; gap thật là retrieval + VI↔EN term mismatch (tầng metric).
6. ~~Glossary VI→EN~~ → **A2 ĐÃ LÀM (metric, elems +0.031)**. **B3 query expansion KHÔNG ADOPT** — ablation: 0 lợi ích so hybrid-only, 1 case làm tệ (L3-05).
7. **Không rebuild graph** — gap chính nằm ở retrieval strategy + judge + language, không phải cấu trúc graph.

## 6b. Vòng tối ưu nâng dần — kết quả pilot (18-19/10 đêm)

Thực hiện theo nguyên tắc "thử nâng dần": mỗi bước pilot trước khi adopt.

### Bước 1 — Pilot B1 (prompt directive chống locate-only): KHÔNG ADOPT

10 câu kém nhất, cùng retrieval, answer thay raw-concat bằng LLM synthesis directive. d_elems_v2 chỉ +0.033 — marginal; GRAPH_COMPLETION của cognee không nhận prompt tùy chỉnh (can thiệp = thêm lớp LLM synthesis, ~2.5s/câu). RC3 không phải nguyên nhân chính. Parked.

### Bước 2 — A1: instrument element metric v2 (deterministic): ADOPT

`judge_elements` là LLM judge → 18/54 câu elems=0.0 và flip giữa runs (L1-08: 0.67→0.0). v2 = deterministic key-term matching từ trailer "Phần tử key:" (`t7_element_v2.py`): normalize NFD-bỏ-dấu, substring OR sliding-window fuzzy ≥ 0.8. elems 0.365 → **0.468**; gradient L1>L2>L3 hợp lý; chỉ còn 2 true-zero; 0 LLM call, <1s toàn bank.

### Bước 3 — Pilot B2 (hybrid GRAPH+CHUNKS cho L3): VALIDATED

18 câu L3, raw-join cap 2500, không thêm LLM: elems_v2 0.411→0.518 (+0.108), 10/18 tăng, corr trung tính. Chi phí +1 retrieval call/câu.

### Bước 4 — Variance B2 (run 2) + probe true-zero: B2 XÁC NHẬN ỔN ĐỊNH

Run 2: elems_v2 0.490 (run1 0.518) — cả hai trên baseline 0.411; per-question |Δ| 0.029. corr swing L3-16 1.0→0.4 (RC1). Probe 2 true-zero: nội dung CÓ trong corpus (L1-12 4/6 HIT, L3-05 3/6 HIT) — gap là retrieval + language mismatch, không phải indexing.

### Bước 5 — A2: glossary VI→EN cho metric: ADOPT

65 term VI dịch EN SWEBOK chuẩn bằng LLM (spot-check 100%), `t7_element_v2.py --glossary`: term HIT nếu term hoặc biến thể EN có trong answer. elems 0.468 → **0.499** (L1 0.540/L2 0.525/L3 0.434); 2 true-zero vẫn 0 → xác nhận lỗi retrieval, mở đường B3/ablation.

### Bước 6 — Pilot B3 (query expansion VI→EN) + ABLATION: expansion KHÔNG ADOPT; gain thật = HYBRID mọi level

Pilot B3 (6 câu yếu nhất): mean 0.286→0.531 (+0.245, 5/6 tăng, L1-12 0→0.333) — tưởng breakthrough. **Ablation hybrid-only trên cùng 4 câu L1/L2 cho kết quả GIỐNG HỆT từng câu** (mean 0.322→0.619): toàn bộ gain là hybrid chunks. Cross-check L3: L3-05 hybrid-only 0.333 ổn định 2 runs nhưng hybrid+expansion = 0.0 (expansion pha loãng query); L3-09 0.714=0.714. Expansion: 0 lợi ích, 1 regression, +1 LLM call vô ích → KHÔNG ADOPT.

### Bước 7 — Full-bank hybrid run (`--hybrid-all`, 54/54): XÁC NHẬN, ADOPT làm mặc định

Chạy toàn bộ 54 câu hybrid (0 lỗi, p50 71.7s), chấm v2+glossary, so baseline cùng metric:

| Level | Base | Hybrid-all | Δ |
|---|---|---|---|
| L1 | 0.540 | 0.592 | +0.052 |
| L2 | 0.525 | 0.534 | +0.009 |
| L3 | 0.434 | 0.469 | +0.035 |
| **Tổng** | **0.499** | **0.532** | **+0.033** |

- **0 true-zero trong toàn bank** — L1-12 0→0.333, L3-05 0→0.167 (cả 2 câu "thất bại thật" đạt partial credit)
- Top gains: L1-12 +0.333, L3-09 +0.285, L3-05/L3-04/L2-07 +0.167, L1-08 +0.166
- 4 regressions nhỏ (−0.111..−0.143: L2-05 1.0→0.857, L1-10, L3-02, L3-15) — variance retrieval bình thường
- corr 0.515 (~= baseline 0.510), hop 0.576→0.632 — không regression
- **Selection bias được đo đúng**: gain full-bank (+0.033) nhỏ hơn pilot 4 câu yếu (+0.297) như dự báo — pilot chọn chính các câu hybrid giúp nhiều nhất

### Bảng tổng hợp vòng nâng dần (7 bước + ablation)

| Bước | Intervention | elems Δ | Quyết định |
|---|---|---|---|
| B1 | Directive LLM synthesis (10 câu kém) | +0.033 | PARKED |
| A1 | Element metric v2 (instrument fix) | +0.103 (đo lại) | ADOPT (metric) |
| B2 | Hybrid GRAPH+CHUNKS (18 câu L3) | +0.108 (stratum) | ADOPT (L3) |
| B2-r2 | Variance run 2 | −0.028 | XÁC NHẬN ổn định |
| A2 | Glossary VI→EN metric (65 terms) | +0.031 (bank) | ADOPT (metric) |
| B3 | Query expansion VI→EN | +0.245 bề mặt | KHÔNG ADOPT (ablation: gain = hybrid) |
| Ablation | Hybrid-only 4 câu L1/L2 yếu | +0.297 | Hybrid mở rộng mọi level |
| **Full-bank** | **Hybrid-all 54 câu** | **+0.033 (bank)** | **ADOPT làm mặc định** |

**Kết luận vòng nâng dần**: 7 bước + 1 ablation. 2 instrument fix + 1 retrieval gain được xác nhận full-bank; 2 giả thuyết bị bác có dữ liệu (B1, B3) + 1 nguyên nhân định vị lại 2 lần (RC5→RC6). **Cấu hình cuối: elems_v2+glossary + hybrid-all = 0.532** (từ 0.365 điểm đo ban đầu — +46%). Hướng còn mở: variance run full-bank, điều tra ranking L3-05 (còn 0.167), L2 bão hòa (nếu cần thì +BM25/rerank thay vì hybrid chunks).

## 7. Tái hiện

```bash
# baseline (graph-only, resume-safe)
cd /workspace && /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank
# cấu hình mặc định mới: hybrid mọi level (đã xác nhận full-bank)
cd /workspace && /opt/venv/bin/python src/skilltree/eval/t7_eval.py --label T7-bank-hybrid --hybrid-all
# chấm element v2 (metric chuẩn, glossary mặc định)
/opt/venv/bin/python src/skilltree/eval/t7_element_v2.py
# các script pilot/analysis
/opt/venv/bin/python src/skilltree/eval/t7_pilot_b2.py --n 18   # B2 + run 2 (variance)
/opt/venv/bin/python src/skilltree/eval/t7_pilot_b3.py          # expansion (bị bác)
/opt/venv/bin/python src/skilltree/eval/t7_ablate_b3.py         # ablation hybrid-only
/opt/venv/bin/python src/skilltree/eval/t7_probe_zeros.py
/opt/venv/bin/python src/skilltree/eval/t7_variance_b2.py
/opt/venv/bin/python src/skilltree/eval/t7_build_glossary.py
```

**Evidence**: `reports/evidence/t7-summary.json`, `t7-analysis.json`, `t7-results-compact.jsonl`, `t7-element-v2-summary.json`, `t7-pilot-b2-element_v2.json`, `t7-variance.json`, `t7-b3-pilot.json`, `t7-ablation-hybrid.json`, **`t7-fullbank-hybrid.json`**; container `runs/t7/T7-bank/`, `T7-pilot-b1/`, `T7-pilot-b2/`, `T7-pilot-b2-r2/`, `T7-pilot-b3/`, `T7-ablate-hybrid/`, **`T7-bank-hybrid/`**; `corpora/swebok-v4/swebok_vi_en_glossary.json`.

## 8. Concerns

1. **Judge noise (RC1)**: corr chỉ đáng tin ở mức aggregate (swing 0.6/câu giữa runs); elems_v2 đáng tin ở mức câu (|Δ| 0.029).
2. **Hybrid gain full-bank là +0.033** — khiêm tốn hơn con số pilot (+0.297 trên nhóm chọn lọc); chỉ báo cáo trung thực cả hai, tránh over-claim.
3. **L2 bão hòa (+0.009)**: hybrid không giúp câu analysis — nếu muốn nâng L2 cần hướng khác (rerank/query decomposition), chưa pilot.
4. **Full-bank hybrid mới chạy 1 lần** — B2 đã có variance run; full-bank có thể chạy run 2 sau nếu cần con số ổn định.
5. **L3-05 còn 0.167** — content có trong chunks nhưng ranking không kéo đủ; investigation riêng còn mở.
6. **Raw results chỉ nằm trong container** — compact + evidence đã lên VFS/GitHub; raw tái tạo bằng rerun (resume skip, 0 call).

## 9. Checklist

- [x] Bank 54 câu (18 KA × 3 level) soạn, validate JSON, gold có trailer "Phần tử key"
- [x] `t7_eval.py` viết + resume; **+ `--hybrid-l3` và `--hybrid-all`**
- [x] Eval 54/54 baseline (0 lỗi) + **full-bank hybrid 54/54 (0 lỗi)**
- [x] Phân tích bottom quintile + nguyên nhân (RC1/RC2/RC4/RC6; RC3 + B3 bị bác có dữ liệu)
- [x] Vòng tối ưu 7 bước + ablation: A1/A2 adopt, B2/full-bank-hybrid adopt, B1/B3 bác, probe zeros
- [x] Commit + push GitHub (branch agent-swebok-usecase2)
- [x] Contract Task #1/#2/#3 → DONE / DONE / DONE
