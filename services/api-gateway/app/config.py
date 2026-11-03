"""Runtime configuration (12-factor)."""

import os

SERVICE_NAME = "api-gateway"
SERVICE_VERSION = "0.1.0"

# {gateway_prefix: (env var for base URL, default)}
UPSTREAMS = {
    "case": ("CASE_BASE_URL", "http://localhost:8101"),
    "quiz": ("QUIZ_BASE_URL", "http://localhost:8102"),
    "class": ("CLASS_BASE_URL", "http://localhost:8103"),
    "events": ("ANALYTICS_BASE_URL", "http://localhost:8104"),
    "learner": ("LEARNER_BASE_URL", "http://localhost:8105"),
    "assignments": ("ASSIGNMENT_BASE_URL", "http://localhost:8106"),
    "documents": ("DOCUMENT_BASE_URL", "http://localhost:8107"),
    "auth": ("AUTH_BASE_URL", "http://localhost:8108"),
    "rag": ("RAG_BASE_URL", "http://localhost:8109"),
}


def upstream_base_url(prefix: str) -> str:
    env_var, default = UPSTREAMS[prefix]
    return os.environ.get(env_var, default)


# Optional bearer token: when set, every proxied request must carry
# `Authorization: Bearer <token>` (replaced by M11 JWT auth later).
AUTH_TOKEN = os.environ.get("GATEWAY_AUTH_TOKEN")

# In-memory rate limiting (dev-grade; Redis-backed bucket in production).
RATE_LIMIT_PER_MINUTE = int(os.environ.get("GATEWAY_RATE_LIMIT", "120"))

TIMEOUT_SECONDS = float(os.environ.get("GATEWAY_TIMEOUT_S", "10"))
