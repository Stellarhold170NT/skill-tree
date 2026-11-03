"""Variance run1 vs run2 của B2 hybrid (18 câu L3)."""

import json
import statistics
from pathlib import Path

R = Path("/workspace/runs/t7")
r1f = json.loads((R / "T7-pilot-b2/element_v2.json").read_text())
r2f = json.loads((R / "T7-pilot-b2-r2/element_v2.json").read_text())
base = json.loads((R / "T7-bank/element_v2.json").read_text())

r1 = {r["id"]: r for r in r1f["rows"]}
r2 = {r["id"]: r for r in r2f["rows"]}
l3b = [x["elems_v2"] for x in base["rows"] if x["level"] == "L3"]
print("baseline graph-only elems_v2 L3:", round(sum(l3b) / 18, 3))
print("run1 hybrid:", r1f["elems_v2_mean"], " run2 hybrid:", r2f["elems_v2_mean"])
print("run1 corr:", r1f["corr_mean"], " run2 corr:", r2f["corr_mean"])

eds = [abs((r2[k]["elems_v2"] or 0) - (r1[k]["elems_v2"] or 0)) for k in r2 if k in r1]
print("elems |delta| mean:", round(sum(eds) / len(eds), 3), " max:", round(max(eds), 3))

c1 = {k: (v["corr"] or 0) for k, v in r1.items()}
c2 = {k: (v["corr"] or 0) for k, v in r2.items()}
cds = [abs(c2[k] - c1[k]) for k in c1 if k in c2]
swings = [(k, c1[k], c2[k]) for k in c1 if k in c2 if abs(c2[k] - c1[k]) >= 0.2]
print("corr |delta| mean:", round(sum(cds) / len(cds), 3))
print("corr swings >=0.2:", swings)
