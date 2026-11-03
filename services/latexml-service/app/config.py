"""Runtime configuration (12-factor: everything overridable via environment)."""

import os

SERVICE_NAME = "latexml-service"
SERVICE_VERSION = "0.1.0"

# Engine: latexmlc with the ar5iv binding flags (what the latexml/ar5ivist image
# uses as its ENTRYPOINT — the same pipeline arXiv's HTML papers use).
ENGINE_CMD = os.environ.get("ENGINE_CMD", "latexmlc")
ENGINE_ARGS = os.environ.get(
    "ENGINE_ARGS",
    "--preload=ar5iv.sty "
    "--path=/opt/ar5iv-bindings/bindings "
    "--path=/opt/ar5iv-bindings/supported_originals "
    "--format=html5 --pmml --mathtex --timeout=2700 --noinvisibletimes "
    "--css=/css/arxiv-html-papers.css",
).split()
RENDER_TIMEOUT_S = int(os.environ.get("RENDER_TIMEOUT_S", "900"))

# Upload / download limits.
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "100"))

# Where rendered HTML workspaces live (mounted as a Docker volume).
RENDERS_DIR = os.environ.get("RENDERS_DIR", "./data/renders")

# arXiv requires a descriptive User-Agent for automated access.
ARXIV_USER_AGENT = os.environ.get(
    "ARXIV_USER_AGENT",
    "SkillTree-latexml-service/0.1.0 (educational platform; contact: admin@example.com)",
)
