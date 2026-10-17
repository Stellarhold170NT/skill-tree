"""Tải PDF SWEBOK v4 vào Corpus corpora/swebok-v4/ (idempotent).

Sử dụng: /opt/venv/bin/python src/skilltree/prep/download.py [--force]

- Nếu PDF đã tồn tại hợp lệ (magic bytes %PDF- và size >= 5MB) -> bỏ qua.
- Ghi qua file tạm .part rồi đổi tên, tránh để lại PDF hỏng giữa chừng.
"""

from __future__ import annotations

import argparse
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]

# Corpus SWEBOK v4 (Use Case #1 — SkillTree)
PDF_URL = (
    "https://raw.githubusercontent.com/olili27/software-development-books/"
    "master/swebok-v4.pdf"
)
MIN_PDF_BYTES = 5 * 1024 * 1024  # SWEBOK v4 ~ 5MB+


def pdf_path() -> Path:
    return REPO_ROOT / "corpora" / "swebok-v4" / "swebok-v4.pdf"


def is_valid_pdf(path: Path) -> bool:
    """Kiểm tra magic bytes + size tối thiểu."""
    if not path.exists():
        return False
    if path.stat().st_size < MIN_PDF_BYTES:
        return False
    with path.open("rb") as f:
        return f.read(5) == b"%PDF-"


def download(url: str = PDF_URL, dest: Path | None = None, force: bool = False) -> Path:
    dest = dest or pdf_path()
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not force and is_valid_pdf(dest):
        size_mb = dest.stat().st_size / 1e6
        print(f"[download] PDF hop le da ton tai, bo qua: {dest} ({size_mb:.1f} MB)")
        return dest

    print(f"[download] Dang tai {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "skilltree-prep/1.0"})
    tmp = dest.with_name(dest.stem + ".part")
    total = 0
    with urllib.request.urlopen(req, timeout=180) as resp, tmp.open("wb") as out:
        while True:
            block = resp.read(1 << 20)
            if not block:
                break
            out.write(block)
            total += len(block)

    with tmp.open("rb") as f:
        magic = f.read(5)
    if total < MIN_PDF_BYTES or magic != b"%PDF-":
        tmp.unlink(missing_ok=True)
        raise RuntimeError(
            f"PDF tai ve khong hop le: {total} bytes, magic={magic!r}"
        )
    tmp.replace(dest)
    print(f"[download] OK: {dest} ({total / 1e6:.1f} MB)")
    return dest


def main() -> int:
    ap = argparse.ArgumentParser(description="Tai PDF SWEBOK v4 vao Corpus (idempotent)")
    ap.add_argument("--url", default=PDF_URL)
    ap.add_argument("--dest", type=Path, default=None)
    ap.add_argument("--force", action="store_true", help="Tai lai du PDF da ton tai")
    args = ap.parse_args()
    try:
        dest = download(args.url, dest=args.dest, force=args.force)
    except Exception as exc:  # noqa: BLE001
        print(f"[download] LOI: {exc}", file=sys.stderr)
        return 1
    print(f"[download] Done: {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
