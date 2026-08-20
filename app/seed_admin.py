from app.main import SessionLocal, User, pwd, Role

ADMIN_NAME = "System Admin"
ADMIN_EMAIL = "admin@attendance.local"
ADMIN_PASSWORD = "Admin@12345"

db = SessionLocal()

try:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()

    if existing:
        print("Admin already exists.")
    else:
        admin = User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            password_hash=pwd.hash(ADMIN_PASSWORD),
            role=Role.ADMIN.value,
            active=True,
        )

        db.add(admin)
        db.commit()

        print("Admin created successfully.")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Password: {ADMIN_PASSWORD}")

finally:
    db.close()