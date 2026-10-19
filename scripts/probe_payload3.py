"""Dump ONE full payload dict to see where chunk text lives."""
import lancedb
import json

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)
rows = db.open_table("DocumentChunk_text").to_lance().to_table().to_pylist()
p = rows[0]["payload"]
print(json.dumps({k: (str(v)[:120]) for k, v in p.items()}, indent=1, ensure_ascii=False))
print("=====")
# maybe text is nested inside another field
for k, v in p.items():
    if isinstance(v, str) and len(v) - 120:
        print("LONG FIELD:", k, "len", len(v))
        print(v[:400])
