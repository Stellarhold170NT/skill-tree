# Task 3 — Ingest/Cognify pipeline (Memory build)

> Trạng thái: **HOÀN THÀNH code + kiểm chứng end-to-end trên subset; baseline full corpus CHƯA chạy** — dừng theo ma trận quyết định của orchestrator (qua message giữa task) vì tốc độ build full ước ~3.6h vượt ngân sách 90 phút. Mọi cấu hình đã sẵn sàng để chạy baseline ngay khi orchestrator chốt phương án.

## 1. Bàn giao

| File | Vai trò |
|---|---|
| `src/skilltree/ingest/__init__.py` | package docs |
| `src/skilltree/ingest/presets.py` | nạp/resolve preset YAML\|JSON, trích subset theo KA (metadata.json + marker `=== [p. N] ===`) |
| `src/skilltree/ingest/build_memory.py` | Pipeline add → cognify → graph stats → search kiểm chứng; round-robin API key; ghi `runs/<run_id>/` |
| `configs/presets/base.yaml` | preset baseline (run_id `run-00`) |
| `configs/presets/smoke.yaml` | preset subset KA "Software Security" (p.266–275) |
| `runs/smoke-001/…`, `runs/smoke-003/…` | logs + `ingest_metrics.json` + `resolved_config.json` + `search_sample.txt` |
| `runs/smoke-002/ABORTED.txt`, `runs/run-00/ABORTED-old-env.txt` | marker các run bị huỷ (lý do bên dưới) |

Không commit/push (theo yêu cầu — orchestrator thực hiện). Không đụng `questions.jsonl`, `.env`, Task 4–6.

## 2. Preset schema (Task 6 chỉ đổi preset, không sửa code)

```yaml
run_id: <str>                 # id Run, CLI --run-id ghi đè được
reset: true|false             # prune_data + prune_system(metadata=True) trước build
dataset: swebok_v4            # tên Dataset cognee (partition)
chunk_size: null|<int>        # null = cognee tự resolve (xem phát hiện #4.1)
chunks_per_batch: 100|null    # null = mặc định cognee (2000)
custom_prompt: null|<str>
graph_model: null|<tên class> # "KnowledgeGraph" | "module.Class" | "module:Class"
extractor: llm|gliner
files: [glob...]              # tương đối repo root
subsets: [KA name...]         # lọc trang theo metadata.json (chỉ dùng test nhanh)
llm_api_keys_env: [LLM_API_KEY, ...]  # TÊN biến môi trường; >=2 key -> round-robin
incremental_loading: true|false
chunk_attachment: null|direct|all
search_type: GRAPH_COMPLETION
search_query: "..."
```

Map thẳng vào `cognee.cognify(**kwargs)` (signature cognee 1.6.4 đã verify runtime): `datasets`, `graph_model`, `chunker`, `chunk_size`, `chunks_per_batch`, `custom_prompt`, `extractor` ("llm"|"gliner"), `incremental_loading`, `chunk_attachment`. Giá trị key KHÔNG bao giờ được ghi vào file — chỉ tên env var + fingerprint `...4 ký tự cuối` trong resolved config.

## 3. Cách chạy

```bash
cd /workspace
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset smoke
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset base --run-id run-00
```

Log python tự mở file `runs/<run_id>/ingest.log` (không shell redirection — môi trường fence chặn `>`/`>>`).

## 4. Phát hiện kỹ thuật quan trọng (đầu vào cho Task 4–6)

1. **chunk_size tự động của cognee = 126 tokens, KHÔNG phải 1500.** `resolve_chunk_size(None)` = `min(embedding_max_completion_tokens, llm_max_completion_tokens//2)`; fastembed MiniLM multilingual chỉ nhận **126 tokens** text → chunk bị ghim 126. Đã verify bằng chính `TextChunker` của cognee: full corpus 1,312,997 chars → **2,809 chunks** (nếu cố set `chunk_size` >126, cognee tự hạ về 126 kèm warning). ⇒ Muốn chunk lớn hơn **bắt buộc** đổi embedding model (biến `EMBEDDING_MODEL`) — gợi ý cho Task 6.
2. **Song song hoá thật khi tắt rate limiter:** `extract_graph_from_data` (cognee 1.6.4) dùng `asyncio.gather` trên TẤT CẢ chunk của một batch → batch chạy đồng thời. Với limiter ON (60 req/min), throughput bị ghim ~7 chunk/phút.
3. **Trần thật của gateway là throughput tổng, không phải concurrency:** đo được ~250 tokens/s aggregate (62 chunk × ~1,300 tok ≈ 80k tok / 321s). Dưới tải đồng thời, mỗi call chậm đi; tăng `chunks_per_batch` hay thêm key KHÔNG vượt được trần này (single vLLM backend).
4. **`LLM_ARGS` tắt thinking làm hỏng structured extraction (bỏ):** với `enable_thinking=false`, GLM-5.3-Flash trả JSON lệch schema (`id_id` thay `id`, key `'This chunk is about'`) → instructor/litellm retry fail, graph hỏng. Evidence: `runs/smoke-002/ABORTED.txt`, 4× "Field required" trong `/root/t3_smoke2.log`. Thinking ON là bắt buộc cho chất lượng; nghĩ lại chỉ còn hướng đổi model hoặc chấp nhận thời gian.
5. **Round-robin 3 API key:** monkeypatch `litellm.acompletion` (idempotent, chỉ đổi kwarg `api_key`, xoay đều 3 key — unit test pass). Adapter litellm_native của cognee lookup `litellm.acompletion` qua module attr LÚC GỌI nên patch toàn cục. 0 lỗi 429 trong các run.
6. **`cognify()` trả về** dict `{dataset_id: PipelineRunCompleted(...)}` (không JSON-serializable trực tiếp) — đã log dạng repr; số liệu định lượng lấy từ graph/vector DB.

## 5. Timing các Run (Corpus subset Software Security, 10 trang, 29,188 chars, 62 chunks)

| Run | Cấu hình | prune | add | cognify | search | total | nodes | edges |
|---|---|---|---|---|---|---|---|---|
| smoke-001 | limiter ON, thinking ON, 1 key, batch mặc định | 3.9s | 37.5s | 544.7s | 10.5s | **596.6s** | 635 | 1,766 |
| smoke-002 | thinking **OFF** (LLM_ARGS) | — | 43.9s | (extraction 223s) | — | ABORTED | — | — |
| smoke-003 | limiter OFF + thinking ON + 3-key RR + batch 100 | 5.5s | 47.9s | **444.1s** | 8.7s | **506.2s** | 643 | 1,767 |

- smoke-002 bị huỷ vì schema hỏng (phát hiện #4.4). run-00 lần 1 bị huỷ ở phút 12 (cấu hình cũ, ước 6.8h) — marker `runs/run-00/ABORTED-old-env.txt`.
- search GRAPH_COMPLETION (smoke-003, 8.7s) — trích ≥300 ký tự:

> **Software security là gì?** Software security (bảo mật phần mềm) là tính bảo mật của phần mềm được phát triển — bên cạnh tính đúng đắn (correctness) và độ tin cậy (reliability), nhà phát triển phải chú ý đến security của phần mềm mình xây dựng. **Tại sao quan trọng?** Security đã trở thành vấn đề nổi bật trong phát triển phần mềm do nguy cơ bị lợi dụng (misuse) và hoạt động ác ý ngày càng tăng nhắm vào hệ thống máy tính… **Cách đảm bảo:** … tốt hơn nhiều là **thiết kế security ngay từ đầu** thay vì vá lại sau khi phần mềm đã hoàn thành.

⇒ Memory dựng được, truy vấn tiếng Việt trả lời đúng nội dung SWEBOK (chapter 13).

## 6. Baseline full corpus (run-00): chưa chạy — ước lượng & phương án

- Ngoại suy từ smoke-003 (throughput-bound ~250 tok/s): 2,809 chunks ÷ 100/wave ≈ 29 wave × ~450s ≈ **13,000s ≈ 3.6h ± 0.5h**. Vượt ngân sách 30–90 phút → dừng theo ma trận orchestrator, KHÔNG tự đổi thiết kế lớn.
- Phương án đã trình orchestrator (chờ quyết định):
  - (a) chấp nhận ~3.5–4h/build;
  - (b) đổi `EMBEDDING_MODEL` sang model window lớn hơn (vd `intfloat/multilingual-e5-large`, fastembed, dim 512) → chunk 512–1024 hợp lệ → giảm 4–8× số chunk → ~30–60 phút (điều kiện cần cho mọi hướng "ít chunk hơn" — xem #4.1);
  - (c) `extractor: gliner` (local, phút thay vì giờ, đổi semantics chất lượng);
  - (d) vòng tinh chỉnh dùng subset 2–3 KA, chỉ baseline/báo cáo cuối mới full corpus.

## 7. Vấn đề & ghi chú vận hành

- Môi trường fence chặn shell redirection → mọi log qua python `open(...,'w')`; file repo qua `sandbox_vfs_write`.
- `[llm-keys]` line bị ghi trước khi FileHandler gắn → không xuất hiện trong ingest.log (INFO trước setup); bằng chứng round-robin nằm ở `resolved_config.json` (`llm_keys.round_robin=true`) — sẽ sửa thứ tự setup_logging trong lần cập nhật code kế.
- 1 lỗi validation nhỏ trong smoke-003 ("nodes.7.type Field required") — 1 node bị bỏ qua sau retry, graph tổng vẫn khoẻ (643 nodes).
- State ghim đúng `/workspace/.cognee_system` + `/workspace/.data_storage` (theo .env Task 1); `cognee.prune.prune_data() + prune_system(metadata=True)` làm sạch triệt để giữa các Run (5–6s).
- Chi phí: mỗi Run smoke ≈ 124 LLM call; chưa chạy baseline để tránh tiêu phí vô ích trước khi chốt phương án.

## 8. Bước tiếp theo (cho orchestrator)

1. Chốt phương án #6 → chạy `--preset base --run-id run-00` (detached, poll log) — code/preset đã sẵn sàng.
2. Task 4/5 đọc `runs/<run_id>/ingest_metrics.json` + `resolved_config.json` (đã có đủ timing/graph stats/sample search).
3. Cân nhắc đưa "đổi embedding model" vào biến tinh chỉnh Task 6 (điều kiện: rebuild toàn bộ vector).
