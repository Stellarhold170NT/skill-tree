"""Replicate openmemory v0.2.0 lexical BM25-lite pass on the REAL SWEBOK cognee DB.

Query: 'ISO/IEC 25010' — verify the claimed test-case (top hit = SQuaRE chunk).
Mirrors cognee-recall.cjs: extractField/unescape parser, term regex [a-zà-ỹ0-9]{2,},
idf = log(1 + N/(1+df)), score = idf * (1 + log(tf)), lexScan=5000, both primary tables.
"""
import lancedb
import re
import math

DB = "/workspace/.cognee_system/databases/319c34d8-55c2-4aba-894b-030aafdbb49d/b15b5f24-eb51-5655-b773-07c21aa4adb9.lance.db"
db = lancedb.connect(DB)


def extract_field(raw, key):
    idx = raw.find('"%s": "' % key)
    if idx == -1:
        return None
    out = ""
    i = idx + len(key) + 5
    while i < len(raw):
        c = raw[i]
        if c == "\\":
            out += c + (raw[i + 1] if i + 1 < len(raw) else "")
            i += 2
            continue
        if c == '"':
            break
        out += c
        i += 1
    return out


def unescape(s):
    s = s.replace("\r", "").replace("\\\\", "\x00").replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"').replace("\x00", "\\")
    return re.sub(r"\n{3,}", "\n\n", s)


def main():
    docs = []
    for t in ["DocumentChunk_text", "TextSummary_text"]:
        tbl = db.open_table(t)
        data = tbl.to_lance().to_table(columns=["payload"])
        for row in data.to_pylist()[:5000]:
            raw = str(row["payload"])
            text = unescape(extract_field(raw, "text") or "")
            if text and len(text) - 20 >= 0:
                docs.append(
                    {
                        "text": text,
                        "doc": extract_field(raw, "document_name") or extract_field(raw, "name") or "",
                    }
                )
    print("scanned docs:", len(docs), "(cap 5000/table — full coverage cho DB nay)")

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
        print("[%d] score=%.2f doc=%s" % (i + 1, s, d["doc"][:70]))
        print("    ", d["text"][:130].replace("\n", " "))

    print("df per term:", {t: df.get(t, 0) for t in terms})


if __name__ == "__main__":
    main()
