# Engine image: LaTeX -> HTML5 via LaTeXML, same pipeline as arXiv's HTML papers
# (the ar5ivist image bundles LaTeXML + TeX Live + ar5iv styles).
FROM latexml/ar5ivist:2512.17

USER root

# Thin FastAPI wrapper on top of the conversion engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/app
COPY requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

COPY app ./app
COPY static ./static

RUN useradd --create-home appuser \
    && mkdir -p /srv/app/data \
    && chown -R appuser:appuser /srv/app

USER appuser

EXPOSE 8103
# The base image sets ENTRYPOINT to latexmlc with ar5iv flags; reset it so CMD runs as-is.
ENTRYPOINT []
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8103"]
