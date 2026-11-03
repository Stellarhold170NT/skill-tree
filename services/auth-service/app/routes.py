"""REST API (prefix /api/v1)."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .schemas import LoginRequest, LoginResponse, RegisterRequest, UserRead
from .security import TokenError, issue_token, verify_token
from .service import BusinessError, authenticate, get_user, register

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


# ---------- error envelope ----------


def _business_error_handler(request: Request, exc: BusinessError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


def _http_error_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = {"error": detail}
    else:
        payload = {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}
    return JSONResponse(status_code=exc.status_code, content=payload)


def _validation_error_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"loc": [str(x) for x in err.get("loc", [])], "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors},
            }
        },
    )


def register_exception_handlers(app):
    app.add_exception_handler(BusinessError, _business_error_handler)
    app.add_exception_handler(HTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)


def _bearer_payload(request: Request) -> dict:
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer "):
        raise BusinessError(401, "UNAUTHORIZED", "Missing bearer token")
    try:
        return verify_token(header.removeprefix("Bearer ").strip())
    except TokenError as exc:
        raise BusinessError(401, "UNAUTHORIZED", str(exc)) from exc


@router.post("/auth/register", response_model=LoginResponse, status_code=201)
def register_user(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    if payload.role not in config.ROLES:
        raise HTTPException(
            422, detail={"code": "INVALID_ROLE",
                         "message": "role must be student, teacher or admin", "details": {}}
        )
    admin_token = request.headers.get("x-admin-token")
    user, _granted = register(db, payload.username, payload.password, payload.role, admin_token)
    db.add(user)
    db.commit()
    db.refresh(user)
    token, expires_in = issue_token(user.id, user.username, user.role)
    return LoginResponse(access_token=token, expires_in=expires_in, user=UserRead.model_validate(user))


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, payload.username, payload.password)
    token, expires_in = issue_token(user.id, user.username, user.role)
    return LoginResponse(access_token=token, expires_in=expires_in, user=UserRead.model_validate(user))


@router.post("/auth/verify")
def verify(request: Request):
    payload = _bearer_payload(request)
    return {"sub": payload["sub"], "username": payload.get("username"),
            "role": payload.get("role"), "exp": payload.get("exp")}


@router.get("/users/me", response_model=UserRead)
def me(request: Request, db: Session = Depends(get_db)):
    payload = _bearer_payload(request)
    user = get_user(db, payload["sub"])
    if user is None:
        raise BusinessError(401, "UNAUTHORIZED", "Token subject no longer exists")
    return user
