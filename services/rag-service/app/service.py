"""Domain helpers: ids, error type, lookups (no HTTP concerns)."""

import uuid

from sqlalchemy.orm import Session

from .models import Doc, Job


class BusinessError(Exception):
    """Raised by service functions; translated to the error envelope by routes."""

    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def new_id() -> str:
    return uuid.uuid4().hex


def get_doc(db: Session, doc_id: str) -> Doc:
    doc = db.get(Doc, doc_id)
    if doc is None:
        raise BusinessError(404, "DOCUMENT_NOT_FOUND", f"Document {doc_id} not found")
    return doc


def get_job(db: Session, job_id: str) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise BusinessError(404, "JOB_NOT_FOUND", f"Job {job_id} not found")
    return job
