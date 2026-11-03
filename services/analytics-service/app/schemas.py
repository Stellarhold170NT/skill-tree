"""Pydantic v2 schemas — the Caliper-aligned envelope from MODULES.md section 5."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, from_attributes=True
    )


class ActorIn(CamelModel):
    id: str
    type: str = "Person"


class ObjectIn(CamelModel):
    id: str
    type: str = "Concept"


class EventIn(CamelModel):
    event_id: str | None = None
    type: str
    occurred_at: datetime | None = None
    actor: ActorIn
    object: ObjectIn
    payload: dict = Field(default_factory=dict)
    producer: str = "unknown"


class BatchIn(CamelModel):
    events: list[EventIn] = Field(min_length=1)


class EventRead(CamelModel):
    event_id: str
    type: str
    occurred_at: datetime
    actor_id: str
    actor_type: str
    object_id: str
    object_type: str
    payload: dict
    producer: str


class LastInteractionRead(CamelModel):
    concept_uri: str
    last_interaction_at: datetime | None
    last_event_type: str | None
    event_count: int
