"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/learner-model.db")
OPENCASE_BASE_URL = os.environ.get("OPENCASE_BASE_URL", "http://localhost:8101")
CLASS_BASE_URL = os.environ.get("CLASS_BASE_URL", "http://localhost:8103")
SERVICE_NAME = "learner-model-service"
SERVICE_VERSION = "0.1.0"

# Mastery / retention thresholds (documented contract, tuned via configs later)
# green=0.85 (NOT 0.7): one lucky win from 1500/RD350 already yields ~0.73 mastery,
# so 0.7 would call a single answer "mastered". 0.85 needs ~2 consistent wins.
MASTERY_GREEN = 0.85
MASTERY_AMBER = 0.4
RETENTION_RUSTY = 0.7
BASE_STABILITY_DAYS = 3.0
STABILITY_PER_REVIEW_DAYS = 7.0
