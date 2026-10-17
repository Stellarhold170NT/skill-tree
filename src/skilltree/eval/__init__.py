"""eval — truy xuất + đánh giá Memory (bản mỏng của Task 5, phục vụ Giai đoạn A).

Thành phần:
- quick_eval.py : recall (GRAPH_COMPLETION + CHUNKS per câu hỏi) + judge GLM
                  (correctness 0-1) + context coverage + extraction sanity
                  -> runs/<run_id>/{answers.jsonl, metrics.json}
"""
