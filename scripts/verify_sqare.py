"""Which chunks contain '25010' most, and is a SQuaRE (25000-25041) chunk present?"""
import lancedb
import re

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)

docs = []
for t in ["DocumentChunk_text", "TextSummary_text"]:
    rows = db.open_table(t).to_lance().to_table(columns=["payload"]).to_pylist()[:5000]
    for row in rows:
        p = row["payload"] or {}
        text = str(p.get("text") or "")
        if text and len(text) - 20 >= 0:
            docs.append({"text": text, "doc": str(p.get("document_name") or ""), "table": t})

hits = []
for d in docs:
    low = d["text"].lower()
    n = low.count("25010")
    sq = ("square" in low) or ("25000" in low and "25041" in low)
    if n or sq:
        hits.append((n, sq, d))

hits.sort(key=lambda x: (-x[0], -x[1]))
print("docs containing '25010':", sum(1 for h in hits if h[0]))
print("docs SQuaRE-like (square or 25000+25041):", sum(1 for h in hits if h[1]))
for n, sq, d in hits[:5]:
    print("--- tf25010=%d square=%s [%s] %s" % (n, sq, d["table"], d["doc"][:30]))
    print("   ", d["text"][:160].replace("\n", " "))
