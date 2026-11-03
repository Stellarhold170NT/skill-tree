"""Pydantic v2 schemas, camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class OrgCreate(CamelModel):
    name: str
    org_type: str = "school"
    identifier: str | None = None


class OrgRead(CamelModel):
    sourced_id: str
    name: str
    org_type: str
    identifier: str | None
    created_at: datetime


class CourseCreate(CamelModel):
    title: str
    school_year: str | None = None
    org_sourced_id: str | None = None


class CourseRead(CamelModel):
    sourced_id: str
    title: str
    school_year: str | None
    org_sourced_id: str | None
    created_at: datetime


class ClassCreate(CamelModel):
    title: str
    course_sourced_id: str | None = None
    org_sourced_id: str | None = None
    term: str | None = None


class ClassRead(CamelModel):
    sourced_id: str
    title: str
    course_sourced_id: str | None
    org_sourced_id: str | None
    term: str | None
    created_at: datetime


class ClassUpdate(CamelModel):
    """PATCH payload: only provided fields change."""

    title: str | None = None
    term: str | None = None
    course_sourced_id: str | None = None
    org_sourced_id: str | None = None


class UserCreate(CamelModel):
    display_name: str
    role: str
    email: str | None = None
    org_sourced_id: str | None = None


class UserRead(CamelModel):
    sourced_id: str
    display_name: str
    role: str
    email: str | None
    org_sourced_id: str | None
    created_at: datetime


class EnrollmentCreate(CamelModel):
    user_sourced_id: str
    class_sourced_id: str
    role: str
    primary: bool = False


class EnrollmentRead(CamelModel):
    sourced_id: str
    user_sourced_id: str
    class_sourced_id: str
    role: str
    primary: bool
    created_at: datetime
