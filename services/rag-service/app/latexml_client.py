"""latexml (M3) client: render LaTeX sources, then fetch the ar5iv HTML (design §3)."""

import httpx

from . import config


def latexml_available() -> bool:
    try:
        resp = httpx.get(f"{config.LATEXML_BASE_URL}/api/v1/health", timeout=5)
        return resp.status_code == 200
    except httpx.HTTPError:
        return False


def render(filename: str, payload: bytes) -> tuple[str, str]:
    """POST /api/v1/render → (renderId, htmlUrl). Timed as conversionMs by the caller.

    Raises RuntimeError with a machine-readable prefix; the ingest worker turns it
    into a failed job (PARSE_FAILED / LATEXML_UNAVAILABLE, design §3).
    """
    try:
        resp = httpx.post(
            f"{config.LATEXML_BASE_URL}/api/v1/render",
            files={"file": (filename, payload)},
            timeout=config.LATEXML_TIMEOUT_S,
        )
    except httpx.HTTPError as exc:
        raise RuntimeError(f"LATEXML_UNAVAILABLE: {exc.__class__.__name__}") from exc
    if resp.status_code != 200:
        raise RuntimeError(
            f"PARSE_FAILED: latexml render returned HTTP {resp.status_code}: {resp.text[:300]}"
        )
    body = resp.json()
    render_id, html_url = body["renderId"], body["htmlUrl"]
    if html_url.startswith("/"):
        html_url = f"{config.LATEXML_BASE_URL}{html_url}"
    return render_id, html_url


def fetch_html(html_url: str) -> str:
    """Fetch the rendered HTML body. Timed as parseMs by the caller."""
    try:
        resp = httpx.get(html_url, timeout=60, follow_redirects=True)
    except httpx.HTTPError as exc:
        raise RuntimeError(f"PARSE_FAILED: could not fetch rendered HTML: {exc}") from exc
    if resp.status_code != 200:
        raise RuntimeError(f"PARSE_FAILED: rendered HTML fetch returned HTTP {resp.status_code}")
    return resp.text
