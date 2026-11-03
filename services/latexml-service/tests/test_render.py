"""Render pipeline behavior (engine subprocess is mocked; extraction is real)."""

import io
import tarfile

import pytest
from fastapi.testclient import TestClient

from app import engine

MAIN_TEX = (
    b"\\documentclass{article}\n"
    b"\\begin{document}\n"
    b"Hello $E=mc^2$ world.\n"
    b"\\end{document}\n"
)


def _tar_bytes(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name, content in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    return buf.getvalue()


@pytest.fixture()
def client(monkeypatch):
    def fake_conversion(src_dir, main_tex, out_dir):
        out_dir.mkdir(parents=True, exist_ok=True)
        (out_dir / "index.html").write_text(
            "<html><body>RENDERED</body></html>", encoding="utf-8")

    monkeypatch.setattr(engine, "run_conversion", fake_conversion)
    from app.main import app
    with TestClient(app) as c:
        yield c


def test_health(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["service"] == "latexml-service"
    assert body["status"] == "ok"


def test_render_single_tex_upload(client):
    resp = client.post("/api/v1/render",
                       files={"file": ("main.tex", MAIN_TEX, "application/x-tex")})
    assert resp.status_code == 200
    body = resp.json()
    assert body["renderId"]
    html = client.get(body["htmlUrl"])
    assert html.status_code == 200
    assert "RENDERED" in html.text
    # /view convenience route serves the same HTML
    view = client.get(f"/api/v1/renders/{body['renderId']}/view")
    assert view.status_code == 200


def test_render_tar_gz_picks_documentclass_file(client):
    archive = _tar_bytes({
        "paper/main.tex": MAIN_TEX,
        "paper/sections/intro.tex": b"\\section{Intro}\nno preamble here",
        "figures/fig1.png": b"\x89PNG fake",
    })
    resp = client.post("/api/v1/render",
                       files={"file": ("paper.tar.gz", archive, "application/gzip")})
    assert resp.status_code == 200
    assert resp.json()["htmlUrl"].endswith("/index.html")


def test_invalid_archive_returns_error_envelope(client):
    resp = client.post("/api/v1/render",
                       files={"file": ("junk.bin", b"not-an-archive", "application/octet-stream")})
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "UNSUPPORTED_ARCHIVE"
    assert set(err) == {"code", "message", "details"}


def test_tex_without_documentclass_rejected(client):
    archive = _tar_bytes({"notes.tex": b"just some \\section{notes}"})
    resp = client.post("/api/v1/render",
                       files={"file": ("notes.tex.tar.gz", archive, "application/gzip")})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "NO_TEX_SOURCE"


def test_render_arxiv_invalid_id(client):
    resp = client.post("/api/v1/render/arxiv", json={"arxivId": "not an id"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_ARXIV_ID"


def test_render_arxiv_happy_path(client, monkeypatch):
    import app.routes as routes

    monkeypatch.setattr(routes, "_download_arxiv_source",
                        lambda arxiv_id: _tar_bytes({"main.tex": MAIN_TEX}))
    resp = client.post("/api/v1/render/arxiv", json={"arxivId": "2609.03874v2"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["arxivId"] == "2609.03874v2"
    assert client.get(body["htmlUrl"]).status_code == 200


def test_path_traversal_entries_skipped(client):
    archive = _tar_bytes({
        "../evil.tex": MAIN_TEX,
        "ok.tex": MAIN_TEX,
    })
    resp = client.post("/api/v1/render",
                       files={"file": ("trap.tar.gz", archive, "application/gzip")})
    # "../evil.tex" is dropped by the safe-name filter; ok.tex renders fine.
    assert resp.status_code == 200
