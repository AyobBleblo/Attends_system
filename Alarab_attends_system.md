# Alarab Attendance System — Project Architecture

This document provides a comprehensive overview of the Alarab Attendance System project structure, components, and their relationships.

## 🏗️ System Overview

The system is a full-stack university attendance tracking application utilizing QR codes. It is built with a decoupled architecture consisting of a React frontend and a Django REST Framework backend, fully containerized with Docker.

---

## 🖥️ Frontend (React 18 + Vite)

**Path:** `frontend/`

The frontend is a modern SPA (Single Page Application) built with React and Vite. It handles role-based views for Admins, Professors, and Students.

| Component | Type | Description |
| :--- | :--- | :--- |
| `main.jsx` | Entry Point | Bootstraps the React application. |
| `App.jsx` | UI / Router | Manages application routing and protected paths. |
| `AuthContext.jsx` | Service | Manages global authentication state and JWT storage. |
| `axios.js` | API | Configured Axios instance with JWT interceptors. |
| `LoginPage.jsx` | UI | Authentication interface. |
| `Dashboard.jsx` | UI | General landing page. |
| `AdminDashboard.jsx` | UI | Administrative controls for users and courses. |
| `ProfessorView.jsx` | UI | Displays courses assigned to the logged-in professor. |
| `CourseDetails.jsx` | UI | Generates QR codes for specific class sessions. |
| `StudentScan.jsx` | UI | QR code scanner for students to mark attendance. |
| `AttendanceReport.jsx` | UI | Reporting interface with CSV export functionality. |

---

## ⚙️ Backend (Django 4 + DRF)

**Path:** `backend/`

The backend provides a RESTful API powered by Django and Django REST Framework. It manages business logic, authentication (JWT), and database persistence.

### Project Configuration
- **`manage.py`**: Entry point for Django CLI commands.
- **`settings.py`**: Central configuration including Database, JWT, and CORS settings.
- **`config/urls.py`**: Root URL router mapping API endpoints and the admin panel.

### Core Applications
- **`core/`**: Manages fundamental university data like Departments and Semesters.
- **`accounts/`**: Extends Django's User model for Students and Professors.
- **`courses/`**: Manages acadmic courses and their assignments to professors.
- **`attendance/`**: The heart of the system—manages Sessions, Enrollments, and Attendance records.

### Key Logic
- **`attendance/services.py`**: Contains the `record_attendance` function which performs critical validation (QR expiry, enrollment status, active semester) before recording attendance.

---

## 🗄️ Database (PostgreSQL 15)

**Engine:** `django.db.backends.postgresql`

The system uses PostgreSQL for reliable, relational data storage.

**Main Entities:**
- **Departments & Semesters** (System Configuration)
- **Students & Professors** (User Profiles)
- **Courses & Assignments** (Curriculum)
- **Sessions & Attendance** (Tracking Data)

---

## 🐳 Infrastructure & Deployment

The project is fully containerized for consistent development and production environments.

| File | Role |
| :--- | :--- |
| `docker-compose.yml` | Orchestrates the `db`, `backend`, and `frontend` services. |
| `backend/Dockerfile` | Builds the Python environment for the Django API. |
| `frontend/Dockerfile` | Multi-stage build (Node build -> Nginx hosting). |
| `frontend/nginx.conf` | Handles routing, static files, and reverse proxies API requests. |
| `backend/entrypoint.sh` | Orchestrates startup tasks like database migrations. |
| `backend/.env` | Environment-specific configuration. |

---

## 🔄 Relationships & Data Flow

1.  **Authentication**: Users login via the Frontend -> Backend returns JWT -> Frontend stores JWT and attaches to subsequent requests.
2.  **Session Creation**: Professor (Frontend) -> API (Backend) -> Creates `Session` with unique `qr_token` -> Returns to Frontend for QR display.
3.  **Marking Attendance**: Student (Frontend/Mobile) scans QR -> Sends `qr_token` + `student_id` to API -> Backend validates via `services.py` -> Creates `Attendance` record.
4.  **Reporting**: Frontend requests attendance data -> Backend aggregates across Sessions/Students -> Frontend renders and allows CSV download.
