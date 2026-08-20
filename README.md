# Smart Attendance

Runnable FastAPI foundation for QR attendance, enrolment, and GPS geofence verification.

## Included features

- Camera-based student QR scanner
- QR tokens that rotate every 25 seconds during an active session
- Teacher live attendance roster
- Admin overview dashboard
- Course attendance percentage and defaulter report
- CSV and PDF report downloads
- Low-attendance notifications generated when a teacher closes a session

## Run

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the API.

Start the React app in a second terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## PostgreSQL

Install Docker Desktop, then start the included PostgreSQL container:

```powershell
docker compose up -d
```

Set this in `.env`, then restart FastAPI:

```env
DATABASE_URL=postgresql+psycopg://attendance:change-this-password@localhost:5432/attendance
```

## Important setup

Create users directly in the database only for development, or add an admin provisioning flow next. An account role is never chosen by public registration.

`POST /student/check-in` requires a valid QR token, active session, valid course enrolment, location within the classroom geofence, acceptable GPS accuracy, and no previous attendance record for the session.

Before production: use Alembic migrations, place secrets in a secret manager, add rate limiting and audit logs.

Passwords use PBKDF2-SHA256 in this starter for cross-platform compatibility; use Argon2id with an appropriate supported backend for production.
