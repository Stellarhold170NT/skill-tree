"""Pydantic v2 schemas. Read schemas serialize with camelCase aliases (CASE vocabulary)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


# ---------- documents ----------


class DocumentCreate(CamelModel):
    title: str
    creator: str
    description: str | None = None
    publisher: str | None = None
    version: str | None = None
    status: str | None = None
    language: str | None = None


class DocumentUpdate(CamelModel):
    title: str | None = None
    creator: str | None = None
    description: str | None = None
    publisher: str | None = None
    version: str | None = None
    status: str | None = None
    language: str | None = None


class DocumentRead(CamelModel):
    id: str
    identifier: str
    title: str
    description: str | None
    creator: str
    publisher: str | None
    version: str | None
    status: str | None
    language: str | None
    last_change_date_time: datetime
    created_at: datetime


# ---------- items ----------


class ItemCreate(CamelModel):
    full_statement: str
    human_coding_scheme: str | None = None
    abbrev_statement: str | None = None
    description: str | None = None
    language: str | None = None
    status: str | None = None


class ItemUpdate(CamelModel):
    full_statement: str | None = None
    human_coding_scheme: str | None = None
    abbrev_statement: str | None = None
    description: str | None = None
    language: str | None = None
    status: str | None = None


class ItemRead(CamelModel):
    id: str
    identifier: str
    document_id: str
    human_coding_scheme: str | None
    full_statement: str
    abbrev_statement: str | None
    description: str | None
    language: str | None
    status: str | None
    last_change_date_time: datetime
    created_at: datetime


# ---------- associations ----------


class AssociationCreate(CamelModel):
    association_type: str
    origin_item_id: str
    destination_item_id: str
    description: str | None = None


class AssociationRead(CamelModel):
    id: str
    identifier: str
    document_id: str
    association_type: str
    origin_item_id: str
    destination_item_id: str
    description: str | None
    created_at: datetime


# ---------- misc request bodies ----------


class CheckPrerequisitesRequest(CamelModel):
    target_item_id: str
    mastered_item_ids: list[str] = []
