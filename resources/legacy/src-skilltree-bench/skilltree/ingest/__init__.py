"""ingest — dựng Memory cognee từ Corpus SWEBOK v4 theo preset Run (Task 3).

Thành phần:
- presets.py      : nạp + resolve preset YAML/JSON từ configs/presets/
                    (reset/dataset/chunk_size/chunks_per_batch/custom_prompt/
                     graph_model/extractor/files/subsets...)
- build_memory.py : Pipeline add → cognify (cognee legacy V1) + đo thời gian
                    + đếm node/edge + truy vấn kiểm chứng, ghi runs/<run_id>/

Pipeline theo GLOSSARY.md: ingest → cognify → index.
Run = 1 lần chạy benchmark config.
"""
