# LightRAG (HKUDS) smoke test — TÓM LƯỢC cho dự án chính

Bản đầy đủ 12.7KB: DSH workspace `lightrag-smoke-report.md` (ngoài repo) + toàn bộ
scripts/logs/rag_storage tái lập trong sandbox `sess-b7b66a2e` / workspace `lightrag-test`
(ttl 6h từ 03:33). Chạy bởi subagent độc lập, 59/60 LLM calls, ~35 phút thực.

## Verdict: BỔ SUNG được, THAY THẾ cognee thì CHƯA

| Khía cạnh | cognee 1.6.4 (S2 86 trang) | LightRAG 1.5.7 (slice 33 trang) |
|---|---|---|
| Ingest | ~81 phút (1.06 phút/trang) | dự phóng ~17–18 phút/108KB (**~2.5–3× nhanh hơn/trang**) |
| Graph | 3,339n/13,155e; semantic 42.1%; **3.9 edge/node** | 413n/414e (**1.0 edge/node — mỏng, entity-relation trừu tượng**) |
| Query p50 | ~50s (GRAPH_COMPLETION) | hybrid 31.6s đo (lạnh 35–80s); naive **7s** |
| Chống bịa |GRAPH từ chối trung thực | S05-naive từ chối 100% đúng, không bịa (honesty 1.0) |
| Chất lượng đa bước | corr 0.456–0.475, hop ~0.73 | chỉ 2/6 câu kịp (budget cạn): S15-hybrid ~0.6, 5/5 trích dẫn verify thật |

## Vai trò đề xuất cho agent thẩm định

- **cognee (chính)**: truy vết lineage multi-hop (S22/S23), Reviewer Gap Analysis,
  checklist traversal — nhờ graph dày + cạnh typed.
- **LightRAG (bổ sung, tuỳ chọn)**: truy vấn nhanh "liệt kê/định nghĩa/so sánh",
  second-opinion cross-check, chế độ naive 7s cho tra cứu rẻ.

## Phát hiện áp dụng cho CẢ dự án chính (không riêng LightRAG)

1. **Gateway NetMind/Viettel CHẶN hẳn `/v1/embeddings` (403 "team not allowed")** —
   team chỉ được 2 model chat (MiniMax-M3, GLM-5.3-Flash). Mọi RAG framework dùng
   gateway này PHẢI tự host embedding. Đã verify: BAAI/bge-small-en-v1.5 (dim 384)
   chạy tốt local, ~900 texts / 90s trên 2 CPU.
2. **GLM-5.3-Flash trả content RỖNG ~20% calls** (11/55 đo được) — token hết vào
   reasoning. mentor.py đã có retry-on-empty; cognee internal + judge đã có fallback
   reasoning_content. Lưu ý: entity của chunk tương ứng bị mất trong extraction khi
   gặp call rỗng.
3. Bẫy lightrag-hku 1.5.7 (nếu dùng sau): constructor kwargs bị bỏ qua một phần
   (config qua env/addon_params); `ainsert()` chỉ là enqueue (dùng 2-step pipeline API);
   `embed_fn` bắt buộc trả np.ndarray (trả list = chết im lặng, vdb rỗng);
   phải `await rag.initialize_storages()`.

## Hạn chế của smoke test (đọc số cần biết)

4/6 câu không chạy được (call budget cạn do gleaning ×2 khi config bị bỏ qua) —
kết quả chất lượng chỉ trên 2 câu; self-judge; slice tự extract từ cùng PDF + cùng
thuật toán extract.py (có thể lệch byte nhẹ, xác suất ảnh hưởng thấp).
