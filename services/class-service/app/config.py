"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/class.db")
SERVICE_NAME = "class-service"
SERVICE_VERSION = "0.1.0"
