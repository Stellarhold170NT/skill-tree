# Task 3 — Ingest/Cognify pipeline (Memory build)

> Trạng thái: **HOÀN THÀNH code + kiểm chứng end-to-end + STAGE A (chọn subset) XONG.**
> Sau PIVOT agent-first (16/10): e5-large embedding (dim 1024, window 510), chunk 512,
> hai candidate subset S1/S2 đã build + recall + eval bằng số đo (correctness judge GLM,
> context coverage semantic, extraction sanity) → **S2 thắng** (chi tiết mục 6, ADR 0002).
> Giai đoạn B (10 vòng tuning) CHƯA chạy — đợi user/orchestrator duyệt kết quả Stage A.
> Baseline full corpus (run-final) sẽ chạy 1 lần sau Giai đoạn B với winner config.

## 1. Bàn giao

| File | Vai trò |
|---|---|
| `src/skilltree/ingest/__init__.py` | package docs |
| `src/skilltree/ingest/presets.py` | nạp/resolve preset YAML\|JSON, trích subset theo KA (metadata.json + marker `=== [p. N] ===`), `raise_on_error` |
| `src/skilltree/ingest/build_memory.py` | Pipeline add → cognify → graph stats → search kiểm chứng; round-robin API key; thread caps OMP/ORT=2; MemoryGuard log MemAvailable mỗi 60s; cognify retry 1 lần |
| `src/skilltree/eval/quick_eval.py` | (mới, bản mỏng Task 5) `recall` GRAPH_COMPLETION + CHUNKS per câu hỏi; `eval` judge correctness + context coverage semantic/lexical + extraction sanity → `runs/<run_id>/{answers.jsonl,metrics.json}` |
| `configs/presets/base.yaml` | preset baseline full corpus (run_id `run-00`) — dùng cho run-final sau Giai đoạn B |
| `configs/presets/base4ka.yaml` | (mới) **S1** = Requirements+Testing+Quality+Security, chunk 512, batch 25 |
| `configs/presets/base4ka_s2.yaml` | (mới) **S2** = Architecture+Design+Construction+Testing, cùng cấu hình |
| `configs/presets/smoke.yaml` | preset subset KA "Software Security" (p.266–275), batch 25 = stability probe |
| `runs/smoke-001/…`, `runs/smoke-003/…` | logs + `ingest_metrics.json` + `resolved_config.json` + `search_sample.txt` |
| `runs/run-00/…` | **S1 build** + `answers.jsonl` (17 câu) + `metrics.json` + `metrics_v1_lexicalonly.json` |
| `runs/run-00-s2/…` | **S2 build** + `answers.jsonl` (16 câu) + `metrics.json` |
| `runs/smoke-002/ABORTED.txt` | marker run huỷ (thinking-off schema hỏng) |
| `docs/adr/0002-subset-selection.md` | ADR Stage A: chọn S2 + số đo + lý do |

Không commit/push (theo yêu cầu — orchestrator thực hiện). Không đụng `questions.jsonl`, `.env`, Task 4–6.

## 2. Preset schema (Task 6 chỉ đổi preset, không sửa code)

```yaml
run_id: <str>                 # id Run, CLI --run-id ghi đè được
reset: true|false             # prune_data + prune_system(metadata=True) trước build
dataset: swebok_v4            # tên Dataset cognee (partition)
chunk_size: null|<int>        # 512 = e5-large window (resolved 510)
chunks_per_batch: 25|null     # chống OOM sandbox 8Gi; null = mặc định cognee (2000)
raise_on_error: false         # chunk fail sau retry bị log + bỏ qua, không chết Run
custom_prompt: null|<str>
graph_model: null|<tên class> # "KnowledgeGraph" | "module.Class" | "module:Class"
extractor: llm|gliner
files: [glob...]              # tương đối repo root
subsets: [KA name...]         # lọc trang theo metadata.json
llm_api_keys_env: [LLM_API_KEY, ...]  # TÊN biến môi trường; >=2 key -> round-robin
incremental_loading: true|false
chunk_attachment: null|direct|all
search_type: GRAPH_COMPLETION
search_query: "..."
```

Map thẳng vào `cognee.cognify(**kwargs)` (signature cognee 1.6.4 đã verify runtime). Giá trị key KHÔNG bao giờ được ghi vào file — chỉ tên env var + fingerprint `...4 ký tự cuối` trong resolved config.

## 3. Cách chạy

```bash
cd /workspace
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset smoke
/opt/venv/bin/python src/skilltree/ingest/build_memory.py --preset base4ka_s2 --run-id run-NN
# Stage A eval (memory phải còn nguyên subset tương ứng):
/opt/venv/bin/python src/skilltree/eval/quick_eval.py recall --run-id run-00-s2 \
  --kas "Software Architecture,Software Design,Software Construction,Software Testing"
/opt/venv/bin/python src/skilltree/eval/quick_eval.py eval --run-id run-00-s2
```

Log python tự mở file `runs/<run_id>/ingest.log` (không shell redirection — môi trường fence chặn `>`/`>>`).

## 4. Phát hiện kỹ thuật quan trọng (đầu vào cho Task 4–6)

1. **chunk_size tự động của cognee = window embedding.** MiniLM multilingual chỉ nhận 126 tokens → full corpus 2,809 chunks. Sau pivot sang **e5-large (`intfloat/multilingual-e5-large`, dim 1024)**: window 510 → `chunk_size: 512` được cognee tự hạ còn **510** kèm warning; full corpus ~891 chunks (`chunks_512.jsonl`). Verify runtime: `embed_text` → dim 1024, `resolve_chunk_size(512)` → 510.
2. **OOM pattern sandbox (2 sandbox chết trước khi fix):** cognify nặng (batch 50–100 + 4 CPU) chết ~18–35 phút. Fix áp dụng và đã SỐNG SÓT qua 3 build: `OMP_NUM_THREADS=2` + `ORT_INTRA_OP_NUM_THREADS=2` setdefault TRƯỚC import onnxruntime; `chunks_per_batch: 25`; `MemoryGuard` log MemAvailable mỗi 60s vào ingest.log; `raise_on_error: false` + cognify retry 1 lần. MemFree curve: S1 plateau 1.77–2.05GB, S2 1.11–1.38GB.
3. **Song song hoá thật khi tắt rate limiter:** `extract_graph_from_data` dùng `asyncio.gather` trên tất cả chunk của batch. Trần gateway là throughput tổng ~250 tok/s (single vLLM backend) — tăng batch/key không vượt được.
4. **`LLM_ARGS` tắt thinking làm hỏng structured extraction (bỏ):** JSON lệch schema → instructor retry fail. Thinking ON bắt buộc với GLM-5.3-Flash.
5. **Round-robin 3 API key:** monkeypatch `litellm.acompletion` (idempotent, chỉ đổi kwarg `api_key`). 0 lỗi 429 trong các run.
6. **cognee.search() trả list[dict]** khoá `search_result` (GRAPH_COMPLETION → list[str]; CHUNKS → list[dict] có `text`) — KHÔNG phải object có attr; getattr trả None → câu trả lời "null" (đã probe + fix trong quick_eval).
7. **Graph Ladybug là per-dataset file** `<SYSTEM_ROOT>/databases/<handler-dir>/<dataset_id>.lbug`: `get_graph_engine()` ở process MỚI mở db rỗng (counts (0,0)) trong khi search vẫn đọc đúng — quick_eval resolve db file qua bảng `datasets` sqlite rồi mở `LadybugAdapter(db_path)` trực tiếp. Ladybug giữ lock file khi build đang chạy (sanity trong lúc build → RuntimeError lock).
8. **GLM judge thinking model hay để `content` rỗng** khi `max_completion_tokens` thấp (reasoning ăn hết budget) → score sai 0. Fix: 2000 token + fallback `reasoning_content` + `temperature=0.1`. S1 chấm 3 lần: 0.612 (lỗi parse) → 0.676 (temp cao) → **0.929 (đúng)**.
9. **Context coverage lexical vô nghĩa khi chéo ngôn ngữ** (gold VI vs chunk EN → ~0.08). Metric CHÍNH = **semantic coverage** (judge GLM chấm "context có đủ thông tin trả lời câu hỏi?" cho phép chéo ngôn ngữ); lexical giữ làm phụ.

## 5. Timing các Run

**Subset Software Security (10 trang, 29,188 chars, 62 chunks):**

| Run | Cấu hình | prune | add | cognify | search | total | nodes | edges |
|---|---|---|---|---|---|---|---|---|
| smoke-001 | limiter ON, thinking ON, 1 key, batch mặc định | 3.9s | 37.5s | 544.7s | 10.5s | **596.6s** | 635 | 1,766 |
| smoke-002 | thinking **OFF** (LLM_ARGS) | — | 43.9s | (extraction 223s) | — | ABORTED | — | — |
| smoke-003 | limiter OFF + thinking ON + 3-key RR + batch 100 | 5.5s | 47.9s | **444.1s** | 8.7s | **506.2s** | 643 | 1,767 |
| smoke-003 (re-run, stability probe) | e5-large + chunk 512 + **batch 25** + thread caps | 3.4s | 37.9s | **1049.9s** | 9.6s | **1100.7s** | 383 | 1,168 |

**Giai đoạn A (cùng cấu hình baseline, e5-large, chunk 510, batch 25, 3-key RR):**

| Run | Corpus | chunks | cognify | total | nodes | edges |
|---|---|---|---|---|---|---|
| run-00 (**S1**) | Requirements+Testing+Quality+Security (p43–275), 295,638 chars | 141 | 4,043.6s | **4,078.3s** | 2,746 | 10,011 |
| run-00-s2 (**S2**) | Architecture+Design+Construction+Testing (p67–152), 287,342 chars | 138 | 4,279.8s | **4,342.4s** | 2,584 | 9,335 |

- Tốc độ cognify batch 25 ≈ 29–31s/chunk (batch 50 lúc gateway rảnh ≈ 2.9s/chunk) — chậm hơn nhưng ổn định; hệ quả: run-final full (~891 chunks) cần ~4–7h hoặc tách theo phần.
- search GRAPH_COMPLETION (run-00, 14.7s) — tiếng Việt đúng nội dung ch.13 (security-in-design vs patch-later).

## 6. Stage A: subset selection (S1 vs S2) — S2 THẮNG

Số đo đầy đủ trong `docs/adr/0002-subset-selection.md`; tóm tắt:

| Metric | S1 (run-00) | S2 (run-00-s2) |
|---|---|---|
| correctness_mean (17/16 câu, judge temp 0.1) | 0.929 | **0.975** |
| correctness by-KA | Req 0.917 / Test 0.900 / Qual 0.950 / Sec 1.000 | **Arch 1.000 / Design 1.000 / Constr 1.000** / Test 0.933 |
| context_coverage_semantic_mean | 0.176 | **0.438** |
| context_coverage_lexical_mean (phụ) | 0.080 | 0.137 |
| 6 câu Testing anchor (mean correctness) | 0.900 | **0.933** (cov bằng nhau 0.167) |
| extraction sanity | 2,746n/10,011e, 100% desc | 2,584n/9,335e, 100% desc |

**Kết luận: S2 (Architecture+Design+Construction+Testing) là subset winner cho Giai
đoạn B.** Correctness cao hơn (3/4 KA tuyệt đối 1.000), coverage semantic gấp ~2.5×,
anchor Testing không phản đối. Nút thắt rõ nhất để tuning: coverage KA Testing thấp
cố định 0.167 ở cả hai build.

## 7. Sample search (run-00-s2, GRAPH_COMPLETION, 15.3s)

Query: *"Kiến trúc phần mềm là gì và tại sao cần nhiều view kiến trúc?"* → trả lời
đúng định nghĩa nhiều view (logical/process/development/physical) và vì sao một view
không đủ (stakeholder khác nhau quan tâm khác nhau) — trích trong
`runs/run-00-s2/search_sample.txt`.

## 8. Việc tiếp theo (không thuộc Task 3)

1. **Duyệt Stage A** → Giai đoạn B: 10 vòng tuning trên S2 (`--preset base4ka_s2 --run-id run-NN`), đổi 1 nhóm biến/vòng (custom_prompt, search_type, graph_model, chunk, retrieval params), mỗi vòng rebuild + eval + ledger.
2. Vòng tuning nhắm trước vào **retrieval** (coverage Testing 0.167 là điểm yếu cố định) hơn là extraction (đã 100% description).
3. run-final: build full sách với winner config → transfer check 40 câu gốc.
