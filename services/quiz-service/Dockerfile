FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr and writing bytecode
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL="sqlite:////srv/app/data/quiz.db"

WORKDIR /srv/app

# Leverage Docker cache for dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user and persistent SQLite data directory with correct permissions
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /srv/app/data \
    && chown -R appuser:appuser /srv/app

# Copy application source code with non-root ownership
COPY --chown=appuser:appuser app ./app

# Declare data volume for SQLite persistence
VOLUME ["/srv/app/data"]

USER appuser

EXPOSE 8102

# Health check using Python standard library
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8102/api/v1/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8102"]
