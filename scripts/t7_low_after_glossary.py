"""Danh sách câu còn yếu sau khi chấm v2+glossary → target cho B3."""

import json

d = json.load(open("/workspace/runs/t7/T7-bank/element_v2g.json"))
print("by_level:", d["by_level_v2"], " zero_v2:", d["zero_v2_rows"])
low = [(r["id"], r["elems_v2"], r["missing"][:3]) for r in d["rows"]
       if r["elems_v2"] is not None and r["elems_v2"] < 0.55]
for x in sorted(low, key=lambda z: z[1]):
    print(x)
