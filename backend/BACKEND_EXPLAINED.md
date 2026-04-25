# 📚 Backend Explained — Teacher's Guide

> **I am your teacher. You are the student. We will go through everything step by step.**
> Every concept will be explained simply first, then you'll see the actual code from YOUR project.

---

## Table of Contents
1. [The Big Picture — How It All Connects](#1-the-big-picture)
2. [Models — Your Database Tables](#2-models)
3. [Serializers — The Translator](#3-serializers)
4. [Views — The Logic Brain](#4-views)
5. [URLs — The Address Book](#5-urls--the-api-map)
6. [Authentication & JWT — Who Are You?](#6-authentication--jwt)
7. [Permissions — What Can You Do?](#7-permissions)
8. [Caching with Redis — Speed Tricks](#8-caching-with-redis)
9. [The QR Scan Service — The Star of the Show](#9-the-qr-scan-service)
10. [Best Practices Used in This Project](#10-best-practices-used-in-this-project)

---

## 1. The Big Picture

Before touching any code, understand this simple flow:

```
Browser/Phone
     │
     │  HTTP Request: "Give me course data" + JWT token
     ▼
  Nginx (frontend container)
     │  /api/* → forward to backend
     ▼
  Gunicorn (runs Django)
     │
     ├──► URLs.py        "Which view handles this URL?"
     ├──► Permissions    "Is this user allowed?"
     ├──► View           "Do the logic"
     │       │
     │       ├──► Model      "Read/Write the database"
     │       ├──► Redis      "Check the cache first"
     │       └──► Serializer "Convert Python objects → JSON"
     │
     └──► JSON Response back to the browser
```

**Think of it like a restaurant:**
- **URL** = the menu (what you can order)
- **View** = the cook (does the work)
- **Model** = the storage room (holds all the data)
- **Serializer** = the plate (presents the food nicely)
- **Permission** = the bouncer (you can only enter if you belong)

---

## 2. Models

### What is a Model?

A **Model** is a Python class that represents a **database table**. Each attribute = one column. Django converts it to SQL automatically.

```python
# This Python class...
class Student(models.Model):
    name = models.CharField(max_length=100)
    student_id = models.CharField(max_length=20)

# ...becomes this SQL table:
# CREATE TABLE students (
#     id INTEGER PRIMARY KEY,
#     name VARCHAR(100),
#     student_id VARCHAR(20)
# );
```

### Your Project's Models

Your project has **4 apps**, each with models:

---

#### 📦 `core` app — Foundation

```python
Department  →  name
Semester    →  name, start_date, end_date, total_lectures, is_active
```

**`Semester.is_active`** — Only ONE semester is active at a time. All queries use this to filter "current" data. Think of it like a switch: this semester is ON, all others are OFF.

---

#### 👤 `accounts` app — People

```python
class Student(models.Model):
    user       = OneToOneField(User)   # ← Django's built-in login system
    student_id = CharField(unique=True) # e.g. "STU0042"
    name       = CharField
    department = ForeignKey(Department)
    student_major = CharField          # e.g. "AI & Data Science"
```

```python
class Professor(models.Model):
    user         = OneToOneField(User)
    professor_id = CharField(unique=True)
    name         = CharField
    department   = ForeignKey(Department)
```

**Key concept — `OneToOneField`:**
Django has its own `User` model that handles usernames and passwords. Your `Student` and `Professor` models are **linked** to it with a `OneToOneField`. This means:

```
auth_user table          Student table
┌────────────┐           ┌───────────────────┐
│ id=5       │◄──────────│ user_id = 5       │
│ username   │           │ student_id = STU01 │
│ password   │           │ name = Ahmed       │
└────────────┘           └───────────────────┘
```

One User account → One Student profile. They are separate tables joined by `user_id`.

---

#### 📖 `courses` app — Academic Structure

```python
class Course(models.Model):
    code       = CharField(unique=True)  # e.g. "CS301"
    name       = CharField               # e.g. "Data Structures"
    department = ForeignKey(Department)
```

```python
class CourseAssignment(models.Model):
    professor         = ForeignKey(Professor)
    course            = ForeignKey(Course)
    semester          = ForeignKey(Semester)
    expected_lectures = PositiveSmallIntegerField(default=15)

    class Meta:
        unique_together = ('professor', 'course', 'semester')
        # A professor can only be assigned once to a course per semester
```

**`CourseAssignment`** is a **junction table** — it connects 3 things: who teaches what, in which semester. The `unique_together` prevents duplicate assignments.

---

#### 📋 `attendance` app — The Core Logic

```python
class Enrollment(models.Model):
    student  = ForeignKey(Student)
    course   = ForeignKey(Course)
    semester = ForeignKey(Semester)

    class Meta:
        unique_together = ('student', 'course', 'semester')
        # A student can only enroll once in a course per semester
```

```python
class Session(models.Model):
    course        = ForeignKey(Course)
    professor     = ForeignKey(Professor)
    semester      = ForeignKey(Semester)
    date_time     = DateTimeField(auto_now_add=True)  # set automatically
    qr_token      = CharField(unique=True, db_index=True)
    qr_expires_at = DateTimeField

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())   # auto-generate UUID
        if not self.qr_expires_at:
            self.qr_expires_at = now() + timedelta(minutes=15)
        super().save(*args, **kwargs)
```

**`db_index=True`** on `qr_token` — this creates a database INDEX. Think of an index like the index at the back of a book. Instead of reading every page to find a word, you jump straight to it. This makes `SELECT * WHERE qr_token = 'abc'` **100x faster**.

```python
class Attendance(models.Model):
    session    = ForeignKey(Session)
    student    = ForeignKey(Student)
    course     = ForeignKey(Course)     # denormalized for speed
    date       = DateField(auto_now_add=True)
    scanned_at = DateTimeField(auto_now_add=True)
    status     = CharField(choices=['present', 'late', 'absent'], default='present')

    class Meta:
        unique_together = ('student', 'course', 'date')
        # One attendance record per student per course per DAY
        # This is the anti-cheat rule at the DATABASE level
```

**Why `unique_together` in `Attendance`?**
This is a **database-level constraint**. Even if your Python code has a bug and tries to insert the same student twice for the same day, the database will REJECT it with an `IntegrityError`. You catch that error and return "already recorded". It's a safety net at the lowest level.

---

## 3. Serializers

### What is a Serializer?

A Serializer converts data **in both directions**:

```
Python Object  ──► JSON     (when responding to a request)
JSON           ──► Python   (when receiving data from a form/API)
```

Without a serializer, you'd have to manually write:
```python
# Without serializer — messy manual work
return {"id": student.id, "name": student.name, "department": student.department.name}

# With serializer — clean and automatic
serializer = StudentSerializer(student)
return Response(serializer.data)
```

### Your Serializers in Action

**`StudentSerializer`** — Read-only, for displaying student data:
```python
class StudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    # ^ "source='department.name'" means: follow the FK relationship and get the name

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'student_major', 'username']
```

**`AdminStudentSerializer`** — For creating students (write operations):
```python
class AdminStudentSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    # ^ write_only=True: password comes IN but never goes OUT in responses

    def create(self, validated_data):
        username = validated_data.pop('username', None) or validated_data.get('student_id')
        password = validated_data.pop('password')

        with transaction.atomic():         # ← if ANYTHING fails, roll back EVERYTHING
            user = User.objects.create_user(username=username, password=password)
            student = Student.objects.create(user=user, **validated_data)
        return student
```

**`transaction.atomic()`** is critical here. Creating a student requires TWO database inserts (one for `User`, one for `Student`). If the second one fails, `atomic()` automatically undoes the first. This prevents "ghost" User accounts with no Student profile.

### Serializer Validation

```python
def validate_student_id(self, value):
    if Student.objects.filter(student_id=value).exists():
        raise serializers.ValidationError("A student with this ID already exists.")
    return value
```

Django calls `validate_<fieldname>` automatically before saving. It's like a custom rule: "before I accept this data, check if it's valid." If you raise `ValidationError`, the API automatically returns a 400 error with your message.

---

## 4. Views

### What is a View?

A **View** is a function/class that:
1. Receives an HTTP request
2. Does some work (read DB, check permissions, run business logic)
3. Returns an HTTP response (usually JSON)

Your project uses **Class-Based Views (APIView)** and **ViewSets**.

### APIView — Custom Logic

```python
class SessionCreateView(APIView):
    permission_classes = [IsAuthenticated]  # must be logged in

    def post(self, request):                # handles POST requests
        professor_id = request.data.get('professor_id')
        course_id    = request.data.get('course_id')

        try:
            professor = Professor.objects.get(pk=professor_id)
            course    = Course.objects.get(pk=course_id)
            semester  = Semester.objects.get(is_active=True)

            session = Session.objects.create(
                professor=professor,
                course=course,
                semester=semester,
            )
            serializer = SessionSerializer(session)
            return Response(serializer.data, status=201)  # 201 = Created

        except Exception as e:
            return Response({'error': str(e)}, status=400)
```

**HTTP Status Codes you'll see:**
| Code | Meaning |
|---|---|
| 200 | OK — success |
| 201 | Created — new record made |
| 400 | Bad Request — your data was wrong |
| 401 | Unauthorized — not logged in |
| 403 | Forbidden — logged in but not allowed |
| 404 | Not Found — record doesn't exist |

### ViewSet — CRUD for Free

```python
class AdminStudentViewSet(viewsets.ModelViewSet):
    queryset         = Student.objects.all()
    serializer_class = AdminStudentSerializer
    permission_classes = [IsAdminUser]
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['name', 'student_id']
```

A `ModelViewSet` gives you **all 5 CRUD operations automatically**:
- `GET /admin/students/` → list all students
- `POST /admin/students/` → create a student
- `GET /admin/students/3/` → get student with id=3
- `PUT /admin/students/3/` → update student with id=3
- `DELETE /admin/students/3/` → delete student with id=3

You wrote 5 lines and got 5 endpoints. That's the power of DRF ViewSets.

### `select_related` — Avoiding the N+1 Problem

```python
# BAD — N+1 queries (very slow with 100 students)
students = Student.objects.all()
for s in students:
    print(s.department.name)  # NEW DB query for EVERY student!
    # 100 students = 101 database queries

# GOOD — 1 query with JOIN
students = Student.objects.select_related('department').all()
for s in students:
    print(s.department.name)  # Already in memory — 0 extra queries!
    # 100 students = 1 database query
```

Your views use `select_related` everywhere. This is one of the most important performance patterns in Django.

---

## 5. URLs — The API Map

### How URLs Work

Django matches each incoming URL to a View function using patterns:

```python
# config/urls.py  (the main router)
urlpatterns = [
    path('api/', include('accounts.urls')),
    path('api/', include('attendance.urls')),
    path('api/', include('courses.urls')),
    path('api/auth/login/',  TokenObtainPairView.as_view()),  # JWT login
    path('api/auth/refresh/', TokenRefreshView.as_view()),    # JWT refresh
]
```

### Complete API Map of YOUR Project

```
AUTH
────────────────────────────────────────────────────────────
POST   /api/auth/login/               Get JWT tokens
POST   /api/auth/refresh/             Refresh an expired access token
GET    /api/auth/me/                  Get current user's profile & role
POST   /api/auth/change-password/     Change your password

PROFESSOR
────────────────────────────────────────────────────────────
GET    /api/professor/<id>/courses/   Get professor's courses this semester

SESSIONS & QR
────────────────────────────────────────────────────────────
POST   /api/attendance/sessions/create/              Start a new class session
GET    /api/attendance/sessions/course/<id>/         Get session history for a course
GET    /api/attendance/sessions/<id>/qr/             Get QR code image (base64)
POST   /api/attendance/sessions/<id>/refresh-qr/     Rotate the QR token

SCANNING
────────────────────────────────────────────────────────────
POST   /api/attendance/attendance/scan/              Student scans QR code
GET    /api/attendance/attendance/session/<id>/      Live attendance list

REPORTS
────────────────────────────────────────────────────────────
GET    /api/attendance/attendance/course-report/<id>/  Full attendance matrix
GET    /api/attendance/attendance/session-report/      Filtered records
GET    /api/attendance/export/course/<id>/             Download CSV

STUDENT
────────────────────────────────────────────────────────────
GET    /api/attendance/student/<student_id>/courses/   Student's own courses & stats

ADMIN (IsAdminUser required)
────────────────────────────────────────────────────────────
GET/POST        /api/admin/students/           List / Create students
GET/PUT/DELETE  /api/admin/students/<id>/      Manage one student
POST            /api/admin/students/<id>/reset_password/
POST            /api/admin/students/<id>/set_custom_password/

GET/POST        /api/admin/professors/         List / Create professors
GET/POST        /api/admin/courses/            List / Create courses
GET/POST        /api/admin/semesters/          List / Create semesters
GET/POST        /api/admin/assignments/        List / Create assignments
GET/POST        /api/admin/enrollments/        List / Create enrollments
```

---

## 6. Authentication & JWT

### The Problem JWT Solves

Imagine a hotel. When you check in, you get a **key card**. Every time you open a door, you show your key card — the hotel doesn't ask you who you are again. JWT works the same way.

**Old way (Session-based):**
- User logs in → server stores "user 5 is logged in" in database
- Every request → server reads database to verify
- Problem: database hit on EVERY request = slow

**JWT way:**
- User logs in → server gives a **signed token** (like a key card)
- Every request → server just **reads the token** — no database needed
- Fast, stateless, scales to 1000 concurrent users easily

### What is a JWT?

A JWT is a string with 3 parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo1fQ.abc123signature
      HEADER                  PAYLOAD           SIGNATURE
```

- **Header**: what algorithm is used (HS256)
- **Payload**: the data (user_id, expiry time) — this is readable by anyone!
- **Signature**: HMAC of Header + Payload using your `SECRET_KEY` — only YOUR server can make this

**Important:** The payload is Base64 encoded, not encrypted. Anyone can decode it. But they **cannot fake it** without your `SECRET_KEY`. Never put passwords in a JWT payload.

### The JWT Flow in Your App

**Step 1 — Login:**
```
POST /api/auth/login/
{ "username": "stu0001", "password": "Student@1234" }

Response:
{
  "access":  "eyJ...long token...abc",   ← valid for 8 hours
  "refresh": "eyJ...long token...xyz"    ← valid for 7 days
}
```

**Step 2 — Use the access token:**
```
GET /api/auth/me/
Authorization: Bearer eyJ...long token...abc

Response: { "role": "student", "name": "Ahmed", ... }
```

**Step 3 — When access token expires (after 8 hours):**
```
POST /api/auth/refresh/
{ "refresh": "eyJ...long token...xyz" }

Response: { "access": "eyJ...NEW token...def" }
```

**Your settings:**
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(hours=8),   # 8 hours
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),     # 7 days
    'ROTATE_REFRESH_TOKENS':  True,   # every refresh gives a NEW refresh token
}
```

### How PBKDF2 Password Hashing Works

When you save a password, Django does NOT store the plain text:

```
Password in:  "Student@1234"
             ↓  (PBKDF2 + random salt + 260,000 iterations)
Stored hash:  "pbkdf2_sha256$260000$randomsalt$XHg7..."
```

When someone logs in:
1. Take their typed password
2. Run the same 260,000 iterations with the stored salt
3. Compare the result to the stored hash
4. If they match → login OK

**Why 260,000 iterations?** Each iteration takes time. 260,000 iterations = ~100ms on a server. For a user logging in once, this is invisible. For a hacker running 10 million guesses/second, it becomes 10 guesses/second. Brute force becomes practically impossible.

---

## 7. Permissions

### How Django Checks Permissions

For every request, Django runs this check BEFORE your view code:

```
Request arrives
      │
      ▼
Is user authenticated?   ← checked by authentication_classes
      │
      ▼
Does user have permission? ← checked by permission_classes
      │
      ▼
Run the view code
```

### Permission Classes Used

```python
# Anyone can call this (no login needed)
permission_classes = [AllowAny]
# Used for: login endpoint only

# Must have a valid JWT token
permission_classes = [IsAuthenticated]
# Used for: most views

# Must be staff/superuser
permission_classes = [IsAdminUser]
# Used for: admin CRUD views
```

### The Global Default

In `settings.py`:
```python
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

This means **every view requires authentication by default**. If you forget to add `permission_classes` to a view, it's still protected. Only views that explicitly set `AllowAny` are public. This is "secure by default" — a production best practice.

### The `MeView` — Smart Role Detection

```python
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user   # Django gives you the user from the JWT automatically

        if user.is_staff or user.is_superuser:
            return Response({'role': 'admin', ...})

        professor = Professor.objects.filter(user=user).first()
        if professor:
            return Response({'role': 'professor', ...})

        student = Student.objects.filter(user=user).first()
        if student:
            return Response({'role': 'student', ...})
```

This is called after every login. The React frontend calls `/api/auth/me/` and gets the role back. Based on the role, it redirects:
- `admin` → `/admin-dashboard`
- `professor` → `/professor`
- `student` → `/student`

---

## 8. Caching with Redis

### What is Caching?

Caching = storing the result of an expensive operation so you can reuse it without doing the work again.

```
Without cache:
  Request → DB Query (50ms) → Response
  Request → DB Query (50ms) → Response   ← same query, same answer, wasted work
  Request → DB Query (50ms) → Response

With cache:
  Request → DB Query (50ms) → Cache → Response
  Request → Cache HIT (1ms) → Response   ← instant! no DB needed
  Request → Cache HIT (1ms) → Response
```

### Your Redis Setup

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/0',
        'OPTIONS': {
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 100,  # max 100 connections shared across all workers
            },
        }
    }
}
```

### Sessions in Redis

```python
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

Without this, every request would do: `SELECT * FROM django_session WHERE key=...` — a database read just to verify the session. With Redis, this becomes a memory lookup taking < 1ms.

### Cache in the QR Scan Service

The smartest caching in your project is in `services.py`:

```python
def record_attendance(student_id, qr_token):
    cache_key = f"session_qr_{qr_token}"
    session_data = cache.get(cache_key)   # check Redis first

    if not session_data:
        # Cache MISS — go to database (only happens ONCE per QR code)
        session = Session.objects.get(qr_token=qr_token)
        session_data = {
            'session_id': session.id,
            'course_id': session.course_id,
            ...
        }
        cache.set(cache_key, session_data, 900)  # cache for 15 minutes

    # From here on: use session_data from Redis (0 DB queries)
```

**Why is this brilliant?**
Imagine 200 students scanning at the same time. Without cache:
- 200 students × 1 DB query to find the session = **200 database queries**

With cache:
- Student #1 does 1 DB query, stores result in Redis
- Students #2–200 read from Redis = **1 DB query total**

That's a **200x reduction** in database load for the most common operation.

---

## 9. The QR Scan Service

This is the heart of your system. Let's walk through `services.py` line by line:

```python
def record_attendance(student_id: str, qr_token: str) -> dict:
    now = timezone.now()

    # ── STEP 1: Is this QR code valid? ──
    cache_key = f"session_qr_{qr_token}"
    session_data = cache.get(cache_key)        # check Redis (fast)

    if not session_data:                        # cache miss → go to DB
        session = Session.objects.select_related('course', 'semester').get(qr_token=qr_token)
        # ... validate, build session_data dict, store in cache ...
        cache.set(cache_key, session_data, 900)

    # ── STEP 2: Has the QR expired? ──
    if session_data['expires_at'] <= now:
        return {'success': False, 'error': 'This QR code has expired.'}

    # ── STEP 3: Is this student enrolled? ──
    # Smart: ONE query that checks BOTH student existence AND enrollment
    student = Student.objects.filter(
        student_id=student_id,
        enrollments__course_id=session_data['course_id'],    # must be enrolled
        enrollments__semester_id=session_data['semester_id'] # in the right semester
    ).only('id', 'name').first()

    if not student:
        return {'success': False, 'error': 'Not enrolled in this course.'}

    # ── STEP 4: INSERT — let the database handle duplicates ──
    try:
        Attendance.objects.create(
            session_id=session_data['session_id'],
            student_id=student.id,
            course_id=session_data['course_id'],
            status='present'
        )
    except IntegrityError:
        # unique_together on (student, course, date) prevented duplicate
        return {'success': False, 'error': 'Already recorded for today.'}

    return {'success': True, 'message': f'Welcome, {student.name}!'}
```

**The total database cost per scan:** 3 queries (1 first-time session lookup cached, 1 enrollment check, 1 INSERT). Under heavy load, the session lookup becomes 0 thanks to Redis, leaving just 2 queries per scan.

---

## 10. Best Practices Used in This Project

Here is a summary of every professional technique used — and WHY it's considered best practice:

| Technique | Where Used | Why It's Good |
|---|---|---|
| **`select_related()`** | All views with FK lookups | Turns N+1 queries into 1 JOIN query |
| **`db_index=True`** | `Session.qr_token` | Makes lookup by QR token 100x faster |
| **`unique_together`** | Enrollment, Attendance | Database-level data integrity, no duplicates ever |
| **`transaction.atomic()`** | Student/Professor creation | If one insert fails, all fail — no ghost records |
| **Redis session cache** | `settings.py` | Removes DB hit on every single request |
| **Cache-aside pattern** | `services.py` | 1 DB query for 200 simultaneous scans instead of 200 |
| **JWT authentication** | All protected views | Stateless, no DB hit to verify auth |
| **PBKDF2 hashing** | `settings.py` | Brute force attacks become computationally infeasible |
| **IsAuthenticated default** | `settings.py` | Secure by default — must opt-in to public endpoints |
| **`IntegrityError` catch** | `services.py` | Race condition safe — two scans at same time → only one wins |
| **`auto_now_add=True`** | `date_time`, `scanned_at` | DB sets timestamp, not the application — cannot be spoofed |
| **`only('id', 'name')`** | Student enrollment query | Fetches only needed columns — less memory, faster query |
| **Daemon threads** | Session compliance check | Background work doesn't block the HTTP response |
| **`CONN_MAX_AGE=600`** | `settings.py` | Persistent DB connections — no reconnect cost per request |

---

## Final Summary — The Request Lifecycle

Let's trace one complete request: **A student scans a QR code**

```
1. Student's phone camera reads the QR → gets the UUID token

2. React frontend sends:
   POST /api/attendance/scan/
   Authorization: Bearer eyJ...token
   { "student_id": "STU0042", "qr_token": "abc-123-uuid" }

3. Nginx forwards to backend:8000

4. Gunicorn picks it up, sends to Django

5. JWT middleware decodes the token → identifies user (no DB query)

6. permission_classes = [IsAuthenticated] → PASS (token is valid)

7. AttendanceScanView.post() runs:
   → calls record_attendance("STU0042", "abc-123-uuid")

8. record_attendance() service:
   a. Check Redis: "session_qr_abc-123-uuid" → MISS (first scan)
   b. DB Query: SELECT session WHERE qr_token="abc-123-uuid" (1 query)
   c. Store in Redis for 15 minutes
   d. Check expiry → OK
   e. DB Query: SELECT student WHERE student_id="STU0042" AND enrolled (1 query)
   f. DB Query: INSERT INTO attendance (...) (1 query)
   → Returns {'success': True, 'message': 'Welcome, Ahmed!'}

9. AttendanceScanView returns:
   HTTP 200 { "success": true, "message": "Welcome, Ahmed!" }

10. Student's phone shows: ✅ Attendance Recorded

Total database queries: 3 (or 2 if QR was already cached)
Total time: ~15ms
```

That's the entire system — from student's camera to database — in 10 steps and 15 milliseconds. 🎯
