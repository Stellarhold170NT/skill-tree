"""Unpack uploaded LaTeX sources (tar.gz / zip / single .tex) safely."""

import gzip
import io
import tarfile
import zipfile
from pathlib import Path, PurePosixPath

from .errors import ApiError

MAX_ENTRIES = 5000


def extract(data: bytes, filename: str, dest: Path) -> Path:
    """Extract archive bytes into ``dest``; returns the source directory.

    Accepts the shapes arXiv's ``/e-print`` endpoint produces:
    - a tar (optionally gz/xz/bz2 compressed) with the full document tree,
    - a gzip of a single ``.tex`` file (single-file submissions),
    - a plain ``.tex`` upload.
    """
    dest.mkdir(parents=True, exist_ok=True)
    if filename.lower().endswith(".tex"):
        _write_single_tex(data, dest, Path(filename).name)
        return dest
    if data[:2] == b"PK":
        _extract_zip(data, dest)
        return dest
    try:
        _extract_tar(data, dest)
        return dest
    except tarfile.ReadError:
        pass
    try:
        tex = gzip.decompress(data)
    except (OSError, EOFError):
        raise ApiError(422, "UNSUPPORTED_ARCHIVE",
                       "Upload must be a .tex file, tar.gz, or zip archive",
                       {"filename": filename})
    if b"\\documentclass" not in tex and b"\\begin{document}" not in tex:
        raise ApiError(422, "UNSUPPORTED_ARCHIVE",
                       "Gzip payload is not a LaTeX document",
                       {"filename": filename})
    _write_single_tex(tex, dest, "main.tex")
    return dest


def find_main_tex(src: Path) -> str | None:
    """Pick the top-level ``\\documentclass`` file, shallowest path wins."""
    candidates: list[tuple[int, int, str]] = []
    for tex in src.rglob("*.tex"):
        try:
            head = tex.read_bytes()[:65536]
        except OSError:
            continue
        if b"\\documentclass" in head:
            rel = tex.relative_to(src).as_posix()
            candidates.append((rel.count("/"), len(rel), rel))
    if not candidates:
        return None
    return min(candidates)[2]


def _write_single_tex(data: bytes, dest: Path, name: str) -> None:
    (dest / name).write_bytes(data)


def _extract_tar(data: bytes, dest: Path) -> None:
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tar:
        members = tar.getmembers()
        if len(members) > MAX_ENTRIES:
            raise ApiError(422, "ARCHIVE_TOO_LARGE",
                           f"Archive has more than {MAX_ENTRIES} entries")
        for member in members:
            if not _safe_name(member.name):
                continue
            if member.isfile() or member.isdir():
                tar.extract(member, dest, filter="data")


def _extract_zip(data: bytes, dest: Path) -> None:
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        names = zf.namelist()
        if len(names) > MAX_ENTRIES:
            raise ApiError(422, "ARCHIVE_TOO_LARGE",
                           f"Archive has more than {MAX_ENTRIES} entries")
        for name in names:
            if not _safe_name(name):
                continue
            info = zf.getinfo(name)
            if not info.is_dir():
                target = dest / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(zf.read(info))


def _safe_name(name: str) -> bool:
    parts = PurePosixPath(name).parts
    if not parts or name.startswith(("/", "\\")) or ":" in name:
        return False
    return ".." not in parts and not any(p.startswith("__MACOSX") for p in parts)
