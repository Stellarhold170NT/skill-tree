# Task 1 Report — Bootstrap base & sandbox environment

- Date: 2026-10-16 · Branch: `agent-swebok-usecase1` (commit `e30eb56`) · Sandbox: `sess-ba4e45b7` (python:3.11-slim, 2CPU/4Gi, TTL 24h)

## Kết quả chính

| Hạng mục | Kết quả |
|---|---|
| Python / uv | 3.11.17 / uv 0.13.1, env tại `/opt/venv` (UV_PROJECT_ENVIRONMENT — tránh .venv bị VFS sync đè) |
| `uv sync` | ✅ cognee[docling]==1.6.4 theo uv.lock |
| Eval extra | ✅ **tên extra thật là `evals`** (README ghi `eval` — sai cho 1.6.4): `cognee[evals,deepeval]==1.6.4` → deepeval 3.9.9, plotly 6.9.0, gdown 5.2.2 |
| Smoke remember→recall | ✅ PASS — recall trả lời tiếng Việt đúng ("SkillTree là một workspace quản lý skill cho agent...") từ text ingest |
| Extraction (GLM) | ✅ hoạt động — graph_completion sinh được câu trả lời → entity/relation extraction OK |
| Embedding fastembed | ✅ multilingual MiniLM (dim 384, ~120MB ONNX), truy xuất chéo VI-query → EN-text OK |
| State pinning | ✅ `/workspace/.cognee_system` (1.6M) + `/workspace/.data_storage` (8.5K) — **không leak** vào site-packages (đã kiểm tra) |

## 3 lỗi gặp phải & cách xử lý (quan trọng cho các task sau)

1. **Extra `eval` không tồn tại** → `cognee[eval]` im lặng không cài gì. Fix: dùng `cognee[evals,deepeval]` (đọc từ METADATA wheel).
2. **litellm không route model `zai-org/GLM-5.3-Flash`** → `LLM Provider NOT provided`. Fix: `LLM_MODEL=openai/zai-org/GLM-5.3-Flash` (prefix provider bắt buộc với custom endpoint).
3. **Connection test cognee fail 30s** do GLM-5.3-Flash là reasoning model (token tiêu vào `reasoning_content`, `content=None`). Fix: `COGNEE_SKIP_CONNECTION_TEST=true`. Đã xác minh json_mode/structured output hoạt động tốt (0.6–3.6s/call).

## Cấu hình cuối (.env)

`LLM_PROVIDER=openai`, `LLM_ENDPOINT=https://netmind.viettel.vn/gateway/v1`,
`LLM_MODEL=openai/zai-org/GLM-5.3-Flash`, `COGNEE_SKIP_CONNECTION_TEST=true`,
`LLM_RATE_LIMIT_ENABLED=true`, `EMBEDDING_PROVIDER=fastembed`,
`EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`,
`SYSTEM_ROOT_DIRECTORY=/workspace/.cognee_system`, `DATA_ROOT_DIRECTORY=/workspace/.data_storage`.

API key chỉ nằm trong `.env` (gitignored). ADR chi tiết: `docs/adr/0001-embedded-storage.md`.

## Lưu ý vận hành

- Chạy mọi script từ cwd `/workspace` (cognee đọc `.env` từ cwd).
- Shell redirection bị broker fence → chạy tác vụ dài dạng detached (subprocess + log file) rồi poll.
- Log của cognee mặc định ở `~/.cognee/logs` (chỉ log, chấp nhận — xem ADR).
- Nếu sandbox_shell trả 504: process vẫn chạy server-side → poll log file, đừng chạy lại mù quáng.

## Lệnh tái tạo môi trường

```bash
pip install uv
cd /workspace && UV_PROJECT_ENVIRONMENT=/opt/venv uv sync
uv pip install --python /opt/venv/bin/python "cognee[evals,deepeval]==1.6.4"
/opt/venv/bin/python scripts/smoke_test.py
```
