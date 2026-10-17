# ADR 0004 — Stage C Toolkit: cải tiến graph không cần rebuild

## Bối cảnh

Benchmark đã chốt (Stage A/B + đối sánh LightRAG): cognee B1 = champion
(corr 0.456, elems 0.322, hop 0.73). Review ngoài (Claude) chỉ ra 6 vấn đề
trong thiết kế cải tiến ban đầu:

1. Số liệu phải truy được nguồn; artifact sống trong container là rủi ro mất.
2. Không trộn dữ liệu thật với minh họa; LLM-confidence chưa hiệu chỉnh.
3. fault/defect/bug là CÙNG khái niệm (gộp được) nhưng failure/error là RIÊNG
   (IEEE 610.12) — gộp sai sẽ phá chính chuỗi nhân quả cần truy vết.
4. Chỉ tiêu "predicate ngoài enum = 0%" tầm thường — cần precision theo mẫu
   audit tay + tỷ lệ OTHER làm chỉ số sức khỏe ontology.
5. DbC VERIFIES Coding sai hướng (kỹ thuật verifies artifact, không activity);
   node tiêu đề mục là vấn đề granularity chứ không phải chính tả.
6. Một cạnh được nhiều chunk hỗ trợ → source_chunks phải là danh sách.

## Quyết định

Xây toolkit thuần local (0 LLM call) TRƯỚC khi quyết định rebuild:

- `src/skilltree/agent/traverse.py` — constrained traversal theo predicate +
  direction + k-hop, 3 mode dựng sẵn (lineage/verify/overview); render_context
  có budget token. Chạy trên graph dump/fixture, không cần DB.
- `src/skilltree/agent/entity_merge.py` — đề xuất gộp (normalize + synonym
  canonical fault/defect/bug→Fault + protected concepts + heading-splitter);
  CHỈ đề xuất kèm evidence, không tự merge.
- `src/skilltree/eval/audit_edges.py` — sampling phân tầng + precision summary
  (chỉ tiêu ≥90% trước khi tin đồ thị).
- `src/skilltree/ontology/swebok.py` — schema Pydantic C5: 14 node type,
  15 edge type (13 semantic + OTHER), confidence 0-1, source_chunks list,
  custom_prompt_v2 với 7 quy tắc cứng (thuật ngữ IEEE, heading tách leaf).
- Test 16/16 pass (`tests/test_stage_c.py`), fixture mô phỏng đúng các bẫy
  thực tế đã gặp (3 node design-by-contract, heading gộp, contains nhiễu).

## Thứ tự thực thi sau khi F0 (full-book) hoàn tất

1. Dump graph full → artifact đẩy vào `reports/evidence/` NGAY (bài học:
   không để artifact sống trong container).
2. C1 ablation (query-side): traverse.py mode lineage/verify cho nhóm câu
   reverse/lineage/paradox — so với R0 full-context trên cùng 24 câu.
3. C2 ablation: entity_merge đề xuất → duyệt → áp dụng trên bản sao dump →
   đo lại. Chỉ áp dụng nếu hop_precision tăng.
4. C4: audit 100 cạnh → precision; nếu <90% → sửa extraction trước khi tính
   rebuild.
5. C5 rebuild với graph_model chỉ khi C1-C4 không đủ — theo giao thức
   C5a (S2 trước) → C5b (full) nếu thắng.

## Không làm

- Không đụng baseline B1 đã ghi trong ledger/báo cáo.
- Không chạy LLM trong toolkit (gateway dành cho build/eval).
- Không tự ý merge node khi chưa có người/agent duyệt đề xuất.
- Không tin confidence LLM trước khi hiệu chỉnh theo mẫu audit.
