"""REST API (prefix /api/v1). Handlers stay thin; logic lives in service.py."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import service
from .database import get_db
from .models import CFAssociation, CFDocument, CFItem
from .schemas import (
    AssociationCreate,
    AssociationRead,
    CheckPrerequisitesRequest,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    ItemCreate,
    ItemRead,
    ItemUpdate,
)

router = APIRouter(prefix="/api/v1")


# ---------- error envelope ----------


@router.get("/health")
def health():
    from . import config

    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


def _business_error_handler(request: Request, exc: service.BusinessError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


def _http_error_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        payload = {"error": detail}
    else:
        payload = {
            "error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}
        }
    return JSONResponse(status_code=exc.status_code, content=payload)


def _validation_error_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"loc": [str(x) for x in err.get("loc", [])], "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": errors},
            }
        },
    )


def register_exception_handlers(app):
    app.add_exception_handler(service.BusinessError, _business_error_handler)
    app.add_exception_handler(HTTPException, _http_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)


def _fail(status: int, code: str, message: str, **details) -> None:
    raise HTTPException(status_code=status, detail={"code": code, "message": message, "details": details})


# ---------- documents ----------


@router.post("/documents", response_model=DocumentRead, status_code=201)
def create_document(payload: DocumentCreate, db: Session = Depends(get_db)):
    doc = CFDocument(**payload.model_dump())
    doc.id = service.new_id()
    doc.identifier = service.new_identifier("CFDocuments", doc.id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(CFDocument).order_by(CFDocument.created_at).offset(offset).limit(limit)
    return db.execute(stmt).scalars().all()


@router.get("/documents/{document_id}", response_model=DocumentRead)
def get_document(document_id: str, db: Session = Depends(get_db)):
    return service.get_document(db, document_id)


@router.patch("/documents/{document_id}", response_model=DocumentRead)
def update_document(
    document_id: str, payload: DocumentUpdate, db: Session = Depends(get_db)
):
    doc = service.get_document(db, document_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    db.delete(doc)
    db.commit()
    return None


# ---------- items ----------


@router.post("/documents/{document_id}/items", response_model=ItemRead, status_code=201)
def create_item(document_id: str, payload: ItemCreate, db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    item = CFItem(document_id=doc.id, **payload.model_dump())
    item.id = service.new_id()
    item.identifier = service.new_identifier("CFItems", item.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/documents/{document_id}/items", response_model=list[ItemRead])
def list_items(document_id: str, db: Session = Depends(get_db)):
    service.get_document(db, document_id)
    stmt = (
        select(CFItem)
        .where(CFItem.document_id == document_id)
        .order_by(CFItem.created_at)
    )
    return db.execute(stmt).scalars().all()


@router.get("/items/{item_id}", response_model=ItemRead)
def get_item(item_id: str, db: Session = Depends(get_db)):
    return service.get_item(db, item_id)


@router.patch("/items/{item_id}", response_model=ItemRead)
def update_item(item_id: str, payload: ItemUpdate, db: Session = Depends(get_db)):
    item = service.get_item(db, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: str, db: Session = Depends(get_db)):
    item = service.get_item(db, item_id)
    db.execute(
        delete(CFAssociation).where(
            (CFAssociation.origin_item_id == item_id)
            | (CFAssociation.destination_item_id == item_id)
        )
    )
    db.delete(item)
    db.commit()
    return None


# ---------- associations ----------


@router.post(
    "/documents/{document_id}/associations",
    response_model=AssociationRead,
    status_code=201,
)
def create_association(
    document_id: str, payload: AssociationCreate, db: Session = Depends(get_db)
):
    service.get_document(db, document_id)
    if payload.association_type not in service.ASSOCIATION_TYPES:
        _fail(
            422,
            "INVALID_ASSOCIATION_TYPE",
            f"Unknown association type '{payload.association_type}'",
            allowed=sorted(service.ASSOCIATION_TYPES),
        )
    origin = service.get_item(db, payload.origin_item_id)
    destination = service.get_item(db, payload.destination_item_id)
    if origin.document_id != document_id or destination.document_id != document_id:
        _fail(404, "ITEM_NOT_FOUND", "Both items must belong to the given document")
    if (
        payload.association_type == "isPrerequisiteOf"
        and payload.origin_item_id == payload.destination_item_id
    ):
        _fail(422, "SELF_REFERENCE", "An item cannot be its own prerequisite")
    if payload.association_type == "isPrerequisiteOf" and service.would_create_cycle(
        db, payload.origin_item_id, payload.destination_item_id
    ):
        _fail(409, "CYCLE_DETECTED", "Adding this prerequisite edge would create a cycle")

    assoc = CFAssociation(
        document_id=document_id,
        association_type=payload.association_type,
        origin_item_id=payload.origin_item_id,
        destination_item_id=payload.destination_item_id,
        description=payload.description,
    )
    assoc.id = service.new_id()
    assoc.identifier = service.new_identifier("CFAssociations", assoc.id)
    db.add(assoc)
    db.commit()
    db.refresh(assoc)
    return assoc


@router.get("/documents/{document_id}/associations", response_model=list[AssociationRead])
def list_associations(document_id: str, db: Session = Depends(get_db)):
    service.get_document(db, document_id)
    stmt = (
        select(CFAssociation)
        .where(CFAssociation.document_id == document_id)
        .order_by(CFAssociation.created_at)
    )
    return db.execute(stmt).scalars().all()


@router.get("/associations/{association_id}", response_model=AssociationRead)
def get_association(association_id: str, db: Session = Depends(get_db)):
    assoc = db.get(CFAssociation, association_id)
    if assoc is None:
        _fail(404, "ASSOCIATION_NOT_FOUND", f"Association {association_id} not found")
    return assoc


@router.delete("/associations/{association_id}", status_code=204)
def delete_association(association_id: str, db: Session = Depends(get_db)):
    assoc = db.get(CFAssociation, association_id)
    if assoc is None:
        _fail(404, "ASSOCIATION_NOT_FOUND", f"Association {association_id} not found")
    db.delete(assoc)
    db.commit()
    return None


# ---------- graph / ordering / prereq check ----------


@router.get("/documents/{document_id}/package")
def get_package(document_id: str, db: Session = Depends(get_db)):
    return service.build_package(db, service.get_document(db, document_id))


@router.get("/documents/{document_id}/graph")
def get_graph(document_id: str, db: Session = Depends(get_db)):
    return service.build_graph(db, service.get_document(db, document_id))


@router.get("/documents/{document_id}/topological-order")
def topological_order(document_id: str, db: Session = Depends(get_db)):
    doc = service.get_document(db, document_id)
    items = (
        db.execute(select(CFItem).where(CFItem.document_id == doc.id)).scalars().all()
    )
    item_ids = [item.id for item in items]
    order = service.toposort(item_ids, service.prerequisite_edges(db, doc.id))
    by_id = {item.id: item for item in items}
    return {"order": [by_id[item_id].identifier for item_id in order]}


@router.post("/documents/{document_id}/check-prerequisites")
def check_prerequisites(
    document_id: str, payload: CheckPrerequisitesRequest, db: Session = Depends(get_db)
):
    service.get_document(db, document_id)
    target = service.get_item(db, payload.target_item_id)
    missing_ids = service.missing_prerequisites(
        db, target.id, set(payload.mastered_item_ids)
    )
    missing = []
    for item_id in missing_ids:
        item = db.get(CFItem, item_id)
        missing.append(
            {"id": item.id, "identifier": item.identifier, "fullStatement": item.full_statement}
        )
    return {
        "targetItem": target.identifier,
        "unlocked": not missing,
        "missingPrerequisites": missing,
        "masteredCount": len(set(payload.mastered_item_ids)),
    }
