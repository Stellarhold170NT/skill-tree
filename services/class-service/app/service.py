"""Domain rules + lookups (no HTTP concerns)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ClassSection, Course, Enrollment, Org, User

ROLES = {"teacher", "student", "admin"}
ENROLLMENT_ROLES = {"teacher", "student"}
ORG_TYPES = {"department", "school", "district", "local", "state", "national"}


class BusinessError(Exception):
    def __init__(self, status: int, code: str, message: str, **details):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.details = details


def get_org(db: Session, sourced_id: str) -> Org:
    org = db.get(Org, sourced_id)
    if org is None:
        raise BusinessError(404, "ORG_NOT_FOUND", f"Org {sourced_id} not found")
    return org


def get_course(db: Session, sourced_id: str) -> Course:
    course = db.get(Course, sourced_id)
    if course is None:
        raise BusinessError(404, "COURSE_NOT_FOUND", f"Course {sourced_id} not found")
    return course


def get_class(db: Session, sourced_id: str) -> ClassSection:
    cls = db.get(ClassSection, sourced_id)
    if cls is None:
        raise BusinessError(404, "CLASS_NOT_FOUND", f"Class {sourced_id} not found")
    return cls


def get_user(db: Session, sourced_id: str) -> User:
    user = db.get(User, sourced_id)
    if user is None:
        raise BusinessError(404, "USER_NOT_FOUND", f"User {sourced_id} not found")
    return user


def find_enrollment(
    db: Session, user_sourced_id: str, class_sourced_id: str, role: str
) -> Enrollment | None:
    return db.execute(
        select(Enrollment).where(
            Enrollment.user_sourced_id == user_sourced_id,
            Enrollment.class_sourced_id == class_sourced_id,
            Enrollment.role == role,
        )
    ).scalar_one_or_none()


def class_roster(db: Session, class_sourced_id: str, role: str) -> list[User]:
    return (
        db.execute(
            select(User)
            .join(Enrollment, Enrollment.user_sourced_id == User.sourced_id)
            .where(Enrollment.class_sourced_id == class_sourced_id, Enrollment.role == role)
            .order_by(User.created_at)
        )
        .scalars()
        .all()
    )
