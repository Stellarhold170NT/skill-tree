"""presets — nạp & resolve preset YAML|JSON cho một Run ingest (Task 3).

Preset là cấu hình duy nhất của một Run (GLOSSARY.md: Run = 1 lần chạy
benchmark config). Task 6 (tinh chỉnh) chỉ đổi preset, không sửa code.

Các khoá preset (mặc định trong DEFAULTS):
- reset             : bool  — prune_data + prune_system(metadata=True) trước build
- dataset           : str   — tên Dataset cognee (partition), mặc định "swebok_v4"
- chunk_size        : int|None — None = cognee tự resolve
                      (min(embedding_max_tokens, llm_max//2) — với fastembed
                       MiniLM multilingual là 126 tokens, KHÔNG phải 1500)
- chunks_per_batch  : int|None — số chunk xử lý đồng thời mỗi wave của cognify
- custom_prompt     : str|None — prompt hướng dẫn trích xuất entity của cognify
- graph_model       : str|None — tên class BaseModel (mặc định KnowledgeGraph);
                      hỗ trợ "Class", "module.Class" hoặc "module:Class"
- extractor         : "llm" | "gliner" (mặc định "llm")
- files             : list glob (tương đối repo root) trỏ vào Corpus
- subsets           : list tên Knowledge Area (theo metadata.json) — chỉ dùng
                      content các trang của KA đó (test nhanh), ghi ra file
                      subset trong runs/<run_id>/corpus/
- llm_api_keys_env  : list TÊN biến môi trường chứa API key gateway; khi có
                      >=2 key, build_memory monkeypatch litellm.acompletion
                      để xoay vòng api_key từng call (spread load, tránh 429).
                      Giá trị key KHÔNG bao giờ được ghi vào preset/config.
- incremental_loading, chunk_attachment : pass-through cho cognify()
- search_type / search_query           : truy vấn kiểm chứng sau build
- run_id            : id Run (có thể bị CLI --run-id ghi đè)

Sử dụng:
    from skilltree.ingest.presets import load_preset, resolve_files
    preset = load_preset("smoke")            # configs/presets/smoke.yaml
    files  = resolve_files(preset, out_dir)  # resolve glob + subsets
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import yaml

REPO_ROOT = Path(__file__).resolve().parents[3]
PRESET_DIR = REPO_ROOT / "configs" / "presets"
CORPUS_DIR = REPO_ROOT / "corpora" / "swebok-v4"

#: Mặc định bám theo giá trị mặc định của cognee 1.6.4.
DEFAULTS: dict[str, Any] = {
    "reset": True,
    "dataset": "swebok_v4",
    "chunk_size": None,          # None -> cognee tự resolve (126 với MiniLM)
    "chunks_per_batch": None,    # None -> cognee tự chọn (2000)
    "custom_prompt": None,
    "graph_model": None,         # None -> KnowledgeGraph mặc định của cognee
    "extractor": "llm",
    "files": ["corpora/swebok-v4/swebok-v4.md"],
    "subsets": None,
    "llm_api_keys_env": ["LLM_API_KEY"],
    "incremental_loading": True,
    "chunk_attachment": None,    # None -> cognee tự chọn ("direct")
    "search_type": "GRAPH_COMPLETION",
    "search_query": "Software requirements là gì?",
    "run_id": None,
}

PAGE_MARKER_RE = re.compile(r"(?m)^=== \[p\. (\d+)\] ===\s*$")


def load_preset(name_or_path: str | Path) -> dict[str, Any]:
    """Nạp preset từ configs/presets/<name>.yaml|.yml|.json hoặc đường dẫn tường minh."""
    p = Path(name_or_path)
    if not p.suffix:  # chỉ tên preset
        for ext in (".yaml", ".yml", ".json"):
            cand = PRESET_DIR / f"{p.name}{ext}"
            if cand.exists():
                p = cand
                break
        else:
            raise FileNotFoundError(
                f"Không tìm thấy preset '{name_or_path}' trong {PRESET_DIR}"
            )
    if not p.is_absolute():
        p = REPO_ROOT / p
    if not p.exists():
        raise FileNotFoundError(f"Không tìm thấy file preset: {p}")

    text = p.read_text(encoding="utf-8")
    if p.suffix == ".json":
        raw = json.loads(text)
    else:
        raw = yaml.safe_load(text) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"Preset {p} phải là mapping YAML/JSON, nhận được {type(raw)}")

    preset = dict(DEFAULTS)
    preset.update(raw)
    preset["name"] = p.stem
    preset["path"] = str(p)
    unknown = set(raw) - set(DEFAULTS) - {"name", "path"}
    if unknown:
        raise ValueError(
            f"Preset {p} chứa khoá lạ (không map được vào cognify): {sorted(unknown)}"
        )
    return preset


def _slice_pages(text: str, page_start: int, page_end: int) -> str:
    """Trích text các trang [page_start..page_end] theo marker `=== [p. N] ===`."""
    marks = [(int(m.group(1)), m.start(), m.end()) for m in PAGE_MARKER_RE.finditer(text)]
    picked: list[str] = []
    for i, (page, start, end) in enumerate(marks):
        if page_start <= page <= page_end:
            body_end = marks[i + 1][1] if i + 1 < len(marks) else len(text)
            picked.append(text[start:body_end].rstrip() + "\n")
    if not picked:
        raise ValueError(
            f"Không tìm thấy trang {page_start}..{page_end} trong corpus "
            f"(marker `=== [p. N] ===`)"
        )
    return "".join(picked)


def expand_subsets(preset: dict[str, Any], out_dir: Path) -> list[Path]:
    """Lọc Corpus theo `subsets` (tên Knowledge Area) và ghi file subset ra out_dir.

    Phục vụ test nhanh: chỉ ingest đúng các trang của KA, giữ nguyên marker
    trang để truy vết nguồn về PDF gốc.
    """
    out_dir = Path(out_dir)
    meta = json.loads((CORPUS_DIR / "metadata.json").read_text(encoding="utf-8"))
    k_by_name = {ka["name"].strip().lower(): ka for ka in meta.get("knowledge_areas", [])}
    k_by_chapter = {
        str(ka.get("chapter", "")).strip(): ka for ka in meta.get("knowledge_areas", [])
    }

    corpus_files = resolve_files({"files": preset.get("files"), "subsets": None})
    if len(corpus_files) != 1:
        raise ValueError("subsets hiện chỉ hỗ trợ khi `files` gộp về đúng 1 file corpus")
    text = corpus_files[0].read_text(encoding="utf-8")

    out_dir.mkdir(parents=True, exist_ok=True)
    pages_out: list[int] = []
    chunks: list[str] = []
    for entry in preset.get("subsets") or []:
        key = str(entry).strip().lower()
        ka = k_by_name.get(key) or k_by_chapter.get(str(entry).strip())
        if ka is None:
            raise ValueError(
                f"Subset '{entry}' không có trong metadata.json knowledge_areas; "
                f"các KA hợp lệ: {sorted(k_by_name)}"
            )
        lo, hi = int(ka["page_start"]), int(ka["page_end"])
        chunks.append(
            f"<!-- subset: {ka['name']} (chapter {ka.get('chapter')}, pages {lo}-{hi}) -->\n"
            + _slice_pages(text, lo, hi)
        )
        pages_out.extend(range(lo, hi + 1))

    out_name = "_".join(re.sub(r"[^A-Za-z0-9]+", "-", str(s)) for s in preset["subsets"])
    out_path = out_dir / f"subset_{out_name}_p{min(pages_out)}-{max(pages_out)}.md"
    out_path.write_text("".join(chunks), encoding="utf-8")
    return [out_path]


def resolve_files(preset: dict[str, Any], out_dir: Path | None = None) -> list[Path]:
    """Resolve `files` (glob tương đối repo root) + `subsets` (nếu có) thành list file.

    - Không có subsets: glob trực tiếp (file hoặc pattern).
    - Có subsets  : trích các trang của KA từ file corpus đầu tiên, ghi file
      subset vào out_dir (thường là runs/<run_id>/corpus/) và trả về file đó.
    """
    if preset.get("subsets"):
        if out_dir is None:
            raise ValueError(
                "preset có `subsets` nhưng chưa truyền out_dir để ghi file subset"
            )
        return expand_subsets(preset, Path(out_dir))

    patterns = preset.get("files") or DEFAULTS["files"]
    files: list[Path] = []
    for pat in patterns:
        p = Path(pat)
        target = p if p.is_absolute() else REPO_ROOT / p
        if target.is_file():
            files.append(target)
        elif "*" in target.name:
            matches = sorted(target.parent.glob(target.name))
            if not matches:
                raise FileNotFoundError(f"glob corpus không khớp file nào: {pat}")
            files.extend(matches)
        else:
            raise FileNotFoundError(f"File/glob corpus không tồn tại: {pat}")
    if not files:
        raise FileNotFoundError("Preset không trỏ tới file corpus nào")
    return files


def summarize_files(files: list[Path]) -> dict[str, Any]:
    """Thống kê nhanh các file sẽ add (số file, ký tự, số trang theo marker)."""
    n_chars = 0
    n_pages = 0
    for f in files:
        text = Path(f).read_text(encoding="utf-8")
        n_chars += len(text)
        n_pages += len(PAGE_MARKER_RE.findall(text))
    return {
        "files": [str(f) for f in files],
        "n_files": len(files),
        "n_chars": n_chars,
        "n_page_markers": n_pages,
    }


def public_preset(preset: dict[str, Any]) -> dict[str, Any]:
    """Bản preset an toàn để ghi resolved_config (chỉ tên env var, không giá trị key)."""
    return {k: v for k, v in preset.items() if k not in {"path"}}
