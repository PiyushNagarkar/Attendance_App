import base64, csv, io, math, os, secrets
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional
import qrcode
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, create_engine, or_, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import NullPool

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    from sqlalchemy.pool import NullPool

    engine = create_engine(
        DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True
    )
SECRET_KEY = os.getenv("SECRET_KEY", "development-only-change-me")
ALGORITHM = "HS256"

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
SessionLocal = sessionmaker(bind=engine, autoflush=False)
security = HTTPBearer()

class Base(DeclarativeBase):
    pass

class Role(str, Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    roll_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    semester: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bound_device_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    device_bound_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Classroom(Base):
    __tablename__ = "classrooms"
    id: Mapped[int] = mapped_column(primary_key=True)
    building: Mapped[str] = mapped_column(String(100))
    room_number: Mapped[str] = mapped_column(String(30), unique=True)
    floor: Mapped[int]
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    radius_m: Mapped[float] = mapped_column(Float, default=25.0)

class Course(Base):
    __tablename__ = "courses"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(30), unique=True)
    name: Mapped[str] = mapped_column(String(150))
    section: Mapped[str] = mapped_column(String(50))
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "course_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    token: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    prev_token: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, default=None)
    starts_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("session_id", "student_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("attendance_sessions.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    marked_at: Mapped[datetime] = mapped_column(DateTime)
    distance_m: Mapped[float] = mapped_column(Float)
    gps_accuracy_m: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="present")

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    message: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    read: Mapped[bool] = mapped_column(Boolean, default=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(50), index=True)
    target_type: Mapped[str] = mapped_column(String(50))
    target_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    details: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class TimetableSlot(Base):
    __tablename__ = "timetable_slots"
    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    classroom_id: Mapped[int] = mapped_column(ForeignKey("classrooms.id"))
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday ... 6=Sunday
    start_time: Mapped[str] = mapped_column(String(10))  # e.g. "09:30"
    end_time: Mapped[str] = mapped_column(String(10))  # e.g. "10:30"

Base.metadata.create_all(engine)

# Auto-migration safety for existing tables
with engine.connect() as conn:
    for col_def in [
        ("attendance_sessions", "prev_token VARCHAR(128)"),
        ("users", "roll_number VARCHAR(64)"),
        ("users", "department VARCHAR(100)"),
        ("users", "semester INTEGER"),
        ("users", "bound_device_id VARCHAR(128)"),
        ("users", "device_bound_at DATETIME"),
    ]:
        try:
            conn.execute(text(f"ALTER TABLE {col_def[0]} ADD COLUMN {col_def[1]}"))
            conn.commit()
        except Exception:
            pass

# Automatic initial admin & demo seed on fresh deployment
try:
    with SessionLocal() as s:
        admin_acc = s.query(User).filter_by(email="admin@attendance.app").first()
        if not admin_acc:
            admin_acc = User(
                name="Campus Administrator",
                email="admin@attendance.app",
                password_hash=pwd.hash("Admin@12345"),
                role=Role.ADMIN.value,
                active=True,
            )
            s.add(admin_acc)
            s.commit()
except Exception:
    pass

def log_audit(s: Session, action: str, target_type: str, details: str, user_id: Optional[int] = None, target_id: Optional[int] = None):
    try:
        s.add(AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            created_at=datetime.utcnow()
        ))
        s.flush()
    except Exception:
        pass

app = FastAPI(title="Smart Attendance API", version="0.3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Login(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str

class UserIn(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=6)
    role: Role
    roll_number: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None

class BulkStudentItem(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    role: Optional[Role] = Role.STUDENT
    roll_number: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None

class BulkImportIn(BaseModel):
    users: list[BulkStudentItem]
    default_password: str = "Student@123"
    course_id: Optional[int] = None

class ClassroomIn(BaseModel):
    building: str
    room_number: str
    floor: int
    latitude: float
    longitude: float
    radius_m: float = Field(default=25.0, ge=1, le=200)

class CourseIn(BaseModel):
    code: str
    name: str
    section: str
    classroom_id: int
    teacher_id: int

class EnrollmentIn(BaseModel):
    student_id: int
    course_id: int

class SessionIn(BaseModel):
    course_id: int
    duration_minutes: int = Field(default=10, ge=1, le=180)

class ManualMarkIn(BaseModel):
    student_id: int
    status: str = "present"
    reason: Optional[str] = "Manual faculty correction"

class TimetableSlotIn(BaseModel):
    course_id: int
    classroom_id: int
    day_of_week: int = Field(ge=0, le=6)  # 0=Mon ... 6=Sun
    start_time: str
    end_time: str

class CheckIn(BaseModel):
    token: str
    latitude: float
    longitude: float
    gps_accuracy_m: float = Field(ge=0)
    device_id: Optional[str] = None

def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()

def actor(credentials: HTTPAuthorizationCredentials = Depends(security), s: Session = Depends(db)):
    try:
        uid = int(jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid token")
    user = s.get(User, uid)
    if not user or not user.active:
        raise HTTPException(401, "Inactive user")
    return user

def require(role: Role):
    def check(user: User = Depends(actor)):
        if user.role != role.value:
            raise HTTPException(403, "Insufficient permission")
        return user
    return check

def distance(a, b, c, d):
    radius = 6371000
    lat = math.radians(c - a)
    lon = math.radians(d - b)
    x = math.sin(lat / 2) ** 2 + math.cos(math.radians(a)) * math.cos(math.radians(c)) * math.sin(lon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(x))

def qr_payload(row):
    image = qrcode.make(row.token)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return {
        "session_id": row.id,
        "expires_at": row.expires_at,
        "qr_token": row.token,
        "qr_png_base64": base64.b64encode(output.getvalue()).decode(),
    }

def teacher_course(s: Session, course_id: int, teacher: User):
    course = s.get(Course, course_id)
    if not course or course.teacher_id != teacher.id:
        raise HTTPException(403, "Course is not assigned to you")
    return course

def report_rows(s: Session, course: Course):
    students = s.query(User).join(Enrollment, Enrollment.student_id == User.id).filter(Enrollment.course_id == course.id).order_by(User.name).all()
    ids = [x.id for x in s.query(AttendanceSession).filter_by(course_id=course.id).all()]
    total = len(ids)
    rows = []
    for student in students:
        present = s.query(Attendance).filter(Attendance.student_id == student.id, Attendance.session_id.in_(ids)).count() if ids else 0
        rows.append({
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "present": present,
            "total": total,
            "percentage": round(present / total * 100, 2) if total else 0,
        })
    return rows

def low_notifications(s: Session, course: Course, threshold: float = 75.0):
    for row in report_rows(s, course):
        if row["total"] and row["percentage"] < threshold:
            message = f"Low attendance alert: your attendance in {course.code} is {row['percentage']}%."
            if not s.query(Notification).filter_by(student_id=row["student_id"], message=message).first():
                s.add(Notification(student_id=row["student_id"], message=message))

@app.get("/")
def home():
    return {"message": "Smart Attendance API is running"}

@app.post("/auth/login", response_model=Token)
def login(data: Login, s: Session = Depends(db)):
    user = s.query(User).filter_by(email=data.email).first()
    if not user or not pwd.verify(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = jwt.encode({"sub": str(user.id), "exp": datetime.now(timezone.utc) + timedelta(minutes=180)}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "role": user.role, "name": user.name}

# --- ADMIN ENDPOINTS ---
@app.get("/admin/dashboard")
def admin_dashboard(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    return {
        "students": s.query(User).filter_by(role="student").count(),
        "teachers": s.query(User).filter_by(role="teacher").count(),
        "courses": s.query(Course).count(),
        "classrooms": s.query(Classroom).count(),
        "sessions": s.query(AttendanceSession).count(),
    }

@app.get("/admin/users")
def admin_users(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    return [
        {
            "id": x.id,
            "name": x.name,
            "email": x.email,
            "role": x.role,
            "roll_number": x.roll_number,
            "department": x.department,
            "semester": x.semester,
            "bound_device_id": x.bound_device_id,
            "device_bound_at": x.device_bound_at,
            "active": x.active,
        }
        for x in s.query(User).order_by(User.role, User.name)
    ]

@app.post("/admin/users")
def create_user(data: UserIn, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    if s.query(User).filter_by(email=data.email).first():
        raise HTTPException(409, "Email is already registered")
    row = User(
        name=data.name,
        email=data.email,
        password_hash=pwd.hash(data.password),
        role=data.role.value,
        roll_number=data.roll_number,
        department=data.department,
        semester=data.semester,
        active=True,
    )
    s.add(row)
    s.flush()
    log_audit(s, action="USER_CREATE", target_type="user", target_id=row.id, details=f"Admin {admin.name} registered {row.role} {row.name} ({row.email})", user_id=admin.id)
    s.commit()
    return {"id": row.id, "name": row.name, "role": row.role}

@app.post("/admin/users/bulk")
def bulk_create_users(data: BulkImportIn, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    created_count = 0
    skipped_count = 0
    enrolled_count = 0

    target_course = s.get(Course, data.course_id) if data.course_id else None

    for item in data.users:
        if not item.email or not item.name:
            continue
        email_clean = item.email.strip().lower()
        name_clean = item.name.strip()
        existing = s.query(User).filter_by(email=email_clean).first()
        student_user = existing

        if not existing:
            pwd_raw = item.password if (item.password and len(item.password) >= 6) else data.default_password
            role_val = item.role.value if item.role else Role.STUDENT.value
            student_user = User(
                name=name_clean,
                email=email_clean,
                password_hash=pwd.hash(pwd_raw),
                role=role_val,
                roll_number=item.roll_number,
                department=item.department,
                semester=item.semester,
                active=True,
            )
            s.add(student_user)
            s.flush()  # populate ID
            created_count += 1
        else:
            skipped_count += 1

        # If course_id specified, enroll student automatically
        if target_course and student_user and student_user.role == Role.STUDENT.value:
            if not s.query(Enrollment).filter_by(student_id=student_user.id, course_id=target_course.id).first():
                s.add(Enrollment(student_id=student_user.id, course_id=target_course.id))
                enrolled_count += 1

    log_audit(s, action="BULK_IMPORT", target_type="users", details=f"Admin {admin.name} imported {len(data.users)} student records ({created_count} created, {enrolled_count} enrolled)", user_id=admin.id)
    s.commit()
    return {
        "created": created_count,
        "skipped": skipped_count,
        "enrolled": enrolled_count,
        "total_processed": len(data.users),
        "message": f"Processed {len(data.users)} records: {created_count} new students created, {skipped_count} existing, {enrolled_count} enrolled.",
    }

@app.post("/admin/users/{user_id}/reset-device")
def reset_user_device(user_id: int, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    user = s.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    old_dev = user.bound_device_id or "none"
    user.bound_device_id = None
    user.device_bound_at = None
    log_audit(s, action="DEVICE_RESET", target_type="user", target_id=user.id, details=f"Admin {admin.name} reset device binding for {user.name} (previously: {old_dev[:12]}...)", user_id=admin.id)
    s.commit()
    return {"message": f"Hardware device binding for {user.name} has been reset. They can now bind their account to a new device upon next scan."}

@app.get("/admin/audit-logs")
def get_audit_logs(limit: int = 100, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    logs = s.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    res = []
    for x in logs:
        actor_user = s.get(User, x.user_id) if x.user_id else None
        res.append({
            "id": x.id,
            "user_id": x.user_id,
            "actor_name": actor_user.name if actor_user else "System / Automated",
            "actor_role": actor_user.role if actor_user else "system",
            "action": x.action,
            "target_type": x.target_type,
            "target_id": x.target_id,
            "details": x.details,
            "created_at": x.created_at,
        })
    return res

@app.get("/admin/timetable")
def get_timetable(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    slots = s.query(TimetableSlot).all()
    res = []
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    for slot in slots:
        c = s.get(Course, slot.course_id)
        room = s.get(Classroom, slot.classroom_id)
        teacher = s.get(User, c.teacher_id) if c else None
        res.append({
            "id": slot.id,
            "course_id": slot.course_id,
            "course_code": c.code if c else "",
            "course_name": c.name if c else "",
            "section": c.section if c else "",
            "classroom_id": slot.classroom_id,
            "room_number": room.room_number if room else "",
            "building": room.building if room else "",
            "teacher_name": teacher.name if teacher else "",
            "day_of_week": slot.day_of_week,
            "day_name": days[slot.day_of_week] if 0 <= slot.day_of_week < 7 else "",
            "start_time": slot.start_time,
            "end_time": slot.end_time,
        })
    return res

@app.post("/admin/timetable")
def create_timetable_slot(data: TimetableSlotIn, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    c = s.get(Course, data.course_id)
    if not c:
        raise HTTPException(404, "Course not found")
    room = s.get(Classroom, data.classroom_id)
    if not room:
        raise HTTPException(404, "Classroom not found")
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    slot = TimetableSlot(
        course_id=data.course_id,
        classroom_id=data.classroom_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
    )
    s.add(slot)
    log_audit(s, action="TIMETABLE_CREATE", target_type="timetable_slot", details=f"Admin {admin.name} scheduled {c.code} on {days[data.day_of_week]} ({data.start_time} - {data.end_time}) in {room.room_number}", user_id=admin.id)
    s.commit()
    return {"id": slot.id, "message": "Timetable slot scheduled successfully."}

@app.delete("/admin/timetable/{slot_id}")
def delete_timetable_slot(slot_id: int, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    slot = s.get(TimetableSlot, slot_id)
    if not slot:
        raise HTTPException(404, "Slot not found")
    s.delete(slot)
    log_audit(s, action="TIMETABLE_DELETE", target_type="timetable_slot", target_id=slot_id, details=f"Admin {admin.name} removed timetable slot #{slot_id}", user_id=admin.id)
    s.commit()
    return {"message": "Timetable slot deleted"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, s: Session = Depends(db), admin: User = Depends(require(Role.ADMIN))):
    if user_id == admin.id:
        raise HTTPException(400, "Cannot delete your own admin account")
    user = s.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    s.query(Enrollment).filter_by(student_id=user_id).delete()
    s.delete(user)
    log_audit(s, action="USER_DELETE", target_type="user", target_id=user_id, details=f"Admin {admin.name} deleted user {user.name} ({user.email})", user_id=admin.id)
    s.commit()
    return {"message": "User deleted"}

@app.get("/admin/classrooms")
def classrooms(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    return [
        {
            "id": x.id,
            "building": x.building,
            "room_number": x.room_number,
            "floor": x.floor,
            "latitude": x.latitude,
            "longitude": x.longitude,
            "radius_m": x.radius_m,
        }
        for x in s.query(Classroom).order_by(Classroom.room_number)
    ]

@app.post("/admin/classrooms")
def classroom(data: ClassroomIn, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    existing = s.query(Classroom).filter_by(room_number=data.room_number).first()
    if existing:
        raise HTTPException(409, f"Room '{data.room_number}' already exists")
    row = Classroom(**data.model_dump())
    s.add(row)
    s.commit()
    return {"id": row.id, "room_number": row.room_number}

@app.delete("/admin/classrooms/{classroom_id}")
def delete_classroom(classroom_id: int, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    c = s.get(Classroom, classroom_id)
    if not c:
        raise HTTPException(404, "Classroom not found")
    s.delete(c)
    s.commit()
    return {"message": "Classroom deleted"}

@app.get("/admin/courses")
def courses(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    res = []
    for x in s.query(Course).order_by(Course.code):
        teacher = s.get(User, x.teacher_id)
        room = s.get(Classroom, x.classroom_id)
        enrolled_count = s.query(Enrollment).filter_by(course_id=x.id).count()
        res.append({
            "id": x.id,
            "code": x.code,
            "name": x.name,
            "section": x.section,
            "teacher_id": x.teacher_id,
            "teacher": teacher.name if teacher else "Unassigned",
            "classroom_id": x.classroom_id,
            "classroom": room.room_number if room else "Unassigned",
            "enrolled_count": enrolled_count,
        })
    return res

@app.post("/admin/courses")
def course(data: CourseIn, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    if not s.get(Classroom, data.classroom_id):
        raise HTTPException(404, "Classroom not found")
    teacher = s.get(User, data.teacher_id)
    if not teacher or teacher.role != Role.TEACHER.value:
        raise HTTPException(422, "Selected user is not a teacher")
    if s.query(Course).filter_by(code=data.code).first():
        raise HTTPException(409, f"Course code '{data.code}' already exists")
    row = Course(**data.model_dump())
    s.add(row)
    s.commit()
    return {"id": row.id, "code": row.code}

@app.delete("/admin/courses/{course_id}")
def delete_course(course_id: int, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    c = s.get(Course, course_id)
    if not c:
        raise HTTPException(404, "Course not found")
    s.query(Enrollment).filter_by(course_id=course_id).delete()
    s.delete(c)
    s.commit()
    return {"message": "Course deleted"}

@app.get("/admin/enrollments")
def get_enrollments(s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    res = []
    for e in s.query(Enrollment).all():
        student = s.get(User, e.student_id)
        course = s.get(Course, e.course_id)
        if student and course:
            res.append({
                "id": e.id,
                "student_id": e.student_id,
                "student_name": student.name,
                "student_email": student.email,
                "course_id": e.course_id,
                "course_code": course.code,
                "course_name": course.name,
                "course_section": course.section,
            })
    return res

@app.post("/admin/enrollments")
def enroll(data: EnrollmentIn, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    student = s.get(User, data.student_id)
    if not student or student.role != Role.STUDENT.value:
        raise HTTPException(422, "Selected user is not a student")
    if not s.get(Course, data.course_id):
        raise HTTPException(404, "Course not found")
    if s.query(Enrollment).filter_by(student_id=data.student_id, course_id=data.course_id).first():
        raise HTTPException(409, "Student is already enrolled in this course")
    row = Enrollment(**data.model_dump())
    s.add(row)
    s.commit()
    return {"id": row.id}

@app.delete("/admin/enrollments/{enrollment_id}")
def delete_enrollment(enrollment_id: int, s: Session = Depends(db), _: User = Depends(require(Role.ADMIN))):
    e = s.get(Enrollment, enrollment_id)
    if not e:
        raise HTTPException(404, "Enrollment not found")
    s.delete(e)
    s.commit()
    return {"message": "Enrollment removed"}

# --- TEACHER ENDPOINTS ---
@app.get("/teacher/courses")
def teacher_courses(s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    return [
        {
            "id": x.id,
            "code": x.code,
            "name": x.name,
            "section": x.section,
            "room": s.get(Classroom, x.classroom_id).room_number if s.get(Classroom, x.classroom_id) else "N/A",
        }
        for x in s.query(Course).filter_by(teacher_id=teacher.id)
    ]

@app.get("/teacher/schedule/today")
def get_teacher_today_schedule(s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    today_dow = datetime.utcnow().weekday()  # 0 = Monday ... 6 = Sunday
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    slots = (
        s.query(TimetableSlot)
        .join(Course, Course.id == TimetableSlot.course_id)
        .filter(Course.teacher_id == teacher.id, TimetableSlot.day_of_week == today_dow)
        .order_by(TimetableSlot.start_time)
        .all()
    )

    res = []
    for slot in slots:
        c = s.get(Course, slot.course_id)
        room = s.get(Classroom, slot.classroom_id)
        res.append({
            "id": slot.id,
            "course_id": slot.course_id,
            "course_code": c.code if c else "",
            "course_name": c.name if c else "",
            "section": c.section if c else "",
            "classroom_id": slot.classroom_id,
            "room_number": room.room_number if room else "",
            "building": room.building if room else "",
            "day_name": days[today_dow],
            "start_time": slot.start_time,
            "end_time": slot.end_time,
        })
    return {"today": days[today_dow], "slots": res}

@app.post("/teacher/sessions")
def create_session(data: SessionIn, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    course = teacher_course(s, data.course_id, teacher)
    now = datetime.utcnow()
    row = AttendanceSession(
        course_id=course.id,
        teacher_id=teacher.id,
        token=secrets.token_urlsafe(32),
        prev_token=None,
        starts_at=now,
        expires_at=now + timedelta(minutes=data.duration_minutes),
    )
    s.add(row)
    s.flush()
    log_audit(s, action="SESSION_START", target_type="attendance_session", target_id=row.id, details=f"Faculty {teacher.name} launched live session for {course.code} ({data.duration_minutes}m duration)", user_id=teacher.id)
    s.commit()
    return qr_payload(row)

@app.post("/teacher/sessions/{session_id}/refresh-qr")
def refresh_qr(session_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    row = s.get(AttendanceSession, session_id)
    if not row or row.teacher_id != teacher.id or not row.active or row.expires_at < datetime.utcnow():
        raise HTTPException(400, "Attendance session is unavailable")
    row.prev_token = row.token  # Retain previous token for grace window
    row.token = secrets.token_urlsafe(32)
    s.commit()
    return qr_payload(row)

@app.post("/teacher/sessions/{session_id}/close")
def close_session(session_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    row = s.get(AttendanceSession, session_id)
    if not row or row.teacher_id != teacher.id:
        raise HTTPException(404, "Session not found")
    row.active = False
    course = s.get(Course, row.course_id)
    if course:
        low_notifications(s, course)
    log_audit(s, action="SESSION_END", target_type="attendance_session", target_id=row.id, details=f"Faculty {teacher.name} closed attendance session #{session_id} for {course.code if course else 'course'}", user_id=teacher.id)
    s.commit()
    return {"message": "Session closed; low-attendance notifications updated."}

@app.get("/teacher/sessions/{session_id}/roster")
def roster(session_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    row = s.get(AttendanceSession, session_id)
    if not row or row.teacher_id != teacher.id:
        raise HTTPException(404, "Session not found")
    res = []
    for x in s.query(Attendance).filter_by(session_id=session_id).order_by(Attendance.marked_at.desc()):
        st_user = s.get(User, x.student_id)
        res.append({
            "student_id": x.student_id,
            "name": st_user.name if st_user else "Unknown",
            "roll_number": st_user.roll_number if st_user else "",
            "department": st_user.department if st_user else "",
            "status": x.status,
            "marked_at": x.marked_at,
            "distance_m": round(x.distance_m, 1),
        })
    return res

@app.get("/teacher/sessions/{session_id}/enrolled-status")
def enrolled_status(session_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    row = s.get(AttendanceSession, session_id)
    if not row or row.teacher_id != teacher.id:
        raise HTTPException(404, "Session not found")
    enrolled = s.query(User).join(Enrollment, Enrollment.student_id == User.id).filter(Enrollment.course_id == row.course_id).order_by(User.name).all()
    attendances = {a.student_id: a for a in s.query(Attendance).filter_by(session_id=session_id).all()}
    res = []
    for st in enrolled:
        att = attendances.get(st.id)
        res.append({
            "student_id": st.id,
            "name": st.name,
            "email": st.email,
            "roll_number": st.roll_number or f"ID #{st.id}",
            "department": st.department or "N/A",
            "bound_device_id": st.bound_device_id,
            "marked": bool(att),
            "status": att.status if att else "absent",
            "marked_at": att.marked_at if att else None,
            "distance_m": round(att.distance_m, 1) if att else None,
        })
    return res

@app.post("/teacher/sessions/{session_id}/manual-mark")
def manual_mark(session_id: int, data: ManualMarkIn, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    row = s.get(AttendanceSession, session_id)
    if not row or row.teacher_id != teacher.id:
        raise HTTPException(404, "Session not found")
    if not s.query(Enrollment).filter_by(student_id=data.student_id, course_id=row.course_id).first():
        raise HTTPException(400, "Student is not enrolled in this course")
    st_user = s.get(User, data.student_id)
    att = s.query(Attendance).filter_by(session_id=session_id, student_id=data.student_id).first()
    old_status = att.status if att else "unmarked"
    if att:
        att.status = data.status
        att.marked_at = datetime.utcnow()
    else:
        att = Attendance(session_id=session_id, student_id=data.student_id, marked_at=datetime.utcnow(), distance_m=0.0, gps_accuracy_m=0.0, status=data.status)
        s.add(att)
    
    log_audit(
        s,
        action="MANUAL_MARK",
        target_type="attendance",
        target_id=att.id,
        details=f"Faculty {teacher.name} changed attendance for student {st_user.name if st_user else data.student_id} from {old_status.upper()} to {data.status.upper()} (Reason: {data.reason})",
        user_id=teacher.id,
    )
    s.commit()
    return {"message": f"Student marked as {data.status}"}

@app.get("/teacher/courses/{course_id}/report")
def teacher_report(course_id: int, threshold: float = 75.0, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    course = teacher_course(s, course_id, teacher)
    rows = report_rows(s, course)
    # augment with roll_number and department
    for r in rows:
        st_obj = s.get(User, r["student_id"])
        r["roll_number"] = st_obj.roll_number if st_obj and st_obj.roll_number else f"ID #{r['student_id']}"
        r["department"] = st_obj.department if st_obj and st_obj.department else "General"
    return {
        "course": {"code": course.code, "name": course.name, "section": course.section},
        "threshold": threshold,
        "students": [{**x, "is_defaulter": x["percentage"] < threshold} for x in rows],
    }

@app.get("/teacher/courses/{course_id}/report.csv")
def report_csv(course_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    course = teacher_course(s, course_id, teacher)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll No", "Student Name", "Email", "Department", "Present Sessions", "Total Sessions", "Attendance %"])
    for row in report_rows(s, course):
        st_obj = s.get(User, row["student_id"])
        roll = st_obj.roll_number if st_obj and st_obj.roll_number else f"ID #{row['student_id']}"
        dept = st_obj.department if st_obj and st_obj.department else "General"
        writer.writerow([roll, row["name"], row["email"], dept, row["present"], row["total"], row["percentage"]])
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{course.code}-attendance.csv"'})

@app.get("/teacher/courses/{course_id}/report.pdf")
def report_pdf(course_id: int, s: Session = Depends(db), teacher: User = Depends(require(Role.TEACHER))):
    course = teacher_course(s, course_id, teacher)
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    pdf.setTitle(f"{course.code} attendance report")
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(50, 800, f"Attendance report — {course.code}")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, 782, f"{course.name} | Section: {course.section}")
    y = 750
    for row in report_rows(s, course):
        st_obj = s.get(User, row["student_id"])
        roll = st_obj.roll_number if st_obj and st_obj.roll_number else f"ID #{row['student_id']}"
        pdf.drawString(50, y, f"[{roll}] {row['name']} — {row['present']}/{row['total']} ({row['percentage']}%)")
        y -= 18
        if y < 50:
            pdf.showPage()
            y = 800
    pdf.save()
    output.seek(0)
    return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{course.code}-attendance.pdf"'})

# --- STUDENT ENDPOINTS ---
@app.post("/student/check-in")
def checkin(data: CheckIn, s: Session = Depends(db), student: User = Depends(require(Role.STUDENT))):
    row = s.query(AttendanceSession).filter(
        or_(AttendanceSession.token == data.token, AttendanceSession.prev_token == data.token),
        AttendanceSession.active == True
    ).first()
    if not row or row.expires_at < datetime.utcnow():
        raise HTTPException(400, "QR session is expired or invalid")
    if not s.query(Enrollment).filter_by(student_id=student.id, course_id=row.course_id).first():
        raise HTTPException(403, "You are not enrolled in this class")
    if s.query(Attendance).filter_by(session_id=row.id, student_id=student.id).first():
        raise HTTPException(409, "Attendance already marked for this session")

    # Anti-Proxy Device Hardware Binding Verification
    if data.device_id:
        if not student.bound_device_id:
            student.bound_device_id = data.device_id
            student.device_bound_at = datetime.utcnow()
            log_audit(s, action="DEVICE_BOUND", target_type="user", target_id=student.id, details=f"Student {student.name} bound account to device ID {data.device_id[:16]}...", user_id=student.id)
        elif student.bound_device_id != data.device_id:
            log_audit(s, action="DEVICE_MISMATCH_REJECTED", target_type="user", target_id=student.id, details=f"Rejected scan attempt for {student.name}: Incoming device {data.device_id[:12]}... did not match bound device {student.bound_device_id[:12]}...", user_id=student.id)
            s.commit()
            raise HTTPException(
                403,
                "🔒 Device Mismatch Security Error: This student account is registered to another phone/browser. Proxy attendance is strictly prohibited. If you switched devices, ask your Professor or Admin to reset your registered device."
            )

    course = s.get(Course, row.course_id)
    room = s.get(Classroom, course.classroom_id) if course else None
    if not room:
        raise HTTPException(500, "Classroom configuration missing")
    metres = distance(data.latitude, data.longitude, room.latitude, room.longitude)
    if metres > room.radius_m:
        raise HTTPException(403, f"Outside classroom geofence ({metres:.1f}m away; maximum radius is {room.radius_m}m)")
    if data.gps_accuracy_m > max(room.radius_m * 1.5, 45.0):
        raise HTTPException(422, f"GPS accuracy is too low (±{data.gps_accuracy_m:.1f}m). Please move closer to a window and retry.")
    
    s.add(Attendance(session_id=row.id, student_id=student.id, marked_at=datetime.utcnow(), distance_m=metres, gps_accuracy_m=data.gps_accuracy_m, status="present"))
    s.commit()
    return {"status": "present", "distance_m": round(metres, 2), "message": "✓ Verified Location & Device: Attendance marked successfully!"}

@app.get("/student/dashboard")
def student_dashboard(s: Session = Depends(db), student: User = Depends(require(Role.STUDENT))):
    courses = s.query(Course).join(Enrollment, Enrollment.course_id == Course.id).filter(Enrollment.student_id == student.id).all()
    result = []
    for course in courses:
        percentage = next((x["percentage"] for x in report_rows(s, course) if x["student_id"] == student.id), 0)
        result.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "section": course.section,
            "percentage": percentage,
        })
    return {
        "student": {
            "name": student.name,
            "email": student.email,
            "roll_number": student.roll_number or f"ID #{student.id}",
            "department": student.department or "General",
            "semester": student.semester or 1,
            "is_device_bound": bool(student.bound_device_id),
            "device_bound_at": student.device_bound_at,
        },
        "courses": result,
    }

@app.get("/student/notifications")
def student_notifications(s: Session = Depends(db), student: User = Depends(require(Role.STUDENT))):
    return [
        {
            "id": x.id,
            "message": x.message,
            "created_at": x.created_at,
            "read": x.read,
        }
        for x in s.query(Notification).filter_by(student_id=student.id).order_by(Notification.created_at.desc())
    ]

