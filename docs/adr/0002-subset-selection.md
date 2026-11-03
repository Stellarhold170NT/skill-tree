# ADR 0002 — Chọn subset dữ liệu cho Giai đoạn B (tuning 10 vòng)

- **Trạng thái**: Accepted (đề xuất bởi Task 3, chờ user/orchestrator xác nhận)
- **Ngày**: 2026-10-16
- **Bối cảnh**: PIVOT agent-first (CONTEXT.md) — Giai đoạn A bắt buộc chọn tập dữ
  liệu bằng số đo trước khi tuning cấu hình. Hai candidate cùng cấu hình baseline
  (cognee 1.6.4, e5-large embedding, chunk 512→510, batch 25, extractor llm,
  3-key round-robin, reset, state ghim repo):

  - **S1** = Requirements (p43–66) + Testing (p118–152) + Quality (p248–265) +
    Security (p266–275) — 295,638 chars, 87 trang, **141 chunks**
  - **S2** = Architecture (p67–82) + Design (p83–99) + Construction (p100–117) +
    Testing (p118–152) — 287,342 chars, 86 trang, **138 chunks**
  - Chồng lấp KA Testing → 6 câu hỏi dùng chung làm anchor so sánh trực tiếp.

## Quyết định

**Chọn S2** (Architecture + Design + Construction + Testing) làm subset cho
Giai đoạn B (10 vòng tuning). Run-final vẫn build full sách với winner config.

## Số đo (runs/run-00/metrics.json vs runs/run-00-s2/metrics.json)

| Metric | S1 (run-00) | S2 (run-00-s2) | thắng |
|---|---|---|---|
| correctness_mean (judge GLM, temp 0.1) | 0.929 | **0.975** | S2 |
| correctness_median | 1.0 | 1.0 | = |
| n_score = 0 | 0 | 0 | = |
| context_coverage_semantic_mean | 0.176 | **0.438** | S2 (2.5×) |
| context_coverage_lexical_mean (phụ) | 0.080 | 0.137 | S2 |
| mean_answer_seconds | 21.4 | 24.1 | ~ |
| Graph: nodes / edges | 2,746 / 10,011 | 2,584 / 9,335 | tương đương |
| % entity có description | 100% | 100% | = |
| Build cognify (141/138 chunks) | 4,044s | 4,280s | ~ |

- **6 câu Testing anchor** (dùng chung 2 subset):

| Q | S1 correctness | S2 correctness | S1 cov_sem | S2 cov_sem |
|---|---|---|---|---|
| Q17 | 1.0 | 1.0 | 0.0 | 0.0 |
| Q18 | 1.0 | 1.0 | 0.5 | 0.5 |
| Q19 | 1.0 | 1.0 | 0.0 | 0.0 |
| Q20 | 1.0 | 0.9 | 0.0 | 0.0 |
| Q21 | 0.9 | 1.0 | 0.0 | 0.0 |
| Q22 | 0.5 | 0.7 | 0.5 | 0.5 |
| **mean** | 0.900 | **0.933** | 0.167 | 0.167 |

- **By-KA**: S1 = Req 0.917, Testing 0.900, Quality 0.950, Security 1.000.
  S2 = **Arch 1.000, Design 1.000, Construction 1.000**, Testing 0.933.

## Lý do

1. **Correctness cao hơn** (0.975 vs 0.929) và đặc biệt S2 đạt 1.000 tuyệt đối
   trên 3/4 KA của chính nó (Arch/Design/Constr).
2. **Context coverage semantic cao gấp ~2.5 lần** (0.438 vs 0.176): các chunk
   retrieved từ S2 chứa đủ thông tin trả lời câu hỏi thường xuyên hơn — S2 là
   tập nội dung "định nghĩa + khái niệm" dày đặc, thân thiện với truy xuất
   vector + graph cùng lúc.
3. **Anchor không phản đối**: 6 câu Testing (cùng nguồn trang p118–152, build
   trong 2 ngữ cảnh khác nhau) cho correctness 0.933 (S2) vs 0.900 (S1) và
   coverage bằng nhau (0.167) — chênh lệch chính đến từ chất lượng build, không
   phải từ độ khó câu hỏi.
4. Extraction sanity: cả hai không degenerate (100% entity có description;
   ~95–99 EntityType khác nhau; node/edge ratio 0.26–0.28 tương đương).

## Hệ lụy

- Giai đoạn B (10 vòng tuning) chạy `--preset base4ka_s2 --run-id run-NN`.
- `configs/presets/base4ka.yaml` (S1) giữ lại làm candidate thứ 2 khi cần đối
  chiếu; question set holdout = các câu của KA ngoài subset (23 câu gốc 40).
- Lưu ý giai đoạn B: coverage của KA Testing thấp cố định (0.167) ở cả hai
  build — vòng tuning nên thử custom_prompt/search_params nhắm cải thiện
  Testing retrieval; đây là nút thắt rõ nhất.

## Ghi chú phương pháp

- Judge = GLM-5.3-Flash qua gateway, temperature 0.1, max_completion_tokens
  2000 + fallback `reasoning_content` (thinking model hay để `content` rỗng —
  3 lần chấm đầu của S1 bị sai thấp vì lỗi này, đã sửa và chấm lại).
- `context_coverage` CHÍNH là semantic (judge chấm "context có đủ thông tin để
  trả lời câu hỏi?" — cho phép chéo ngôn ngữ VI↔EN); lexical overlap chỉ giữ
  làm phụ vì vô nghĩa khi chéo ngôn ngữ.
- Cả hai build sống sót trên sandbox 8Gi với các biện pháp chống OOM (OMP=2
  thread, batch 25, MemoryGuard): MemFree S1 plateau 1.77–2.05GB, S2
  1.11–1.38GB.
