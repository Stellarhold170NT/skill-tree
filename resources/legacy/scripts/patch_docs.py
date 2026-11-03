"""Patch README.md + SKILL.md for v0.4.0 (all-JS graph, recall modes) — v2 với pattern đúng."""

# ---------- README ----------
p = '/tmp/openmemory-main/README.md'
r = open(p, encoding='utf-8').read()

sec_start = r.find('## Tận dụng 100% — tool `cognee_graph` (opt-in)')
sec_end = r.find('## Files')
assert sec_start != -1 and sec_end != -1, 'README sections not found'

new_graph = """## Tận dụng 100% — graph in-process (v0.4.0)

Engine graph giờ là **package npm chính chủ** `@ladybugdb/core@0.19.0` — native binding của chính engine ladybug build DB (cùng source release, format khớp tuyệt đối, đã verify mở DB thật: 11,277 nodes / 48,382 edges đúng tuyệt đối).

Cài plugin qua npm → `optionalDependencies` tự kéo đúng binary platform (linux-x64/win32-x64/darwin-x64/darwin-arm64/linux-arm64). **Không cần Python, không cần tải DLL, không sidecar, không HTTP.**

- Tool `cognee_graph { memory?, cypher, params? }` xuất hiện khi engine có trong node_modules; thiếu → im lặng chạy vector/hybrid như thường.
- `cognee-recall.cjs` có 4 **recall mode** (`"mode"` trong registry, default `hybrid`):

| mode | ngữ nghĩa | phụ thuộc |
|---|---|---|
| `semantic` | vector thuần (ANN cosine, mọi bảng) | không |
| `lexical` | BM25-lite thuần trên bảng primary | không |
| `hybrid` | vector + lexical RRF k=60 + 2-hop text-proxy | không |
| `deep` | hybrid + **graph traversal thật** 1–2 hop (dòng `a —rel→ b`) | `@ladybugdb/core` |

- Thiếu engine → `deep` tự rơi về `hybrid` (không lỗi). DB mở READ-ONLY — tắt plugin khi rebuild DB để tránh tranh chấp ghi.
- Pin version: DB build bằng cognee 1.6.4 (ladybug 0.19.0) → dùng `@ladybugdb/core@0.19.0`. Cognee nâng ladybug → đổi pin theo.
- Schema (introspect được qua tool, đừng tin cứng): node table `Node` (property `type`), cạnh `MATCH (a:Node)-[r]->(b:Node)` — **không** ghi `:REL`; property cạnh `r.relationship_name`.

"""
r = r[:sec_start] + new_graph + r[sec_end:]

# Files table: thay dòng graph-server.py bằng graph.cjs
r = r.replace(
    '| `graph-server.py` | [opt-in] đọc `*.lbug` read-only (ladybug, không cognee) — bật tool `cognee_graph` |',
    '| `graph.cjs` | tầng graph in-process (`@ladybugdb/core`, read-only) — tool `cognee_graph` + mode `deep` |'
)
open(p, 'w', encoding='utf-8').write(r)
print('README.md patched')

# ---------- SKILL.md ----------
sp = '/tmp/openmemory-main/skills/cognee-memory/SKILL.md'
s = open(sp, encoding='utf-8').read()
modes_block = """

## Recall modes (v0.4.0)

Đặt `"mode"` trong registry (defaults hoặc per-memory). Mặc định `hybrid`.

- `semantic` — chỉ vector. Nhanh nhất, hợp câu hỏi diễn đạt khác từ ngữ tài liệu.
- `lexical` — chỉ BM25. Hợp tra thuật ngữ/chuẩn chính xác (ISO, tên hàm).
- `hybrid` — vector + lexical RRF + 2-hop proxy. Cân bằng, mặc định.
- `deep` — hybrid + graph traversal thật (`@ladybugdb/core`): thêm dòng quan hệ `a —rel→ b`.
  Hợp câu multi-hop ("X liên quan gì đến Y"); engine thiếu thì tự về `hybrid`.

Tool `cognee_graph` cho agent tự chạy Cypher multi-hop khi cần (schema xem description của tool).
"""
if '## Recall modes (v0.4.0)' not in s:
    s += modes_block
    open(sp, 'w', encoding='utf-8').write(s)
    print('SKILL.md patched')
