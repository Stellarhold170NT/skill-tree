"""Probe 1 raw payload row from the real SWEBOK lance.db to see actual schema."""
import lancedb

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)
tbl = db.open_table("DocumentChunk_text")
data = tbl.to_lance().to_table()
print("columns:", data.column_names)
print("rows:", data.num_rows)
row = data.to_pylist()[0]
for k, v in row.items():
    s = str(v)
    print("---", k, type(v).__name__, "len", len(s))
    print(s[:300])
