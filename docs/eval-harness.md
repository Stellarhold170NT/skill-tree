# Eval Harness — chuẩn hoá 3 tầng (Task 5)

Ba tầng đánh giá dùng xuyên suốt use case SWEBOK×Cognee, tất cả resumable (append-per-call,
skip kết quả đã có), judge GLM temp 0.1 / max_completion_tokens 2000 + fallback
reasoning_content, 3-key round-robin qua monkeypatch litellm.

## Tầng 1 — quick_eval.py (nền tảng)
Nhập helpers dùng chung: `load_env_file`, `read_keys`, `install_key_round_robin`,
`extract_search_texts`, `find_dataset_graph_db` (resolve dataset name → Ladybug file qua
sqlite registry), `_llm_judge_json` (3 attempts). Chế độ recall/eval cho một câu lẻ.

## Tầng 2 — ab_probe.py (A/B probe)
Ma trận chế độ × câu hỏi: `modes_for(q)` = [GRAPH_COMPLETION, CHUNKS] + COT nếu topology
∈ {reverse, paradox}. Judges: correctness (JUDGE_TEMPLATE), negative (NEGATIVE_JUDGE_TEMPLATE
→ score + fabricated), elements (JUDGE_ELEMENTS_TEMPLATE → completeness + missing), hops
(HOP_TEMPLATE → hops_correct/total → hop_precision). CHUNKS mode = vector top-k → LLM
synthesis có ràng buộc "chỉ trả lời dựa trên đoạn trích". Kết quả: runs/graph_probe/
ab_results.jsonl + ab_summary.json (agg by_mode, by_mode_and_topology).

## Tầng 3 — stage_b.py (tuning rounds)
Một vòng = 24 câu × 1 cấu hình retrieval (--mode, --top-k, --rag-structured, --dataset).
Mỗi vòng ghi: runs/stage_b/<label>/results.jsonl + summary.json + 1 dòng runs/ledger.jsonl
(round, kind, config, metrics by_topology, ts). chain_rounds.py chạy chuỗi tuần tự.
Build-side eval: gọi lại stage_b với --dataset khác (b1/b2/full) — cùng câu hỏi, cùng judge
→ so sánh công bằng giữa các memory.

## Metrics chuẩn
- correctness (0–1, semantic match vs gold, judge)
- element_completeness (tỉ lệ phần tử key của gold có trong answer)
- hop_precision (hops_correct / hops_total theo expected_path; None với câu không path)
- fabricated flag (chỉ câu negative — phát hiện bẫy)
- latency (search + rag tách riêng)

## Quy ước vận hành
- .env KHÔNG commit; questions_stress.jsonl append-only trong lúc chạy
- Timeout 900s mỗi call (asyncio.wait_for) — đề phòng gateway treo
- Kill process bằng python /proc scan (không có ps/pkill); long job = Popen detached + poll log
- Memory S2/b1/b2/full: chỉ search, không prune; rebuild = preset riêng + reset:false khi có
  dataset khác cùng sống
