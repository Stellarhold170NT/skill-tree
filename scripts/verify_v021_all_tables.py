"""Simulate v0.2.1 parseRow over ALL 7 tables of the REAL struct-layout DB.

For each table: rowsSeen, parsed text>=20 chars (usable), schema fields present.
Predicts exactly which tables feed hits and which silently contribute nothing.
"""
import lancedb

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)


def parse_row_struct(p):
    # mirror of parseRow struct branch: doc = document_name ?? name; text = p.text
    doc = str(p.get("document_name") or p.get("name") or "")
    text = str(p.get("text") or "")
    return doc, text


def main():
    names = sorted(db.table_names())
    print("%-28s %9s %10s %8s  fields" % ("table", "rows", "usable", "schema?"))
    for t in names:
        rows = db.open_table(t).to_lance().to_table(columns=["payload"]).to_pylist()
        usable = 0
        keys = set()
        for r in rows[:2000]:
            p = r["payload"] or {}
            keys.update(p.keys())
            doc, text = parse_row_struct(p)
            if text and len(text) - 20 >= 0:
                usable += 1
        has_text = "text" in keys
        has_name = "name" in keys or "document_name" in keys
        mark = "OK" if usable else ("WARN(nó sẽ kêu nếu bảng duy nhất)" if rows else "-")
        print("%-28s %9d %10d %8s  %s" % (t, len(rows), usable, mark, "text" if has_text else ("name" if has_name else "?none"),))
        if t == "EdgeType_relationship_name" or t == "Entity_name":
            print("    sample keys:", sorted(keys))
            p0 = rows[0]["payload"] or {}
            for k in ("text", "name", "relationship_name", "document_name"):
                if k in p0:
                    print("    %s = %r" % (k, str(p0[k])[:110]))


if __name__ == "__main__":
    main()
