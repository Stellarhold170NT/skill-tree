"""REST API (prefix /api/v1), OneRoster v1.2 subset. Handlers stay thin."""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import config, service
from .database import get_db
from .models import ClassSection, Course, Enrollment, Org, User
from .schemas import (
    ClassCreate,
    ClassRead,
    ClassUpdate,
    CourseCreate,
    CourseRead,
    EnrollmentCreate,
    EnrollmentRead,
    OrgCreate,
    OrgRead,
    UserCreate,
    UserRead,
)

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health():
    return {"status": "ok", "service": config.SERVICE_NAME, "version": config.SERVICE_VERSION}


# ---------- error envelope ----------


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
        payload = {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}
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


def _validate_ref(db: Session, **kwargs) -> None:
    if kwargs.get("org_sourced_id"):
        service.get_org(db, kwargs["org_sourced_id"])
    if kwargs.get("course_sourced_id"):
        service.get_course(db, kwargs["course_sourced_id"])


# ---------- orgs ----------


@router.post("/orgs", response_model=OrgRead, status_code=201)
def create_org(payload: OrgCreate, db: Session = Depends(get_db)):
    if payload.org_type not in service.ORG_TYPES:
        _fail(422, "INVALID_ORG_TYPE", "Unknown orgType", allowed=sorted(service.ORG_TYPES))
    org = Org(**payload.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@router.get("/orgs", response_model=list[OrgRead])
def list_orgs(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    return db.execute(select(Org).order_by(Org.created_at).offset(offset).limit(limit)).scalars().all()


@router.get("/orgs/{org_id}", response_model=OrgRead)
def get_org(org_id: str, db: Session = Depends(get_db)):
    return service.get_org(db, org_id)


# ---------- courses ----------


@router.post("/courses", response_model=CourseRead, status_code=201)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)):
    _validate_ref(db, org_sourced_id=payload.org_sourced_id)
    course = Course(**payload.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


@router.get("/courses", response_model=list[CourseRead])
def list_courses(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    return db.execute(select(Course).order_by(Course.created_at).offset(offset).limit(limit)).scalars().all()


@router.get("/courses/{course_id}", response_model=CourseRead)
def get_course(course_id: str, db: Session = Depends(get_db)):
    return service.get_course(db, course_id)


# ---------- classes ----------


@router.post("/classes", response_model=ClassRead, status_code=201)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)):
    _validate_ref(db, org_sourced_id=payload.org_sourced_id, course_sourced_id=payload.course_sourced_id)
    cls = ClassSection(**payload.model_dump())
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


@router.get("/classes", response_model=list[ClassRead])
def list_classes(limit: int = 50, offset: int = 0, course_id: str | None = None, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(ClassSection).order_by(ClassSection.created_at)
    if course_id:
        stmt = stmt.where(ClassSection.course_sourced_id == course_id)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/classes/{class_id}", response_model=ClassRead)
def get_class(class_id: str, db: Session = Depends(get_db)):
    return service.get_class(db, class_id)


@router.patch("/classes/{class_id}", response_model=ClassRead)
def update_class(class_id: str, payload: ClassUpdate, db: Session = Depends(get_db)):
    cls = service.get_class(db, class_id)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        _fail(422, "EMPTY_UPDATE", "Provide at least one field to update")
    _validate_ref(
        db,
        org_sourced_id=data.get("org_sourced_id"),
        course_sourced_id=data.get("course_sourced_id"),
    )
    for field, value in data.items():
        setattr(cls, field, value)
    db.commit()
    db.refresh(cls)
    return cls


@router.delete("/classes/{class_id}", status_code=204)
def delete_class(class_id: str, db: Session = Depends(get_db)):
    cls = service.get_class(db, class_id)
    db.delete(cls)
    db.commit()
    return None


# ---------- users ----------


@router.post("/users", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if payload.role not in service.ROLES:
        _fail(422, "INVALID_ROLE", "Unknown role", allowed=sorted(service.ROLES))
    _validate_ref(db, org_sourced_id=payload.org_sourced_id)
    user = User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=list[UserRead])
def list_users(role: str | None = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(User).order_by(User.created_at)
    if role:
        stmt = stmt.where(User.role == role)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: str, db: Session = Depends(get_db)):
    return service.get_user(db, user_id)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = service.get_user(db, user_id)
    db.delete(user)
    db.commit()
    return None


@router.get("/users/{user_id}/classes", response_model=list[ClassRead])
def user_classes(user_id: str, db: Session = Depends(get_db)):
    service.get_user(db, user_id)
    return (
        db.execute(
            select(ClassSection)
            .join(Enrollment, Enrollment.class_sourced_id == ClassSection.sourced_id)
            .where(Enrollment.user_sourced_id == user_id)
            .order_by(ClassSection.created_at)
        )
        .scalars()
        .all()
    )


# ---------- enrollments ----------


@router.post("/enrollments", response_model=EnrollmentRead, status_code=201)
def create_enrollment(payload: EnrollmentCreate, db: Session = Depends(get_db)):
    if payload.role not in service.ENROLLMENT_ROLES:
        _fail(422, "INVALID_ROLE", "Enrollment role must be teacher or student", allowed=sorted(service.ENROLLMENT_ROLES))
    user = service.get_user(db, payload.user_sourced_id)
    if user.role == "admin":
        _fail(422, "INVALID_ROLE", "Admins cannot be enrolled in classes")
    service.get_class(db, payload.class_sourced_id)
    if service.find_enrollment(db, payload.user_sourced_id, payload.class_sourced_id, payload.role):
        _fail(409, "DUPLICATE_ENROLLMENT", "User already enrolled with this role")
    enrollment = Enrollment(**payload.model_dump())
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.get("/enrollments", response_model=list[EnrollmentRead])
def list_enrollments(class_id: str | None = None, user_id: str | None = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    limit = min(max(limit, 1), 200)
    stmt = select(Enrollment).order_by(Enrollment.created_at)
    if class_id:
        stmt = stmt.where(Enrollment.class_sourced_id == class_id)
    if user_id:
        stmt = stmt.where(Enrollment.user_sourced_id == user_id)
    return db.execute(stmt.offset(offset).limit(limit)).scalars().all()


@router.get("/classes/{class_id}/students", response_model=list[UserRead])
def class_students(class_id: str, db: Session = Depends(get_db)):
    service.get_class(db, class_id)
    return service.class_roster(db, class_id, "student")


@router.get("/classes/{class_id}/teachers", response_model=list[UserRead])
def class_teachers(class_id: str, db: Session = Depends(get_db)):
    service.get_class(db, class_id)
    return service.class_roster(db, class_id, "teacher")


@router.delete("/enrollments/{enrollment_id}", status_code=204)
def delete_enrollment(enrollment_id: str, db: Session = Depends(get_db)):
    enrollment = db.get(Enrollment, enrollment_id)
    if enrollment is None:
        _fail(404, "ENROLLMENT_NOT_FOUND", f"Enrollment {enrollment_id} not found")
    db.delete(enrollment)
    db.commit()
    return None
