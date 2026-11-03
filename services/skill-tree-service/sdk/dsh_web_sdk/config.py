"""Configuration loaded from args or environment variables."""
from __future__ import annotations

import os
from dataclasses import dataclass

from .errors import DshConfigError


@dataclass
class RetryConfig:
    """Retry policy for transient failures."""

    max_attempts: int = 3
    initial_backoff: float = 0.5
    max_backoff: float = 10.0
    backoff_multiplier: float = 2.0


@dataclass
class DshConfig:
    """All knobs for DshClient."""

    base_url: str = ""
    token: str = ""
    timeout: float = 30.0
    retry: RetryConfig | None = None

    def __post_init__(self) -> None:
        if self.retry is None:
            self.retry = RetryConfig()

    @classmethod
    def from_env(cls, prefix: str = "DSH_") -> "DshConfig":
        """Load from env vars: DSH_BASE_URL, DSH_TOKEN, DSH_TIMEOUT."""
        base_url = os.environ.get(f"{prefix}BASE_URL", "")
        token = os.environ.get(f"{prefix}TOKEN", "")
        if not base_url:
            raise DshConfigError(f"env {prefix}BASE_URL is required")
        if not token:
            raise DshConfigError(f"env {prefix}TOKEN is required")
        timeout = float(os.environ.get(f"{prefix}TIMEOUT", "30"))
        return cls(base_url=base_url, token=token, timeout=timeout)

    def validate(self) -> None:
        if not self.base_url:
            raise DshConfigError("base_url is required")
        if not self.base_url.startswith(("http://", "https://")):
            raise DshConfigError(f"base_url must start with http:// or https://")
        if not self.token:
            raise DshConfigError("token is required")
