"""Fix patch #2: chuyển --hybrid-all lên trước parse_args."""

from pathlib import Path

p = Path("/workspace/src/skilltree/eval/t7_eval.py")
t = p.read_text(encoding="utf-8")

a = "    args = ap.parse_args()\n    ap.add_argument(\"--hybrid-all\", action=\"store_true\",\n                    help=\"merge CHUNKS top_k=8 cho MOI level (B2 mo rong)\")\n"
b = "    ap.add_argument(\"--hybrid-all\", action=\"store_true\",\n                    help=\"merge CHUNKS top_k=8 cho MOI level (B2 mo rong)\")\n    args = ap.parse_args()\n"
assert a in t, "pattern not found"
t = t.replace(a, b, 1)
p.write_text(t, encoding="utf-8")
print("fixed, size:", len(t))
