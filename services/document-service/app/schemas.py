"""Pydantic v2 schemas, camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel

DURATION_RE = (
    r"^P(?!$)(\d+Y)?(\d+M)?(\d+D)?"
    r"(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$"
)


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class DocumentCreate(CamelModel):
    title: str
    description: str | None = None
    document_uri: str | None = None
    learning_resource_type: str = "Text"
    educational_level: str | None = None
    typical_learning_time: str | None = None

    @field_validator("typical_learning_time")
    @classmethod
    def _check_duration(cls, v: str | None) -> str | None:
        import re

        if v is not None and not re.match(DURATION_RE, v):
            raise ValueError("typicalLearningTime must be an ISO-8601 duration, e.g. PT2H30M")
        return v


class ChunkIn(CamelModel):
    text: str
    order_index: int | None = None


class ChunksCreate(CamelModel):
    chunks: list[ChunkIn]


class AlignmentCreate(CamelModel):
    concept_uri: str
    alignment_type: str


class DocumentRead(CamelModel):
    id: str
    title: str
    description: str | None
    document_uri: str | None
    learning_resource_type: str
    educational_level: str | None
    typical_learning_time: str | None
    created_at: datetime


class AlignmentRead(CamelModel):
    id: str
    concept_uri: str
    alignment_type: str
    created_at: datetime


class ChunkRead(CamelModel):
    id: str
    document_id: str
    order_index: int
    text: str
    char_count: int
    alignments: list[AlignmentRead] = []


class FileRead(CamelModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    sha256: str
    created_at: datetime
