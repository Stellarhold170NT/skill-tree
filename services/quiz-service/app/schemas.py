"""Pydantic v2 schemas. Read schemas serialize with camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


# ---------- items ----------


class ChoiceIn(CamelModel):
    identifier: str
    text: str


class ItemCreate(CamelModel):
    title: str
    prompt: str
    choices: list[ChoiceIn] = Field(min_length=2)
    correct_response: list[str] = Field(min_length=1)
    interaction_type: str = "single_choice"
    shuffle: bool = True
    concept_uri: str | None = None
    difficulty: float | None = None
    discrimination: float | None = None
    language: str | None = "eng"


class ItemUpdate(CamelModel):
    title: str | None = None
    prompt: str | None = None
    choices: list[ChoiceIn] | None = None
    correct_response: list[str] | None = None
    interaction_type: str | None = None
    shuffle: bool | None = None
    concept_uri: str | None = None
    difficulty: float | None = None
    discrimination: float | None = None
    language: str | None = None


class ItemRead(CamelModel):
    id: str
    identifier: str
    title: str
    prompt: str
    interaction_type: str
    choices: list[dict]
    correct_response: list[str]
    shuffle: bool
    concept_uri: str | None
    difficulty: float | None
    discrimination: float | None
    language: str | None
    created_at: datetime
    updated_at: datetime


class ImportQtiRequest(CamelModel):
    qti_xml: str


# ---------- tests ----------


class SectionIn(CamelModel):
    title: str
    item_ids: list[str] = Field(min_length=1)


class TestCreate(CamelModel):
    identifier: str
    title: str
    sections: list[SectionIn] = Field(min_length=1)


class TestRead(CamelModel):
    id: str
    identifier: str
    title: str
    sections: list[dict]
    created_at: datetime
    updated_at: datetime


# ---------- attempts / outcomes ----------


class AttemptCreate(CamelModel):
    item_id: str
    candidate_id: str
    response: list[str] = Field(min_length=1)
    test_id: str | None = None


class BulkResponseIn(CamelModel):
    item_id: str
    response: list[str] = Field(min_length=1)


class AttemptBulkRequest(CamelModel):
    candidate_id: str
    responses: list[BulkResponseIn] = Field(min_length=1)
    test_id: str | None = None


class AttemptRead(CamelModel):
    id: str
    item_id: str
    test_id: str | None
    candidate_id: str
    response: list[str]
    is_correct: bool
    score: float
    submitted_at: datetime
