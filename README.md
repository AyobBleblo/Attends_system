# University Attendance System

A modern full-stack web application designed for university professors to manage classroom attendance using dynamically generated QR codes, and for students to easily scan and register their presence.

## 🏗 Architecture

The project follows a decoupled architecture:
- **Backend**: Django 5.x + Django REST Framework + Simple JWT. Handles models, business logic, QR generation, validation, and Postgres database interactions.
- **Frontend**: React + Vite + React Router. A Single Page Application (SPA) that consumes the DRF APIs and provides role-based interfaces.
- **Database**: PostgreSQL (relational structure optimized for fast reads/unique constraints).

```
[Student Device] 📱 (React/Camera)  --> POST /api/attendance/scan/
                                                 |
                                                 v
[Professor Screen] 💻 (React/Display) <-- QR [Django Backend] <--> [PostgreSQL]
```

## 🛠 Prerequisites
- Python 3.12+ 
- Node.js 18+
- PostgreSQL
- `uv` package manager (`pip install uv`)

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Initialize uv project and install dependencies
uv sync

# Run database migrations
uv run python manage.py migrate

# (Optional) Seed the database with test data
uv run python manage.py seed
```

Make sure your `.env` in the `backend/` folder correctly points to your Postgres database:
```env
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (axios, react-router, qrcode, lucide)
npm install

# Start the Vite development server
npm run dev
```
The React app will be available at `http://localhost:5173`.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/login/` | Get JWT access and refresh tokens |
| `GET` | `/api/departments/` | List all academic departments |
| `GET` | `/api/semesters/active/` | Get the currently active semester |
| `GET` | `/api/professor/<id>/courses/` | Get courses assigned to a professor |
| `POST` | `/api/sessions/create/` | Create a session & generate QR token |
| `GET` | `/api/sessions/<id>/qr/` | Return QR code image (base64) |
| `POST` | `/api/attendance/scan/` | Submit `student_id` & `qr_token` |
| `GET` | `/api/attendance/session/<id>/`| Get live attendance for a session |
| `GET` | `/api/attendance/report/` | Get filtered attendance reports |

---

## 📊 Database ERD
The entity-relationship diagram is available as a standalone interactive HTML file.
Simply click to open **`erd.html`** in any web browser. It uses Mermaid.js and does not require a server to run.

---

## 🧪 Testing Checklist

- [x] **Admin configuration**: Departments, courses, professors, and active semester created (use `seed` script).
- [x] **Professor session creation**: Professor can select a course, start a session, and a QR code renders on screen.
- [x] **Student scan logic**: Submitting a valid `student_id` and the `qr_token` successfully creates an Attendance record.
- [x] **Duplicate prevention**: Scanning the exact same valid QR token twice with the same Student ID returns a sensible rejection error.
- [x] **QR Expiration**: QR token expires after 15 minutes and correctly rejects scans after expiry.
- [x] **Reporting**: Admin/Professor can view the tabular report and download it as CSV.
