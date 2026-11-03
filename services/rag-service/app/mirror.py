"""Best-effort mirror of docs + chunks into document-service (M9) — design §3.

Mirror failure never fails ingest: the error string is recorded in the job's
stageMs JSON (`mirrorError`) and the local index remains the serving path.
"""

import httpx

from . import config


def mirror_document(
    title: str, document_uri: str | None, chunks: list[str]
) -> tuple[str | None, str | None]:
    """Create the canonical document + chunk records. Returns (docServiceId, error)."""
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{config.DOCUMENT_BASE_URL}/api/v1/documents",
                json={"title": title, "documentUri": document_uri},
            )
            if resp.status_code != 201:
                return None, f"document-service create returned HTTP {resp.status_code}"
            doc_id = resp.json()["id"]
            if chunks:
                chunk_resp = client.post(
                    f"{config.DOCUMENT_BASE_URL}/api/v1/documents/{doc_id}/chunks",
                    json={"chunks": [{"text": text} for text in chunks]},
                )
                if chunk_resp.status_code != 201:
                    return doc_id, f"chunk mirror returned HTTP {chunk_resp.status_code}"
            return doc_id, None
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
        return None, f"{exc.__class__.__name__}: {exc}"
