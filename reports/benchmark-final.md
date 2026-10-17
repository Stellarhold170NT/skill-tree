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
  trước, build-side đắt sau, combo chỉ khi mọi thành phần đo là dương).
- **Kết quả chính**:
  - GRAPH_COMPLETION **2.3× correctness**, **29× hop_precision** so vector RAG trần —
    multi-hop traversal là năng lực độc quyền của đồ thị.
  - Zero fabrication cả 3 chế độ; GRAPH từ chối trung thực khi out-of-corpus
    (faithfulness cho agent thẩm định); vector "thắng" out bằng parametric hallucination.
  - **custom_prompt trích xuất là đòn bẩy mạnh nhất**: semantic edges 11.6% → **42.1%**,
    element_completeness **+18%**, không cần đổi retrieval.
  - Agent MVP chạy thật: Mentor VI bám đồ thị + tự khai ngoài phạm vi; Reviewer duyệt
    51 node con của 1 KA → Gap Analysis; Graph→Chunk grounding (đường ray graph +
    bằng chứng chunk nguyên bản).

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
Artifact: `artifacts/graph_swebok_v4_b1.json.gz` (313KB, 3,511n/13,429e).

## 6. Run-final full-book + Transfer check — CHỜ BUILD

- Preset `f0_full_book.yaml`: 413 trang, custom_prompt B1, reset:false, dataset riêng
  `swebok_v4_full` (bài học prune toàn cục — mục 8).
- Build: [CHỜ — nodes/edges/semantic_pct/thời lượng]
- **F1 transfer**: 24 câu trên swebok_v4_full vs R0-baseline S2:
  correctness = [CHỜ], elems = [CHỜ]. Kỳ vọng: 8 câu out-of-corpus cũ (SCM/Security/
  Quality/Maintenance) giờ in-corpus → phải tăng rõ; nếu không = full-book pha loãng.

## 7. Agent MVP (Task 4) + so sánh framework thay thế

- `mentor.py`: ask (Q&A VI + tự khai ngoài phạm vi), review (--ka Software Design:
  51 node con → Gap Analysis COVERED/PARTIAL/MISSING), batch; llm retry-on-empty
  (GLM reasoning ăn token ~20% calls).
- `graph_to_chunks.py`: entity → cạnh ngữ nghĩa (verifies/mitigates/part_of) →
  DocumentChunk nguồn — citation gốc + không rơi rụng chi tiết + đối chiếu chống ảo giác.
- **LightRAG 1.5.7 smoke test song song** (subagent độc lập, 59/60 calls, chi tiết
  reports/lightrag-smoke-summary.md): ingest **~2.5–3× nhanh hơn/trang**, query naive 7s /
  hybrid ~30–80s; **graph mỏng (1.0 edge/node vs 3.9)** → không hợp lineage multi-hop;
  từ chối đúng khi thiếu dữ liệu (honesty 1.0 trên S05-naive). **Verdict: BỔ SUNG
  (second-opinion, query rẻ), THAY THẾ cognee thì CHƯA.**
- Phát hiện chung cho gateway-closed env: `/v1/embeddings` bị chặn 403 → embedding
  luôn tự host (bge-small-en-v1.5 verify chạy tốt).

## 8. Hạn chế & bài học vận hành

- **Judge tự soạn gold**: điểm tuyệt đối 0.45–0.48 THẤP cho QA đơn giản nhưng
  TRUNG BÌNH-KHA cho bộ stress đa bước + bẫy + nghịch lý (nhóm in/partial corpus
  ~0.55–0.6), CAO GẤP ĐÔI đối thủ trực tiếp (vector 0.204).
- **Nút thắt là LLM gateway**: COT 0.46 ≈ GRAPH 0.475 nhưng 7.5× đắt → memory không
  phải nút thắt chính; GLM-Flash rỗng content ~20% calls (retry bắt buộc).
- **prune_system(metadata=True) destructive toàn cục**: 1 build với reset:true xoá
  registry MỌI dataset cũ → preset run-final dataset riêng + reset:false; graph dump
  JSON là bảo hiểm tri thức; DB binary 140MB KHÔNG commit (khung tái tạo là preset).
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
# Phân tích + artifact
/opt/venv/bin/python src/skilltree/eval/analyze_graph.py --dataset swebok_v4_full
/opt/venv/bin/python src/skilltree/agent/dump_graph.py --dataset swebok_v4_full
```

Env: `.env` không commit (keys trong Secrets); preset yaml commit đầy đủ;
`SKILLTREE_QUESTIONS` đổi bộ câu hỏi theo use case (default SWEBOK).

## 10. Việc tiếp theo

- Framework hoá nốt: persona flag mentor, CLI entrypoint `skilltree`, externalize
  judge templates.
- LightRAG A/B đầy đủ nếu cần (bật cache, tắt gleaning đúng qua env — hiện smoke 2/6 câu).
- Agent production hoá: Mentor/Reviewer thành service; checklist authored theo ma trận
  Risk Scanner 5 chiều + Audit Review Ledger 4 phần (docs/plans/CONTEXT.md).
