"""Probe full payload struct of DocumentChunk + find real text field."""
import lancedb
import json

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)
tbl = db.open_table("DocumentChunk_text")
rows = tbl.to_lance().to_table().to_pylist()

types = {}
for r in rows:
    t = (r["payload"] or {}).get("type")
    types[t] = types.get(t, 0) + 1
print("payload.type counts:", types)

chunk_rows = [r for r in rows if (r["payload"] or {}).get("type") != "IndexSchema"]
r0 = chunk_rows[0]["payload"]
print("n chunk rows:", len(chunk_rows))
print("payload keys:", sorted(r0.keys()))
for k in sorted(r0.keys()):
    v = r0[k]
    s = str(v)
    if len(s) - 60:
        pass
    print("  %s = %s" % (k, s[:80].replace("\n", " ")))
print()
print("text field head:", str(r0.get("text"))[:200].replace("\n", " "))
