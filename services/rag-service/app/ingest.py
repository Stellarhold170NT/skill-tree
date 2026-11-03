"""In-process ingest worker: parse → structure-chunk → index → mirror (design §3)."""

import asyncio
import hashlib
import json
import time
from pathlib import Path

from sqlalchemy import delete, update

from . import chunker, config, latexml_client, mirror
from .database import SessionLocal
from .metrics import metrics
from .models import Chunk, Doc, Job, Section
from .service import new_id

_tasks: set[asyncio.Task] = set()
_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Capture the app's event loop so sync (threadpool) routes can schedule too."""
    global _main_loop
    _main_loop = loop


def schedule_ingest(job_id: str) -> None:
    """Queue the pipeline; safe from both the loop thread and worker threads."""
    if _main_loop is not None:
        _main_loop.call_soon_threadsafe(_spawn_on, _main_loop, job_id)
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return  # no loop available: job stays queued (documented single-worker mode)
    _spawn_on(loop, job_id)


def _spawn_on(loop: asyncio.AbstractEventLoop, job_id: str) -> None:
    task = loop.create_task(_run(job_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)


async def _run(job_id: str) -> None:
    try:
        await asyncio.to_thread(_ingest_blocking, job_id)
    except Exception as exc:  # last-resort guard: never leave a job non-terminal
        _mark_failed(job_id, f"INGEST_FAILED: {exc.__class__.__name__}: {exc}")


def _mark_failed(job_id: str, message: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job is not None:
            job.status = "failed"
            job.error = message[:2000]
            db.commit()
    finally:
        db.close()


def _decode(raw: bytes) -> str:
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("latin-1", errors="replace")


def _ingest_blocking(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job is None or job.status in ("ready", "failed"):
            return
        doc = db.get(Doc, job.doc_id)
        if doc is None:
            job.status = "failed"
            job.error = "INGEST_FAILED: doc row missing"
            db.commit()
            return

        # Reingest: clear previous index rows before re-running the pipeline.
        # Deterministic FK-safe order (self-FK on sections.parent_id defeats the
        # ORM unit-of-work sort); bulk DELETEs keep FTS5 triggers firing.
        if doc.sections:
            db.execute(delete(Chunk).where(Chunk.doc_id == doc.id))
            db.execute(update(Section).where(Section.doc_id == doc.id).values(parent_id=None))
            db.execute(delete(Section).where(Section.doc_id == doc.id))
            db.commit()
            db.expire(doc)

        stage: dict = {}
        job.status = "received"
        db.commit()

        # 1) parse ------------------------------------------------------------
        raw = Path(doc.raw_path).read_bytes() if doc.raw_path else b""
        content, source_url, render_id = "", None, None
        if doc.source_kind == "latexml":
            t0 = time.perf_counter()
            render_id, html_url = latexml_client.render(doc.raw_filename or "source.tex", raw)
            stage["conversionMs"] = round((time.perf_counter() - t0) * 1000, 1)  # excluded from budget
            t0 = time.perf_counter()
            content = latexml_client.fetch_html(html_url)
            stage["parseMs"] = round((time.perf_counter() - t0) * 1000, 1)
            source_url = html_url
        else:
            t0 = time.perf_counter()
            content = _decode(raw)
            stage["parseMs"] = round((time.perf_counter() - t0) * 1000, 1)
        doc.char_count = len(content)
        doc.source_url = source_url
        doc.render_id = render_id
        job.status = "parsed"
        db.commit()

        # 2) structure chunk ---------------------------------------------------
        t0 = time.perf_counter()
        try:
            sections = chunker.build(content, doc.source_kind)
        except chunker.EmptyDocument:
            job.status = "failed"
            job.stage_ms = json.dumps(stage)
            job.error = "EMPTY_DOCUMENT: parser produced zero sections"
            db.commit()
            return
        stage["chunkMs"] = round((time.perf_counter() - t0) * 1000, 1)
        job.status = "chunked"
        db.commit()

        # 3) index (FTS5 triggers maintain chunks_fts) --------------------------
        t0 = time.perf_counter()
        id_by_node: dict[int, str] = {}
        for node in sections:
            sid = new_id()
            id_by_node[id(node)] = sid
            db.add(
                Section(
                    id=sid,
                    doc_id=doc.id,
                    level=node.level,
                    title=node.title[:500],
                    path=node.path[:2000],
                    order_idx=node.order_idx,
                )
            )
        db.flush()
        for node in sections:
            if node.parent is not None:
                row = db.get(Section, id_by_node[id(node)])
                row.parent_id = id_by_node[id(node.parent)]
        for node in sections:
            for part_index, part in node.parts:
                db.add(
                    Chunk(
                        id=new_id(),
                        doc_id=doc.id,
                        section_id=id_by_node[id(node)],
                        part=part_index,
                        heading=node.title[:500],
                        path=node.path[:2000],
                        body=part,
                        char_count=len(part),
                    )
                )
        db.commit()
        stage["indexMs"] = round((time.perf_counter() - t0) * 1000, 1)

        # 4) mirror (best effort; failure does not fail ingest, design §3) ------
        t0 = time.perf_counter()
        mirror_chunks = [part for node in sections for _, part in node.parts]
        doc_service_id, mirror_error = mirror.mirror_document(
            doc.title, doc.source_url, mirror_chunks
        )
        stage["mirrorMs"] = round((time.perf_counter() - t0) * 1000, 1)
        if mirror_error:
            stage["mirrorError"] = mirror_error
        if doc_service_id:
            doc.doc_service_id = doc_service_id
        db.commit()

        # 5) ready ---------------------------------------------------------------
        job.status = "ready"
        job.stage_ms = json.dumps(stage)
        db.commit()
        budget_ms = stage.get("parseMs", 0) + stage.get("chunkMs", 0) + stage.get("indexMs", 0)
        metrics.ingest.observe(budget_ms)
    finally:
        db.close()
