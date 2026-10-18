# Benchmark cuối — SWEBOK v4 × Cognee embedded (agent-first use case)


> Trạng thái: HOÀN TẤT — run-final full-book (C5b) transfer check WIN:
> correctness 0.544 / elems 0.331 (+21% vs baseline) trên graph lớn nhất vòng lặp
> (11.275 nodes / 48.382 edges); audit precision 0.885 ≈ gate 0.90.
> Repo: skilltree (branch `agent-swebok-usecase1`). Judge: GLM temp 0.1 / 2000 tokens +
> fallback reasoning_content. Bộ đánh giá: 24 câu stress S01–S24, 5 topology
> (linear multi-hop / tree-fanout / negative trap / artifact lineage / reverse root-cause
> + paradox), gold authored từ corpus.


## 1. Tóm tắt điều hành


- **Use case**: biến SWEBOK v4 (413 trang, ISO/IEC TR 19759) thành memory đồ thị nhúng
  (cognee 1.6.4: SQLite + LanceDB + Ladybug) cho agent "Kỹ sư thẩm định kiến trúc &
  cố vấn rủi ro" — Mentor Q&A VI + Reviewer Gap Analysis.
- **Pipeline 2 giai đoạn theo nguyên tắc đo đạc**: Stage A chọn subset dữ liệu tốt nhất
  trước khi đụng cấu hình; Stage B tinh chỉnh theo ma trận thông minh (retrieval-side rẻ
  trước, build-side đắt sau, combo chỉ khi mọi thành phần đo là dương); Stage C
  ablation-first (traversal/merge/audit) trước khi quyết định rebuild ontology.
- **Kết quả chính**:
  - GRAPH_COMPLETION **2.3× correctness**, **29× hop_precision** so vector RAG trần —
    multi-hop traversal là năng lực độc quyền của đồ thị.
  - Zero fabrication cả 3 chế độ; GRAPH từ chối trung thực khi out-of-corpus
    (faithfulness cho agent thẩm định); vector "thắng" out bằng parametric hallucination.
  - **custom_prompt trích xuất là đòn bẩy mạnh nhất Stage B**: semantic edges
    11.6% → **42.1%**, element_completeness **+18%**, không cần đổi retrieval.
  - **Đối sảnh chuẩn LightRAG**: correctness hòa (0.49 vs 0.456–0.475 trong nhiễu);
    cognee thắng hop 0.73 vs 0.61 + elems 0.322 vs 0.273; LightRAG thắng build 2.4× +
    naive query 7s. Verdict: bổ sung, không thay thế.
  - **Stage C ablation (âm tính có giá trị)**: constrained traversal + entity merge
    KHÔNG cải thiện trên ngữ cảnh name-only; C3 edge precision 0.82 < 0.90 → gate mở cho
    C5 ontology rebuild.
  - **C5 ontology rebuild xác nhận gate**: C5a trên S2 correctness **0.538** (cao nhất
    vòng lặp) / elems 0.29 / hop 0.717 → thắng B1 theo điều kiện gate; C5b full-book
    tận dụng đồ thị lớn ~12× S2 (**11.275n/48.382e**) vẫn giữ kết quả F1
    **0.544/0.331** — **transfer WIN, không pha loãng** (elems +21% vs R0); audit
    precision 0.885 (+6.4pt vs S2, vẫn hụt gate 0.90 — weakest INJECTS).
  - Agent MVP chạy thật: Mentor VI bám đồ thị + tự khai ngoài phạm vi; Reviewer duyệt
    51 node con của 1 KA → Gap Analysis; Graph→Chunk grounding.


## 2. Thiết lập thí nghiệm


- **Corpus**: `swebok-v4.md` 413 trang (PyMuPDF, marker `=== [p. N] ===`);
  Stage A/B/C: subset S2 = trang 67–152; Run-final: toàn sách.
- **Memory**: cognee 1.6.4 embedded — chunk 512, batch 25 (anti-OOM: OMP/ORT=2 threads),
  extractor LLM (GLM-5.3-Flash, gateway Viettel/NetMind, 3-key RR ~250 tok/s).
- **Judge**: cùng gateway, temp 0.1. Metrics: correctness / element_completeness /
  hop_precision / fabricated / latency.
- **Harness 3 tầng** (docs/eval-harness.md): quick_eval → ab_probe → stage_b + ledger.
  Append-per-call, resumable, timeout 900s/call.


## 3. Stage A — chọn subset (ADR 0002)


S1 (3 KA) vs **S2 (+Construction, 4 KA)**: S2 thắng (coverage semantic 0.438,
correctness 0.975 vs 0.929; đồ thị 2,584n/9,335e, 0% isolated) → nền Stage B.


## 4. A/B Graph Reasoning — 24 câu stress (runs/graph_probe/)


| Metric (24 câu) | CHUNKS (vector+RAG trần) | GRAPH_COMPLETION | COT (probe trần) |
|---|---|---|---|
| correctness | 0.204 | **0.475** | 0.461 |
| element_completeness | 0.122 | 0.273 | 0.315 |
| **hop_precision** | **0.025** | **0.734** | 0.670 |
| latency p50 | 6.7s | 50.6s | 379.9s |
| fabrication | 0 | 0 | 0 |


Theo topology (GRAPH vs CHUNKS): negative trap **1.0 vs 0.5** (S21 Cleanroom — đủ 2
điểm bẫy), reverse hops **1.0 vs 0.0**, lineage 0.50/0.67 vs 0.15/0.125,
linear 0.475/0.665 vs 0.025/0.0. COT không tăng correctness, đắt 7.5× → chỉ giữ
probe trần. TRIPLET_COMPLETION: NoDataError → loại. Chi tiết: probe_notes.md.


## 5. Stage B — 7 vòng (runs/ledger.jsonl, ADR 0003)


| Vòng | Biến | corr | elems | Kết luận |
|---|---|---|---|---|
| R0 | baseline GRAPH_COMPLETION | 0.475 | 0.273 | champion retrieval |
| R1/R1b | CHUNKS k=5 / k=20 | 0.217/0.225 | 0.174/0.144 | top_k không đòn bẩy |
| R2 | CONTEXT_EXTENSION | 0.348 | 0.148 | loãng ngữ cảnh |
| R3 | HYBRID_COMPLETION | 0.373 | 0.193 | vẫn thua baseline |
| R4 | CHUNKS + prompt cấu trúc | 0.123 | 0.093 | ràng buộc quá mức |
| **B1** | **custom_prompt semantic boost** | **0.456** | **0.322** | **WINNER elems** |
| B2 | chunk 1024 | 0.390 | 0.241 | có hại → B3 combo loại theo số đo |


B1 graph: 3,339n/13,155e (+29%/+41%); semantic edges **42.1%** (gần 4×): part_of 13.3%,
uses 10.2%, produces 4.2%, constrains 4.0%, verifies 3.0%, mitigates 1.7%.
Bản tái tạo B1 sau sandbox-death: 74 phút, 3,412n/13,174e (sai số build ±5% — chấp nhận);
phân tích cấu trúc + edge samples: `reports/evidence/structure-s2-b1.json`.


## 6. Run-final full-book (C5b) + Transfer check — WIN


- Preset `c5_full_book.yaml` (kế thừa preset f0: 413 trang, reset:false, dataset riêng
  `swebok_v4_full_c5` — bài học prune toàn cục, mục 8 — và thay custom_prompt B1 bằng
  graph_model C5).
- **Build (C5b)**: 5h45m10s (10:31→16:16 18/10, sess-93159cee 16Gi), **1 attempt duy
  nhất**, 1.264 LLM calls (3-key RR; 1 lỗi thoáng tự hồi phục nhờ retry stack
  backoff 60s×2ⁿ), 26 chu kỳ extract↔local ổn định 12–13 min/chu kỳ.
- **Graph**: **11.275 nodes / 48.382 edges** (~12× S2, lớn nhất vòng lặp): Structural
  cognee 39.1% (contains/made_from/is_part_of) · enum C5 38.4% · cấu trúc phụ
  ⚠️ schema deviation `is_a` 22.4% (LLM phát sinh predicate trái schema dù prompt —
  ứng viên fix: chũi prompt hoặc hậu xử map is_a→subtype_of).
- **F1 transfer 24 câu** trên swebok_v4_full_c5, cùng judge, cùng gold:

| Metric (24 câu) | R0 baseline (S2) | C5a (S2) | **F1 (full 413 trang)** |
|---|---|---|---|
| correctness | 0.475 | **0.538** | 0.544 |
| element_completeness | 0.273 | 0.29 | **0.331** (+21% vs R0) |
| hop_precision | — | **0.717** | 0.69 |
| latency_p50 | 50.6s | 40.1s | 51.8s |

- **Verdict: full-book KHÔNG pha loãng** — 8 câu out-of-corpus cũ (SCM/Security/
  Quality/Maintenance) giờ in-corpus; correctness vẫn nhích lên (0.544 vs C5a 0.538),
  elems tăng mạnh (+14% vs C5a, **+21% vs baseline**). Hop 0.717→0.69 — trong biên
  nhiễu judge (granularity 0.05).
- **C3 re-audit trên C5b** (sample 100, 96 scored, seed=7): **0.885** vs 0.821 tại S2
  (+6.4pt) — vẫn hụt gate 0.90. Yếu nhất: INJECTS 0.667 (n=6) — đầu chuỗi nhân quả
  HumanError→Fault; mạnh nhất: CONSUMES/REQUIRES/USESTOOL/VALIDATES/OTHER = 1.0.
  Per-predicate đầy đủ: `reports/evidence/c5b-audit-precision.json`.


## 7. So sánh framework thay thế (LightRAG, đối sảnh CHUẨN)


- **Thiết kế đối sảnh**: subagent độc lập ingest ĐỦ S2 (p.67–152, cùng coverage),
  gleaning TẮT đúng cách (env MAX_GLEANING=0 trước import — constructor kwarg vô hiệu),
  183 chunks → graph 1,685n/1,971e (34 phút, 306 LLM calls); 24 câu hybrid + S21/S24
  naive; **judge cùng rubric** với cognee (template y văn bản ab_probe — 2 lỗi công nghệ
  đã sửa không đụng rubric).
- **Bảng đối sành (cùng corpus, cùng 24 câu, cùng judge)**:

| Metric | cognee B1 (GC) | cognee R0 | LightRAG hybrid |
|---|---|---|---|
| correctness | 0.456 | 0.475 | **0.490** |
| element_completeness | **0.322** | 0.273 | 0.273 |
| **hop_precision** | **0.73** | 0.734 | 0.612 |
| latency p50 | ~50s | 50.6s | 44.5s (p90 81.2s) |
| Negative S21 (bẫy) | 1.0 fab=0 | 1.0 fab=0 | **1.0 fab=0 (2 mode)** |
| Build | ~81 phút | ~68 phút | **34 phút (2.4×)** |
| Graph | 3.9 e/node | 3.6 e/node | 1.1 e/node |
| Query rẻ nhất | ~50s | ~50s | **naive 7s** |

- **Đọc trung thực**: correctness hòa trong biên nhiễu judge (0.05 granularity, 1 lượt);
  LightRAG nhiều row 0.5 ("đúng hướng, thiếu chi tiết"). Cognee thắng đúng ở CHỖ ĐỒ THỊ
  mạnh: truy vết đa bước (0.73 vs 0.61) + gom phần tử key (0.322 vs 0.273).
- **Verdict: BỔ SUNG xứng đáng (query naive 7s cho tra cứu rẻ, build nhanh 2.4× cho
  corpus rebuild thường xuyên), KHÔNG thay thế cognee B1 cho lineage multi-hop +
  Reviewer Gap Analysis.** Evidence: `reports/evidence/lightrag-judged.jsonl` (26/26),
  `reports/lightRag-vs-cognee.md`.
- Phát hiện chung gateway-closed: `/v1/embeddings` chặn 403 → embedding luôn tự host
  (bge-small-en-v1.5, dim 384); GLM rỗng content 14–29% calls → retry-on-empty bắt buộc.


## 7b. Stage C ablation — âm tính có giá trị (ADR 0004)


Thiết kế ablation-first: thử RẺ (không rebuild) trước khi đốt chi phí ontology.
Kết quả trên bản B1 tái tạo (3,412n/13,174e, cùng 24 câu, cùng judge):

| Variant | correctness | elems | hop_precision | p50 |
|---|---|---|---|---|
| B1 baseline (GRAPH_COMPLETION) | 0.456 | 0.322 | 0.73 | ~50s |
| C1 constrained traversal (lineage/verify/overview modes) | 0.114 | 0.029 | 0.087 | 2.15s |
| C2 C1 + entity merge (57 exact groups) | 0.067 | 0.031 | 0.053 | 2.38s |

- **Root cause C1/C2**: graph dump chỉ có id/name/type **KHÔNG description** → ngữ cảnh
  đưa cho LLM chỉ gồm TÊN node + cạnh (name-only, đói nguyên liệu); B1 dùng
  GRAPH_COMPLETION với descriptions + summaries đầy đủ. Câu có start-node đúng + subgraph
  gọn thì rất cao (S10 lineage corr 1.0, S03 hop 1.0, S21 bẫy 0.5 không fabricated) —
  cơ chế hoạt động, nguyên liệu thiếu.
- **C2**: 57 exact merge proposals (Fault ×7 variants) + 191 heading-split candidates;
  merge không cải thiện vì nghẽn cổ chai là ngữ cảnh, không phải node trùng.
  Proposals: `reports/evidence/c2-merge-proposals.jsonl` — dùng cho C5.
- **C3 edge audit** (100 cạnh phân tầng): precision **0.82 < 0.90 → FAIL**. Kéo xuống bởi
  `made_from` 0.333 (cạnh provenance giữa node tên rỗng — loại nhóm này ≈0.872, vẫn
  dưới target); VERIFIES/USES/REQUIRES/MITIGATES/CONSTRAINS = **1.0**. Per-predicate:
  `reports/evidence/c3-audit-precision.json`.
- **Quyết định theo gate ADR 0004**: C1/C2 không thắng + C3 <90% → **C5 ontology rebuild
  là viên đạn còn lại** (schema Pydantic 14 node types + 15 edge types + CUSTOM_PROMPT_V2
  đã sẵn trong `src/skilltree/ontology/swebok.py`; giao thức C5a trên S2 trước khi
  full-book). Fix cần kèm: dump_graph phải xuất `description` + summaries (khắc phục
  name-only), lọc provenance node tên rỗng khỏi audit.
- **▶ Kết quả C5 (giải quyết gate)**: C5a trên S2 với graph_model Pydantic (14 node types
  + 15 edge types + CUSTOM_PROMPT_V2, chuân hoá dung hợp 57 merge proposals + 191
  heading splits): **correctness 0.538 (cao nhất vòng lặp) / elems 0.29 / hop 0.717** —
  thắng B1 theo điều kiện gate → đẩy tiếp C5b full-book: **transfer WIN** (mục 6), kéo
  elems lên **0.331** — mức cao nhất vòng lặp.


## 8. Hạn chế & bài học vận hành


- **Judge tự soạn gold**: điểm tuyệt đối 0.45–0.48 THẤP cho QA đơn giản nhưng
  TRUNG BÌNH-KHA cho bộ stress đa bước + bẫy + nghịch lý (nhóm in/partial corpus
  ~0.55–0.6), CAO GẤP ĐÔI đối thủ trực tiếp (vector 0.204).
- **Nút thắt là LLM gateway**: COT 0.46 ≈ GRAPH 0.475 nhưng 7.5× đắt → memory không
  phải nút thắt chính; GLM-Flash rỗng content ~20% calls (retry bắt buộc); gateway có
  micro-outage 15–90 phút (absorbed bởi retry stack) và **đổi team-policy runtime**
  (prefix model 403) — hóa giải bằng model rewrite proxy đứng giữa
  (`scripts/model_rewrite_proxy.py`, 127.0.0.1:8771).
- **prune_system(metadata=True) destructive toàn cục**: 1 build với reset:true xoá
  registry MỌI dataset cũ → preset run-final dataset riêng + reset:false.
- **Artifact container-side KHÔNG tự đồng bộ về VFS/server** (bài học mất 92% build
  C5b lần 1): VFS đồng bộ MỘT CHIỀU server→container — mọi artifact container-side
  (graph DB, logs, dumps, `.git`) mất khi container chết → quy tắc mới: evidence nhỏ
  copy `reports/evidence/` + sync VFS NGAY sau khi sinh.
- **Long-build cần supervision stack**: `scripts/run_supervised.sh` (preflight LLM →
  restart ≤8, backoff 300s×2ⁿ → watchdog STALL 5400s) + `cognify_resilient` (backoff
  60s×2ⁿ cap 900s, 12 transient/3 hard) + `post_done_pipeline.sh` (auto-eval khi DONE) —
  kết quả: C5b lần 2 hoàn thành 1 attempt duy nhất, 1/1.264 call lỗi đoáng tự hồi phục.
- TRIPLET_COMPLETION không dùng được nếu không build pipeline SPO riêng.
- Latency GRAPH ~50s/query: OK cho agent không-realtime; COT 380s không dùng được.
- **Ước lượng khối lượng build từ velocity đo được, không từ chars/512**: dự đoán sai
  dẫn tới kết luận sai cấp tỷ lệ ~4× (2.565 chunks giả thiết vs ~650 thật — chunks
  đo bằng token, không ký tự) và gần sai lầm giết build healthy ở mốc 92%; luôn
  ước ETA chu kỳ theo số đo lần chạy trước (C5a: 12–13 min/chu kỳ) trước bất kỳ
  quyết định stop/migrate nào.


## 9. Tái tạo (reproducibility)


```bash
# Stage B winner (subset S2)
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset b1_semantic_boost
/opt/venv/bin/python src/skilltree/eval/stage_b.py --label B1 --mode GRAPH_COMPLETION --dataset swebok_v4_b1

# Run-final (C5 ontology, full-book) — supervised mode (1 lệnh):
nohup bash scripts/run_supervised.sh c5_full_book run-00-c5full >/dev/null 2>&1 &
# Khi DONE, post_done_pipeline tự chạy: dump_graph + stage_b (label F1-full-c5,
# dataset swebok_v4_full_c5) + audit; viết RUN-FINAL-STATUS.json.
# Lưu ý: analyze_graph FAIL với schema custom (query table Entity không tồn tại) —
# thống kê cấu trúc lấy từ dump_graph JSON thay thế (reports/evidence/c5b-structure.json).
```

Env: `.env` không commit (keys trong Secrets); preset yaml commit đầy đủ;
`SKILLTREE_QUESTIONS` đổi bộ câu hỏi theo use case (default SWEBOK).


## 10. Việc tiếp theo


1. ~~C5 ontology rebuild~~ — **DONE**: C5a thắng gate (0.538), C5b full-book transfer
   WIN (F1 0.544/0.331, không pha loãng; evidence mục 6).
2. **Triệt tiêu `is_a`** (22.4% edges lệch schema C5b): củng cố CUSTOM_PROMPT_V2
   (chũi prompt) hoặc hậu xử map is_a→subtype_of rồi re-audit xem precision vượt
   gate 0.90 chưa (hiện 0.885).
3. **Vá dump_graph**: xuất `description` + summaries vào dump → rerun C1 (traversal
   có đủ nguyên liệu) — còn khả năng thắng nếu name-only là nguyên nhân duy nhất.
4. **Đào sâu INJECTS 0.667** (predicate yếu nhất audit C5b): đôi câu hỏi HumanError→Fault
   khó judgement nhất; cân nhắc exemplar hoặc phân tách INJECTS từ CAUSES.
5. Framework hoá nốt: persona flag mentor, CLI entrypoint `skilltree`, externalize
   judge templates; Mentor/Reviewer thành service.
