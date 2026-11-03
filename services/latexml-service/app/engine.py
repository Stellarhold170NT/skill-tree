"""LaTeXML/ar5ivist conversion engine wrapper.

Two-stage conversion, mirroring arXiv's own HTML pipeline:
1. Pre-compile: ``pdflatex`` + ``bibtex`` generate a ``.bbl`` when the authors
   didn't ship one — without it, LaTeXML renders zero bibliography entries.
2. Convert: ``latexmlc`` (from the ``latexml/ar5ivist`` image — LaTeXML + TeX
   Live + ar5iv styles) produces the HTML5 + MathML document.
"""

import re
import shutil
import subprocess
from pathlib import Path

from . import config
from .errors import ApiError

STDERR_TAIL = 2000

# acl-style papers: LaTeXML emits the title block twice — once as proper
# frontmatter, once as literal centered paragraphs ("ltx_block ltx_align_bottom")
# right before the first section. arXiv's pipeline shows only the frontmatter.
_ACL_FALLBACK_RE = re.compile(
    r'<div id="p1"[^>]*>\s*'
    r'<div id="p1\.1" class="ltx_block ltx_align_bottom">.*?'
    r'</div>\s*</div>\s*(?=<section\b)',
    re.DOTALL,
)

_ARTICLE_CLASS_RE = re.compile(r'(<article class="ltx_document)(?! ltx_authors_1line)')


def _post_process_html(html: str) -> str:
    """Align LaTeXML output with what arxiv.org/html actually serves."""

    def drop_fallback(m: re.Match) -> str:
        block = m.group(0)
        # Safety: only drop when it is the centered literal title/authors
        # rendering, never arbitrary content.
        if "ltx_align_center" in block and re.search(r'width:\d+(\.\d+)?pt', block):
            return ""
        return block

    html = _ACL_FALLBACK_RE.sub(drop_fallback, html)
    # Both ar5iv and arXiv mark single-line author blocks with this class.
    html = _ARTICLE_CLASS_RE.sub(r'\1 ltx_authors_1line', html)
    return html


def engine_available() -> bool:
    return shutil.which(config.ENGINE_CMD) is not None


PRECOMPILE_TIMEOUT_S = 300
BIBTEX_TIMEOUT_S = 120


def _prepare_bibliography(src_dir: Path, main_tex: str) -> None:
    """Generate a ``.bbl`` with real bibtex when the source lacks one.

    Non-fatal: if pdflatex/bibtex fail (missing packages, broken aux), the
    document still converts — just without resolved citations.
    """
    job = Path(main_tex).stem
    if (src_dir / f"{job}.bbl").exists():
        return
    if not list(src_dir.glob("*.bib")):
        return
    try:
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", main_tex],
            cwd=src_dir, timeout=PRECOMPILE_TIMEOUT_S,
            capture_output=True, text=True,
        )
        if (src_dir / f"{job}.aux").exists():
            subprocess.run(
                ["bibtex", job],
                cwd=src_dir, timeout=BIBTEX_TIMEOUT_S,
                capture_output=True, text=True,
            )
    except (OSError, subprocess.TimeoutExpired):
        pass


def run_conversion(src_dir: Path, main_tex: str, out_dir: Path) -> Path:
    """Convert ``main_tex`` inside ``src_dir``; moves results into ``out_dir``."""
    _prepare_bibliography(src_dir, main_tex)
    cmd = [config.ENGINE_CMD, *config.ENGINE_ARGS,
           f"--source={main_tex}",
           "--destination=html/index.html"]
    try:
        proc = subprocess.run(
            cmd,
            cwd=src_dir,
            timeout=config.RENDER_TIMEOUT_S,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        raise ApiError(
            503,
            "ENGINE_UNAVAILABLE",
            f"Conversion engine '{config.ENGINE_CMD}' is not installed",
            {"hint": "Run via docker compose (image latexml/ar5ivist), "
                     "or set ENGINE_CMD to a latexmlc/ar5ivist binary on PATH"},
        )
    except subprocess.TimeoutExpired:
        raise ApiError(
            504,
            "CONVERSION_TIMEOUT",
            f"Conversion exceeded {config.RENDER_TIMEOUT_S}s",
            {"mainTex": main_tex},
        )

    # latexmlc resolves the relative --destination against its cwd (src_dir),
    # so results land in src_dir/html — relocate them to the workspace out_dir.
    generated = src_dir / "html"
    html_path = generated / "index.html"
    if proc.returncode != 0 or not html_path.exists():
        raise ApiError(
            422,
            "CONVERSION_FAILED",
            "LaTeXML could not convert the document",
            {
                "mainTex": main_tex,
                "returnCode": proc.returncode,
                "stderr": _tail(proc.stderr),
                "logHint": "see *.latexml.log next to the source for details",
            },
        )
    _copy_log(src_dir, generated, main_tex)
    html = html_path.read_text(encoding="utf-8", errors="replace")
    html_path.write_text(_post_process_html(html), encoding="utf-8")
    if out_dir.exists():
        shutil.rmtree(out_dir)
    shutil.move(str(generated), str(out_dir))
    return out_dir / "index.html"


def _copy_log(src_dir: Path, out_dir: Path, main_tex: str) -> None:
    log = src_dir / (Path(main_tex).name + ".latexml.log")
    if log.exists():
        shutil.copy2(log, out_dir / "conversion.log")


def _tail(text: str | None) -> str:
    if not text:
        return ""
    return text[-STDERR_TAIL:]
