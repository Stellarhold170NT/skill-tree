"""Pydantic v2 schemas, camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class RegisterRequest(CamelModel):
    username: str
    password: str
    role: str = "student"

    @field_validator("username")
    @classmethod
    def _username(cls, v: str) -> str:
        v = v.strip()
        if not (3 <= len(v) <= 100):
            raise ValueError("username must be 3-100 characters")
        return v

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginRequest(CamelModel):
    username: str
    password: str


class UserRead(CamelModel):
    id: str
    username: str
    role: str
    sourced_id: str | None
    created_at: datetime


class LoginResponse(CamelModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserRead
