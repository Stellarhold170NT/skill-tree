"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/document.db")
UPLOAD_DIR = os.environ.get("DOCUMENT_UPLOAD_DIR", "./data/uploads")
MAX_UPLOAD_BYTES = int(os.environ.get("DOCUMENT_MAX_UPLOAD_BYTES", str(20 * 1024 * 1024)))
SERVICE_NAME = "document-service"
SERVICE_VERSION = "0.1.0"
