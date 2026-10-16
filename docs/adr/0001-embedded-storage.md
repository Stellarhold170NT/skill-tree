# ADR 0001 — Embedded storage + LLM gateway + local embedding

- Status: accepted
- Date: 2026-10-16
- Context: Use case SWEBOK v4 cần memory graph+vector chạy được trong sandbox CPU-only,
  state đóng gói được, không rải rác file.

## Quyết định

1. **Embedded stack** (SQLite + LanceDB + Ladybug/Kuzu) thay vì server DB (Neo4j/Postgres).
   - Lý do: 1 process duy nhất, không cần concurrent access; copy 2 thư mục là di chuyển được.
   - Ghim qua `SYSTEM_ROOT_DIRECTORY` / `DATA_ROOT_DIRECTORY` → `/workspace/.cognee_system`, `/workspace/.data_storage`.
   - **Bằng chứng rủi ro "file rải rác"**: không set env → cognee ghi vào
     `site-packages/cognee/.cognee_system` (đã gặp thực tế trong bootstrap) và log vào
     `~/.cognee/logs`. Log directory chưa ghim được qua env — chấp nhận (chỉ là log).
2. **LLM**: gateway OpenAI-compatible NetMind/Viettel.
   - `LLM_MODEL=openai/zai-org/GLM-5.3-Flash` — **bắt buộc prefix `openai/`** vì litellm
     không route được model name bắt đầu bằng segment lạ (`zai-org/...`) → BadRequestError.
   - `COGNEE_SKIP_CONNECTION_TEST=true` — GLM-5.3-Flash là reasoning model, connection test
     của cognee (budget token nhỏ) tiêu hết token vào reasoning → content rỗng → fail/timeout.
   - Fallback extraction: `MiniMax/MiniMax-M3` cùng gateway (chưa cần dùng — GLM extraction OK).
3. **Embedding**: fastembed local `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
   (dim 384, ~120MB ONNX). Lý do: gateway không có `/embeddings` (403); multilingual phục vụ
   hỏi–đáp tiếng Việt trên corpus tiếng Anh (đã smoke test: recall VI trả đúng từ text EN).

## Hệ quả

- Toàn bộ state nằm trong 2 thư mục của repo → backup/migrate = copy 2 thư mục.
- Xóa sạch = `rm -rf .cognee_system .data_storage` (+ prune API nếu muốn trong code).
- Mọi run phải khởi động từ cwd chứa `.env` (cognee đọc .env từ cwd).
- Cache fastembed mặc định ở `/tmp/fastembed_cache` (không ghim — chỉ là cache, tự tải lại).
