# 📚 The Alarab Attendance System — Backend Explained (Teacher Edition)

> **هذا الملف يشرح كل شيء في الـ backend خطوة بخطوة، كأنك مع أستاذ يشرح لك.**
> Everything is broken down from scratch — no assumptions made.

---

## 🗂️ Table of Contents

1. [What is the Backend?](#1-what-is-the-backend)
2. [How Django Works — The Big Picture](#2-how-django-works--the-big-picture)
3. [Project Structure Overview](#3-project-structure-overview)
4. [Configuration — `config/`](#4-configuration--config)
5. [The Database — How Data is Stored](#5-the-database--how-data-is-stored)
6. [App: `core` — Foundation Models](#6-app-core--foundation-models)
7. [App: `accounts` — Users, Students & Professors](#7-app-accounts--users-students--professors)
8. [App: `courses` — Courses & Assignments](#8-app-courses--courses--assignments)
9. [App: `attendance` — The Heart of the System](#9-app-attendance--the-heart-of-the-system)
10. [Serializers — From Python to JSON](#10-serializers--from-python-to-json)
11. [Views — The Request Handlers](#11-views--the-request-handlers)
12. [URL Routing — How Requests Find Their Handler](#12-url-routing--how-requests-find-their-handler)
13. [The QR Attendance Flow — Step by Step](#13-the-qr-attendance-flow--step-by-step)
14. [The Lecture Tracking Service](#14-the-lecture-tracking-service)
15. [Authentication — JWT Tokens](#15-authentication--jwt-tokens)
16. [Docker & Startup — `entrypoint.sh`](#16-docker--startup--entrypointsh)
17. [Complete API Reference Table](#17-complete-api-reference-table)

---

## 1. What is the Backend?

Think of the system as a restaurant:

- **The Frontend (React app)** = the dining room where customers sit. It's what users *see*.
- **The Backend (Django)** = the kitchen. It does all the real work — cooking the data, storing it, validating it, and sending it back.
- **The Database (PostgreSQL)** = the pantry/fridge. It permanently stores everything.

The backend is built with **Django** (a Python framework) and exposes a **REST API** — meaning the frontend talks to it via HTTP requests (`GET`, `POST`, `PUT`, `DELETE`) and everything is exchanged as **JSON** data.

---

## 2. How Django Works — The Big Picture

When the frontend sends a request, this is the exact journey it takes:

```
Browser/Frontend
      │
      │  HTTP Request (e.g. POST /api/attendance/scan/)
      ▼
  Nginx (reverse proxy)
      │
      ▼
  Gunicorn (Python web server — runs Django)
      │
      ▼
  Django Middleware Stack
  (security, CORS, auth, sessions...)
      │
      ▼
  URL Router (config/urls.py → app urls.py)
      │
      ▼
  View (the function/class that handles the request)
      │
      ├─ validates data with a Serializer
      ├─ queries the Database via Models
      ├─ runs business logic (services)
      │
      ▼
  JSON Response sent back to browser
```

Every Django project is split into **apps** — self-contained modules that each handle one area of responsibility. Our backend has 4 apps:

| App | Responsibility |
|-----|---------------|
| `core` | Shared building blocks: Departments, Semesters, Notifications |
| `accounts` | Students & Professors (people) |
| `courses` | Courses & who teaches what |
| `attendance` | Sessions, QR codes, scanning, reports |

---

## 3. Project Structure Overview

```
backend/
│
├── config/              ← Django project settings & root URL config
│   ├── settings.py      ← All configuration lives here
│   ├── urls.py          ← The "reception desk" — routes ALL incoming URLs
│   └── wsgi.py          ← The entry point for Gunicorn (production server)
│
├── core/                ← App 1: Foundation — Dept, Semester, Notifications
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── accounts/            ← App 2: People — Students & Professors
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── courses/             ← App 3: Courses & Teaching assignments
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── tracking_service.py  ← Monitors lecture compliance
│
├── attendance/          ← App 4: The core feature — QR, Sessions, Records
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── services.py      ← The `record_attendance` business logic
│
├── manage.py            ← The Django command-line tool
├── entrypoint.sh        ← Docker startup script
├── Dockerfile           ← How to build the Docker container
├── requirements.txt     ← All Python packages needed
└── .env                 ← Secret environment variables (DB password, etc.)
```

---

## 4. Configuration — `config/`

### `config/settings.py` — The Brain of Django

This file tells Django *everything* about how to run. Let's go section by section:

#### 🔑 Secret Key & Debug Mode
```python
SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-secret-key-change-in-production')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
```
- `SECRET_KEY` — Django uses this to sign cookies, tokens, etc. **Must be secret in production.**
- `DEBUG = True` means Django shows detailed error pages. In production, set this to `False`.
- `os.getenv(...)` reads from the `.env` file — this way secrets are not hardcoded into the codebase.

#### 📦 Installed Apps
```python
INSTALLED_APPS = [
    'django.contrib.admin',    # The /admin/ interface
    'django.contrib.auth',     # User authentication system
    ...
    'rest_framework',          # Django REST Framework — makes building APIs easy
    'corsheaders',             # Allows the React frontend to call our API
    'core',
    'accounts',
    'courses',
    'attendance',
]
```
Think of `INSTALLED_APPS` like a list of plugins you're activating for your project.

#### 🔗 CORS (Cross-Origin Resource Sharing)
```python
CORS_ALLOW_ALL_ORIGINS = True
```
By default, browsers block JavaScript from talking to a different server (e.g., React on `localhost:3000` can't call Django on `localhost:8000`). This setting says "allow ALL origins." Fine for development, but in production you'd restrict it.

#### 🗄️ Database
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'attendance_db'),
        ...
        'CONN_MAX_AGE': 600,  # Keep connection alive for 10 minutes
    }
}
```
- We use **PostgreSQL** as our database (not SQLite which is Django's default).
- `CONN_MAX_AGE: 600` — instead of opening a new DB connection for every request (expensive!), we reuse connections for up to 10 minutes. Critical for handling 1000+ concurrent users.

#### 🔐 JWT & Authentication
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Default: open to everyone
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),   # Login stays valid 8 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),    # Refresh token valid 7 days
    'ROTATE_REFRESH_TOKENS': True,
}
```
- **JWT** = JSON Web Token. Instead of sessions (stored on the server), we give the user a signed "card" (token). The user sends this card with every request. No server-side session needed.
- Access token expires after **8 hours** — the user needs to log in again.
- Refresh token lasts **7 days** — can be used to get a new access token silently.

#### 🔒 Password Hashers
```python
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',   # ← FIRST = default
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    ...
]
```
> ⚠️ **Teacher Note:** MD5 is intentionally placed **first** to make it the default hasher. MD5 is fast (good for load-testing with 1000 users) but **NOT safe for real production systems**. PBKDF2 is the secure default you should use in a real app.

Passwords are NEVER stored as plain text. Django always **hashes** them — a one-way transformation.

---

### `config/urls.py` — The Reception Desk

```python
urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth — Login & token refresh
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # App URL groups (delegates to each app's urls.py)
    path('api/', include('core.urls')),
    path('api/', include('accounts.urls')),
    path('api/', include('courses.urls')),
    path('api/', include('attendance.urls')),
]
```

This is the "main switchboard." Every URL that comes in is checked here first:
- If it starts with `admin/` → goes to Django's built-in admin panel.
- If it starts with `api/auth/login/` → handles login (returns JWT tokens).
- If it starts with `api/` → delegates to one of the 4 apps.

The `include('core.urls')` means "go look in `core/urls.py` for the rest of the path."

---

## 5. The Database — How Data is Stored

The database is organized into **tables**. In Django, each **Model** = one table. Here is the full entity-relationship diagram of every table:

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐
│ Department  │◄──┬───│   Student    │       │    Professor     │
│─────────────│   │   │──────────────│       │──────────────────│
│ id          │   │   │ id           │       │ id               │
│ name        │   │   │ student_id   │       │ professor_id     │
│ code        │   │   │ name         │       │ name             │
└─────────────┘   │   │ department ──┼──────►│ department  ─────┼──► Department
                  │   │ student_major│       │ user (Django) ───┼──► User
                  │   │ user ────────┼──────►└──────────────────┘
                  │   └──────────────┘
                  │
                  │   ┌──────────────┐       ┌──────────────────┐
                  └───│   Course     │       │ CourseAssignment  │
                      │──────────────│       │──────────────────│
                      │ id           │       │ id               │
                      │ code         │       │ professor ───────┼──► Professor
                      │ name         │       │ course ──────────┼──► Course
                      │ department──►│       │ semester ────────┼──► Semester
                      └──────────────┘       │ expected_lectures│
                                             └──────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│   Semester   │       │  Enrollment  │       │    Session       │
│──────────────│       │──────────────│       │──────────────────│
│ id           │       │ id           │       │ id               │
│ name         │       │ student ─────┼──────►│ course ──────────┼──► Course
│ start_date   │       │ course ──────┼──────►│ professor ───────┼──► Professor
│ end_date     │       │ semester ────┼──────►│ semester ────────┼──► Semester
│ is_active    │       └──────────────┘       │ date_time        │
│ total_lectures│                             │ qr_token (UUID)  │
└──────────────┘                             │ qr_expires_at    │
                                             └──────────────────┘
                                                      │
                                             ┌──────────────────┐
                                             │   Attendance     │
                                             │──────────────────│
                                             │ id               │
                                             │ session ─────────┼──► Session
                                             │ student ─────────┼──► Student
                                             │ course ──────────┼──► Course
                                             │ date             │
                                             │ scanned_at       │
                                             │ status (present) │
                                             └──────────────────┘
```

---

## 6. App: `core` — Foundation Models

This app contains the *shared building blocks* that every other app depends on.

### `core/models.py`

#### 📁 `Department` Model
```python
class Department(models.Model):
    name = models.CharField(max_length=100)   # e.g. "Computer Science"
    code = models.CharField(max_length=20, unique=True, db_index=True)  # e.g. "CS"
```
- Represents an academic department (كلية / قسم).
- `unique=True` — no two departments can have the same code.
- `db_index=True` — PostgreSQL creates an index on this column, making lookups by `code` very fast.

---

#### 📅 `Semester` Model
```python
class Semester(models.Model):
    name = models.CharField(max_length=100)       # e.g. "Spring 2025"
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    total_lectures = models.PositiveSmallIntegerField(default=15)
```
- `is_active` — only ONE semester is active at a time. When a student scans QR, we check the active semester.
- `total_lectures` — the **quota**: maximum number of times a student can scan per course this semester.

The `save()` method has smart logic:
```python
def save(self, *args, **kwargs):
    if self.is_active:
        # Deactivate ALL other semesters first
        Semester.objects.exclude(pk=self.pk).update(is_active=False)
    super().save(*args, **kwargs)
```
> **Teacher Note:** This overrides Django's default save behavior. Before saving this semester as active, it automatically sets all *other* semesters to `is_active=False`. **This guarantees exactly one active semester at all times.** Smart!

---

#### 🔔 `Notification` Model
```python
class Notification(models.Model):
    class NotificationType(models.TextChoices):
        CONGRATULATION = 'congratulation', 'Congratulation'
        WARNING        = 'warning',        'Warning'

    professor    = models.ForeignKey('accounts.Professor', ...)
    message      = models.TextField()
    notification_type = models.CharField(choices=NotificationType.choices, ...)
    is_read      = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)
```
- Created by the Lecture Tracking Service automatically.
- Two types: 🎉 **Congratulation** (professor hit 100% lectures) or ⚠️ **Warning** (professor is behind with semester ending soon).
- `is_read` let's the frontend show "unread" badges.

---

### `core/views.py`

| View | What it does |
|------|-------------|
| `DepartmentListView` | Returns all departments |
| `SemesterListView` | Returns all semesters |
| `ActiveSemesterView` | Returns only the active semester |
| `StatsView` | Returns dashboard counters (total students, professors, etc.) |
| `AdminSemesterViewSet` | Full CRUD for semesters (admin only) |

`StatsView` is interesting — it's used by the Admin Dashboard homepage:
```python
return Response({
    'total_students': Student.objects.count(),
    'total_professors': Professor.objects.count(),
    'total_courses': Course.objects.count(),
    'total_departments': Department.objects.count(),
    'active_semester': semester_name,
})
```
One endpoint, five database counts, one response. Simple and efficient.

---

## 7. App: `accounts` — Users, Students & Professors

### `accounts/models.py`

#### 🎓 `Student` Model
```python
class Student(models.Model):
    user         = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, ...)
    student_id   = models.CharField(max_length=20, unique=True, db_index=True)
    name         = models.CharField(max_length=100)
    department   = models.ForeignKey(Department, ...)
    student_major = models.CharField(max_length=100, blank=True)
```

**Key design decision:** There are TWO "user" concepts working together:

1. **Django's built-in `User`** — handles login, password, and authentication.
2. **`Student` profile** — stores the student's academic info (ID, department, major).

They are linked by `OneToOneField` — one `User` has exactly one `Student` profile.

When someone logs in, Django checks the `User`. When we want to know their student ID or department, we look at `User.student_profile`.

`on_delete=models.SET_NULL` means: if the User account is deleted, we keep the Student record (just set `user = None`). This preserves academic records.

---

#### 👨‍🏫 `Professor` Model
```python
class Professor(models.Model):
    user          = models.OneToOneField(User, ...)
    professor_id  = models.CharField(max_length=20, unique=True)
    name          = models.CharField(max_length=100)
    department    = models.ForeignKey(Department, ...)
```
Same pattern as Student — linked to Django's User for auth. The `professor_profile` reverse relation lets us do `request.user.professor_profile` to get the professor from the logged-in user.

---

### `accounts/serializers.py`

Serializers convert Python objects (models) to JSON and back. We have two tiers:

#### Tier 1: Read-only Serializers (for listing)
```python
class StudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'student_major', 'username']
```
- `source='department.name'` — reaches across the relationship to get the department's name (not just its ID number). This prevents the frontend from needing a second API call just to display the name.

#### Tier 2: Admin Serializers (for creating/editing)
```python
class AdminStudentSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    ...

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        if not username:
            username = validated_data.get('student_id')  # Auto-generate!
        password = validated_data.pop('password')
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            student = Student.objects.create(user=user, **validated_data)
        return student
```

**Step-by-step what `create()` does:**

1. Pops `username` from the data (if not provided, uses the `student_id` as username automatically).
2. Pops `password` from the data.
3. Opens a **database transaction** (`transaction.atomic()`) — this means: if creating the User OR the Student fails, **both** are rolled back. You'll never have a User without a Student, or vice versa.
4. Creates the Django `User` (with hashed password via `create_user`).
5. Creates the `Student` profile and links it to the User.

`write_only=True` on `password` means: the password is accepted when creating/updating, but **never** returned in a response. Security!

---

### `accounts/views.py`

#### 🔑 `MeView` — Who Am I?
This is the most important view for the frontend. After logging in, the frontend calls `GET /api/auth/me/` to find out who the user is.

```python
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Check 1: Is this an admin?
        if user.is_staff or user.is_superuser:
            return Response({'role': 'admin', ...})

        # Check 2: Is this a professor?
        professor = Professor.objects.filter(user=user).first()
        if professor:
            return Response({'role': 'professor', 'courses': [...], ...})

        # Check 3: Is this a student?
        student = Student.objects.filter(user=user).first()
        if student:
            return Response({'role': 'student', 'courses': [...], ...})

        return Response({'error': 'No profile found'}, status=400)
```

This single endpoint returns different data depending on who is asking:
- **Admin** → gets admin dashboard data.
- **Professor** → gets their profile + their courses for this semester.
- **Student** → gets their profile + their enrolled courses.

The frontend uses `role` to decide which dashboard to show.

---

#### 👨‍💼 `AdminStudentViewSet` & `AdminProfessorViewSet`
These are **ModelViewSets** — a powerful Django REST Framework class that automatically provides:
- `GET /api/admin/students/` — list all students
- `POST /api/admin/students/` — create a new student
- `GET /api/admin/students/{id}/` — get one student
- `PUT /api/admin/students/{id}/` — update a student
- `DELETE /api/admin/students/{id}/` — delete a student

Plus custom actions:
```python
@action(detail=True, methods=['post'])
def reset_password(self, request, pk=None):
    student = self.get_object()
    student.user.set_password('123456')
    student.user.save()
    return Response({'status': 'Password reset to default successfully'})
```
This adds `POST /api/admin/students/{id}/reset_password/` automatically.

---

## 8. App: `courses` — Courses & Assignments

### `courses/models.py`

#### 📖 `Course` Model
```python
class Course(models.Model):
    code       = models.CharField(max_length=20, unique=True)  # e.g. "CS301"
    name       = models.CharField(max_length=100)               # e.g. "Data Structures"
    department = models.ForeignKey(Department, ...)
```
A course belongs to a department. `unique=True` on `code` means no duplicate course codes.

---

#### 📋 `CourseAssignment` Model
```python
class CourseAssignment(models.Model):
    professor         = models.ForeignKey(Professor, ...)
    course            = models.ForeignKey(Course, ...)
    semester          = models.ForeignKey(Semester, ...)
    expected_lectures = models.PositiveSmallIntegerField(default=15)

    class Meta:
        unique_together = ('professor', 'course', 'semester')
```
This is the **bridge table** that says "Professor X teaches Course Y in Semester Z."

- `unique_together` — a professor cannot be assigned to the same course twice in the same semester.
- `expected_lectures` — how many lectures the professor is *expected* to deliver. Used by the compliance tracking service.

---

### `courses/serializers.py` — The Nested Assignment Serializer

This is one of the most powerful serializers in the project:

```python
class NestedCourseAssignmentSerializer(serializers.Serializer):
    """
    One HTTP request creates the entire chain:
    Department → Course → Professor (with User) → CourseAssignment
    """
    def create(self, validated_data):
        with transaction.atomic():
            department, _ = Department.objects.get_or_create(code=..., defaults={...})
            course, _     = Course.objects.get_or_create(code=..., defaults={...})
            # Professor: only create if doesn't exist
            if not Professor.objects.filter(professor_id=...).exists():
                user = User.objects.create(...)
                professor = Professor.objects.create(user=user, ...)
            semester = Semester.objects.get(name=...)
            assignment, created = CourseAssignment.objects.get_or_create(...)
        return {...}
```

**`get_or_create()`** — tries to find a record first; only creates it if it doesn't exist. This makes the operation **idempotent** — you can call it multiple times without creating duplicates. Perfect for seeding demo data.

---

### `courses/tracking_service.py` — Lecture Compliance Monitor

This service monitors whether professors are delivering enough lectures. It's called automatically every time a session is created.

#### `calculate_coverage(assignment)` function
```python
def calculate_coverage(assignment):
    actual = Session.objects.filter(
        professor_id=assignment.professor_id,
        course_id=assignment.course_id,
        semester_id=assignment.semester_id,
    ).annotate(
        lecture_date=TruncDate('date_time')
    ).values('lecture_date').distinct().count()  # Count unique DATES, not sessions!

    expected = assignment.expected_lectures
    pct = (actual / expected * 100)
    ...
```

> **Teacher Note:** This counts **distinct lecture dates**, not raw session records. If a professor accidentally creates two sessions on the same day, it still counts as **one lecture**. This is the correct behavior.

#### `check_and_notify(assignment)` function
The main logic:
```python
# Rule 1: Hit 100%? Send congratulations!
if coverage['pct'] >= 100:
    # Only send once (guard check)
    if not already_notified:
        Notification.objects.create(type='congratulation', message='🎉 ...')

# Rule 2: Behind schedule AND semester ending soon?
days_left = (semester.end_date - today).days
if coverage_fraction <= 0.70 and 0 < days_left <= 14:
    if not already_notified:
        Notification.objects.create(type='warning', message='⚠️ ...')
```

The `_notification_already_sent()` guard prevents sending the same notification twice. It checks for existing notifications with the same type in the same semester.

---

## 9. App: `attendance` — The Heart of the System

### `attendance/models.py`

#### 📝 `Enrollment` Model
```python
class Enrollment(models.Model):
    student  = models.ForeignKey(Student, ...)
    course   = models.ForeignKey(Course, ...)
    semester = models.ForeignKey(Semester, ...)

    class Meta:
        unique_together = ('student', 'course', 'semester')
```
This records "Student A is enrolled in Course B for Semester C." Without enrollment, the student cannot scan attendance for that course.

---

#### 🖥️ `Session` Model
```python
class Session(models.Model):
    course       = models.ForeignKey(Course, ...)
    professor    = models.ForeignKey(Professor, ...)
    semester     = models.ForeignKey(Semester, ...)
    date_time    = models.DateTimeField(auto_now_add=True)   # Set automatically when created
    qr_token     = models.CharField(max_length=100, unique=True)
    qr_expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())       # Generate random UUID
        if not self.qr_expires_at:
            self.qr_expires_at = now() + timedelta(minutes=15)  # Expire in 15 min
        super().save(*args, **kwargs)
```

A Session is created when a professor *starts* a lecture. It automatically:
- Generates a **UUID** (universally unique ID) as the QR token — something like `a3f1c2d4-...`
- Sets expiry to **15 minutes** from now

The QR code encodes this token. Students scan it to record attendance.

---

#### ✅ `Attendance` Model
```python
class Attendance(models.Model):
    STATUS_CHOICES = [('present', 'Present'), ('late', 'Late'), ('absent', 'Absent')]

    session    = models.ForeignKey(Session, ...)
    student    = models.ForeignKey(Student, ...)
    course     = models.ForeignKey(Course, ...)   # Denormalized for fast queries
    date       = models.DateField(auto_now_add=True)
    scanned_at = models.DateTimeField(auto_now_add=True)
    status     = models.CharField(choices=STATUS_CHOICES, default='present')

    class Meta:
        unique_together = ('student', 'course', 'date')  # ← THE key constraint!
```

**The most important line:** `unique_together = ('student', 'course', 'date')`

This is a **database-level constraint** that says: a student can only have ONE attendance record per course per day. Even if the application code has a bug, the database itself will reject duplicate scans. This is defense in depth.

The `save()` method auto-fills the `course` from the session:
```python
def save(self, *args, **kwargs):
    if not self.course_id and self.session_id:
        self.course = self.session.course   # Copy course from session
    super().save(*args, **kwargs)
```

---

### `attendance/services.py` — The `record_attendance` Function

This is the core business logic of the entire system. Let's walk through it step by step:

```python
def record_attendance(student_id: str, qr_token: str) -> dict:
```

**Input:** student's ID number + the token from the QR code.
**Output:** a dict with `{'success': True/False, ...}`.

#### Step 1: Fast Early Validation (millisecond-level checks)
```python
if not Session.objects.filter(qr_token=qr_token).exists():
    return {'success': False, 'error': 'Invalid QR code.'}

if not Student.objects.filter(student_id=student_id).exists():
    return {'success': False, 'error': 'No student found.'}
```
Before doing any heavy work, we check if the token and student exist using cheap `EXISTS` queries on indexed columns. If they don't exist, we fail fast.

#### Step 2: Load the Full Session & Check Expiry
```python
session = Session.objects.select_related('course', 'professor', 'semester').get(qr_token=qr_token)

if session.qr_expires_at <= now:
    return {'success': False, 'error': 'This QR code has expired.'}
```
`select_related(...)` loads the session AND its related course, professor, and semester in a **single SQL JOIN query** — instead of making 3 separate database calls.

#### Step 3: Check Active Semester
```python
active_semester = Semester.objects.get(is_active=True)
if session.semester != active_semester:
    return {'success': False, 'error': 'Session does not belong to the current semester.'}
```

#### Step 4: Check Enrollment
```python
is_enrolled = Enrollment.objects.filter(
    student_id=student.pk,
    course_id=session.course_id,
    semester_id=session.semester_id
).exists()
if not is_enrolled:
    return {'success': False, 'error': 'Student is not enrolled.'}
```
A student cannot scan a QR for a course they aren't enrolled in.

#### Step 5: One Scan Per Day
```python
already_scanned_today = Attendance.objects.filter(
    student_id=student.pk,
    course_id=session.course_id,
    date=today,     # today's date
).exists()
if already_scanned_today:
    return {'success': False, 'error': 'Already scanned today.'}
```

#### Step 6: Semester Quota Check
```python
total_lectures_quota = active_semester.total_lectures   # e.g. 15
total_scans_so_far = Attendance.objects.filter(
    student_id=student.pk,
    course_id=session.course_id,
    session__semester_id=active_semester.pk,
).count()
if total_scans_so_far >= total_lectures_quota:
    return {'success': False, 'error': 'Maximum attendance limit reached.'}
```
Even if a student cheats and tries to scan after the semester is full, we block them here.

#### Step 7: Save the Record (Atomic)
```python
try:
    with transaction.atomic():
        attendance = Attendance.objects.create(
            session=session, student=student, status='present'
        )
except IntegrityError:
    # DB unique constraint caught a race condition (two simultaneous scans)
    return {'success': False, 'error': 'Already registered.'}
```
`transaction.atomic()` + catching `IntegrityError` is the **last line of defense** against race conditions (two requests hitting the server at the exact same millisecond).

#### Final Response
```python
return {
    'success': True,
    'message': f'Attendance recorded for {student.name}.',
    'attendance_id': attendance.id,
    'scans_used': total_scans_so_far + 1,
    'scans_remaining': total_lectures_quota - (total_scans_so_far + 1),
}
```

---

## 10. Serializers — From Python to JSON

Think of serializers as **translators**. When data lives in Python objects (Model instances), serializers convert them to JSON so the frontend can read them. When data comes from the frontend (JSON), serializers validate it and convert it to Python objects for saving.

```
Django Model → Serializer → JSON (sent to frontend)
JSON (from frontend) → Serializer validates & deserializes → Django Model → .save()
```

### Key serializer patterns used in this project:

#### Read-only computed fields
```python
department_name = serializers.CharField(source='department.name', read_only=True)
```
Instead of sending `department: 5` (just an ID), we also send `department_name: "Computer Science"`. The frontend doesn't need a second API call.

#### Write-only fields
```python
password = serializers.CharField(write_only=True)
```
Password comes IN but never goes OUT in response data.

#### Nested source traversal
```python
session_date = serializers.DateTimeField(source='session.date_time', read_only=True)
```
Follow the `session` foreign key and get `date_time` from it.

---

## 11. Views — The Request Handlers

### Two Types of Views Used

#### 1. `APIView` — Manual control
```python
class AttendanceScanView(APIView):
    def post(self, request):
        # Full manual control of what happens
        result = record_attendance(...)
        if result['success']:
            return Response(result, status=200)
        return Response(result, status=400)
```
You write the `get()`, `post()`, `put()`, `delete()` methods yourself.

#### 2. `ModelViewSet` — Automatic CRUD
```python
class AdminStudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = AdminStudentSerializer
    permission_classes = [IsAdminUser]
```
Django REST Framework automatically generates all 5 CRUD endpoints. Much less code.

### Permission Classes — Who Can Access What?

| Permission Class | Meaning |
|-----------------|---------|
| `AllowAny` | Anyone, even not logged in, can access |
| `IsAuthenticated` | Must be logged in (valid JWT token) |
| `IsAdminUser` | Must be an admin (`is_staff=True`) |

---

### Key Views Explained

#### `CourseAttendanceReportView`
This view generates the full attendance matrix for a course. Here's the algorithm:

1. **Get the course and active semester.**
2. **Build `lecture_dates_map`** — a dict mapping `date → first session of that day`. This groups multiple sessions on the same day into one "lecture."
3. **Get all enrolled students.**
4. **Pre-fetch all attendance records** for those students in one query.
5. **Build `attendance_map[(student_id, date)] = True`** for fast lookups.
6. **For each student:** loop through all lecture dates, check the map, build the lecture list with Present/Absent status.
7. **Calculate percentages** and return the full matrix.

```python
# The key grouping step:
lecture_dates_map = {}  # date → first session of that day
for sess in sessions:
    dt = sess.date_time.date()
    if dt not in lecture_dates_map:
        lecture_dates_map[dt] = sess   # Only keep the first session per day
```

This prevents inflated lecture counts when a professor creates multiple sessions on the same day.

#### `SessionCreateView`
```python
def post(self, request):
    session = Session.objects.create(professor=professor, course=course, semester=semester)

    # Fire compliance check in a background thread (non-blocking!)
    t = threading.Thread(target=check_and_notify, args=(assignment,), daemon=True)
    t.start()

    return Response(serializer.data, status=201)  # ← Returns immediately
```

After creating the session, it fires the lecture compliance check **in a separate thread** so the professor's browser gets the response immediately without waiting for the compliance check to finish.

#### `CourseExportView`
Generates a downloadable CSV file:
```python
response = HttpResponse(content_type='text/csv')
writer = csv.writer(response)
writer.writerow(['Student ID', 'Student Name', '2025-01-01', '2025-01-08', ...])
for student in students:
    writer.writerow([student.student_id, student.name, 'Present', 'Absent', ...])
return response
```
Instead of returning JSON, this returns a `.csv` file directly — the browser will download it.

---

## 12. URL Routing — How Requests Find Their Handler

The full URL map assembled from all `urls.py` files:

### Authentication
| Method | URL | Handler | Access |
|--------|-----|---------|--------|
| POST | `/api/auth/login/` | `TokenObtainPairView` | Anyone |
| POST | `/api/auth/refresh/` | `TokenRefreshView` | Anyone |
| GET | `/api/auth/me/` | `MeView` | Authenticated |
| POST | `/api/auth/change-password/` | `ChangePasswordView` | Authenticated |

### Core
| Method | URL | Handler | Access |
|--------|-----|---------|--------|
| GET | `/api/departments/` | `DepartmentListView` | Anyone |
| GET | `/api/semesters/` | `SemesterListView` | Anyone |
| GET | `/api/semesters/active/` | `ActiveSemesterView` | Anyone |
| GET | `/api/stats/` | `StatsView` | Anyone |
| GET/POST/PUT/DELETE | `/api/admin/semesters/` | `AdminSemesterViewSet` | Admin |

### Accounts
| Method | URL | Handler | Access |
|--------|-----|---------|--------|
| GET | `/api/students/` | `StudentListView` | Anyone |
| GET | `/api/professors/` | `ProfessorListView` | Anyone |
| GET | `/api/professor/{id}/courses/` | `ProfessorCoursesView` | Anyone |
| GET/POST/PUT/DELETE | `/api/admin/students/` | `AdminStudentViewSet` | Admin |
| POST | `/api/admin/students/{id}/reset_password/` | custom action | Admin |
| GET/POST/PUT/DELETE | `/api/admin/professors/` | `AdminProfessorViewSet` | Admin |

### Courses
| Method | URL | Handler | Access |
|--------|-----|---------|--------|
| GET | `/api/courses/` | `CourseListView` | Anyone |
| POST | `/api/courses/admin/nested-assign/` | `NestedAssignmentCreateView` | Admin |
| GET/POST/PUT/DELETE | `/api/admin/courses/` | `AdminCourseViewSet` | Admin |
| GET/POST/PUT/DELETE | `/api/admin/assignments/` | `AdminCourseAssignmentViewSet` | Admin |

### Attendance
| Method | URL | Handler | Access |
|--------|-----|---------|--------|
| POST | `/api/sessions/create/` | `SessionCreateView` | Anyone |
| GET | `/api/sessions/course/{id}/` | `CourseSessionsView` | Authenticated (Professor) |
| GET | `/api/sessions/{id}/qr/` | `SessionQRView` | Anyone |
| POST | `/api/sessions/{id}/refresh-qr/` | `SessionRefreshQRView` | Anyone |
| POST | `/api/attendance/scan/` | `AttendanceScanView` | Anyone |
| GET | `/api/attendance/session/{id}/` | `SessionAttendanceListView` | Anyone |
| GET | `/api/attendance/report/` | `AttendanceReportView` | Anyone |
| GET | `/api/attendance/session-report/` | `SessionReportView` | Anyone |
| GET | `/api/attendance/course-report/{id}/` | `CourseAttendanceReportView` | Anyone |
| GET | `/api/export/course/{id}/` | `CourseExportView` | Authenticated |
| GET | `/api/student/{id}/courses/` | `StudentCoursesView` | Anyone |
| GET/POST/PUT/DELETE | `/api/admin/enrollments/` | `AdminEnrollmentViewSet` | Admin |

---

## 13. The QR Attendance Flow — Step by Step

This is the main feature. Here is the complete flow:

```
┌──────────────────────────────────────────────────────────────────┐
│  PROFESSOR SIDE                                                    │
│                                                                    │
│  1. Professor opens course page in browser                        │
│  2. Clicks "Start Session"                                        │
│  3. Frontend: POST /api/sessions/create/                          │
│     { professor_id: 5, course_id: 3 }                            │
│                                                                    │
│  4. Backend:                                                       │
│     - Creates Session record in DB                                │
│     - Auto-generates UUID as qr_token e.g. "a3f1-c2d4-..."      │
│     - Sets qr_expires_at = now + 15 minutes                      │
│     - Fires compliance check in background thread                 │
│     - Returns: { id: 42, qr_token: "a3f1...", ... }             │
│                                                                    │
│  5. Frontend: GET /api/sessions/42/qr/                            │
│  6. Backend: generates QR code image (PNG) from qr_token         │
│     Returns: { qr_code: "data:image/png;base64,..." }            │
│                                                                    │
│  7. Professor shows QR on projector/screen                        │
└──────────────────────────────────────────────────────────────────┘
                          ↓ (students scan)

┌──────────────────────────────────────────────────────────────────┐
│  STUDENT SIDE                                                      │
│                                                                    │
│  1. Student opens app on phone, goes to course page               │
│  2. Clicks "Scan QR"                                              │
│  3. Camera reads QR → extracts the token "a3f1-c2d4-..."        │
│  4. Frontend: POST /api/attendance/scan/                          │
│     { student_id: "S12345", qr_token: "a3f1-c2d4-..." }        │
│                                                                    │
│  5. Backend runs record_attendance():                             │
│     ✓ Check token exists                                          │
│     ✓ Check student exists                                        │
│     ✓ Check QR not expired                                        │
│     ✓ Check active semester matches                               │
│     ✓ Check student is enrolled in this course                   │
│     ✓ Check not already scanned today                            │
│     ✓ Check under semester quota                                  │
│     ✓ Create Attendance record (atomic)                           │
│     Returns: { success: true, message: "Attendance recorded!" }  │
│                                                                    │
│  6. Student sees green "✓ Attendance Recorded!" on screen        │
└──────────────────────────────────────────────────────────────────┘
```

### QR Refresh
If the QR expires during class (15 min), the professor can refresh it:
```
POST /api/sessions/42/refresh-qr/
→ Backend generates new UUID, updates qr_expires_at
→ Returns new token
→ Frontend re-fetches the QR image
```

---

## 14. The Lecture Tracking Service

Found in `courses/tracking_service.py`. This system monitors whether professors are on track.

### How it's triggered:
Every time a professor creates a session, `SessionCreateView` fires:
```python
t = threading.Thread(target=check_and_notify, args=(assignment,), daemon=True)
t.start()
```
It runs in the **background** — the professor's response is not delayed.

### What it checks:

```
lectures_delivered        15
Coverage % = ──────────────────── × 100  =  ─── × 100 = 100%
             expected_lectures             15
```

| Scenario | Action |
|----------|--------|
| Coverage ≥ 100% | 🎉 Send CONGRATULATION notification (once per semester) |
| Coverage ≤ 70% AND semester ends within 14 days | ⚠️ Send WARNING notification (once per semester) |
| Any other case | No action |

### Duplicate prevention:
```python
def _notification_already_sent(professor_id, notification_type, semester_id):
    return Notification.objects.filter(
        professor_id=professor_id,
        notification_type=notification_type,
        message__startswith=f'[SEM-{semester_id}]',
    ).exists()
```
Before sending any notification, we check if one was already sent this semester. If yes, we skip it.

---

## 15. Authentication — JWT Tokens

### How Login Works:

```
1. User submits { username: "S12345", password: "secret" }
   → POST /api/auth/login/

2. Django verifies password (checks hash in DB)

3. If correct, SimpleJWT generates TWO tokens:
   {
     "access":  "eyJ0eXA...(long string)...",   ← Valid 8 hours
     "refresh": "eyJ0eXA...(different long string)..."  ← Valid 7 days
   }

4. Frontend stores these tokens (usually in localStorage)

5. For all future API calls, frontend sends:
   Authorization: Bearer eyJ0eXA...

6. Django middleware reads the token, decodes it, identifies the user
   (no database lookup needed for the user identity!)

7. When access token expires (8 hours later):
   POST /api/auth/refresh/ { "refresh": "eyJ0eXA..." }
   → Returns new access token
   → User doesn't need to log in again
```

### Why is JWT better than traditional sessions?
- **Sessions** store user data on the server. With 1000 users, that's a lot of server memory.
- **JWT** stores the data inside the token itself (encrypted/signed). The server just verifies the signature — no lookup needed. Scales perfectly to 1000s of users.

---

## 16. Docker & Startup — `entrypoint.sh`

When the Docker container starts, `entrypoint.sh` runs these steps **in order**:

### Step 1: Wait for PostgreSQL
```bash
python - <<'PYEOF'
# Tries to connect to PostgreSQL up to 30 times (every 2 seconds = up to 60s)
# If it can't connect, the script aborts (Docker will restart the container)
PYEOF
```
Without this, Django would crash on startup if the database wasn't ready yet.

### Step 2: Django Management Commands
```bash
python manage.py makemigrations --noinput  # Generate migration files from models
python manage.py migrate --noinput         # Apply migrations to the database
python manage.py collectstatic --noinput   # Copy static files to STATIC_ROOT
python manage.py seed_demo                 # Load demo data (professors, courses, etc.)
```
**Migrations** are like version control for your database schema. Every time you add/change a model, you create a migration. `migrate` applies pending migrations to bring the DB up to date.

### Step 3: Create Superuser
```bash
python manage.py shell -c "
user, created = U.objects.get_or_create(username='admin', ...)
user.set_password('Admin@1234')
user.save()
"
```
Creates the `admin` user with password `Admin@1234` if it doesn't already exist. Idempotent — safe to run multiple times.

### Step 4: Seed Test Students
```bash
python manage.py seed_test_students --count 1000
```
Creates 1000 student accounts for load-testing. These are used with Locust to simulate 1000 concurrent users scanning attendance.

### Step 5: Start Gunicorn
```bash
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 9 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    ...
```
**Gunicorn** is the production web server that runs Django. Let's decode these settings:

| Setting | Value | Meaning |
|---------|-------|---------|
| `--workers 9` | 9 | 9 separate Python processes (uses multiple CPU cores) |
| `--worker-class gthread` | gthread | Each worker uses native OS threads (not async) |
| `--threads 2` | 2 | Each worker handles 2 requests simultaneously |
| Total capacity | 9 × 2 = 18 | 18 concurrent requests at once |
| `--timeout 120` | 120s | Request timeout (covers slow report generation) |
| `--max-requests 1000` | 1000 | Worker restarts after 1000 requests (prevents memory leaks) |

---

## 17. Complete API Reference Table

### Quick Summary of All Endpoints

```
Base URL: http://your-server:8000

AUTH:
  POST   /api/auth/login/                    → Get JWT tokens
  POST   /api/auth/refresh/                  → Refresh access token
  GET    /api/auth/me/                       → Get my profile & role
  POST   /api/auth/change-password/          → Change my password

CORE:
  GET    /api/departments/                   → List departments
  GET    /api/semesters/                     → List all semesters
  GET    /api/semesters/active/              → Get active semester
  GET    /api/stats/                         → Dashboard statistics
  CRUD   /api/admin/semesters/               → Manage semesters (admin)

ACCOUNTS:
  GET    /api/students/                      → List students
  GET    /api/professors/                    → List professors
  GET    /api/professor/{id}/courses/        → Professor's courses this semester
  CRUD   /api/admin/students/                → Manage students (admin)
  POST   /api/admin/students/{id}/reset_password/  → Reset to '123456' (admin)
  POST   /api/admin/students/{id}/set_custom_password/  → Set custom pass (admin)
  CRUD   /api/admin/professors/              → Manage professors (admin)

COURSES:
  GET    /api/courses/                       → List all courses
  POST   /api/courses/admin/nested-assign/  → One-shot course setup (admin)
  CRUD   /api/admin/courses/                → Manage courses (admin)
  CRUD   /api/admin/assignments/             → Manage assignments (admin)

ATTENDANCE:
  POST   /api/sessions/create/              → Professor starts a session
  GET    /api/sessions/course/{id}/         → Sessions for a course (professor)
  GET    /api/sessions/{id}/qr/             → Get QR code image
  POST   /api/sessions/{id}/refresh-qr/    → Refresh QR token
  POST   /api/attendance/scan/             → Student scans QR
  GET    /api/attendance/session/{id}/     → List who attended a session
  GET    /api/attendance/report/           → Legacy filtered report
  GET    /api/attendance/session-report/   → Per-session report
  GET    /api/attendance/course-report/{course_id}/  → Full course matrix
  GET    /api/export/course/{id}/           → Download CSV
  GET    /api/student/{id}/courses/         → Student's courses + attendance stats
  CRUD   /api/admin/enrollments/            → Manage enrollments (admin)
```

---

## 🎓 Final Summary — The Big Picture

The backend is a **Django REST API** that serves as the brain of the attendance system. Here's the full data flow:

```
Admin uses React Dashboard
   → Creates semesters, departments, courses, assigns professors, enrolls students
   → All stored in PostgreSQL via Django REST API

Professor logs in
   → Gets JWT tokens from /api/auth/login/
   → Calls /api/auth/me/ → gets role='professor' + their courses
   → Creates a session (POST /api/sessions/create/)
   → Shows QR code on screen (GET /api/sessions/{id}/qr/)

Student logs in
   → Gets JWT tokens
   → Calls /api/auth/me/ → gets role='student' + enrolled courses
   → Scans QR code (POST /api/attendance/scan/)
   → Backend runs 7 validation checks
   → Attendance recorded in DB

Admin reviews
   → GET /api/attendance/course-report/{id}/ → full matrix
   → GET /api/export/course/{id}/ → downloads CSV

Tracking Service (automatic)
   → Every session creation → background thread checks lecture compliance
   → If professor hits 100% → 🎉 notification
   → If professor is behind + semester ending → ⚠️ warning
```

Every decision in this backend — from `unique_together` constraints, to background threads, to `select_related` for query optimization, to `transaction.atomic()` for data integrity — was made with **correctness**, **performance**, and **security** in mind.

---

*Document generated for the Alarab Attendance System — April 2026*
