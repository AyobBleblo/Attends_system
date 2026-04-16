# Alarab Attendance System - Backend Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Models & Relationships](#database-models--relationships)
5. [API Endpoints](#api-endpoints)
6. [Authentication & Authorization](#authentication--authorization)
7. [Core Features](#core-features)
8. [Deployment](#deployment)
9. [Development Setup](#development-setup)
10. [Key Design Decisions](#key-design-decisions)

---

## 🎯 Project Overview

The **Alarab Attendance System** is a university attendance management system that uses QR codes for tracking student attendance. The backend is built with Django and Django REST Framework, providing a robust REST API for the frontend to interact with.

### Key Features:
- **QR Code-based Attendance**: Professors generate QR codes for sessions, students scan to mark attendance
- **Role-based Access Control**: Admin, Professor, and Student roles with different permissions
- **Multi-semester Support**: Track attendance across different academic semesters
- **Reporting & Export**: CSV export of attendance records and comprehensive reports
- **Scalable Architecture**: Optimized for high-concurrency with connection pooling and gevent workers

---

## 🛠 Technology Stack

### Core Framework
- **Django 6.0.4**: Web framework with ORM, admin, and authentication
- **Django REST Framework 3.17.1**: REST API development
- **Simple JWT 5.5.1**: JWT-based authentication

### Database
- **PostgreSQL**: Primary database (via `psycopg2-binary`)
- **Connection Pooling**: `CONN_MAX_AGE=600` for persistent connections

### Utilities
- **QR Code Generation**: `qrcode[pil]` + `Pillow` for image generation
- **CORS**: `django-cors-headers` for cross-origin requests
- **Environment Management**: `python-dotenv` for `.env` configuration

### Production Server
- **Gunicorn**: WSGI HTTP server with `gthread` worker class
- **Docker**: Containerized deployment with multi-stage builds

---

## 📁 Project Structure

```
backend/
├── config/                      # Django project configuration
│   ├── settings.py             # Main settings (DB, middleware, REST, JWT)
│   ├── urls.py                 # Root URL routing
│   └── wsgi.py                 # WSGI application entry point
│
├── core/                       # Core models and utilities
│   ├── models.py              # Department, Semester
│   ├── views.py               # Stats, semester, department endpoints
│   ├── serializers.py         # DepartmentSerializer, SemesterSerializer
│   ├── urls.py                # /api/departments/, /api/semesters/, etc.
│   └── management/commands/   # Custom management commands
│       ├── seed_demo.py       # Seeds demo data
│       └── seed_test_students.py  # Seeds test students for load testing
│
├── accounts/                   # User management (Students & Professors)
│   ├── models.py              # Student, Professor (linked to Django User)
│   ├── views.py               # CRUD for students/professors, auth endpoints
│   ├── serializers.py         # StudentSerializer, ProfessorSerializer
│   ├── urls.py                # /api/students/, /api/professors/, etc.
│   └── management/commands/
│       └── seed_test_students.py  # Load testing student generation
│
├── courses/                    # Course management
│   ├── models.py              # Course, CourseAssignment
│   ├── views.py               # Course CRUD, nested assignment creation
│   ├── serializers.py         # CourseSerializer, CourseAssignmentSerializer
│   └── urls.py                # /api/courses/, /api/admin/assignments/, etc.
│
├── attendance/                 # Attendance tracking (core feature)
│   ├── models.py              # Enrollment, Session, Attendance
│   ├── views.py               # Session creation, QR generation, attendance scanning
│   ├── serializers.py         # SessionSerializer, AttendanceSerializer
│   ├── services.py            # Business logic for recording attendance
│   └── urls.py                # /api/sessions/, /api/attendance/, etc.
│
├── manage.py                   # Django CLI utility
├── requirements.txt            # Python dependencies
├── pyproject.toml             # Project metadata (uv package manager)
├── Dockerfile                  # Docker container configuration
├── entrypoint.sh              # Container startup script
├── .env                        # Environment variables
└── .dockerignore              # Docker ignore patterns
```

---

## 🗄 Database Models & Relationships

### Core Models (`core/models.py`)

#### **Department**
Represents an academic department.
```
Fields:
- name: CharField(100)
- code: CharField(20, unique, indexed)
```

#### **Semester**
Represents an academic semester with date range.
```
Fields:
- name: CharField(100)
- start_date: DateField
- end_date: DateField
- is_active: BooleanField (default=False, indexed)
```
**Important**: Only ONE semester can be active at a time. The `save()` method ensures this by deactivating all other semesters when one is activated.

---

### Account Models (`accounts/models.py`)

#### **Student**
Represents a university student.
```
Fields:
- user: OneToOneField(User, null=True) - Linked Django User
- student_id: CharField(20, unique, indexed)
- name: CharField(100)
- department: ForeignKey(Department, related_name='students')
```

#### **Professor**
Represents a university professor/instructor.
```
Fields:
- user: OneToOneField(User, null=True) - Linked Django User
- professor_id: CharField(20, unique, indexed)
- name: CharField(100)
- department: ForeignKey(Department, related_name='professors')
```

**Relationship**: Both Student and Professor have a `OneToOneField` to Django's `User` model, allowing authentication while maintaining separate profile data.

---

### Course Models (`courses/models.py`)

#### **Course**
Represents an academic course.
```
Fields:
- code: CharField(20, unique, indexed)
- name: CharField(100)
- department: ForeignKey(Department, related_name='courses')
```

#### **CourseAssignment**
Links a professor to a course for a specific semester.
```
Fields:
- professor: ForeignKey(Professor, related_name='course_assignments')
- course: ForeignKey(Course, related_name='assignments')
- semester: ForeignKey(Semester, related_name='course_assignments')
```
**Constraint**: `unique_together = ('professor', 'course', 'semester')`

---

### Attendance Models (`attendance/models.py`)

#### **Enrollment**
Tracks which students are enrolled in which courses per semester.
```
Fields:
- student: ForeignKey(Student, related_name='enrollments')
- course: ForeignKey(Course, related_name='enrollments')
- semester: ForeignKey(Semester, related_name='enrollments')
```
**Constraint**: `unique_together = ('student', 'course', 'semester')`

#### **Session**
Represents a single class session with a QR code.
```
Fields:
- course: ForeignKey(Course, related_name='sessions')
- professor: ForeignKey(Professor, related_name='sessions')
- semester: ForeignKey(Semester, related_name='sessions')
- date_time: DateTimeField (auto-created)
- qr_token: CharField(100, unique, indexed) - UUID token
- qr_expires_at: DateTimeField - Expiration time (15 min by default)
```
**Auto-generation**: 
- `qr_token` is auto-generated as UUID4
- `qr_expires_at` defaults to 15 minutes from creation

#### **Attendance**
Records a student's attendance for a session.
```
Fields:
- session: ForeignKey(Session, related_name='attendances')
- student: ForeignKey(Student, related_name='attendances')
- course: ForeignKey(Course, null=True, related_name='attendance_records')
- date: DateField (auto-filled, null=True for backward compatibility)
- scanned_at: DateTimeField (auto-created)
- status: CharField (choices: 'present', 'late', 'absent')
```
**Constraint**: `unique_together = ('student', 'course', 'date')` - Prevents duplicate attendance for the same student/course/date.

---

### Entity Relationship Diagram

```
┌─────────────┐
│  Department │
└──────┬──────┘
       │ 1
       │
       ├───────────────────────┐
       │                       │
       │ N                     │ N
┌──────┴──────┐         ┌──────┴──────┐
│   Student   │         │   Course    │
└──────┬──────┘         └──────┬──────┘
       │ N                     │ 1
       │                       │
       ├────── N            ┌──┴────┐
       │                    │  1    │
┌──────┴──────┐    ┌───────┴───────┐
│ Enrollment  │    │   Session     │
└─────────────┘    └───────┬───────┘
       │                   │ N
       │                   │
       └─────────┬─────────┘
                 │
          ┌──────┴──────┐
          │ Attendance  │
          └─────────────┘

┌─────────────┐
│  Professor  │
└──────┬──────┘
       │ N
       │
┌──────┴──────────┐
│CourseAssignment │
└─────────────────┘
```

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login/` | Obtain JWT token pair | Public |
| POST | `/api/auth/refresh/` | Refresh access token | Public |
| GET | `/api/auth/me/` | Get current user info & role | Authenticated |
| POST | `/api/auth/change-password/` | Change password | Authenticated |

### Core (Departments & Semesters)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/departments/` | List all departments | Public |
| GET | `/api/semesters/` | List all semesters | Public |
| GET | `/api/semesters/active/` | Get active semester | Public |
| GET | `/api/stats/` | Dashboard statistics | Public |

### Accounts (Students & Professors)
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/students/` | List all students | Public |
| GET | `/api/professors/` | List all professors | Public |
| GET | `/api/professor/<id>/courses/` | Get professor's courses | Public |
| GET | `/api/admin/students/` | CRUD students (admin) | Admin |
| POST | `/api/admin/students/<id>/reset_password/` | Reset password to default | Admin |
| POST | `/api/admin/students/<id>/set_custom_password/` | Set custom password | Admin |
| GET | `/api/admin/professors/` | CRUD professors (admin) | Admin |
| POST | `/api/admin/professors/<id>/reset_password/` | Reset password to default | Admin |
| POST | `/api/admin/professors/<id>/set_custom_password/` | Set custom password | Admin |

### Courses
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/courses/` | List all courses | Public |
| GET | `/api/admin/courses/` | CRUD courses (admin) | Admin |
| GET | `/api/admin/assignments/` | CRUD assignments (admin) | Admin |
| POST | `/api/courses/admin/nested-assign/` | Create Dept→Course→Professor→Assignment in one call | Admin |

### Attendance
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/sessions/create/` | Create a new session | Public* |
| GET | `/api/sessions/course/<course_id>/` | Get sessions for a course | Authenticated Professor |
| GET | `/api/sessions/<session_id>/qr/` | Get QR code image (base64) | Public |
| POST | `/api/attendance/scan/` | Scan QR and mark attendance | Public |
| GET | `/api/attendance/session/<session_id>/` | Get attendance for a session | Public |
| GET | `/api/attendance/report/` | Attendance report (filterable) | Public |
| GET | `/api/student/<student_id>/courses/` | Get student's courses with attendance stats | Public |
| GET | `/api/export/course/<course_id>/` | Export attendance as CSV | Authenticated Professor/Admin |
| GET | `/api/admin/enrollments/` | CRUD enrollments (admin) | Admin |

---

## 🔐 Authentication & Authorization

### JWT Authentication
The system uses **Simple JWT** for token-based authentication:
- **Access Token**: Valid for 8 hours
- **Refresh Token**: Valid for 7 days (with rotation)
- **Token Endpoint**: `/api/auth/login/` returns `{access, refresh}` tokens

### User Roles
1. **Admin** (`is_staff` or `is_superuser`)
   - Full access to all admin endpoints
   - Can create/manage students, professors, courses
   - Can reset passwords for any user

2. **Professor**
   - Has a `Professor` profile linked to Django `User`
   - Can create sessions for their assigned courses
   - Can view attendance reports for their courses
   - Can export attendance as CSV

3. **Student**
   - Has a `Student` profile linked to Django `User`
   - Can scan QR codes to mark attendance
   - Can view their courses and attendance statistics

### Permission Flow
```
Request → JWT Authentication → User Role Detection → Permission Check → Response
```

---

## ⚙ Core Features

### 1. QR Code Attendance Flow

**Step-by-Step Process:**

1. **Professor Creates Session**
   ```
   POST /api/sessions/create/
   Body: { professor_id, course_id }
   → Creates Session with UUID qr_token and 15-min expiration
   ```

2. **Generate QR Code**
   ```
   GET /api/sessions/<session_id>/qr/
   → Returns base64-encoded PNG QR image
   ```

3. **Student Scans QR**
   ```
   POST /api/attendance/scan/
   Body: { student_id, qr_token }
   → Validates and creates Attendance record
   ```

### 2. Attendance Validation Logic (`attendance/services.py`)

The `record_attendance()` function performs these checks:

1. ✅ **QR Token Exists**: Fast indexed lookup on `Session.qr_token`
2. ✅ **Student Exists**: Fast indexed lookup on `Student.student_id`
3. ✅ **QR Not Expired**: Compares `session.qr_expires_at` with current time
4. ✅ **Active Semester Match**: Session must belong to current active semester
5. ✅ **Student Enrolled**: Student must be enrolled in the session's course
6. ✅ **Professor Assigned**: Professor must be assigned to teach the course
7. ✅ **No Duplicate**: Unique constraint on `(student, course, date)`

**Optimization**: Early exit checks use indexed `.exists()` queries (< 1ms) before loading full objects.

### 3. Enrollment Management
- **Admin**: Manages enrollments via `/api/admin/enrollments/`
- **Automatic**: Enrollment links students to courses for a specific semester
- **Unique Constraint**: Prevents duplicate enrollments

### 4. Reporting & Export
- **Attendance Report**: Filterable by course, semester, professor
- **CSV Export**: Downloads complete attendance matrix with dates as columns
- **Student Dashboard**: Shows attendance percentage per course

### 5. Semester Management
- Only ONE active semester at a time (enforced in `Semester.save()`)
- Sessions, enrollments, and assignments are semester-scoped
- Active semester determines which data is visible/usable

---

## 🚀 Deployment

### Docker Deployment

**Dockerfile Breakdown:**
```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies for psycopg2 and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn gevent

COPY . /app/
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
```

### Entrypoint Script (`entrypoint.sh`)

The startup process:

1. **Wait for PostgreSQL**
   - Polls database until it accepts connections (max 30 attempts, 60s timeout)
   - Prevents migration failures on slow DB startup

2. **Database Migrations**
   ```bash
   python manage.py makemigrations --noinput
   python manage.py migrate --noinput
   ```

3. **Collect Static Files**
   ```bash
   python manage.py collectstatic --noinput
   ```

4. **Seed Demo Data**
   ```bash
   python manage.py seed_demo
   python manage.py seed_test_students --count 1000
   ```

5. **Create Superuser**
   - Creates `admin` user with password `Admin@1234`
   - Always refreshes password hash to match current config

6. **Start Gunicorn**
   ```bash
   exec gunicorn config.wsgi:application \
       --bind 0.0.0.0:8000 \
       --workers 9 \
       --worker-class gthread \
       --threads 2 \
       --timeout 120 \
       --keep-alive 5 \
       --max-requests 1000 \
       --max-requests-jitter 50 \
       --access-logfile - \
       --error-logfile - \
       --log-level info
   ```

**Gunicorn Configuration:**
- **9 workers** × **2 threads** = 18 concurrent request slots
- **Worker class**: `gthread` (native threads, avoids gevent monkey-patching issues)
- **Timeout**: 120s (covers heavy PDF/report endpoints)
- **Max requests**: 1000 per worker with ±50 jitter (prevents memory leaks)
- **Keep-alive**: 5s for connection reuse

### WSGI Configuration (`config/wsgi.py`)

```python
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
```

This is the standard Django WSGI entry point. Gunicorn loads this `application` object to serve HTTP requests.

### Environment Variables (`.env`)
```env
SECRET_KEY=django-insecure-university-attend-sys-secret-k3y!@#$%^&*()_+
DEBUG=True
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=P@123456
DB_HOST=postgres
DB_PORT=5432
ALLOWED_HOSTS=*
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://192.168.100.134:5173
```

### Database Configuration
- **Engine**: `django.db.backends.postgresql`
- **Connection Pooling**: `CONN_MAX_AGE=600` (10 minutes)
  - Critical for high-concurrency: avoids TCP+auth overhead on every request
  - Prevents reconnection storms with 25 workers × 100 students

---

## 💻 Development Setup

### Prerequisites
- Python 3.12+
- PostgreSQL
- `uv` package manager (or `pip`)

### Local Development

1. **Install Dependencies**
   ```bash
   cd backend
   uv sync  # or: pip install -r requirements.txt
   ```

2. **Set Up Environment**
   ```bash
   # Create .env file with your database credentials
   cp .env.example .env  # or create manually
   ```

3. **Run Migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create Superuser**
   ```bash
   python manage.py createsuperuser
   ```

5. **Seed Demo Data (Optional)**
   ```bash
   python manage.py seed_demo
   python manage.py seed_test_students --count 100
   ```

6. **Run Development Server**
   ```bash
   python manage.py runserver
   ```

7. **Access Admin Panel**
   - URL: `http://localhost:8000/admin/`
   - Login with superuser credentials

### Docker Development

```bash
# Build and run with Docker Compose (if available)
docker-compose up --build

# Or build/run manually
docker build -t attendance-backend .
docker run -p 8000:8000 --env-file .env attendance-backend
```

---

## 🎨 Key Design Decisions

### 1. **Why OneToOne to User instead of Custom User Model?**
- Simpler migration from existing Django projects
- Allows null users (imported data without auth)
- Keeps authentication separate from business logic

### 2. **Why Public Permissions on Many Endpoints?**
- Designed for internal university network
- QR scanning doesn't require authentication (student_id + token is sufficient)
- Can be tightened with `IsAuthenticated` if needed

### 3. **Why MD5 Password Hasher First?**
```python
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',  # First!
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    ...
]
```
- **Note**: This is for **legacy compatibility**. MD5 is NOT secure.
- In production, move `PBKDF2PasswordHasher` or `Argon2PasswordHasher` to first position.

### 4. **Connection Pooling Strategy**
- `CONN_MAX_AGE=600` keeps connections alive for 10 minutes
- Reduces overhead in high-concurrency scenarios
- Trade-off: More open connections vs. faster response times

### 5. **Early Exit Validation in `record_attendance()`**
```python
if not Session.objects.filter(qr_token=qr_token).exists():
    return {'success': False, 'error': 'Invalid QR code.'}
```
- Fast indexed checks (< 1ms) before expensive operations
- Prevents unnecessary object loading and database queries
- Improves performance under load (e.g., 100 students scanning simultaneously)

### 6. **Gunicorn Worker Configuration**
- **9 workers**: Optimized for 12-core CPU (leaves room for other processes like Locust testing)
- **2 threads per worker**: Balances I/O concurrency without excessive context switching
- **max-requests=1000**: Prevents memory leaks from long-running workers
- **max-requests-jitter=50**: Staggers worker restarts to avoid downtime

### 7. **Unique Constraints for Data Integrity**
- `Enrollment`: `(student, course, semester)` - No duplicate enrollments
- `Attendance`: `(student, course, date)` - No duplicate attendance per day
- `CourseAssignment`: `(professor, course, semester)` - No duplicate assignments
- Prevents race conditions and maintains data consistency

### 8. **Atomic Transactions**
- `record_attendance()` uses `transaction.atomic()` for IntegrityError handling
- `AdminStudentSerializer.create()` wraps User + Student creation in atomic block
- Ensures data consistency on failures

---

## 📊 Performance Considerations

### Database Optimization
1. **Indexed Fields**:
   - `student_id`, `professor_id`, `course.code`, `department.code`
   - `Session.qr_token`, `Semester.is_active`
2. **Composite Indexes**:
   - `Attendance`: `(student, course, date)` and `(session, student)`
   - `Session`: `(qr_token)` and `(course, semester)`
3. **select_related()**: Used extensively to avoid N+1 queries
4. **Only() and Defer()**: Used in hot paths to reduce data loading

### Caching Strategy
- **Not implemented yet** - Consider adding Redis/Memcached for:
  - Active semester lookup
  - Course assignments
  - Session QR tokens

### Scalability Notes
- **Horizontal Scaling**: Add more Gunicorn workers or run multiple containers behind a load balancer
- **Database Scaling**: PostgreSQL connection pooling (PgBouncer) for >1000 concurrent connections
- **Static Files**: Use CDN (e.g., AWS S3 + CloudFront) for production

---

## 🔧 Troubleshooting

### Common Issues

1. **PostgreSQL Connection Refused**
   - Ensure DB container is running
   - Check `DB_HOST`, `DB_PORT`, `DB_PASSWORD` in `.env`
   - Entrypoint script waits up to 60s for DB

2. **Migration Conflicts**
   ```bash
   python manage.py showmigrations
   python manage.py migrate --fake <app> <migration_number>
   ```

3. **JWT Token Expired**
   - Default: 8 hours access, 7 days refresh
   - Use `/api/auth/refresh/` with refresh token

4. **QR Code Not Working**
   - Check system time synchronization (QR expiration is time-based)
   - Verify active semester matches session semester

---

## 📝 API Usage Examples

### 1. Login as Professor
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "prof1", "password": "123456"}'
```
**Response**:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 2. Create Session
```bash
curl -X POST http://localhost:8000/api/sessions/create/ \
  -H "Content-Type: application/json" \
  -d '{"professor_id": 1, "course_id": 5}'
```
**Response**:
```json
{
  "id": 42,
  "course": 5,
  "date_time": "2025-04-14T10:30:00Z",
  "qr_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "qr_expires_at": "2025-04-14T10:45:00Z"
}
```

### 3. Get QR Code Image
```bash
curl http://localhost:8000/api/sessions/42/qr/
```
**Response**:
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 4. Student Scans QR
```bash
curl -X POST http://localhost:8000/api/attendance/scan/ \
  -H "Content-Type: application/json" \
  -d '{"student_id": "STU001", "qr_token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'
```
**Response**:
```json
{
  "success": true,
  "message": "Attendance recorded for John Doe.",
  "attendance_id": 123
}
```

### 5. Get Student's Courses with Attendance
```bash
curl http://localhost:8000/api/student/STU001/courses/
```
**Response**:
```json
{
  "student_id": "STU001",
  "name": "John Doe",
  "department": "Computer Science",
  "semester": "Spring 2025",
  "courses": [
    {
      "id": 5,
      "code": "CS101",
      "name": "Intro to CS",
      "attended_count": 8,
      "total_sessions": 10,
      "attendance_pct": 80
    }
  ]
}
```

---

## 📚 Additional Resources

- **Django Documentation**: https://docs.djangoproject.com/
- **DRF Documentation**: https://www.django-rest-framework.org/
- **Simple JWT**: https://django-rest-framework-simplejwt.readthedocs.io/
- **Gunicorn Docs**: https://docs.gunicorn.org/
- **PostgreSQL**: https://www.postgresql.org/docs/

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (when available)
5. Commit with conventional commit message
6. Push to the branch
7. Open a Pull Request

---

## 📄 License

[Specify License Here]

---

**Last Updated**: April 14, 2026  
**Version**: 0.1.0  
**Maintained By**: [Your Team/Organization]
