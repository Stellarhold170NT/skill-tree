"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/assignment.db")
LEARNER_BASE_URL = os.environ.get("LEARNER_BASE_URL", "http://localhost:8105")
QUIZ_BASE_URL = os.environ.get("QUIZ_BASE_URL", "http://localhost:8102")
SERVICE_NAME = "assignment-service"
SERVICE_VERSION = "0.1.0"
