"""OneRoster v1.2 subset: orgs, courses, classes, users, enrollments."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Org(Base):
    __tablename__ = "orgs"

    sourced_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(300))
    org_type: Mapped[str] = mapped_column(String(30), default="school")  # department|school|district|local
    identifier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Course(Base):
    __tablename__ = "courses"

    sourced_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300))
    school_year: Mapped[str | None] = mapped_column(String(20), nullable=True)
    org_sourced_id: Mapped[str | None] = mapped_column(
        ForeignKey("orgs.sourced_id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ClassSection(Base):
    __tablename__ = "classes"

    sourced_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300))
    course_sourced_id: Mapped[str | None] = mapped_column(
        ForeignKey("courses.sourced_id"), nullable=True, index=True
    )
    org_sourced_id: Mapped[str | None] = mapped_column(
        ForeignKey("orgs.sourced_id"), nullable=True, index=True
    )
    term: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. 2026-spring
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="class_section", cascade="all, delete-orphan"
    )


class User(Base):
    __tablename__ = "users"

    sourced_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    display_name: Mapped[str] = mapped_column(String(300))
    role: Mapped[str] = mapped_column(String(20))  # teacher|student|admin
    email: Mapped[str | None] = mapped_column(String(300), nullable=True)
    org_sourced_id: Mapped[str | None] = mapped_column(
        ForeignKey("orgs.sourced_id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Enrollment(Base):
    __tablename__ = "enrollments"

    sourced_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=_uuid)
    user_sourced_id: Mapped[str] = mapped_column(ForeignKey("users.sourced_id"), index=True)
    class_sourced_id: Mapped[str] = mapped_column(ForeignKey("classes.sourced_id"), index=True)
    role: Mapped[str] = mapped_column(String(20))  # teacher|student
    primary: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    user: Mapped[User] = relationship(back_populates="enrollments")
    class_section: Mapped[ClassSection] = relationship(back_populates="enrollments")
