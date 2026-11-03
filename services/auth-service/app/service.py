"""Domain rules: registration, login, identity lookup."""

import sqlalchemy as sa
from sqlalchemy.orm import Session

from . import config
from .models import User
from .security import hash_password, verify_password


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def get_user(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def get_by_username(db: Session, username: str) -> User | None:
    return db.execute(sa.select(User).where(User.username == username)).scalar_one_or_none()


def register(db: Session, username: str, password: str, requested_role: str,
             admin_token: str | None) -> tuple[User, bool]:
    """Returns (user, role_granted). Raises BusinessError on conflicts."""
    if get_by_username(db, username):
        raise BusinessError(409, "USERNAME_TAKEN", f"Username {username} already exists")

    first_user = db.execute(sa.select(sa.func.count()).select_from(User)).scalar_one() == 0

    granted = False
    role = "student"
    if first_user:
        role, granted = "admin", True  # bootstrap: first account owns the platform
    elif requested_role != "student" and config.ADMIN_REGISTRATION_TOKEN and \
            admin_token == config.ADMIN_REGISTRATION_TOKEN:
        if requested_role in config.ROLES:
            role, granted = requested_role, True
    return User(username=username, password_hash=hash_password(password), role=role), granted


def authenticate(db: Session, username: str, password: str) -> User:
    user = get_by_username(db, username)
    if user is None or not verify_password(password, user.password_hash):
        raise BusinessError(401, "BAD_CREDENTIALS", "Invalid username or password")
    return user
