# Triển khai Cognee Server (Module M8 — Classroom Memory)

Thư mục này chứa cấu hình Docker Compose độc lập để khởi chạy **Cognee MCP Server** và **Cognee REST API Server**, đóng vai trò là kho lưu trữ đồ thị tri thức nhận thức (*Cognitive Knowledge Graph*) và bộ nhớ dài hạn của học sinh cho hệ thống **SkillTree**.

---

## 1. Kiến trúc dịch vụ

```
┌────────────────────────────────────────────────────────┐
│  SkillTree Agent Harness (:8104)                       │
│  Plugin: skilltree-memory (3 tools)                    │
└───────────────────────────┬────────────────────────────┘
                            │ Giao thức MCP (Streamable HTTP)
                            ▼
┌────────────────────────────────────────────────────────┐
│  skilltree-cognee-mcp (:8021 -> container :8001)       │
│  • Endpoint: http://localhost:8021/mcp                 │
│  • Bóc tách Entity/Relation & Hybrid Graph+Vector RAG  │
└───────────────────────────┬────────────────────────────┘
                            │ Chung volume: skilltree_cognee-data
                            ▼
┌────────────────────────────────────────────────────────┐
│  skilltree-cognee-server (:8020 -> container :8000)    │
│  • Swagger REST API: http://localhost:8020/docs        │
│  • Quản lý Dataset, Inspect Graph thủ công             │
└────────────────────────────────────────────────────────┘
```

---

## 2. Hướng dẫn khởi chạy nhanh

### Bước 1: Tạo file cấu hình môi trường `.env`
Sao chép từ file mẫu `.env.example`:
```powershell
cd deploy/cognee
Copy-Item .env.example .env
```

Mở file `.env` và điền khóa API LLM của bạn (OpenAI, NetMind, OpenRouter hoặc Ollama):
```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
```

> [!TIP]
> Nếu bạn muốn dùng Ollama chạy local trên máy host:
> ```env
> LLM_PROVIDER=ollama
> LLM_MODEL=llama3.1
> LLM_ENDPOINT=http://host.docker.internal:11434
> EMBEDDING_PROVIDER=ollama
> EMBEDDING_MODEL=nomic-embed-text
> EMBEDDING_ENDPOINT=http://host.docker.internal:11434
> ```

### Bước 2: Khởi động container
```bash
docker compose up -d
```

### Bước 3: Kiểm tra trạng thái hoạt động
1. **Kiểm tra Swagger REST Docs**:
   Mở trình duyệt truy cập: [http://localhost:8020/docs](http://localhost:8020/docs)
2. **Kiểm tra MCP Server Endpoint**:
   ```bash
   curl -i http://localhost:8021/mcp
   ```
   *(Nhận phản hồi HTTP `200` hoặc header `Content-Type: text/event-stream` / JSON-RPC streamable-http)*

---

## 3. Kết nối với `skill-tree-service`

Khi container `skilltree-cognee-mcp` đang chạy:
1. `services/skill-tree-service/plugins/patch.yml` đã được định tuyến sẵn tới cổng `:8021`:
   ```yaml
   - id: mcp-cognee-memory
     name: '@deepseek-ai/dsh-mcp-client'
     config:
       transport: streamable-http
       serverName: cognee-memory
       url: http://localhost:8021/mcp
   ```
2. AI Agent trong `skill-tree-service` sẽ tự động phát hiện được 3 công cụ:
   * `memory_ingest`: Gửi ghi chú / tiến độ học tập vào dataset `student-<id>`.
   * `memory_ask`: Truy vấn Graph RAG về lỗ hổng nhận thức của học sinh.
   * `memory_evolve`: Tự động tiến hóa đồ thị hiểu biết định kỳ.

---

## 4. Các lệnh quản trị thường dùng

* **Xem log MCP Server theo thời gian thực**:
  ```bash
  docker logs -f skilltree-cognee-mcp
  ```
* **Dừng dịch vụ**:
  ```bash
  docker compose down
  ```
* **Xóa sạch dữ liệu đồ thị bộ nhớ làm lại từ đầu**:
  ```bash
  docker compose down -v
  ```
