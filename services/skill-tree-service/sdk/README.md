# dsh_web_sdk — Python SDK cho DeepSeek Harness + vai-taskloop

SDK Python async để điều khiển **agent harness server** từ bên ngoài: tạo task,
gửi prompt, theo dõi và điều khiển task đến khi hoàn thành.

```
┌─────────────┐   HTTP (token→cookie)   ┌──────────────────────────────┐
│  SDK (máy   │ ───────────────────────►│  DSH server (container)      │
│  bạn, remote)│  session/create+prompt │                              │
│             │  /api/taskloop/*        │  vai-taskloop plugin         │
│             │ ◄───────────────────────│   ├─ contract file = truth   │
└─────────────┘   poll status           │   ├─ goal bridge + auto-heal │
                                        │   └─ web viewer (status bar) │
                                        └──────────────────────────────┘
```

## 1. vai-taskloop là gì

**Subagent Task Contract** — mỗi task là một file JSON nằm trong workspace:

```
<workspace>/taskloop/task-N.task.json     ← contract (nguồn chân lý duy nhất)
<workspace>/docs/plans/task-N-brief.md    ← đề bài chi tiết
<workspace>/reports/task-N-report.md      ← báo cáo của agent
```

File contract là **single source of truth**: tool của agent, web form và SDK
đều đọc/ghi cùng một file. Ai ghi cuối cùng, trạng thái đó thắng.

**6 trạng thái**: `PENDING` → `IN_PROGRESS` → `DONE` | `DONE_WITH_CONCERNS` |
`BLOCKED` | `NEEDS_CONTEXT`.

**Vòng đời một task do SDK điều phối:**

1. SDK ghi contract + brief vào workspace (**trước khi** có prompt)
2. Plugin render prompt "implementer" (nhúng sẵn yêu cầu cập nhật status)
3. SDK tạo/tái dùng session trên workspace và gửi prompt
4. Agent đọc contract (`taskloop_get_task`), set `IN_PROGRESS`
5. Goal bridge tạo goal → goal round driver giữ agent làm đến khi xong;
   dính 429 rate limit thì **auto-heal** tự đánh thức lại (backoff ×2,
   tối đa 10 lần, cộng thêm 1 cú wake sau mốc "Limit resets at")
6. Agent viết report, set `DONE` (hoặc BLOCKED/NEEDS_CONTEXT...)
7. SDK poll file contract, thấy trạng thái terminal → trả kết quả

**Luật an toàn của store**: chỉ **tạo mới**, không bao giờ ghi đè/xóa file
có sẵn; brief phải là đường dẫn tương đối nằm trong workspace.

## 2. Cài đặt

```bash
# Python >= 3.10, không cần cài package (chạy trực tiếp từ thư mục sdk/)
pip install -e sdk/            # hoặc thêm sdk/ vào PYTHONPATH
```

Cần plugin `vai-taskloop` >= 1.3.1 trên server. Thông tin kết nối:

```bash
export DSH_BASE_URL="http://<host>:<port>"   # URL web UI của server
export DSH_TOKEN="<token>"                    # token trên URL ?token=...
```

Token đổi sau mỗi lần restart server — lấy từ `docker logs <container> | grep "dsh web:"`.

## 3. Dùng nhanh — một call chạy trọn vòng đời

```python
import asyncio
from dsh_web_sdk import DshClient, TaskContract

WS = "/app/workspace/TaskLoop"   # workspace dùng chung, chỉ định tên rõ ràng

async def main():
    async with DshClient() as client:            # đọc DSH_BASE_URL/DSH_TOKEN
        result = await client.run_contract_task(
            WS,
            TaskContract(
                n="auto",                        # tự đánh số task-1, 2, 3...
                name="Viết hàm Fibonacci",
                model="sonnet",
                brief="docs/plans/task-1-brief.md",
                report="reports/task-1-report.md",
                dir=WS,
                ctx="Workspace trống, tạo cấu trúc tối thiểu.",
            ),
            brief_text="# Task 1: Fibonacci\n- Tạo fib.py ...\n- Viết report ...",
            reuse=True,          # tái dùng session của workspace này
            timeout_s=1800,      # chờ tối đa 30 phút
            poll_s=5,            # dò contract mỗi 5 giây
            on_status=lambda c: print("status:", c.get("status")),
        )
        print(result["task"]["status"])   # DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT

asyncio.run(main())
```

`run_contract_task` làm theo thứ tự:

1. `create_task` — ghi contract + brief vào `<WS>/taskloop/` (tạo luôn thư
   mục workspace nếu chưa có). Trùng `n` → lỗi 409 (create-only).
2. Đảm bảo workspace đã đăng ký + session attach vào workspace
   (`session_for_workspace` — tái dùng session cũ nếu cwd khớp)
3. Gửi prompt do **plugin render** (chứa ràng buộc cập nhật status qua tool)
4. Poll file contract đến trạng thái terminal, trả về
   `{session_id, file, prompt, task}`

## 4. API chi tiết

### Quản lý task (qua plugin routes, file là chân lý)

```python
# Tạo task — n="auto" tự chọn số tiếp theo trong workspace
r = await client.create_task(WS, contract, brief_text="# đề bài")
# r = {"ok": True, "file": ".../task-1.task.json",
#      "contract": {...}, "prompt": "Subagent (general-purpose): ..."}

task = await client.get_task(WS, "1")            # đọc 1 contract
tasks = await client.list_tasks(WS)              # danh sách [{n, status, ...}]

# Điều khiển 2 chiều: đổi status / sửa field / thả comment cho agent đọc
await client.update_task(WS, "1", patch={"status": "BLOCKED"})
await client.update_task(WS, "1",
    comment={"author": "Reviewer", "text": "Hàm fib(-1) phải raise ValueError"})
await client.update_task(WS, "1", patch={"status": "IN_PROGRESS"})  # đánh thức
```

### Session

```python
s = await client.session_for_workspace(WS)   # reuse theo cwd, không có thì tạo
s = await client.create_session_for_workspace(WS)      # luôn tạo + attach group
s = await client.create_session_for_workspace(WS, session_id=sid)  # nhận nuôi
s = await client.create_session(cwd=WS)                # thấp cấp (không attach)

await s.prompt(text, mode="queue")   # "steer" khi agent đang chạy
await s.wait(timeout_s=600)          # chờ agent idle
await s.run(text)                    # prompt + wait

# Tiện ích task gắn trên session (dir mặc định = cwd của session)
t = await s.task_status("1")
t = await s.wait_task_done("1", timeout_s=1800)
t = await s.run_task(prompt, "1", timeout_s=1800)
```

### Workspace (UI nhóm session theo Workspace, không phải cwd)

```python
ws = await client.ensure_workspace(WS)      # đăng ký workspace — idempotent
# Session tạo bằng cwd trần sẽ rơi vào "Ungrouped" trên UI.
# create_session_for_workspace / run_contract_task tự attach giúp bạn.
```

## 5. Trạng thái terminal & ý nghĩa

| Trạng thái            | SDK `wait_task_done` | Ý nghĩa                          |
|-----------------------|----------------------|----------------------------------|
| `DONE`                | trả về               | xong, report đã viết             |
| `DONE_WITH_CONCERNS`  | trả về               | xong nhưng agent còn nghi ngờ    |
| `BLOCKED`             | trả về               | kẹt — cần người/admin xử lý      |
| `NEEDS_CONTEXT`       | trả về               | thiếu thông tin — cần bổ sung    |
| `PENDING`/`IN_PROGRESS` | tiếp tục poll      | đang chờ / đang làm              |

Khi bị BLOCKED/NEEDS_CONTEXT: đọc report + comments trong contract, xử lý
xong thì `update_task(..., patch={"status": "IN_PROGRESS"})` để đánh thức
goal loop làm tiếp (goal bridge tự resume goal đang pause).

## 6. Ghi chú kỹ thuật

- **Remote-first**: mặc định `local_fs=False` — đường dẫn workspace được
  resolve bên server, không kiểm tra trên máy chạy SDK. Bật
  `DshClient(..., local_fs=True)` khi SDK chạy cùng máy server.
- **Auth**: GET `/?token=...` → 303 + cookie `dsh-auth-*`; SDK tự giữ cookie
  cho mọi request về sau. 401 = token cũ (server vừa restart).
- **Retry**: lỗi transport (connection reset qua tunnel) và 429/5xx được tự
  thử lại theo `RetryConfig` (mặc định 3 lần, backoff ×2). Lỗi 4xx khác là
  lỗi thật — không retry.
- **Auto-heal phía server**: goal bridge (plugin) tự xử lý 429 rate limit
  của provider; SDK chỉ cần poll bình thường.
- **Agent bắt buộc cập nhật status qua tool** (`taskloop_get_task`,
  `taskloop_update_task`) — prompt render từ plugin nhúng sẵn quy tắc này;
  status đổi là tín hiệu cho orchestrator, không phải tin nhắn cuối.
- Xem thêm `examples/basic.py` (session cơ bản) và `examples/task.py`
  (chạy task trọn vòng đời).
