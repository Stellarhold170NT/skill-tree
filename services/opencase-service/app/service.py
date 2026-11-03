"""Graph / business logic kept free of HTTP concerns."""

import uuid
from collections import defaultdict, deque

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, models

ASSOCIATION_TYPES = {
    "isPartOf",
    "isChildOf",
    "isPeerOf",
    "isPrerequisiteOf",
    "exactMatchOf",
    "related",
    "replacedBy",
    "isTranslationOf",
    "exemplar",
    "hasSkillLevel",
}


class BusinessError(Exception):
    """Raised by service functions; translated to the error envelope by routes."""

    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def new_identifier(kind: str, obj_id: str) -> str:
    return f"{config.CASE_BASE_URI}/{kind}/{obj_id}"


def new_id() -> str:
    return uuid.uuid4().hex


def prerequisite_edges(db: Session, document_id: str) -> list[tuple[str, str]]:
    """All isPrerequisiteOf edges of a document as (prerequisite_id, dependent_id)."""
    rows = db.execute(
        select(
            models.CFAssociation.origin_item_id,
            models.CFAssociation.destination_item_id,
        ).where(
            models.CFAssociation.document_id == document_id,
            models.CFAssociation.association_type == "isPrerequisiteOf",
        )
    ).all()
    return [(origin, dest) for origin, dest in rows]


def toposort(item_ids: list[str], edges: list[tuple[str, str]]) -> list[str]:
    """Kahn's algorithm: prerequisites come before their dependents. Raises on cycle."""
    indegree = {item: 0 for item in item_ids}
    adjacency: dict[str, list[str]] = defaultdict(list)
    for prereq, dependent in edges:
        adjacency[prereq].append(dependent)
        indegree[dependent] += 1
    ready = deque(sorted(item for item in item_ids if indegree[item] == 0))
    order: list[str] = []
    while ready:
        node = ready.popleft()
        order.append(node)
        for nxt in adjacency[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                ready.append(nxt)
    if len(order) != len(item_ids):
        raise BusinessError(409, "CYCLE_DETECTED", "Prerequisite graph contains a cycle")
    return order


def would_create_cycle(db: Session, origin_item_id: str, destination_item_id: str) -> bool:
    """True if adding edge origin->destination closes a prerequisite cycle.

    Semantics: edge (origin=prerequisite, destination=dependent). A cycle appears when
    origin is reachable from destination by walking dependents forward.
    """
    if origin_item_id == destination_item_id:
        return True
    seen = {destination_item_id}
    frontier = [destination_item_id]
    while frontier:
        current = frontier.pop()
        if current == origin_item_id:
            return True
        rows = db.execute(
            select(models.CFAssociation.destination_item_id).where(
                models.CFAssociation.association_type == "isPrerequisiteOf",
                models.CFAssociation.origin_item_id == current,
            )
        ).scalars().all()
        for nxt in rows:
            if nxt not in seen:
                seen.add(nxt)
                frontier.append(nxt)
    return False


def missing_prerequisites(
    db: Session, target_item_id: str, mastered_item_ids: set[str]
) -> list[str]:
    """Unmastered prerequisites of target, transitively up the prereq chain.

    Stops descending past mastered nodes: a mastered item implies its own
    prerequisites were satisfied earlier.
    """
    missing: list[str] = []
    seen = {target_item_id}
    frontier = [target_item_id]
    while frontier:
        current = frontier.pop()
        rows = db.execute(
            select(models.CFAssociation.origin_item_id).where(
                models.CFAssociation.association_type == "isPrerequisiteOf",
                models.CFAssociation.destination_item_id == current,
            )
        ).scalars().all()
        for prereq in rows:
            if prereq in seen:
                continue
            seen.add(prereq)
            if prereq not in mastered_item_ids:
                missing.append(prereq)
                frontier.append(prereq)
    return missing


def get_document(db: Session, document_id: str) -> models.CFDocument:
    doc = db.get(models.CFDocument, document_id)
    if doc is None:
        raise BusinessError(404, "DOCUMENT_NOT_FOUND", f"Document {document_id} not found")
    return doc


def get_item(db: Session, item_id: str) -> models.CFItem:
    item = db.get(models.CFItem, item_id)
    if item is None:
        raise BusinessError(404, "ITEM_NOT_FOUND", f"Item {item_id} not found")
    return item


def build_package(db: Session, document: models.CFDocument) -> dict:
    """CASE JSON-LD envelope for the whole document."""
    items = (
        db.execute(
            select(models.CFItem).where(models.CFItem.document_id == document.id)
        )
        .scalars()
        .all()
    )
    associations = (
        db.execute(
            select(models.CFAssociation).where(
                models.CFAssociation.document_id == document.id
            )
        )
        .scalars()
        .all()
    )
    return {
        "@context": "https://purl.imsglobal.org/spec/case/v1p0/context/imscase-v1p0_context.jsonld",
        "identifier": document.identifier,
        "lastChangeDateTime": document.last_change_date_time.isoformat(),
        "CFDocument": {
            "identifier": document.identifier,
            "title": document.title,
            "creator": document.creator,
            "publisher": document.publisher,
            "version": document.version,
            "status": document.status,
            "language": document.language,
        },
        "CFItems": [
            {
                "identifier": item.identifier,
                "humanCodingScheme": item.human_coding_scheme,
                "fullStatement": item.full_statement,
                "abbrevStatement": item.abbrev_statement,
                "language": item.language,
                "status": item.status,
            }
            for item in items
        ],
        "CFAssociations": [
            {
                "identifier": assoc.identifier,
                "associationType": assoc.association_type,
                "originCFItemURI": db.get(models.CFItem, assoc.origin_item_id).identifier,
                "destinationCFItemURI": db.get(models.CFItem, assoc.destination_item_id).identifier,
            }
            for assoc in associations
        ],
    }


def build_graph(db: Session, document: models.CFDocument) -> dict:
    items = (
        db.execute(select(models.CFItem).where(models.CFItem.document_id == document.id))
        .scalars()
        .all()
    )
    associations = (
        db.execute(
            select(models.CFAssociation).where(
                models.CFAssociation.document_id == document.id
            )
        )
        .scalars()
        .all()
    )
    id_to_item = {item.id: item for item in items}
    return {
        "nodes": [
            {
                "id": item.id,
                "identifier": item.identifier,
                "fullStatement": item.full_statement,
                "humanCodingScheme": item.human_coding_scheme,
            }
            for item in items
        ],
        "edges": [
            {
                "source": assoc.origin_item_id,
                "target": assoc.destination_item_id,
                "type": assoc.association_type,
                "sourceIdentifier": id_to_item[assoc.origin_item_id].identifier,
                "targetIdentifier": id_to_item[assoc.destination_item_id].identifier,
            }
            for assoc in associations
        ],
    }
