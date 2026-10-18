# Runbook migration sandbox khi hết TTL (C5b full-book)

> **CẬP NHẬT 2026-10-18 10:15 sau migration lần 1 — bài học đắt giá:**
>
> ## Mô hình lưu trữ THỰC của sandbox (khác tài liệu)
> - "VFS is the master copy" chỉ đúng **1 chiều VFS→container**.
> - File sinh ra **trong container** (pip/tar/logs/.cognee_system/git) **CHẾT CÙNG CONTAINER** —
>   không sync ngược VFS, kể cả khi sandbox_delete "an toàn".
> - Chỉ 2 cách cho file sống: (a) viết qua VFS tools (sandbox_vfs_write/edit),
>   (b) push lên git remote (không có remote cho project này → git local chỉ dùng
>   trong phiên: checksum/diff, KHÔNG phải lưu trữ).
>
> ## Mất trong migration 1 (đã xác nhận qua sandbox_vfs_files)
> - `.cognee_system/**` — 24 chu kỳ C5b (~1207 LLM calls, graph 189M) — mất toàn bộ.
> - `corpora/swebok-v4/swebok-v4.md` — corpus 413 trang (download lại bằng prep/download.py).
> - `venv-backup.tar.gz` 546MB (tar trong container → không bao giờ tới VFS).
> - `runs/run-00-c5full/*` (ingest.log, llm_activity, metrics) — chỉ còn trong hội thoại.
> - `.git/**` — 4 commits hôm nay (file code vẫn sống vì đã VFS-write).
>
> ## Chiến lược đúng cho build dài
> 1. Chọn TTL **≥ thời gian build + eval** (16Gi/24h: đủ build ~8-12h + transfer check ~1h).
> 2. KHÔNG tin "resume incremental" qua ranh giới container — state trong container là ephemeral.
> 3. Sau build DONE: **sync ngay** artifact nhỏ về VFS (metrics/evidence/ledger qua
>    sandbox_vfs_write; log thì tail) TRƯỚC KHI làm gì khác.
> 4. Graph DB lớn (>10MB) không thể sync qua tool (limit base64 ~10MB) → phải hoàn thành
>    build + eval trong MỘT sandbox TTL.

---

## (Cũ — giữ lại cho tham chiếu, phần lớn đã sai về sync)

## Bối cảnh
- Sandbox build 16Gi ttl 86400 — TTL tự hủy container sau 24h kể từ tạo.

## Kill build (incremental resume chỉ đúng NỘI BỘ container)
1. Ghi nhận `llm_activity.json`, số chu kỳ batch.
2. Kill monitor TRƯỚC build (tránh race handoff), rồi TERM → KILL nếu cần.
3. sync + verify.

## Sandbox mới
- `sandbox_delete` cũ → `sandbox_create` 16Gi ttl 86400 project_path=swebok-cognee.

## Bootstrap venv (bắt buộc làm lại — /opt/venv ngoài /workspace)
```bash
python3 -m venv /opt/venv
/opt/venv/bin/pip install -e /workspace   # cognee[docling]==1.6.4 + deps (~10-30 phút)
/opt/venv/bin/python -c "import cognee, litellm; print(cognee.__version__)"
# corpus: /opt/venv/bin/python src/skilltree/prep/download.py  (nếu .md chưa có)
```

## Relaunch (supervisor double-fork daemon + monitor y hệt cũ)
- `bash scripts/run_supervised.sh c5_full_book run-00-c5full` qua python double-fork.
- Monitor: `bash scripts/monitor_orphan.sh <pid_moi> run-00-c5full c5_full_book`.

## Xác nhận sống
- ingest.log có `[session] pid=... attempt=...` mới; llm_activity cập nhật; preflight OK.
