# latexml-service

Converts full LaTeX documents (e.g. arXiv papers) into **HTML5 pages that look
like [arxiv.org/html](https://arxiv.org/html/2609.03874v2)** — same engine
pipeline (LaTeXML + ar5iv bindings), same stylesheet as arXiv's own HTML papers.

Engine component for **M3 `document-service`**: stateless, no database —
rendered workspaces are plain files under `RENDERS_DIR`.

## Role in the platform

- **Paper/lecture-note reading**: `POST /render/arxiv` turns any arXiv ID into a
  browsable HTML page (figures + conversion log included), served under `/renders/`.
- **Course material**: `POST /render` accepts a `.tex` / `tar.gz` / `zip` upload.
- Output is plain HTML5 + MathML — no client-side JS required.

## Tech stack

- **Python 3.11, FastAPI, httpx** — thin REST wrapper (this repo's code)
- **Engine (inside the Docker image):**
  - `latexml/ar5ivist:2512.17` base image — Perl LaTeXML (arXiv's fork) +
    TeX Live + ar5iv bindings/styles; a paper conversion typically takes
    ~2 minutes (outer timeout: `RENDER_TIMEOUT_S`)
  - `pdflatex` + `bibtex` — pre-compile step that generates a `.bbl` when
    authors didn't ship one, so citations/References resolve (45/45 on the
    sample paper)

## Conversion pipeline

```
arxivId / upload
  → extract (tar.gz / zip / .tex / gzip-of-single-tex)
  → find main .tex (contains \documentclass, shallowest path wins)
  → [if no .bbl and *.bib present] pdflatex + bibtex → paper.bbl
  → latexmlc --preload=ar5iv.sty --path=/opt/ar5iv-bindings/... --format=html5
             --pmml --mathtex --css=/css/arxiv-html-papers.css
  → post-process (see below)
  → move to /renders/<id>/html/ and serve statically
```

**Post-processing** (aligns output with what arxiv.org actually serves):

1. Strip the duplicate ACL-style title block (`acl.sty` fallback renders the
   title/authors twice; arXiv shows only the frontmatter).
2. Add the `ltx_authors_1line` class to `<article>` (both ar5iv and arXiv have
   it; controls the single-line author layout).
3. `.ltx_page_footer` is hidden via CSS (arXiv strips it entirely).

**Stylesheets** are vendored from arxiv.org (`static/css/`) and served
same-origin at `/css/` — no CDN dependency.

## Quickstart

```bash
# docker (engine included — image is ~8.5GB, mostly TeX Live)
cd deploy
docker compose up -d --build latexml-service

# local dev (requires latexmlc + pdflatex/bibtex on PATH)
pip install -r requirements.txt
uvicorn app.main:app --port 8103 --reload     # Swagger: http://localhost:8103/docs
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `ENGINE_CMD` | `latexmlc` | Engine binary on PATH |
| `ENGINE_ARGS` | (ar5iv flags, incl. `--css=/css/arxiv-html-papers.css`) | Engine arguments |
| `RENDER_TIMEOUT_S` | `900` | Max seconds per conversion (subprocess kill) |
| `MAX_UPLOAD_MB` | `100` | Upload size limit |
| `RENDERS_DIR` | `./data/renders` | Where rendered workspaces live |
| `ARXIV_USER_AGENT` | (descriptive default) | arXiv requires identifying automated access |

## API reference (prefix `/api/v1`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe → `{"status","service","version"}` |
| GET | `/engine` | Engine availability → `{"engine","available","timeoutS"}` |
| POST | `/render` | Multipart upload (`.tex`, `tar.gz`, `zip`) → render |
| POST | `/render/arxiv` | `{"arxivId": "2609.03874v2"}` → fetch arXiv source → render |
| GET | `/renders/{id}/html/index.html` | Rendered document (also `/api/v1/renders/{id}/view`) |
| GET | `/renders/{id}/html/conversion.log` | LaTeXML conversion log |
| GET | `/css/…` | Vendored arXiv stylesheets (same-origin) |

Example:

```bash
curl -s -X POST localhost:8103/api/v1/render/arxiv \
  -H "Content-Type: application/json" \
  -d '{"arxivId": "2609.03874v2"}'
# → {"renderId": "…", "htmlUrl": "/renders/<id>/html/index.html",
#    "logUrl": "/renders/<id>/html/conversion.log", "arxivId": "2609.03874v2"}
```

### Input

- `POST /render`: `.tex` file, `tar`/`tar.gz`/`zip` archive, or arXiv-style
  gzip-of-a-single-`.tex` (auto-detected). Max `MAX_UPLOAD_MB`.
- `POST /render/arxiv`: arXiv identifier (`2609.03874v2`, `math/0309136`, …).
  PDF-only papers carry no source → `404 ARXIV_SOURCE_NOT_FOUND`.

### Output

```json
{"renderId": "…", "htmlUrl": "/renders/<id>/html/index.html",
 "logUrl": "/renders/<id>/html/conversion.log", "arxivId": "…"}
```

On disk under `RENDERS_DIR/<id>/html/`: `index.html` (HTML5 + MathML, arXiv CSS),
`images/` (converted figures), `conversion.log`. **The LaTeX source is deleted
after conversion** — only the HTML workspace persists.

### Validation rules

- Unsupported payload → `422 UNSUPPORTED_ARCHIVE`; no `\documentclass` file →
  `422 NO_TEX_SOURCE`; engine failure → `422 CONVERSION_FAILED` (with stderr
  tail); conversion too slow → `504 CONVERSION_TIMEOUT`; engine missing →
  `503 ENGINE_UNAVAILABLE`.
- All errors use the platform envelope: `{"error": {"code", "message", "details"}}`.

## Known limitations

- natbib citations with the same author are compressed (`Bai et al. (2024a, b)`)
  where arXiv's pipeline keeps them separate (`Bai et al. (2024a); Bai et al.
  (2024b)`) — cosmetic only, both link to the same bibitems.
- PDF-only arXiv submissions cannot be converted (no LaTeX source exists).
- Conversions are synchronous; a paper takes ~2 minutes.

## Integration contract

- Callers reference renders by URL (`htmlUrl`) — opaque, no back-reference.
- Runs on its own Docker network (`latexml-net`); integrates with other modules
  via the API gateway / event bus (see `docs/MODULES.md`).

## Running tests

```bash
pytest -q   # 11 tests: pipeline behavior (engine mocked) + post-processing rules
```

## Roadmap

- Async job queue (202-style) for long conversions.
- CSS theming to match the platform UI instead of arXiv's.
- PDF-figure caching across re-renders.
