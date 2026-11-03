"""Structure-aware chunking (STAIR adaptation — design §5).

One entry point: ``build(text, kind)`` returns the ToC tree as a list of
SectionNode (document order). Every surviving section carries
``parts = [(partIndex, text)]``; long sections split on paragraph boundaries,
tiny sections merge into their parent, non-content blocks are dropped.
"""

import re
from dataclasses import dataclass, field

from . import config


class EmptyDocument(Exception):
    """Parser produced zero sections (design §7 EMPTY_DOCUMENT)."""


@dataclass
class SectionNode:
    level: int
    title: str
    path: str
    order_idx: int
    parent: "SectionNode | None" = None
    body: str = ""
    parts: list = field(default_factory=list)


_DROP_CLASSES = {"ltx_bibliography", "ltx_appendix"}
_LTX_SECTION_RE = re.compile(
    r"\bltx_(part|chapter|section|subsection|subsubsection|paragraph|abstract)\b"
)
_LEVEL_BY_NAME = {
    "part": 1,
    "chapter": 2,
    "section": 3,
    "abstract": 3,
    "subsection": 4,
    "subsubsection": 5,
    "paragraph": 6,
}
_TITLE_CLASS_RE = re.compile(r"\bltx_title_(\w+)")
_LTX_TITLE_ATTR_RE = re.compile(r"\bltx_title\b")
_HEADER_NAME_RE = re.compile(r"^h([1-6])$")
_BLOCK_TAGS = ["p", "li", "blockquote", "figcaption", "dt", "dd", "pre"]
_MD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$")
_WS_RE = re.compile(r"\s+")


def _clean(text: str) -> str:
    return _WS_RE.sub(" ", text or "").strip()


# ---------------------------------------------------------------------------
# entry point
# ---------------------------------------------------------------------------


def build(text: str, kind: str) -> list[SectionNode]:
    if kind == "markdown":
        nodes = _markdown_sections(text)
    elif kind == "html":
        nodes = _html_sections(text)
    else:  # plain text
        body = text.strip()
        nodes = (
            [SectionNode(level=1, title="Document", path="Document", order_idx=0, body=body)]
            if body
            else []
        )
    _merge_small(nodes)
    nodes = [n for n in nodes if n.body != "__dropped__"]
    _renumber(nodes)
    _attach_parts(nodes)
    if not nodes or not any(n.parts for n in nodes):
        raise EmptyDocument("parser produced zero sections")
    return nodes


def _renumber(nodes: list[SectionNode]) -> None:
    for i, node in enumerate(nodes):
        node.order_idx = i


def _merge_small(nodes: list[SectionNode]) -> None:
    """Sections shorter than MIN chars merge into their parent (design §5 rule 4).

    Reversed order so descendants merge before their parents do.
    """
    for node in reversed(nodes):
        if node.body == "__dropped__":
            continue
        if len(node.body) < config.MIN_SECTION_CHARS and node.parent is not None:
            if node.body:
                parent = node.parent
                parent.body = f"{parent.body}\n\n{node.body}" if parent.body else node.body
            node.body = "__dropped__"


def _attach_parts(nodes: list[SectionNode]) -> None:
    for node in nodes:
        if node.body == "__dropped__":
            continue
        node.parts = [
            (i, part) for i, part in enumerate(_split_parts(node.body, config.MAX_SECTION_CHARS))
        ]


def _split_parts(body: str, max_chars: int) -> list[str]:
    """Split on paragraph boundaries; never cross a section (design §5 rule 3)."""
    body = body.strip()
    if len(body) <= max_chars:
        return [body] if body else []
    paras = [p.strip() for p in body.split("\n\n") if p.strip()]
    if len(paras) <= 1:
        return [body]  # single giant paragraph: cannot split on paragraphs in V1
    parts: list[str] = []
    buf = ""
    for para in paras:
        if buf and len(buf) + len(para) + 2 > max_chars:
            parts.append(buf)
            buf = para
        else:
            buf = f"{buf}\n\n{para}" if buf else para
    if buf:
        parts.append(buf)
    return parts


# ---------------------------------------------------------------------------
# Markdown (ATX headings)
# ---------------------------------------------------------------------------


def _markdown_sections(text: str) -> list[SectionNode]:
    out: list[SectionNode] = []
    stack: list[SectionNode] = []
    buf: list[str] = []

    def close_current() -> None:
        if not out:
            buf.clear()  # preamble before the first heading is dropped
            return
        body = "\n".join(buf).strip()
        buf.clear()
        if body:
            out[-1].body = body

    for line in text.splitlines():
        match = _MD_HEADING_RE.match(line)
        if match:
            close_current()
            level = len(match.group(1))
            title = _clean(match.group(2))
            while stack and stack[-1].level >= level:
                stack.pop()
            parent = stack[-1] if stack else None
            path = " > ".join([*(n.title for n in stack), title])
            out.append(
                SectionNode(
                    level=level,
                    title=title,
                    path=path,
                    order_idx=len(out),
                    parent=parent,
                )
            )
            stack.append(out[-1])
        else:
            buf.append(line)
    close_current()
    return out


# ---------------------------------------------------------------------------
# HTML: latexml ltx_* classes with h1..h6 fallback
# ---------------------------------------------------------------------------


def _classes(el) -> list[str]:
    return el.get("class") or []


def _is_dropped(el) -> bool:
    return bool(_DROP_CLASSES & set(_classes(el)))


def _ltx_level(el) -> int | None:
    match = _LTX_SECTION_RE.search(" ".join(_classes(el)))
    return _LEVEL_BY_NAME.get(match.group(1)) if match else None


def _title_of(el, fallback_idx: int) -> str:
    title_el = el.find(class_=_TITLE_CLASS_RE)
    if title_el is None:
        for level in range(1, 7):
            title_el = el.find(f"h{level}")
            if title_el is not None:
                break
    title = _clean(title_el.get_text(" ", strip=True)) if title_el is not None else ""
    return title or f"Section {fallback_idx + 1}"


def _element_text(el) -> str:
    """Text of one non-section element; ltx_para divs become paragraphs."""
    paras = el.find_all("div", class_=re.compile(r"\bltx_para\b"))
    if paras:
        texts = [_clean(p.get_text(" ", strip=True)) for p in paras]
        return "\n\n".join(t for t in texts if t)
    blocks = el.find_all(_BLOCK_TAGS)
    if blocks:
        parts = []
        for block in blocks:
            if block.find(_BLOCK_TAGS):
                continue  # handled when walking its children
            text = _clean(block.get_text(" ", strip=True))
            if text:
                parts.append(text)
        if parts:
            return "\n\n".join(parts)
    return _clean(el.get_text(" ", strip=True))


def _html_sections(html: str) -> list[SectionNode]:
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for bad in soup.find_all(["script", "style"]):
        bad.decompose()
    root = soup.body or soup
    out: list[SectionNode] = []
    if root.find(class_=_LTX_SECTION_RE) is not None:
        _walk_ltx(root, [], out, None)
    else:
        _walk_headers(root, out, [])
    if not out:
        body = _clean(root.get_text(" ", strip=True))
        if body:
            out = [SectionNode(level=1, title="Document", path="Document", order_idx=0, body=body)]
    return out


def _walk_ltx(el, stack_titles: list[str], out: list, parent: SectionNode | None) -> None:
    for child in el.children:
        if getattr(child, "name", None) is None:
            continue
        if _is_dropped(child) or _LTX_TITLE_ATTR_RE.search(" ".join(_classes(child))):
            continue
        level = _ltx_level(child)
        if level is not None:
            title = _title_of(child, len(out))
            path = " > ".join([*stack_titles, title])
            node = SectionNode(
                level=level, title=title, path=path, order_idx=len(out), parent=parent
            )
            out.append(node)
            _walk_ltx(child, [*stack_titles, title], out, node)
            continue
        if child.find(class_=_LTX_SECTION_RE):
            _walk_ltx(child, stack_titles, out, parent)
            continue
        text = _element_text(child)
        if text and parent is not None:
            parent.body = f"{parent.body}\n\n{text}" if parent.body else text


def _walk_headers(el, out: list, node_stack: list[SectionNode]) -> None:
    for child in el.children:
        if getattr(child, "name", None) is None:
            continue
        match = _HEADER_NAME_RE.match(child.name or "")
        if match:
            level = int(match.group(1))
            while node_stack and node_stack[-1].level >= level:
                node_stack.pop()
            title = _clean(child.get_text(" ", strip=True)) or f"Section {len(out) + 1}"
            parent = node_stack[-1] if node_stack else None
            path = " > ".join([*(n.title for n in node_stack), title])
            node = SectionNode(
                level=level, title=title, path=path, order_idx=len(out), parent=parent
            )
            out.append(node)
            node_stack.append(node)
            continue
        if child.find(_HEADER_NAME_RE):
            _walk_headers(child, out, node_stack)
            continue
        text = _element_text(child)
        if text and node_stack:
            owner = node_stack[-1]
            owner.body = f"{owner.body}\n\n{text}" if owner.body else text
