"""Pydantic v2 schemas, camelCase aliases."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class UpdateRequest(CamelModel):
    concept_uri: str
    is_correct: bool
    item_id: str | None = None
    occurred_at: datetime | None = None


class BulkUpdateRequest(CamelModel):
    responses: list[UpdateRequest] = Field(min_length=1)


class MasteryRead(CamelModel):
    concept_uri: str
    rating: float
    rating_deviation: float
    volatility: float
    mastery: float
    state: str
    review_count: int
    last_played_at: datetime
