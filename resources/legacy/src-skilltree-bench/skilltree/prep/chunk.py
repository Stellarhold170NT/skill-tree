"""Chunk Corpus SWEBOK v4 theo size token 512/1024/2048 (idempotent).

Sử dụng:
  /opt/venv/bin/python src/skilltree/prep/chunk.py                 # cả 3 size
  /opt/venv/bin/python src/skilltree/prep/chunk.py --size 1024     # 1 size

Đầu ra: corpora/swebok-v4/chunks_<size>.jsonl, mỗi dòng:
  {"chunk_id", "size_tokens", "n_tokens", "ka", "section", "text"}

- Token đếm bằng tiktoken cl100k_base (có sẵn trong venv).
- Chunk theo đơn vị đoạn văn, tách tại heading để giữ ngữ cảnh section.
- Mục đích: input cho Benchmark chunk-based (so sánh với Memory cognee).
  KHÔNG thay thế cơ chế chunking của cognee khi build Memory.
- Idempotent: output ghi đè tên cố định, deterministic (seed-free).
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
CORPUS_DIR = REPO_ROOT / "corpora" / "swebok-v4"
MD_NAME = "swebok-v4.md"
DEFAULT_SIZES = (512, 1024, 2048)
HEADING_RE = __import__("re").compile(r"^(#{1,6})\s+(.+?)\s*$")

try:
    import tiktoken

    _ENC = tiktoken.get_encoding("cl100k_base")

    def encode(text: str) -> list[int]:
        return _ENC.encode(text)

    def decode(tokens: list[int]) -> str:
        return _ENC.decode(tokens)

    TOKENIZER = "tiktoken/cl100k_base"
except Exception:  # noqa: BLE001  — fallback gần đúng
    def encode(text: str) -> list[int]:
        return text.split()

    def decode(tokens: list[int]) -> str:
        return " ".join(tokens)

    TOKENIZER = "whitespace-words (approx)"


@dataclass
class Unit:
    """Đơn vị nhỏ nhất khi đóng gói chunk: một heading hoặc một đoạn văn."""

    text: str
    section: str  # breadcrumb "H1 / H2 / H3"
    ka: str | None
    tokens: list[int]


def detect_ka(breadcrumb: str) -> str | None:
    """Nhận diện knowledge area từ breadcrumb (tên KA giữ nguyên tiếng Anh)."""
    parts = [p.strip() for p in breadcrumb.split(" / ")]
    # thứ tự dài trước để khớp "Software Engineering Models and Methods"
    # trước "Software Engineering" (prefix con)
    kas = [
        "Software Engineering Professional Practice",
        "Software Engineering Models and Methods",
        "Software Engineering Operations",
        "Software Engineering Management",
        "Software Engineering Economics",
        "Software Architecture",
        "Software Requirements",
        "Software Construction",
        "Software Testing",
        "Software Security",
        "Software Quality",
        "Software Design",
        "Computing Foundations",
        "Mathematical Foundations",
        "Engineering Foundations",
    ]
    for ka in kas:
        for p in parts:
            if ka.casefold() in p.casefold():
                return ka
    return None


def read_units(md_path: Path) -> list[Unit]:
    """Tách markdown thành units: heading mở breadcrumb mới, đoạn văn nối breadcrumb."""
    units: list[Unit] = []
    crumbs: dict[int, str] = {}
    buf: list[str] = []
    buf_section = ""
    buf_ka = None

    def flush_buf():
        nonlocal buf, buf_section, buf_ka
        text = "\n\n".join(s for s in buf if s.strip())
        if text.strip():
            units.append(Unit(text=text, section=buf_section, ka=buf_ka, tokens=encode(text)))
        buf = []

    with md_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            m = HEADING_RE.match(line)
            if m:
                flush_buf()
                level, title = len(m.group(1)), m.group(2).strip()
                crumbs[level] = title
                for k in [k for k in crumbs if k > level]:
                    crumbs.pop(k)
                buf_section = " / ".join(crumbs[k] for k in sorted(crumbs))
                buf_ka = detect_ka(buf_section)
                units.append(Unit(text=title, section=buf_section, ka=buf_ka, tokens=encode(title)))
                buf = []
                buf_section = buf_section
                buf_ka = buf_ka
            else:
                if line.strip() == "":
                    if buf:
                        flush_buf()
                else:
                    buf.append(line)
        flush_buf()
    return units


def pack_chunks(units: list[Unit], size: int, overlap: int) -> list[dict]:
    """Đóng gói units thành chunks ~size token, overlap token giữa 2 chunk liền kề."""
    chunks: list[dict] = []
    buffer: list[int] = []
    buffer_meta: list[tuple[str, str | None]] = []  # (section, ka) mỗi unit

    def flush():
        nonlocal buffer, buffer_meta
        if not buffer:
            return
        text = decode(buffer)
        chunks.append(
            {
                "chunk_id": f"swebok-v4-{size}-{len(chunks) + 1:05d}",
                "size_tokens": size,
                "n_tokens": len(buffer),
                "ka": buffer_meta[len(buffer_meta) // 2][1],
                "section": buffer_meta[0][0],
                "text": text,
            }
        )
        tail = buffer[-overlap:] if overlap > 0 else []
        tail_meta = [(buffer_meta[-1][0], buffer_meta[-1][1])] if tail else []
        buffer = list(tail)
        buffer_meta = list(tail_meta)

    for u in units:
        toks = u.tokens
        # unit dài hơn budget: cắt thành các window token
        if len(toks) > size:
            step = max(1, size - overlap)
            for i in range(0, len(toks), step):
                window = toks[i : i + size]
                if buffer and len(buffer) + len(window) > size:
                    flush()
                buffer.extend(window)
                buffer_meta.append((u.section, u.ka))
                if len(buffer) >= size:
                    flush()
            continue
        if buffer and len(buffer) + len(toks) > size:
            flush()
        buffer.extend(toks)
        buffer_meta.append((u.section, u.ka))
        if len(buffer) >= size:
            flush()
    flush()
    return chunks


def write_size(md_path: Path, size: int, overlap: int) -> dict:
    units = read_units(md_path)
    chunks = pack_chunks(units, size, overlap)
    out = CORPUS_DIR / f"chunks_{size}.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    toks = [c["n_tokens"] for c in chunks]
    stats = {
        "size": size,
        "overlap": overlap,
        "file": str(out.relative_to(REPO_ROOT)),
        "chunks": len(chunks),
        "total_tokens": sum(toks),
        "min": min(toks) if toks else 0,
        "avg": round(sum(toks) / len(toks), 1) if toks else 0,
        "max": max(toks) if toks else 0,
    }
    print(f"[chunk] {stats}", flush=True)
    return stats


def main() -> int:
    ap = argparse.ArgumentParser(description="Chunk SWEBOK v4 theo size token (idempotent)")
    ap.add_argument("--size", type=int, action="append", default=None,
                    help="chunk size token (lặp được); mặc định 512 1024 2048")
    ap.add_argument("--overlap", type=int, default=None,
                    help="overlap token giữa 2 chunk (mặc định size//8)")
    ap.add_argument("--md", type=Path, default=CORPUS_DIR / MD_NAME)
    args = ap.parse_args()

    if not args.md.exists():
        print(f"[chunk] LOI: khong thay {args.md} — chay extract.py truoc", file=sys.stderr)
        return 1
    sizes = args.size or list(DEFAULT_SIZES)
    print(f"[chunk] tokenizer: {TOKENIZER}")
    for size in sizes:
        if size < 64:
            print(f"[chunk] bo qua size qua nho: {size}", file=sys.stderr)
            continue
        write_size(args.md, size, overlap=(args.overlap if args.overlap is not None else size // 8))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
