"""Patch t7_eval.py: thêm --hybrid-all (chunks cho mọi level)."""

from pathlib import Path

p = Path("/workspace/src/skilltree/eval/t7_eval.py")
t = p.read_text(encoding="utf-8")

a = "async def run_eval(label: str, mode: str, top_k: int, dataset: str, hybrid_l3: bool = False) -> dict:"
b = "async def run_eval(label: str, mode: str, top_k: int, dataset: str, hybrid_l3: bool = False, hybrid_all: bool = False) -> dict:"
assert a in t
t = t.replace(a, b, 1)

a = "                if hybrid_l3 and q.get(\"level\") == \"L3\":"
b = "                if hybrid_all or (hybrid_l3 and q.get(\"level\") == \"L3\"):"
assert a in t
t = t.replace(a, b, 1)

a = "asyncio.run(run_eval(args.label, args.mode, args.top_k, args.dataset, args.hybrid_l3))"
b = "asyncio.run(run_eval(args.label, args.mode, args.top_k, args.dataset, args.hybrid_l3, args.hybrid_all))"
assert a in t
t = t.replace(a, b, 1)

# thêm argparse ngay trước dòng asyncio.run
a = "    asyncio.run(run_eval(args.label, args.mode, args.top_k, args.dataset, args.hybrid_l3, args.hybrid_all))"
b = "    ap.add_argument(\"--hybrid-all\", action=\"store_true\",\n                    help=\"merge CHUNKS top_k=8 cho MOI level (B2 mo rong)\")\n" + a
assert "hybrid-all" not in t
t = t.replace(a, b, 1)

p.write_text(t, encoding="utf-8")
print("patched, size:", len(t))
