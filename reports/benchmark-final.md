# Benchmark cuối — SWEBOK v4 × Cognee embedded (agent-first use case)


> Trạng thái: BẢN NHÁP — mục 6 (transfer check) chờ build run-final hoàn tất.
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
  - **custom_prompt trích xuất là đòn bẩy mạnh nhất**: semantic edges 11.6% → **42.1%**,
    element_completeness **+18%**, không cần đổi retrieval.
  - **Đối sánh chuẩn LightRAG**: correctness hòa (0.49 vs 0.456–0.475 trong nhiễu);
    cognee thắng hop 0.73 vs 0.61 + elems 0.322 vs 0.273; LightRAG thắng build 2.4× +
    naive query 7s. Verdict: bổ sung, không thay thế.
  - **Stage C ablation (âm tính có giá trị)**: constrained traversal + entity merge
    KHÔNG cải thiện trên ngữ cảnh name-only; edge precision 0.82 < 0.90 → gate mở cho
    C5 ontology rebuild.
  - Agent MVP chạy thật: Mentor VI bám đồ thị + tự khai ngoài phạm vi; Reviewer duyệt
    51 node con của 1 KA → Gap Analysis; Graph→Chunk grounding.


## 2. Thiết lập thí nghiệm


- **Corpus**: `swebok-v4.md` 413 trang (PyMuPDF, marker `=== [p. N] ===`);
  Stage A/B: subset S2 = trang 67–152; Run-final: toàn sách.
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


## 6. Run-final full-book + Transfer check — CHỜ BUILD


- Preset `f0_full_book.yaml`: 413 trang, custom_prompt B1, reset:false, dataset riêng
  `swebok_v4_full` (bài học prune toàn cục — mục 8).
- Build: [CHỜ — nodes/edges/semantic_pct/thời lượng]
- **F1 transfer**: 24 câu trên swebok_v4_full vs R0-baseline S2:
  correctness = [CHỜ], elems = [CHỜ]. Kỳ vọng: 8 câu out-of-corpus cũ (SCM/Security/
  Quality/Maintenance) giờ in-corpus → phải tăng rõ; nếu không = full-book pha loãng.


## 7. So sánh framework thay thế (LightRAG, đối sánh CHUẨN)


- **Thiết kế đối sánh**: subagent độc lập ingest ĐỦ S2 (p.67–152, cùng coverage),
  gleaning TẮT đúng cách (env MAX_GLEANING=0 trước import — constructor kwarg vô hiệu),
  183 chunks → graph 1,685n/1,971e (34 phút, 306 LLM calls); 24 câu hybrid + S21/S24
  naive; **judge cùng rubric** với cognee (template y văn bản ab_probe — 2 lỗi công nghệ
  đã sửa không đụng rubric).
- **Bảng đối sánh (cùng corpus, cùng 24 câu, cùng judge)**:

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
  `reports/lightrag-vs-cognee.md`.
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


## 8. Hạn chế & bài học vận hành


- **Judge tự soạn gold**: điểm tuyệt đối 0.45–0.48 THẤP cho QA đơn giản nhưng
  TRUNG BÌNH-KHA cho bộ stress đa bước + bẫy + nghịch lý (nhóm in/partial corpus
  ~0.55–0.6), CAO GẤP ĐÔI đối thủ trực tiếp (vector 0.204).
- **Nút thắt là LLM gateway**: COT 0.46 ≈ GRAPH 0.475 nhưng 7.5× đắt → memory không
  phải nút thắt chính; GLM-Flash rỗng content ~20% calls (retry bắt buộc).
- **prune_system(metadata=True) destructive toàn cục**: 1 build với reset:true xoá
  registry MỌI dataset cũ → preset run-final dataset riêng + reset:false.
- **Artifact container-side KHÔNG tự vào git** (3 lần over-claim được xác minh bằng
  `git show --stat`): quy tắc mới — artifact quan trọng copy `reports/evidence/` NGAY
  sau khi sinh; file python-modified trong container sẽ MẤT khi sandbox chết (đã mất
  1 bản sửa mục 7 của chính báo cáo này).
- TRIPLET_COMPLETION không dùng được nếu không build pipeline SPO riêng.
- Latency GRAPH ~50s/query: OK cho agent không-realtime; COT 380s không dùng được.


## 9. Tái tạo (reproducibility)


```bash
# Stage B winner (subset S2)
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset b1_semantic_boost
/opt/venv/bin/python src/skilltree/eval/stage_b.py --label B1 --mode GRAPH_COMPLETION --dataset swebok_v4_b1
# Run-final
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset f0_full_book
/opt/venv/bin/python src/skilltree/eval/stage_b.py --label F1 --mode GRAPH_COMPLETION --dataset swebok_v4_full
# Phân tích + artifact (lưu ý: dump mới phải xuất description — đang vá)
/opt/venv/bin/python src/skilltree/eval/analyze_graph.py --dataset swebok_v4_full
/opt/venv/bin/python src/skilltree/agent/dump_graph.py --dataset swebok_v4_full
# Stage C (nếu rerun)
/opt/venv/bin/python src/skilltree/eval/c1_traverse_eval.py --help
```


Env: `.env` không commit (keys trong Secrets); preset yaml commit đầy đủ;
`SKILLTREE_QUESTIONS` đổi bộ câu hỏi theo use case (default SWEBOK).


## 10. Việc tiếp theo


1. **C5 ontology rebuild** (viên đạn còn lại theo gate): graph_model Pydantic +
   CUSTOM_PROMPT_V2 → C5a trên S2 (81 phút) → nếu corr/hop thắng B1 → C5b full-book.
   Schema đã sẵn: `src/skilltree/ontology/swebok.py`; chuẩn hoá dung hợp 57 merge
   proposals + 191 heading splits.
2. **Vá dump_graph**: xuất `description` + summaries vào dump → rerun C1 (traversal
   có đủ nguyên liệu) — còn khả năng thắng nếu name-only là nguyên nhân duy nhất.
3. **C3 re-audit** sau C5: target precision ≥0.90 (loại provenance node tên rỗng,
   hoặc bắt extraction gắn name cho mọi node).
4. Framework hoá nốt: persona flag mentor, CLI entrypoint `skilltree`, externalize
   judge templates; Mentor/Reviewer thành service.
