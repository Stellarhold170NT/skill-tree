"""Runtime configuration (12-factor: everything overridable via environment)."""

import os

SERVICE_NAME = "rag-service"
SERVICE_VERSION = "0.1.0"
SERVICE_PORT = int(os.environ.get("RAG_PORT", "8109"))

DB_PATH = os.environ.get("RAG_DB_PATH", "./data/rag.db")
UPLOAD_DIR = os.environ.get("RAG_UPLOAD_DIR", "./data/uploads")

MAX_UPLOAD_MB = int(os.environ.get("RAG_MAX_UPLOAD_MB", "20"))
MAX_SECTION_CHARS = int(os.environ.get("RAG_MAX_SECTION_CHARS", "8000"))
MIN_SECTION_CHARS = int(os.environ.get("RAG_MIN_SECTION_CHARS", "200"))
DEFAULT_TOPK = int(os.environ.get("RAG_TOPK", "5"))
PATH_BOOST = float(os.environ.get("RAG_PATH_BOOST", "0.5"))

LATEXML_BASE_URL = os.environ.get("LATEXML_BASE_URL", "http://localhost:8110").rstrip("/")
LATEXML_TIMEOUT_S = float(os.environ.get("LATEXML_TIMEOUT_S", "900"))

DOCUMENT_BASE_URL = os.environ.get("DOCUMENT_BASE_URL", "http://localhost:8107").rstrip("/")

LLM_ENDPOINT = os.environ.get("LLM_ENDPOINT", "").rstrip("/")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "")
LLM_TIMEOUT_S = float(os.environ.get("RAG_LLM_TIMEOUT_S", "30"))

SNIPPET_CHARS = 320
METRICS_WINDOW = 1000

SUPPORTED_SUFFIXES = (".tex", ".tar.gz", ".tgz", ".zip", ".md", ".txt", ".html", ".htm")
LATEXML_SUFFIXES = (".tex", ".tar.gz", ".tgz", ".zip")


def kind_for(filename: str) -> str | None:
    """Map an upload filename to its parse kind (design §5 input policy)."""
    name = (filename or "").lower()
    if name.endswith(LATEXML_SUFFIXES):
        return "latexml"
    if name.endswith(".md"):
        return "markdown"
    if name.endswith(".txt"):
        return "text"
    if name.endswith((".html", ".htm")):
        return "html"
    return None
