"""Open the REAL SWEBOK .lbug graph — direct ladybug API: Database + Connection.

ladybug module exposes Connection/Database (Kuzu-fork API).
"""
import ladybug

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lbug"

conn = ladybug.Connection(database_path=DB)
res = conn.execute("MATCH (n) RETURN count(n)")
rows = res.get_all()
print("nodes:", rows)

res = conn.execute("MATCH ()-[r]->() RETURN count(r)")
print("edges:", res.get_all())

res = conn.execute("MATCH (n) RETURN DISTINCT label(n) AS l, count(*) AS c ORDER BY c DESC LIMIT 8")
for row in res.get_all():
    print("  label:", row)

res = conn.execute(
    "MATCH (e:Entity)-[r1]-(m)-[r2]-(o) "
    "WHERE e.name CONTAINS 'quality' "
    "RETURN e.name, type(r1), m.name, type(r2), o.name LIMIT 3"
)
for row in res.get_all():
    print("2-hop path:", row)
