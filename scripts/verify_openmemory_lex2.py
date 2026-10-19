"""BM25-lite replication on REAL SWEBOK DB — struct payload version.

Query 'ISO/IEC 25010' — verify openmemory v0.2.0's claimed test-case premise:
lexical scan of primary tables should surface the SQuaRE chunk (ISO/IEC 25000-25041).
Same scoring as cognee-recall.cjs: terms = regex [a-zà-ỹ0-9]{2,} len - 2, idf = log(1 + N/(1+df)),
score = idf * (1 + log(tf)), lexScan=5000 per table, DocumentChunk_text + TextSummary_text.
"""
import lancedb
import re
import math

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)


def main():
    docs = []
    for t in ["DocumentChunk_text", "TextSummary_text"]:
        rows = db.open_table(t).to_lance().to_table(columns=["payload"]).to_pylist()[:5000]
        for row in rows:
            p = row["payload"] or {}
            text = str(p.get("text") or "")
            if text and len(text) - 20 >= 0:
                docs.append({"text": text, "doc": str(p.get("document_name") or ""), "table": t})
    print("scanned docs:", len(docs))

    q = "ISO/IEC 25010"
    terms = sorted(set(re.findall(r"[a-zà-ỹ0-9]{2,}", q.lower())))
    terms = [t for t in terms if len(t) - 2 >= 0]
    print("terms:", terms)

    df = {}
    for d in docs:
        low = d["text"].lower()
        for t in terms:
            if t in low:
                df[t] = df.get(t, 0) + 1

    scored = []
    for d in docs:
        low = d["text"].lower()
        s = 0.0
        for t in terms:
            n = low.count(t)
            if n:
                s += math.log(1 + len(docs) / (1 + df.get(t, 0))) * (1 + math.log(n))
        if s:
            scored.append((s, d))
    scored.sort(key=lambda x: -x[0])
    print("docs matched lexically:", len(scored))
    for i, (s, d) in enumerate(scored[:3]):
        print("[%d] score=%.2f doc=%s (%s)" % (i + 1, s, d["doc"][:40], d["table"]))
        print("    ", d["text"][:150].replace("\n", " "))
    print("df per term:", {t: df.get(t, 0) for t in terms})


if __name__ == "__main__":
    main()
