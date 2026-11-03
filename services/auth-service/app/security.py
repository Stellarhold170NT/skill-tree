"""Minimal JWT (HS256) + password hashing — stdlib only, no extra dependencies."""

import base64
import hashlib
import hmac
import json
import secrets
import time

from . import config


class TokenError(Exception):
    pass


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"pbkdf2_sha256$100000${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iterations, salt, expected = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations))
        return hmac.compare_digest(digest.hex(), expected)
    except (ValueError, AttributeError):
        return False


def issue_token(user_id: str, username: str, role: str, ttl: int | None = None) -> tuple[str, int]:
    """Returns (jwt, expires_in_seconds)."""
    ttl = ttl if ttl is not None else config.AUTH_TOKEN_TTL
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": user_id, "username": username, "role": role, "iat": now, "exp": now + ttl}
    segments = _b64url_encode(json.dumps(header, separators=(",", ":")).encode()) + "." + \
        _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(config.AUTH_SECRET.encode(), segments.encode(), hashlib.sha256).digest()
    return f"{segments}.{_b64url_encode(signature)}", ttl


def verify_token(token: str) -> dict:
    """Returns the payload; raises TokenError on any structural/signature/expiry problem."""
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
        segments = f"{header_b64}.{payload_b64}"
        expected = hmac.new(config.AUTH_SECRET.encode(), segments.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(signature_b64)):
            raise TokenError("bad signature")
        header = json.loads(_b64url_decode(header_b64))
        if header.get("alg") != "HS256":
            raise TokenError("unsupported algorithm")
        payload = json.loads(_b64url_decode(payload_b64))
        if int(payload.get("exp", 0)) < time.time():
            raise TokenError("token expired")
        return payload
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise TokenError(f"malformed token: {exc}") from exc
