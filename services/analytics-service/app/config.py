"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/analytics.db")
SERVICE_NAME = "analytics-service"
SERVICE_VERSION = "0.1.0"
