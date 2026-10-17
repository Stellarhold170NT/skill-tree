# LightRAG (HKUDS) — đối sánh độ chính xác CHUẨN với cognee (S2, cùng rubric)

Chạy 17/10: subagent độc lập — ingest ĐỦ S2 (p.67–152, 287KB, cùng coverage 86 trang như
benchmark cognee), gleaning TẮT đúng cách (env MAX_GLEANING=0 trước import), 183 chunks →
**graph 1,685n / 1,971e**, ingest 34 phút, 306/420 LLM calls (empty-response 29% ingest /
14% query, retry-on-empty áp dụng). Query: 24/24 hybrid + S21/S24 naive = 26 runs.
Judge: **cùng rubric** với benchmark cognee (judge_lightrag.py — template y văn bản
ab_probe, 2 lỗi công nghệ đã sửa không đụng rubric: api_key qua with_options,
điều kiện JSON chấp nhận "completeness").

## BẢNG SO SÁNH ĐỘ CHÍNH XÁC (cùng corpus, cùng 24 câu, cùng judge)

| Metric | cognee B1 (GRAPH_COMPLETION) | cognee R0 baseline | **LightRAG hybrid** |
|---|---|---|---|
| correctness_mean | 0.456 | 0.475 | **0.490** |
| element_completeness | **0.322** | 0.273 | 0.273 |
| **hop_precision** | **~0.73** | 0.734 | 0.612 |
| latency p50 | ~50s | 50.6s | 44.5s (p90 81.2s) |
| Negative S21 (bẫy Cleanroom) | 1.0, fab=0 | 1.0, fab=0 | **1.0, fab=0 (cả hybrid & naive)** |
| Build thời gian | ~81 phút | ~68 phút | **~34 phút (2.4×)** |
| Graph | 3,339n/13,155e (3.9 e/node) | 2,584n/9,335e | 1,685n/1,971e (**1.1 e/node**) |
| Query rẻ nhất | ~50s | ~50s | **naive 7–11.5s** |

## Đọc kết quả (trung thực)

1. **Correctness: ngang nhau trong biên nhiễu** (0.49 vs 0.456–0.475). Phân phối
   LightRAG nhiều row đúng 0.5 ("đúng hướng nhưng thiếu") — retrieval rộng nhưng
   synthesis hời hợt hơn.
2. **Hai điểm cognee vẫn thắng rõ**:
   - **hop_precision 0.73 vs 0.61** — truy vết đa bước (lineage S22, reverse S23)
     vẫn là thế mạnh graph dày có cạnh typed; đúng dự đoán từ mật độ cạnh (3.9 vs 1.1).
   - **element_completeness 0.322 vs 0.273** — custom_prompt B1 gom phần tử key tốt hơn.
3. **Hai điểm LightRAG thắng**: build nhanh 2.4×; query naive 7s (tra cứu rẻ).
4. **Chống bịa: CẢ HAI đều 1.0** — từ chối trung thực khi thiếu dữ liệu là tính chất
   của thiết kế grounded (không phải đặc quyền của hệ nào).

## Verdict (đối sánh chuẩn, thay cho verdict smoke 2/6 câu trước đó)

**LightRAG = BỔ SUNG xứng đáng, KHÔNG phải thay thế**: dùng cho truy vấn nhanh
"liệt kê/định nghĩa/so sánh" (naive 7s) và second-opinion; giữ cognee B1 cho
lineage/reverse multi-hop + Reviewer Gap Analysis. Nếu ưu tiên tốc độ build ở
use case mới (corpus lớn, rebuild thường xuyên), LightRAG là ứng viên mạnh.

## Phát hiện chung (gateway-closed env)

- `/v1/embeddings` bị gateway chặn 403 → mọi RAG framework phải tự host embedding
  (bge-small-en-v1.5 dim 384 verify chạy tốt: ~900 texts/90s trên 2 CPU).
- GLM-5.3-Flash rỗng content 14–29% calls khi gateway tải cao → retry-on-empty bắt buộc.
- Lightrag-hku 1.5.7 bẫy: gleaning tắt qua env `MAX_GLEANING=0` set TRƯỚC import
  (field default đọc lúc import — constructor kwarg vô hiệu); `ainsert()` chỉ là
  enqueue (dùng apipeline_* 2 bước); embed phải trả np.ndarray; cần
  `await rag.initialize_storages()`.

Files đầy đủ: DSH workspace `lightrag-results-s2.jsonl`, `lightrag-judged.jsonl`,
`lightrag-judged-summary.json`, `lightrag-smoke-report.md` (mục 11 phụ lục run S2) +
bản gốc trong vAi workspace `lightrag-test` (sess-b7b66a2e, ttl 6h từ 03:33).
