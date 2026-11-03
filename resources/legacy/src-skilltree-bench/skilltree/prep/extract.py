"""Extract PDF SWEBOK v4 -> Markdown + metadata bằng PyMuPDF (idempotent).

Sử dụng: /opt/venv/bin/python src/skilltree/prep/extract.py [--force]

Đầu ra (Corpus corpora/swebok-v4/):
  - swebok-v4.md  : full text theo trang "=== [p. N] ===" + heading chèn từ bookmark TOC
  - metadata.json : cấu trúc tài liệu từ doc.get_toc() — 18 knowledge areas với
                    page range CHÍNH XÁC (không ước lượng) + cây section 3 cấp.

Vì sao PyMuPDF thay docling (quyết định của orchestrator, xem reports/task-2-report.md):
  - docling 2.139.0 fail lặp lại trong sandbox: thiếu torch -> thiếu transformers ->
    layout model "docling-layout-heron" không load được AutoImageProcessor
    (không tương thích transformers vừa cài); chi phí vá chuỗi dependency quá lớn.
  - PyMuPDF đọc được font subset của PDF này, nhanh (<1 phút), và PDF có sẵn
    bookmark TOC 815 entry -> metadata chính xác theo trang thật.

Idempotent: ghi đè cùng tên file, chạy lại không nhân bản dữ liệu.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CORPUS_DIR = REPO_ROOT / "corpora" / "swebok-v4"
PDF_NAME = "swebok-v4.pdf"
MD_NAME = "swebok-v4.md"
META_NAME = "metadata.json"

PDF_URL = (
    "https://raw.githubusercontent.com/olili27/software-development-books/"
    "master/swebok-v4.pdf"
)

# 18 knowledge areas của SWEBOK Guide v4.0 (theo bookmark TOC của chính PDF)
SWEBOK_V4_KAS = [
    "Software Requirements",
    "Software Architecture",
    "Software Design",
    "Software Construction",
    "Software Testing",
    "Software Engineering Operations",
    "Software Maintenance",
    "Software Configuration Management",
    "Software Engineering Management",
    "Software Engineering Process",
    "Software Engineering Models and Methods",
    "Software Quality",
    "Software Security",
    "Software Engineering Professional Practice",
    "Software Engineering Economics",
    "Computing Foundations",
    "Mathematical Foundations",
    "Engineering Foundations",
]

CHAP_RE = re.compile(r"^Chapter\s+(\d+)\s*:\s*(.+)$", re.IGNORECASE)


def get_doc(pdf: Path):
    import pymupdf  # fitz API cũ đã deprecated — dùng namespace mới

    return pymupdf.open(str(pdf))


def build_markdown(doc) -> str:
    """Ghép text từng trang + chèn heading từ TOC bookmark tại trang tương ứng."""
    toc_by_page: dict[int, list[tuple[int, str]]] = {}
    for level, title, page in doc.get_toc():
        if 1 <= level <= 6:
            toc_by_page.setdefault(page, []).append((level, title))

    parts: list[str] = []
    for i in range(doc.page_count):
        page_no = i + 1
        page = doc.load_page(i)
        chunk = [f"=== [p. {page_no}] ==="]
        for level, title in toc_by_page.get(page_no, []):
            title = " ".join(title.split())
            chunk.append("#" * level + " " + title)
        text = page.get_text("text")
        chunk.append(text.rstrip())
        parts.append("\n".join(chunk))
    md = "\n\n".join(parts) + "\n"
    return md


def build_metadata(doc, pdf: Path) -> dict:
    toc = doc.get_toc()
    chapters = [
        {"n": int(CHAP_RE.match(t).group(1)), "title": t, "page": p}
        for lvl, t, p in toc
        if lvl == 1 and CHAP_RE.match(t)
    ]
    chapters.sort(key=lambda c: c["page"])
    total = doc.page_count

    kas = []
    for i, ch in enumerate(chapters):
        m = CHAP_RE.match(ch["title"])
        name = " ".join(m.group(2).split())
        page_start = ch["page"]
        page_end = (
            chapters[i + 1]["page"] - 1 if i + 1 < len(chapters) else total
        )
        sections = [
            {
                "title": " ".join(t.split()),
                "level": lvl,
                "page": p,
            }
            for lvl, t, p in toc
            if lvl >= 2 and page_start <= p <= page_end
        ]
        kas.append(
            {
                "name": name,
                "chapter": ch["n"],
                "page_start": page_start,
                "page_end": page_end,
                "sections": sections,
            }
        )

    front = [
        {"title": " ".join(t.split()), "level": lvl, "page": p}
        for lvl, t, p in toc
        if lvl == 1 and not CHAP_RE.match(t)
    ]
    found = [k["name"] for k in kas]
    missing = [k for k in SWEBOK_V4_KAS if k not in found]
    extra = [k for k in found if k not in SWEBOK_V4_KAS]

    return {
        "corpus": "swebok-v4",
        "corpus_definition": "Fixed, versioned collection of documents used as Benchmark input (GLOSSARY.md)",
        "title": "SWEBOK Guide V4.0 (IEEE Computer Society, 2024)",
        "source_pdf": str(pdf.relative_to(REPO_ROOT)),
        "source_url": PDF_URL,
        "extracted_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "extractor": "PyMuPDF (pymupdf) get_toc() + page.get_text('text')",
        "extractor_note": (
            "PyMuPDF thay docling theo quyết định của orchestrator: docling 2.139.0 "
            "không load được layout model (heron/AutoImageProcessor) trong sandbox; "
            "PDF có bookmark TOC đầy đủ 815 entries nên metadata lấy page chính xác."
        ),
        "pdf": {"size_bytes": pdf.stat().st_size, "pages": total},
        "markdown": {
            "path": MD_NAME,
            "chars": None,  # điền sau khi ghi md
            "headings": sum(1 for lvl, _, _ in toc if 1 <= lvl <= 6),
            "toc_entries": len(toc),
            "page_marker_format": "=== [p. N] ===",
        },
        "front_matter_and_appendices": front,
        "knowledge_areas": kas,
        "ka_check": {
            "expected": len(SWEBOK_V4_KAS),
            "found": len(kas),
            "missing": missing,
            "extra": extra,
        },
    }


def run(pdf: Path, out_dir: Path, force: bool = False) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    md_path = out_dir / MD_NAME
    meta_path = out_dir / META_NAME

    if not pdf.exists():
        raise FileNotFoundError(f"Khong thay PDF: {pdf} — chay download.py truoc")

    if (
        not force
        and md_path.exists()
        and md_path.stat().st_size > 100_000
        and meta_path.exists()
        and meta_path.stat().st_size > 1_000
    ):
        print(f"[extract] Output hop le da ton tai, bo qua: {md_path} (--force de extract lai)")
        return md_path

    doc = get_doc(pdf)
    md = build_markdown(doc)
    md_path.write_text(md, encoding="utf-8")

    meta = build_metadata(doc, pdf)
    meta["markdown"]["chars"] = len(md)
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    check = meta["ka_check"]
    print(
        f"[extract] md: {len(md)} chars | pages: {meta['pdf']['pages']} | "
        f"KA: {len(meta['knowledge_areas'])} (missing={check['missing']}, extra={check['extra']})",
        flush=True,
    )
    return md_path


def main() -> int:
    ap = argparse.ArgumentParser(description="Extract SWEBOK v4 PDF bang PyMuPDF (idempotent)")
    ap.add_argument("--pdf", type=Path, default=CORPUS_DIR / PDF_NAME)
    ap.add_argument("--outdir", type=Path, default=CORPUS_DIR)
    ap.add_argument("--force", action="store_true", help="Extract lai bo qua output cu")
    args = ap.parse_args()
    try:
        out = run(args.pdf, args.outdir, force=args.force)
    except Exception as exc:  # noqa: BLE001
        print(f"[extract] LOI: {exc}", file=sys.stderr)
        return 1
    print(f"[extract] Done: {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
