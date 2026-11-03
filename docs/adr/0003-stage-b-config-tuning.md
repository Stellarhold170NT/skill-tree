# ADR 0003 — Kết quả Giai đoạn B: cấu hình tuning trên S2

Ngày: 17/10 (đêm). Trạng thái: Accepted. Quyết định bởi: orchestrator + user (ma trận thông minh đã duyệt).

## Bối cảnh

Stage A chọn S2 (Arch+Design+Constr+Test) làm winner subset (ADR 0002). Stage B tinh chỉnh
cấu hình trên S2 theo nguyên tắc: chỉ rebuild khi biến thuộc build-side; retrieval-side chạy
trên cùng memory để cô lập biến. Bộ đánh giá: 24 câu stress (5 topology: linear/tree/negative/
lineage/reverse + paradox), metrics: correctness, element_completeness, hop_precision.

## Các vòng (runs/ledger.jsonl, memory cùng corpus, judge GLM temp 0.1)

| Vòng | Biến | correctness | elems | Ghi chú |
|---|---|---|---|---|
| R0 | baseline S2 + GRAPH_COMPLETION | 0.475 | 0.273 | baseline |
| R1 | CHUNKS k=5 | 0.217 | 0.174 | |
| R1b | CHUNKS k=20 | 0.225 | 0.144 | top_k không phải đòn bẩy |
| R2 | GRAPH_COMPLETION_CONTEXT_EXTENSION | 0.348 | 0.148 | loãng ngữ cảnh |
| R3 | HYBRID_COMPLETION | 0.373 | 0.193 | |
| R4 | CHUNKS + prompt cấu trúc | 0.123 | 0.093 | ràng buộc quá mức |
| **B1** | **custom_prompt semantic boost** | **0.456** | **0.322** | **WINNER elems** |
| B2 | chunk 1024 | 0.390 | 0.241 | lớn hơn ≠ tốt hơn |

## Kết luận

1. **Retrieval-side: GRAPH_COMPLETION mặc định là champion.** Không biến retrieval nào vượt
   baseline. CONTEXT_EXTENSION loãng (30 triplets thêm = nhiễu); HYBRID tốt hơn ext nhưng
   vẫn thua; structured-RAG prompt làm sập synthesis.
2. **Build-side: B1 thắng ở element_completeness (+18%: 0.273→0.322) với correctness ngang**
   (0.456 vs 0.475, trong biên nhiễu judge). Graph B1: 3,339n/13,155e (+29%/+41%),
   **semantic edges 42.1%** (từ 11.6% — gần 4×, vượt mục tiêu 25-30%): predicates
   part_of 13.3%, uses 10.2%, produces 4.2%, constrains 4.0%, verifies 3.0%, mitigates 1.7%.
3. **B2 (chunk 1024) có hại** dù semantic edges tình cờ 32.9%: chunk to làm loãng, correctness
   tụt 0.085. → **B3 combo (B1 prompt + chunk 1024) bị LOẠI theo nguyên tắc đo đạc**: không
   hợp biến có tác động âm với chi phí 2h rebuild, kỳ vọng thấp hơn B1.

## Quyết định

- **Cấu hình mang vào run-final full-book: B1** (chunk 512→510, batch 25, extractor llm,
  custom_prompt semantic-boost như configs/presets/b1_semantic_boost.yaml) +
  GRAPH_COMPLETION cho Q&A.
- Stage B kết thúc ở 7 vòng có số đo + A/B probe 62 cặp + 3 phân tích cấu trúc đồ thị
  (S2, b1, b2) — không chạy B3, có lý do đo đạc ghi ở trên.
- COT: chỉ giữ probe trần (S16/S17/S23/S24); TRIPLET_COMPLETION: loại vĩnh viễn
  (pipeline mặc định không dựng SPO index).

## Hệ lụy

- Reviewer mode (Task 4) nên chạy trên memory B1 (quan hệ typed hơn) + tận dụng cạnh
  cấu trúc cho checklist/Gap Analysis.
- Full-book: giữ nguyên chống-OOM (OMP/ORT=2, batch 25) + custom_prompt B1.
- Latency GRAPH_COMPLETION p50 ~50s chấp nhận được cho agent; COT 380s không dùng.
