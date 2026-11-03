"""Pydantic v2 schemas, camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class AssignmentCreate(CamelModel):
    title: str
    class_id: str
    concept_uri: str
    target_group: str = "red_rusty"
    due_at: datetime | None = None


class AssignmentUpdate(CamelModel):
    title: str | None = None
    status: str | None = None
    due_at: datetime | None = None


class AssignmentRead(CamelModel):
    id: str
    title: str
    class_id: str
    concept_uri: str
    target_group: str
    student_ids: list[str]
    item_ids: list[str]
    quiz_test_id: str | None
    status: str
    due_at: datetime | None
    created_at: datetime
