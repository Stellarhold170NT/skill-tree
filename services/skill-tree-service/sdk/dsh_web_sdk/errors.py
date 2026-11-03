"""Error hierarchy for dsh_web_sdk.

All errors inherit from DshError. Subclasses let orchestrators decide
whether to retry, reauth, or give up.
"""
from __future__ import annotations

from typing import Any


class DshError(Exception):
    """Base error. Carries message, code, details, request_id."""

    #: Class-level default so DshError(msg) without code is constructible.
    code = None

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
        request_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code if code is not None else type(self).code
        self.details = details or {}
        self.request_id = request_id

    @property
    def is_retryable(self) -> bool:
        """Default: most DshErrors are not retryable."""
        return False

    def __repr__(self) -> str:
        return f"{type(self).__name__}({self.code!r}, {self.message!r})"


class DshAuthError(DshError):
    """Token rejected. Call reauth() then retry."""

    code = "dsh/auth"

    @property
    def is_retryable(self) -> bool:
        return True  # retryable after reauth


class DshTimeoutError(DshError):
    """Request or wait timed out."""

    code = "dsh/timeout"

    @property
    def is_retryable(self) -> bool:
        return True


class DshTransportError(DshError):
    """Network/HTTP failure (5xx, connection error)."""

    code = "dsh/transport"

    @property
    def is_retryable(self) -> bool:
        return True


class DshProtocolError(DshError):
    """Server returned malformed data. Not retryable."""

    code = "dsh/protocol"


class DshSessionError(DshError):
    """Session-level problem (not found, cancelled, ...)."""

    code = "dsh/session"


class DshConfigError(DshError):
    """Client misconfiguration (missing token, bad URL, ...)."""

    code = "dsh/config"
