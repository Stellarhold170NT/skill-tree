"""App factory. Run: uvicorn app.main:app --host 0.0.0.0 --port 8000"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import config
from .routes import error, forward, health, route_table


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.upstream_client = httpx.AsyncClient(follow_redirects=False)
    yield
    await app.state.upstream_client.aclose()


def _http_error_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = {"error": detail}
    else:
        payload = {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}
    return JSONResponse(status_code=exc.status_code, content=payload)


def _validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Request validation failed",
                           "details": {"errors": exc.errors()[:10]}}},
    )


def create_app() -> FastAPI:
    app = FastAPI(title="API Gateway", version=config.SERVICE_VERSION, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_api_route("/health", health, methods=["GET"])
    app.add_api_route("/api/v1/routes", route_table, methods=["GET"])

    for prefix in config.UPSTREAMS:
        def make_endpoint(p: str):
            async def endpoint(request: Request, rest: str):
                return await forward(request, p, rest)
            return endpoint

        app.add_api_route(
            f"/{prefix}/{{rest:path}}",
            make_endpoint(prefix),
            methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        )

    app.add_exception_handler(HTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    return app


app = create_app()
