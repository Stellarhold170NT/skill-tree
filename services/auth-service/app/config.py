"""Runtime configuration (12-factor)."""

import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/auth.db")
AUTH_SECRET = os.environ.get("AUTH_SECRET", "dev-secret-change-me")
AUTH_TOKEN_TTL = int(os.environ.get("AUTH_TOKEN_TTL", "3600"))  # seconds
# Registering non-student roles requires this shared token (teacher/admin bootstrap);
# empty in dev = the FIRST registered user becomes admin, everyone else student.
ADMIN_REGISTRATION_TOKEN = os.environ.get("ADMIN_REGISTRATION_TOKEN", "")
ROLES = ("student", "teacher", "admin")
SERVICE_NAME = "auth-service"
SERVICE_VERSION = "0.1.0"
