"""Runtime configuration (12-factor: everything overridable via environment)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/quiz.db")
SERVICE_NAME = "quiz-service"
SERVICE_VERSION = "0.1.0"
