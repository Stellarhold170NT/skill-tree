"""Open the REAL .lbug graph WITHOUT cognee — verify the author's claim.

Correct API (from cognee's own adapter): Database(path, ...) -> init_database() -> Connection(db) -> execute(Cypher).
Introspect schema (SHOW_TABLES) + verify node label is 'Node' not 'Entity'.
"""
from ladybug.database import Database
import ladybug

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lbug"

print("ladybug version:", ladybug.__version__)
db = Database(DB)
db.init_database()
conn = ladybug.Connection(db)

def run(q, label):
    try:
        r = conn.execute(q)
        rows = r.get_all() if hasattr(r, "get_all") else list(r)
        print("%s ->" % label)
        for row in rows[:10]:
            print("   ", row)
        return rows
    except Exception as e:
        print("%s ERR: %s" % (label, str(e)[:130]))
        return []

run("CALL show_tables() RETURN *", "SHOW_TABLES")
run("MATCH (n) RETURN count(n)", "node count")
run("MATCH ()-[r]->() RETURN count(r)", "edge count")
run("MATCH (n) RETURN DISTINCT label(n) AS l, count(*) AS c ORDER BY c DESC LIMIT 8", "labels")
run(
    "MATCH (n:Node) WHERE n.name CONTAINS 'quality' "
    "MATCH (n)-[r]-(m:Node) RETURN n.name, type(r), m.name LIMIT 5",
    "1-hop from 'quality' node",
)
