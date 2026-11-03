"""REST API (prefix /api/v1) + static serving of rendered HTML workspaces."""

import re
import shutil
import uuid
from pathlib import Path

import httpx
from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from . import config, engine, extraction
from .errors import ApiError

router = APIRouter(prefix="/api/v1")

ARXIV_ID_RE = re.compile(r"^\d{4}\.\d{4,5}(v\d+)?$|^[a-z-]+(\.[A-Z]{2})?/\d{7}(v\d+)?$")


def register_exception_handlers(app) -> None:
    app.add_exception_handler(ApiError, _api_error_handler)


async def _api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


@router.get("/engine")
def engine_status() -> dict:
    return {"engine": config.ENGINE_CMD, "available": engine.engine_available(),
            "timeoutS": config.RENDER_TIMEOUT_S}


class ArxivRenderRequest(BaseModel):
    arxivId: str


@router.post("/render")
async def render_upload(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise ApiError(413, "PAYLOAD_TOO_LARGE",
                       f"Upload exceeds {config.MAX_UPLOAD_MB}MB")
    return _render_bytes(data, file.filename or "upload.tar.gz")


@router.post("/render/arxiv")
def render_arxiv(body: ArxivRenderRequest) -> dict:
    arxiv_id = body.arxivId.strip().rstrip(".")
    if not ARXIV_ID_RE.match(arxiv_id):
        raise ApiError(422, "INVALID_ARXIV_ID",
                       "Expected an arXiv identifier like 2609.03874v2 or math/0309136",
                       {"arxivId": arxiv_id})
    data = _download_arxiv_source(arxiv_id)
    result = _render_bytes(data, f"arxiv-{arxiv_id}.tar.gz")
    result["arxivId"] = arxiv_id
    return result


def _download_arxiv_source(arxiv_id: str) -> bytes:
    url = f"https://arxiv.org/e-print/{arxiv_id}"
    try:
        resp = httpx.get(
            url,
            headers={"User-Agent": config.ARXIV_USER_AGENT},
            timeout=120,
            follow_redirects=True,
        )
    except httpx.HTTPError as exc:
        raise ApiError(502, "UPSTREAM_ERROR",
                       f"Could not reach arXiv: {exc.__class__.__name__}",
                       {"url": url})
    if resp.status_code == 404:
        raise ApiError(404, "ARXIV_SOURCE_NOT_FOUND",
                       "arXiv has no LaTeX source for this paper "
                       "(PDF-only submissions carry no source)",
                       {"arxivId": arxiv_id})
    if resp.status_code != 200:
        raise ApiError(502, "UPSTREAM_ERROR",
                       f"arXiv returned HTTP {resp.status_code}",
                       {"url": url, "arxivId": arxiv_id})
    return resp.content


def _render_bytes(data: bytes, filename: str) -> dict:
    render_id = uuid.uuid4().hex
    render_root = Path(config.RENDERS_DIR) / render_id
    src_dir = render_root / "source"
    out_dir = render_root / "html"
    try:
        extraction.extract(data, filename, src_dir)
        main_tex = extraction.find_main_tex(src_dir)
        if main_tex is None:
            raise ApiError(422, "NO_TEX_SOURCE",
                           "No .tex file containing \\documentclass was found",
                           {"filename": filename})
        engine.run_conversion(src_dir, main_tex, out_dir)
    except ApiError:
        shutil.rmtree(render_root, ignore_errors=True)
        raise
    finally:
        shutil.rmtree(src_dir, ignore_errors=True)
    return {
        "renderId": render_id,
        "htmlUrl": f"/renders/{render_id}/html/index.html",
        "logUrl": f"/renders/{render_id}/html/conversion.log",
    }


@router.get("/renders/{render_id}/view", response_class=HTMLResponse)
def view_render(render_id: str, request: Request) -> HTMLResponse:
    html = Path(config.RENDERS_DIR) / render_id / "html" / "index.html"
    if not _valid_render_id(render_id) or not html.is_file():
        raise ApiError(404, "RENDER_NOT_FOUND", "No rendered document with this id",
                       {"renderId": render_id})
    return HTMLResponse(html.read_text(encoding="utf-8", errors="replace"))


def _valid_render_id(render_id: str) -> bool:
    return bool(re.fullmatch(r"[0-9a-f]{32}", render_id))
