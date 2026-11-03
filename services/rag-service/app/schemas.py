"""Pydantic v2 schemas. camelCase aliases (platform contract, services/README)."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class AskRequest(CamelModel):
    question: str = ""
    document_ids: list[str] | None = None
    uploader_id: str | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)
    mode: str = "retrieve"
