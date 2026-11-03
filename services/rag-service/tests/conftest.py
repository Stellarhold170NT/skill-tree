"""Shared fixtures: isolated tmp SQLite DB per pytest run, fresh schema per test."""

import os
import pathlib
import sys
import tempfile
import time

# Configure environment BEFORE importing the app package.
_TMPDIR = tempfile.mkdtemp(prefix="rag-test-")
os.environ["RAG_DB_PATH"] = f"{_TMPDIR}/test.db"
os.environ["RAG_UPLOAD_DIR"] = f"{_TMPDIR}/uploads"
os.environ["RAG_MAX_UPLOAD_MB"] = "1"  # keep the 413 test cheap
os.environ.pop("LLM_ENDPOINT", None)
os.environ.pop("LLM_API_KEY", None)

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import FTS_DDL, Base, engine, fts_connect, init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with fts_connect() as conn:
        conn.execute("DROP TABLE IF EXISTS chunks_fts")
    Base.metadata.create_all(bind=engine)
    init_db()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def upload(client):
    """Upload a file and return the 202 body (jobId/statusUrl/docId)."""

    def _upload(filename: str, content, title: str | None = None, uploader_id: str | None = None):
        data = {}
        if title:
            data["title"] = title
        if uploader_id:
            data["uploaderId"] = uploader_id
        payload = content if isinstance(content, bytes) else content.encode("utf-8")
        resp = client.post(
            "/api/v1/documents/upload",
            files={"file": (filename, payload)},
            data=data,
        )
        assert resp.status_code == 202, resp.text
        return resp.json()

    return _upload


@pytest.fixture()
def wait_ready(client):
    """Poll a job until it reaches a terminal status (or fail the test)."""

    def _wait(job_id: str, timeout: float = 30.0) -> dict:
        deadline = time.time() + timeout
        last = None
        while time.time() < deadline:
            resp = client.get(f"/api/v1/jobs/{job_id}")
            assert resp.status_code == 200
            last = resp.json()
            if last.get("status") in ("ready", "failed"):
                return last
            time.sleep(0.05)
        raise AssertionError(f"job {job_id} did not finish in {timeout}s: {last}")

    return _wait


# Section bodies stay above RAG_MIN_SECTION_CHARS (200) so nothing merges away.
SAMPLE_MD = """# Democracies

Democracies are systems of government in which political power belongs to the
citizens, exercised directly or through freely elected representatives. Free and
fair elections, the rule of law, and the protection of minority rights are the
foundations that separate a healthy democracy from plain majoritarian rule.

## Electoral Systems

A plurality voting system awards the seat to the candidate with the most votes,
even when that candidate lacks an absolute majority of the electorate. Proportional
representation instead allocates legislative seats in proportion to each party's
share of the vote, which tends to produce multi-party coalitions instead of
single-party governments.

## Institutions within Democracy

Courts and parliaments are the core institutions that keep a democracy
accountable. Independent constitutional courts review whether statutes respect
fundamental rights, while parliaments debate, amend and pass legislation and
control the public budget through committee work.

### Courts

Constitutional courts guard fundamental rights and can strike down laws that
violate the constitution. Judicial review gives citizens a legal remedy when the
legislature or the executive oversteps its constitutional powers.

# Chapter 2: economies

## Markets

Markets coordinate supply and demand through prices. Inflation reduces the
purchasing power of money when prices rise too fast across the economy, and
central banks respond by raising interest rates to cool demand.
"""

# All paragraphs are padded above the 200-char merge threshold.
LTX_HTML = """<html><body>
<div class="ltx_title ltx_title_document">Sample Paper</div>
<section class="ltx_abstract">
<h2 class="ltx_title ltx_title_abstract"><span class="ltx_title_abstract">Abstract</span></h2>
<div class="ltx_para"><p id="S0.p1">We study retrieval over structured corpora and show that
respecting the table of contents of a document improves citation quality for student
question answering across long study materials.</p></div>
</section>
<section class="ltx_section" id="S1">
<h2 class="ltx_title ltx_title_section"><span class="ltx_title_section">1 Introduction</span></h2>
<div class="ltx_para"><p id="S1.p1">Retrieval quality depends on chunk boundaries and on the
metadata attached to each chunk, because a length-based chunker throws away the global
structure that would otherwise anchor every citation to a stable section path.</p></div>
<section class="ltx_subsection" id="S1.SS1">
<h3 class="ltx_title ltx_title_subsection"><span class="ltx_title_subsection">1.1 Contributions</span></h3>
<div class="ltx_para"><p id="S1.SS1.p1">We list three contributions about embeddings and paths,
including a structure-aware chunker, a hybrid BM25 ranker with a path boost, and a citation
format that names the full section path of every retrieved passage.</p></div>
</section>
</section>
<section class="ltx_bibliography" id="bib">
<h2 class="ltx_title ltx_title_bibliography">References</h2>
<div class="ltx_para"><p>Bibitem one. Bibitem two.</p></div>
</section>
</body></html>"""
