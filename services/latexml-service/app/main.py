"""App factory. Run: uvicorn app.main:app --host 0.0.0.0 --port 8103"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .routes import register_exception_handlers, router


def create_app() -> FastAPI:
    app = FastAPI(title="LaTeXML Render Service", version=config.SERVICE_VERSION)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    register_exception_handlers(app)

    # Rendered workspaces (HTML + generated figures + conversion log).
    renders = Path(config.RENDERS_DIR)
    renders.mkdir(parents=True, exist_ok=True)
    app.mount("/renders", StaticFiles(directory=renders, html=True), name="renders")

    # Vendored arXiv CSS, served same-origin (no CDN dependency).
    css_dir = Path(__file__).resolve().parent.parent / "static" / "css"
    app.mount("/css", StaticFiles(directory=css_dir), name="css")
    return app


app = create_app()
