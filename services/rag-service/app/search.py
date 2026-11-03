"""FTS5 BM25 search + section-path boost + citation assembly (design §6)."""

import re
import time

from sqlalchemy.orm import Session

from . import config
from .database import fts_connect
from .models import Doc

_WORD_RE = re.compile(r"\w+", re.UNICODE)

# Column weights heading=8, path=4, body=1 (design §6.2).
_MAIN_SQL = """
    SELECT c.id, c.doc_id, c.section_id, c.heading, c.path, c.body,
           bm25(chunks_fts, 8.0, 4.0, 1.0) AS rank
    FROM chunks_fts JOIN chunks c ON c.rowid = chunks_fts.rowid
    WHERE chunks_fts MATCH ?{doc_filter}
    ORDER BY rank
    LIMIT ?
"""
_PATH_SQL = """
    SELECT c.id, bm25(chunks_fts) AS rank
    FROM chunks_fts JOIN chunks c ON c.rowid = chunks_fts.rowid
    WHERE chunks_fts MATCH ?{doc_filter}
"""


def sanitize_query(question: str) -> str:
    """Keep word characters + diacritics; strip FTS5 operators (design §6.1)."""
    return " ".join(_WORD_RE.findall(question.lower()))


def _doc_filter(document_ids: list[str] | None) -> tuple[str, list[str]]:
    if not document_ids:
        return "", []
    placeholders = ",".join("?" for _ in document_ids)
    return f" AND c.doc_id IN ({placeholders})", list(document_ids)


def retrieve(
    question: str, document_ids: list[str] | None = None, top_k: int | None = None
) -> tuple[list[dict], float]:
    """Return the best chunk per section (top-k) plus elapsed ms.

    The main MATCH uses OR semantics over sanitized tokens — BM25 IDF then pushes
    chunks matching many rare terms to the top, so common words cannot sink an
    otherwise perfect match (implicit AND would require every token to appear).
    """
    t0 = time.perf_counter()
    top_k = top_k or config.DEFAULT_TOPK
    tokens = sanitize_query(question).split()
    if not tokens:
        return [], (time.perf_counter() - t0) * 1000

    doc_filter, doc_params = _doc_filter(document_ids)
    main_query = " OR ".join(tokens)
    path_query = "{path} : (" + " OR ".join(tokens) + ")"

    with fts_connect() as conn:
        main = conn.execute(
            _MAIN_SQL.format(doc_filter=doc_filter), [main_query, *doc_params, top_k * 4]
        ).fetchall()
        path_hits = (
            conn.execute(_PATH_SQL.format(doc_filter=doc_filter), [path_query, *doc_params])
            .fetchall()
            if len(tokens) > 1
            else []
        )

    # Structure boost (design §6.3): final = bm25(8,4,1) + RAG_PATH_BOOST * bm25_path.
    boost = {row[0]: row[1] for row in path_hits}
    scored = [
        {
            "chunk_id": row[0],
            "doc_id": row[1],
            "section_id": row[2],
            "heading": row[3],
            "path": row[4],
            "body": row[5],
            "score": row[6] + config.PATH_BOOST * boost.get(row[0], 0.0),
        }
        for row in main
    ]
    scored.sort(key=lambda item: item["score"])

    # Re-rank to section granularity: best chunk per section (design §6.4).
    seen_sections: set[str] = set()
    final: list[dict] = []
    for item in scored:
        if item["section_id"] in seen_sections:
            continue
        seen_sections.add(item["section_id"])
        final.append(item)
        if len(final) >= top_k:
            break
    return final, (time.perf_counter() - t0) * 1000


def assemble_citations(db: Session, hits: list[dict]) -> list[dict]:
    """Citation payload (design §6.4): section paths, not byte offsets."""
    out = []
    for hit in hits:
        doc = db.get(Doc, hit["doc_id"])
        entry = {
            "chunkId": hit["chunk_id"],
            "documentId": hit["doc_id"],
            "sectionPath": hit["path"],
            "heading": hit["heading"],
            "snippet": hit["body"][: config.SNIPPET_CHARS],
            "score": round(hit["score"], 4),
        }
        if doc is not None and doc.source_url:
            entry["sourceUrl"] = doc.source_url
        out.append(entry)
    return out
