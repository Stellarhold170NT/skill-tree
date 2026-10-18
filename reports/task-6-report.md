# Task 6 — Fine-tune loop + Benchmark cuối: Báo cáo

> Trạng thái: **DONE_WITH_CONCERNS** — fine-tune loop đóng đầy đủ (12 vòng ledger),
> C5b build DONE, transfer check 24 câu **WIN** (0.544/0.331, không pha loãng),
> benchmark-final.md mục 6 đã chốt. Concern duy nhất: audit precision 0.885 vẫn hụt
> gate 0.90 (INJECTS 0.667) — đã ghi next step.

## 1. Vòng fine-tune đã chạy (runs/ledger.jsonl — 12 dòng, commit e8ad818)

PIVOT so brief gốc: 10 vòng không chạy qua `tune/loop.py` tự động mà chạy có chủ đích
qua 3 stage (ADR 0002/0003/0004), mỗi vòng rebuild/eval đúng quy trình preset → memory →
recall → eval → ledger. Ledger gốc mất cùng container 17/10; đã backfill từ ADR 0003 +
evidence JSON, mỗi dòng ghi provenance.

| Vòng | Biến | correctness | elems | Kết luận |
|---|---|---|---|---|
| R0 | S2 baseline + GRAPH_COMPLETION | 0.475 | 0.273 | baseline |
| R1 | ChunkS k=5 | 0.217 | 0.174 | retrieval-side thua |
| R1b | ChunkS k=20 | 0.225 | 0.144 | top_k không phải đòn bẩy |
| R2 | GRAPH_COMPLETION_CONTEXT_EXTENSION | 0.348 | 0.148 | ngữ cảnh loãng |
| R3 | HYBRID_COMPLETION | 0.373 | 0.193 | vẫn thua |
| R4 | CHUNKS + prompt cấu trúc | 0.123 | 0.093 | sập synthesis |
| **B1** | **custom_prompt semantic boost** | **0.456** | **0.322** | **winner Stage B (elems +18%)** |
| B2 | chunk 1024 | 0.390 | 0.241 | to hơn ≠ tốt hơn; B3 loại theo nguyên tắc |
| C1 | ablation traversal name-only | 0.114 | 0.029 | FAIL — dump thiếu description |
| C2 | C1 + entity merge | 0.067 | 0.031 | FAIL — nút thắt không phải node dup |
| **C5** | **ontology prompt v2 (16 loại cạnh enum)** | **0.538** | 0.29 | **WIN theo gate — champion mới (corr +0.082 vs B1)** |
| **F1** | **C5b full-book run-final** | **0.544** | **0.331** | **transfer WIN — elems cao nhất vòng lặp** |

Winner config mang vào run-final: **C5** (prompt/ontology v2: node 14 enum, cạnh 15 enum,
chuỗi nhân quả IEEE 610.12 HumanError-INJECTS-Fault-CAUSES-FailureMode, confidence 0-1,
id slug + source_node_id/target_node_id) — preset `configs/presets/c5_full_book.yaml`.

## 2. Run-final full-book (C5b) — DONE ✅

- Dataset `swebok_v4_full_c5`, corpus 413 trang / 1.312.997 ký tự, chunk 512, batch 25.
- Sandbox 16Gi (bài học OOMKIll trần 8Gi). Hai lần build:
  - Build 1 (đêm 17→18): nuốt outage gateway 90 phút bằng cognify_resilient (4 lần
    backoff tự động, key-mode đã nghi trí tự phục hồi ~05:06) — đạt 24/26 chu kỳ ≈ 92%
    nhưng **toàn bộ graph container-side (189M) mất khi sandbox TTL hết** vì VFS chỉ
    đồng bộ MỘT CHIỀU server→container (bài học vận hành số 4 bên dưới).
  - Build 2 (chính thức, sess-93159cee): 10:31→16:16 18/10 (**5h45m10s**), **1 attempt
    duy nhất**, 1.264 LLM calls (3-key RR), chỉ 1 lỗi đoáng transient (13:54) được retry
    nội bộ hấp thụ; 26 chu kỳ extract↔local ổn định 12–13 min/chu kỳ.
- **Kết quả build**: graph **11.275 nodes / 48.382 edges** (~12× S2; graph lớn nhất vòng
  lặp). Cấu trúc: cognee-internal (contains/made_from/is_part_of) 39,1% · enum C5 đúng
  schema 38,4% · ⚠️ lệch schema `is_a` 22,4% (10.859 cạnh — LLM phát predicate trái
  enum dù prompt; semantic sau khi cộng is_a-part-of-deviation = 18.585 cạnh audited).
  Chi tiết: `reports/evidence/c5b-structure.json`, dump `artifacts/graph_swebok_v4_full_c5.json.gz`
  (1.054 KB, trong container) — analyze_graph.py FAIL với schema custom (query table
  Entity không tồn tại) — cấu trúc lấy từ dump JSON thay thế.
- **Audit precision (bước C3 re-run)**: Sample 100 (96 scored, seed=7):
  **0.885** vs C5a S2 0.821 (**+6,4pt**) — nhưng vẫn hụt gate 0,90. Yếu nhất
  INJECTS 0,667; mạnh nhất CONSUMES/REQUIRES/USESTOOL/VALIDATES/OTHER = 1,0.
  Chi tiết: `reports/evidence/c5b-audit-precision.json`.

## 3. Transfer check — WIN ✅ (không pha loãng)

`stage_b.py --label F1-full-c5 --mode GRAPH_COMPLETION --dataset swebok_v4_full_c5`
(24 câu stress, 5 topology + paradox; n=24, 0 lỗi).

| Metric | R0 baseline | C5a (S2) | **F1 (full 413 trang)** |
|---|---|---|---|
| correctness | 0,475 | **0,538** | **0,544** |
| element_completeness | 0,273 | 0,29 | **0,331** (+21% vs R0) |
| hop_precision | — | **0,717** | 0,69 |
| latency_p50 | 50,6s | 40,1s | 51,8s |

- **Verdict: full-book KHÔNG pha loãng.** 8 câu out-of-corpus cũ (SCM/Security/Quality/
  Maintenance) giờ in-corpus: correctness vẫn nhích (0,544 vs C5a), elems tăng mạnh
  (+14% vs C5a, **+21% vs baseline**). Hop 0,717→0,69 nằm trong biên nhiễu judge (grain 0,05).
- Theo topology: linear 0,542 (13) · tree 0,637 (4) · reverse 0,433 (3) · lineage 0,50 (2)
  · negative 0,50 (1) · paradox 0,65 (1).
- Evidence: `reports/evidence/f1-full-c5-summary.json`, ledger dòng F1; tổng hợp
  `reports/evidence/c5b-run-final.json`.

## 4. Tái chạy toàn bộ pipeline bằng 1 lệnh

```bash
# 0) Sandbox 16Gi + workspace swebok-cognee (code/corpus/presets sẵn trong VFS)
# 1) Build full-book CHỊU LỖI (preflight gateway → retry → watchdog → restart):
nohup bash scripts/run_supervised.sh c5_full_book run-00-c5full > /dev/null 2>&1 &
#    (nếu có build orphan đang chạy: bash scripts/monitor_orphan.sh <pid> run-00-c5full c5_full_book)
# 2) Khi DONE: post_done_pipeline TỰ chạy dump_graph + stage_b F1-full-c5 + audit
#    và viết runs/run-00-c5full/RUN-FINAL-STATUS.json — không cần lệnh tay.
# 3) Thủ công (nếu cần rerun từng phần):
/opt/venv/bin/python src/skilltree/eval/stage_b.py --label F1-full-c5 --mode GRAPH_COMPLETION --dataset swebok_v4_full_c5
/opt/venv/bin/python src/skilltree/agent/dump_graph.py --dataset swebok_v4_full_c5
/opt/venv/bin/python src/skilltree/eval/c5_audit_edges.py --dataset swebok_v4_full_c5
```

Trạng thái run xem tại: `runs/run-00-c5full/supervisor.log` (supervisor/monitor),
`runs/run-00-c5full/ingest.log` (build + MemAvailable 60s),
`runs/run-00-c5full/llm_activity.json` (nhịp LLM call — watchdog dùng).

## 5. Bài học vận hành (ghi vào ADR/handover)

1. **Artifact mất cùng container**: ledger/evidence quan trọng phải copy `reports/evidence/`
   + git commit ngay sau mỗi run (quy ước 78813bd) — ledger Stage B đã mất 1 lần, phải backfill.
2. **Retry 4 lớp** (commit cb57d8e + e8ad818 hotfix). in-process backoff → activity tracker →
   supervisor (preflight POST /chat/completions — GET /models trên gateway này treo vĩnh viễn;
   trap TERM phải exit; singleton lock chống double-build) → watchdog tre 90 phút.
3. **Gateway 3 key không đồng đều**: key 2/3 từng 403 treo, key 1 ổn — round-robin + preflight
   per-key giúp phát hiện sớm.
4. **VFS một chiều (container→server KHÔNG tự syncing)**: graph build-1 189M (92% hoàn
   thành, 24/26 chu kỳ) mất nguyên khi container TTL hết — mọi artifact container-side
   (.cognee_system graph DB, logs, dumps, .git, tar) đều không sống sót; phải chủ động
   sync evidence nhỏ về VFS NGAY sau khi sinh (`sandbox_vfs_write`), không trông đợi sync ngược.
5. **Gateway đổi team-policy runtime**: allow-list chê rigorous-prefix
   (`openai/zai-org/GLM-5.3-Flash` bị 403 chỉ `zai-org/GLM-5.3-Flash` được) — khắc phục
   bằng model rewrite proxy đứng giữa (scripts/model_rewrite_proxy.py, 127.0.0.1:8771)
   gỡ tiền tố `openai/` trước khi forward — bridge prefix requirement của litellm (cần
   `openai/` để ra HTTPS endpoint) và gateway policy (từ chối prefix).
6. **Ước lượng khối lượng build từ velocity đo được**: đo từ chu kỳ lần chạy trước
   (C5a: 12-13 min/chu kỳ) chứ không từ chars/512 (sai số ~4×: giả định 2.565 chunks so
   với thực tế ~650 chunks theo token measurement — nguyên nhân suýt kill nhầm build healthy
   ở mốc 92% build-1 vì tưởng chỉ đạt 40%).

## 6. Checklist DONE

- [x] C5b build DONE (5h45m10s, 26/26 chu kỳ, 1.264 calls, 1 lỗi đoáng tự hồi phục)
- [x] Transfer check 24 câu trên graph full — **WIN, không pha loãng** (0,544/0,331)
- [x] Cập nhật `reports/benchmark-final.md` mục 6 (Run-final + Transfer) + mục 7b, 8, 9, 10
- [x] Memory dài hạn: bài học đã lưu qua taskloop comment #4 + các lesson tại §5
- [x] Đổi status task #6 → DONE_WITH_CONCERNS (concern: audit 0,885 < 0,90 — INJECTS)
