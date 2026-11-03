FROM python:3.11-slim

WORKDIR /srv/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --create-home appuser \
    && mkdir -p /srv/app/data \
    && chown -R appuser:appuser /srv/app
COPY --chown=appuser:appuser app ./app

USER appuser

EXPOSE 8109
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8109"]
