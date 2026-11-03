"""Runtime configuration (12-factor: everything overridable via environment)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/opencase.db")
CASE_BASE_URI = os.environ.get("CASE_BASE_URI", "http://localhost:8101/api/v1/case")
SERVICE_NAME = "opencase-service"
SERVICE_VERSION = "0.1.0"
