# 📦 Apps Explained — Every App in the Backend

> **Each Django "app" is a self-contained module** with its own models, views, serializers, and URLs.
> Think of apps like departments in a company — each has a specific job.

---

## Project Structure

```
backend/
├── config/          ← Project settings, main URLs, WSGI
├── core/            ← App 1: Shared foundation (Department, Semester, Notification)
├── accounts/        ← App 2: People (Student, Professor, Auth)
├── courses/         ← App 3: Academic structure (Course, Assignment, Tracking)
└── attendance/      ← App 4: The core logic (Session, QR, Scan, Reports)
```

---

## App 1 — `core` 🏛️

**Job:** Holds everything that ALL other apps depend on. If `core` didn't exist, the other apps couldn't function.

### Files
```
core/
├── models.py          ← Department, Semester, Notification
├── serializers.py     ← DepartmentSerializer, SemesterSerializer
├── views.py           ← Admin CRUD for departments & semesters
└── urls.py            ← /api/admin/departments/, /api/admin/semesters/
```

### Models

#### `Department`
```python
class Department(models.Model):
    name = CharField(max_length=100)
    code = CharField(max_length=20, unique=True, db_index=True)  # e.g. "CS", "EE"
```
Everything in the system belongs to a department. Students, Professors, and Courses all link here via `ForeignKey`. It's the root of the hierarchy.

#### `Semester`
```python
class Semester(models.Model):
    name           = CharField         # e.g. "Spring 2025"
    start_date     = DateField
    end_date       = DateField
    is_active      = BooleanField(default=False, db_index=True)
    total_lectures = PositiveSmallIntegerField(default=15)

    def save(self, *args, **kwargs):
        if self.is_active:
            # When you mark one semester active, ALL others become inactive
            Semester.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
```

**The `save()` override is important.** It enforces a business rule: only ONE semester can be active at any time. When you flip `is_active=True` on a new semester, Django automatically sets all others to `False` in a single SQL `UPDATE`. No Python loop needed.

`total_lectures` (default: 15) = the scan quota. A student can only mark attendance up to this many times per course per semester. Set by the admin.

#### `Notification`
```python
class Notification(models.Model):
    class NotificationType(models.TextChoices):
        CONGRATULATION = 'congratulation'
        WARNING        = 'warning'

    professor         = ForeignKey(Professor)
    message           = TextField
    notification_type = CharField(choices=NotificationType.choices)
    is_read           = BooleanField(default=False, db_index=True)
    created_at        = DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [models.Index(fields=['professor', 'is_read'])]
```

Notifications are created by the **Lecture Tracking Service** (in `courses/`). There are two types:
- 🎉 `CONGRATULATION` — professor completed 100% of expected lectures
- ⚠️ `WARNING` — professor is below 70% with less than 14 days left in semester

The composite index on `(professor, is_read)` makes loading "unread notifications for professor X" a single indexed lookup — fast even with thousands of records.

### Key Design Point

The `core` app has **no dependencies on other apps** (no imports from `accounts`, `courses`, or `attendance`). This is intentional. It's the foundation layer. Other apps import FROM `core`, never the reverse.

---

## App 2 — `accounts` 👤

**Job:** Manages all people in the system — students, professors — and handles authentication (login, password change, role detection).

### Files
```
accounts/
├── models.py       ← Student, Professor
├── serializers.py  ← StudentSerializer, AdminStudentSerializer, AdminProfessorSerializer
├── views.py        ← MeView, AdminStudentViewSet, AdminProfessorViewSet, ChangePasswordView
└── urls.py         ← /api/auth/me/, /api/admin/students/, /api/admin/professors/
```

### Models

#### `Student`
```python
class Student(models.Model):
    user          = OneToOneField(User, on_delete=SET_NULL, null=True)
    student_id    = CharField(max_length=20, unique=True, db_index=True)
    name          = CharField(max_length=100)
    department    = ForeignKey(Department)
    student_major = CharField(max_length=100, blank=True)
```

**Two tables, one person.** Django's built-in `User` table holds `username` and `password`. Your `Student` table holds academic info. They link via `user_id`. This separation lets you:
- Use Django's full auth system (login, permissions, admin) without modification
- Add academic fields (student_id, major) without touching Django internals

`on_delete=SET_NULL` means if you delete the Django `User` account, the `Student` profile stays — it just loses its login. The student's academic history is never accidentally deleted.

#### `Professor`
```python
class Professor(models.Model):
    user         = OneToOneField(User, on_delete=SET_NULL, null=True)
    professor_id = CharField(max_length=20, unique=True, db_index=True)
    name         = CharField(max_length=100)
    department   = ForeignKey(Department)
```

Same pattern as Student. A professor has a Django `User` for login + a `Professor` profile for academic info.

### Serializers

#### `AdminStudentSerializer` — The Smart Creator
```python
def create(self, validated_data):
    username = validated_data.pop('username', None)
    if not username:
        username = validated_data.get('student_id')  # auto-use student_id as username

    password = validated_data.pop('password')

    with transaction.atomic():
        user = User.objects.create_user(username=username, password=password)
        student = Student.objects.create(user=user, **validated_data)
    return student
```

Two database inserts wrapped in ONE atomic transaction. If the `Student.create()` fails (e.g. duplicate `student_id`), the `User.create()` is automatically rolled back. You can never end up with a `User` that has no `Student` profile attached.

`write_only=True` on the password field means it is accepted on input but **never returned** in any API response — even if you explicitly request it. This is enforced at the serializer level, not just by convention.

### Views

#### `AdminStudentViewSet` — Full CRUD + Custom Actions
```python
class AdminStudentViewSet(viewsets.ModelViewSet):
    queryset           = Student.objects.all()
    serializer_class   = AdminStudentSerializer
    permission_classes = [IsAdminUser]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'student_id', 'user__username']
```

You get `GET /api/admin/students/?search=ahmed` for free — DRF's `SearchFilter` generates a `WHERE name ILIKE '%ahmed%' OR student_id ILIKE '%ahmed%'` SQL query automatically.

Custom actions extend the ViewSet without extra URL definitions:

```python
@action(detail=True, methods=['post'])
def reset_password(self, request, pk=None):
    student = self.get_object()
    student.user.set_password('123456')
    student.user.save()
    return Response({'status': 'Password reset to default'})
```

`@action(detail=True)` creates the URL: `POST /api/admin/students/<id>/reset_password/` automatically.

#### `MeView` — The Identity Resolver
```python
class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user  # Django decodes this from the JWT automatically

        if user.is_staff or user.is_superuser:
            return Response({'role': 'admin', ...})

        professor = Professor.objects.filter(user=user).first()
        if professor:
            return Response({'role': 'professor', ...})

        student = Student.objects.filter(user=user).first()
        if student:
            return Response({'role': 'student', ...})
```

Called immediately after login. The React frontend uses the `role` field to decide which page to render. One endpoint serves all three user types.

#### `ChangePasswordView`
```python
def post(self, request):
    if not user.check_password(old_password):   # PBKDF2 verify
        return Response({'error': 'Incorrect old password'}, status=400)
    user.set_password(new_password)             # PBKDF2 hash + store
    user.save()
    return Response({'success': 'Password changed'})
```

`check_password()` runs the full PBKDF2 verification — never stores plain text, never compares plain text directly.

### URL Map
```
GET    /api/students/                         All students (public list)
GET    /api/professors/                       All professors (public list)
GET    /api/professor/<id>/courses/           Professor's courses this semester
GET    /api/auth/me/                          Identify current user's role
POST   /api/auth/change-password/             Change your own password

GET    /api/admin/students/                   Admin: list students (searchable)
POST   /api/admin/students/                   Admin: create student
GET    /api/admin/students/<id>/              Admin: get one student
PUT    /api/admin/students/<id>/              Admin: update student
DELETE /api/admin/students/<id>/              Admin: delete student
POST   /api/admin/students/<id>/reset_password/      Reset to default
POST   /api/admin/students/<id>/set_custom_password/ Set custom password

GET    /api/admin/professors/                 Admin: same CRUD for professors
```

---

## App 3 — `courses` 📖

**Job:** Manages the academic structure — which courses exist, who teaches them, and whether professors are meeting their lecture targets.

### Files
```
courses/
├── models.py           ← Course, CourseAssignment
├── serializers.py      ← CourseSerializer, CourseAssignmentSerializer,
│                          NestedCourseAssignmentSerializer
├── views.py            ← AdminCourseViewSet, NestedAssignmentCreateView
├── tracking_service.py ← Lecture compliance engine
└── urls.py             ← /api/admin/courses/, /api/admin/assignments/
```

### Models

#### `Course`
```python
class Course(models.Model):
    code       = CharField(max_length=20, unique=True, db_index=True)  # "CS301"
    name       = CharField(max_length=100)                             # "Data Structures"
    department = ForeignKey(Department, related_name='courses')
```

Simple. A course belongs to a department. The `code` is unique across the whole university.

#### `CourseAssignment`
```python
class CourseAssignment(models.Model):
    professor         = ForeignKey(Professor)
    course            = ForeignKey(Course)
    semester          = ForeignKey(Semester)
    expected_lectures = PositiveSmallIntegerField(default=15)

    class Meta:
        unique_together = ('professor', 'course', 'semester')
```

This table answers: **"Who teaches what, in which semester, and how many lectures are expected?"**

`expected_lectures` is separate from `Semester.total_lectures`:
- `Semester.total_lectures` = student scan quota (how many times a student can register attendance)
- `CourseAssignment.expected_lectures` = professor delivery target (how many sessions the professor should CREATE)

Both default to 15 but serve different purposes.

### The Power Serializer — `NestedCourseAssignmentSerializer`

This is one of the most sophisticated pieces in the backend. Instead of forcing the admin to create Department → Course → Professor → Assignment in 4 separate API calls, this serializer does it all in ONE request:

```python
# POST /api/courses/admin/nested-assign/
{
    "department_name": "Computer Science",
    "department_code": "CS",
    "course_code": "CS301",
    "course_name": "Data Structures",
    "professor_id": "PROF001",
    "professor_name": "Dr. Ali",
    "professor_username": "dr.ali",
    "professor_password": "Prof@1234",
    "semester_name": "Spring 2025"
}
```

Internally it runs 5 steps inside `transaction.atomic()`:

```python
def create(self, validated_data):
    with transaction.atomic():
        # Step 1: Department — create if doesn't exist
        department, _ = Department.objects.get_or_create(
            code=validated_data['department_code'].upper(),
            defaults={'name': validated_data['department_name']}
        )

        # Step 2: Course — create if doesn't exist
        course, _ = Course.objects.get_or_create(
            code=validated_data['course_code'].upper(),
            defaults={'name': validated_data['course_name'], 'department': department}
        )

        # Step 3: Professor + Django User — create if doesn't exist
        professor_qs = Professor.objects.filter(professor_id=validated_data['professor_id'])
        if not professor_qs.exists():
            user, created = User.objects.get_or_create(username=validated_data['professor_username'])
            if created:
                user.set_password(validated_data['professor_password'])
                user.save()
            professor = Professor.objects.create(user=user, ...)

        # Step 4: Semester — must already exist (admins create semesters separately)
        semester = Semester.objects.get(name=validated_data['semester_name'])

        # Step 5: CourseAssignment — link them all
        assignment, created = CourseAssignment.objects.get_or_create(
            professor=professor, course=course, semester=semester
        )
    return {'assignment_id': assignment.id, 'created': created, ...}
```

`get_or_create()` is idempotent — you can POST the same data twice and it won't create duplicates. If everything already exists, it just returns the existing records.

### The Tracking Service — `courses/tracking_service.py`

This is the **compliance monitoring engine**. It runs automatically every time a professor starts a new session.

#### How it works

```
Professor starts a session
        ↓
SessionCreateView creates the Session record
        ↓
Returns HTTP 201 to the professor immediately
        ↓ (in background thread — non-blocking)
check_and_notify(assignment) runs
        ↓
calculate_coverage() counts unique lecture dates
        ↓
IF pct >= 100%  → create CONGRATULATION notification
IF pct <= 70% AND semester ends in ≤ 14 days → create WARNING notification
```

#### `calculate_coverage()` — The Smart Counter

```python
def calculate_coverage(assignment):
    # Count DISTINCT lecture dates (not raw session count)
    # Prevents inflation if professor accidentally creates 2 sessions on same day
    actual = Session.objects.filter(
        professor_id=assignment.professor_id,
        course_id=assignment.course_id,
        semester_id=assignment.semester_id,
    ).annotate(
        lecture_date=TruncDate('date_time')
    ).values('lecture_date').distinct().count()

    pct = (actual / assignment.expected_lectures * 100)
    return {'actual': actual, 'expected': assignment.expected_lectures, 'pct': pct}
```

**Why `TruncDate` + `distinct()`?** If a professor creates 3 sessions on the same day (a mistake), it should still count as 1 lecture day. Without `distinct()`, it would count as 3 — inflating the coverage percentage and potentially triggering a false congratulation.

#### Duplicate Notification Guard

```python
def _notification_already_sent(professor_id, notification_type, semester_id):
    return Notification.objects.filter(
        professor_id=professor_id,
        notification_type=notification_type,
        message__startswith=f'[SEM-{semester_id}]',
    ).exists()
```

Notifications are only sent ONCE per professor per course per semester. Every notification message is prefixed with `[SEM-<id>]` — the guard checks for this prefix to prevent the same professor getting 50 congratulation messages (one every time they start a session after hitting 100%).

### URL Map
```
GET    /api/courses/                           List all courses (public)
POST   /api/courses/admin/nested-assign/       Create dept+course+prof+assignment in one call

GET    /api/admin/courses/                     Admin: list courses
POST   /api/admin/courses/                     Admin: create course
PUT    /api/admin/courses/<id>/                Admin: update course
DELETE /api/admin/courses/<id>/                Admin: delete course

GET    /api/admin/assignments/                 Admin: list all course assignments
POST   /api/admin/assignments/                 Admin: assign professor to course
```

---

## App 4 — `attendance` 📋

**Job:** The heart of the system. Manages class sessions, QR code generation/rotation, student scanning, and all reporting.

### Files
```
attendance/
├── models.py      ← Enrollment, Session, Attendance
├── serializers.py ← EnrollmentSerializer, SessionSerializer, AttendanceSerializer
├── services.py    ← record_attendance() — the QR scan engine
├── views.py       ← 10+ API views for sessions, scanning, reports
└── urls.py        ← All attendance endpoints
```

### Models

#### `Enrollment`
```python
class Enrollment(models.Model):
    student  = ForeignKey(Student)
    course   = ForeignKey(Course)
    semester = ForeignKey(Semester)

    class Meta:
        unique_together = ('student', 'course', 'semester')
```

The enrollment table answers: **"Is this student allowed to attend this course?"** Without an enrollment record, a student's scan will be rejected — even if they have a valid QR token. This is the gatekeeper.

#### `Session`
```python
class Session(models.Model):
    course        = ForeignKey(Course)
    professor     = ForeignKey(Professor)
    semester      = ForeignKey(Semester)
    date_time     = DateTimeField(auto_now_add=True)
    qr_token      = CharField(unique=True, db_index=True)
    qr_expires_at = DateTimeField

    class Meta:
        indexes = [
            models.Index(fields=['qr_token']),        # fast token lookup
            models.Index(fields=['course', 'semester']), # fast course history
        ]

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())    # generates: "a3f8-b2c1-..."
        if not self.qr_expires_at:
            self.qr_expires_at = now() + timedelta(minutes=15)
        super().save(*args, **kwargs)
```

When a professor clicks "Start Session":
1. A `Session` record is created
2. Django's `save()` override auto-generates a UUID as `qr_token`
3. `qr_expires_at` is set to now + 15 minutes
4. The frontend polls `SessionRefreshQRView` every 30 seconds to rotate the token (anti-screenshot attack)

Two database indexes: one on `qr_token` (for fast student scans), one on `(course, semester)` (for fast history lookups by professor).

#### `Attendance`
```python
class Attendance(models.Model):
    session    = ForeignKey(Session)
    student    = ForeignKey(Student)
    course     = ForeignKey(Course, null=True)     # denormalized — saves a JOIN
    date       = DateField(auto_now_add=True)
    scanned_at = DateTimeField(auto_now_add=True)
    status     = CharField(choices=['present','late','absent'], default='present')

    class Meta:
        unique_together = ('student', 'course', 'date')
        indexes = [
            models.Index(fields=['session', 'student']),
            models.Index(fields=['student', 'course', 'date']),
        ]

    def save(self, *args, **kwargs):
        if not self.course_id and self.session_id:
            self.course = self.session.course  # auto-fill from session
        super().save(*args, **kwargs)
```

**`unique_together = ('student', 'course', 'date')`** — This is the anti-cheat rule implemented at the DATABASE level. A student can only scan once per day per course. If the Python code has a bug and tries to insert a duplicate, PostgreSQL rejects it with `IntegrityError`, which is caught and returned as "already recorded."

**Why store `course` separately?** It's "denormalization" — storing data you could calculate from joining `session → course`. It's a deliberate performance trade-off: it costs one extra byte per row, but it saves a JOIN on every report query and every scan check. The `save()` override fills it in automatically from the related session.

### Serializers

Simple but important — each one exposes human-readable names alongside raw IDs:

```python
class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id   = serializers.CharField(source='student.student_id', read_only=True)
    session_date = serializers.DateTimeField(source='session.date_time', read_only=True)
    course_code  = serializers.CharField(source='session.course.code', read_only=True)
```

`source='student.name'` traverses the FK relationship. Without this, the API would only return `student: 5` (just the ID). With it, you get `student_name: "Ahmed"` for free.

### The `record_attendance` Service — 4 Steps

```
Step 1: Check Redis for cached session data
        ↓ (cache miss: 1 DB query to get Session, then store in Redis for 15 min)
Step 2: Check QR expiry
        ↓
Step 3: 1 DB query — verify student exists AND is enrolled in this course
        ↓
Step 4: 1 DB INSERT into Attendance table
        ↓ (IntegrityError = already scanned today → friendly error message)

Total: 2-3 DB queries per scan
```

### Views — The 10 API Handlers

| View | Method | What It Does |
|---|---|---|
| `SessionCreateView` | POST | Professor starts a class → creates Session + QR |
| `SessionQRView` | GET | Returns QR image as base64 PNG string |
| `SessionRefreshQRView` | POST | Rotates the QR token (anti-screenshot) |
| `AttendanceScanView` | POST | Student submits QR scan → calls `record_attendance()` |
| `SessionAttendanceListView` | GET | Live list of who has scanned (5s poll) |
| `CourseSessionsView` | GET | Session history for a course (professor view) |
| `AttendanceReportView` | GET | Filterable attendance records |
| `SessionReportView` | GET | Fine-grained per-session report |
| `CourseAttendanceReportView` | GET | Full student matrix for a course |
| `CourseExportView` | GET | Download CSV attendance sheet |
| `StudentCoursesView` | GET | Student's own courses + attendance % |

#### `CourseAttendanceReportView` — The Big Report

This builds a complete attendance matrix: every enrolled student vs every lecture day.

```python
# Aggregates by unique date — prevents double-counting
sessions = Session.objects.filter(course=course, semester=semester).order_by('date_time')
lecture_dates_map = {}  # { date: first_session_of_that_day }
for sess in sessions:
    dt = sess.date_time.date()
    if dt not in lecture_dates_map:
        lecture_dates_map[dt] = sess   # only first session per day counts
```

Response shape per student:
```json
{
  "student_id": "STU0042",
  "student_name": "Ahmed",
  "total_lectures": 15,
  "lectures_held": 8,
  "lectures": [
    {"lecture_number": 1, "date": "2025-02-10", "status": "Present"},
    {"lecture_number": 2, "date": "2025-02-17", "status": "Absent"},
    ...
  ],
  "total_present": 6,
  "total_absent": 2,
  "attendance_pct": 75.0
}
```

The frontend renders this as a color-coded table (green = Present, red = Absent).

### URL Map
```
POST   /api/attendance/sessions/create/               Start a session
GET    /api/attendance/sessions/course/<id>/           Course session history
GET    /api/attendance/sessions/<id>/qr/               Get QR image
POST   /api/attendance/sessions/<id>/refresh-qr/       Rotate QR token

POST   /api/attendance/attendance/scan/                Student scans QR
GET    /api/attendance/attendance/session/<id>/         Live attendance list
GET    /api/attendance/attendance/course-report/<id>/   Full course matrix
GET    /api/attendance/attendance/session-report/       Filtered records
GET    /api/attendance/export/course/<id>/              Download CSV

GET    /api/attendance/student/<id>/courses/            Student's courses + stats

GET    /api/admin/enrollments/                         Admin: list enrollments
POST   /api/admin/enrollments/                         Admin: enroll student
DELETE /api/admin/enrollments/<id>/                    Admin: remove enrollment
```

---

## App 5 — `config` ⚙️

**Job:** Not a data app — it's the glue that holds everything together.

### Files
```
config/
├── settings.py    ← All Django configuration
├── urls.py        ← Root URL router (includes all app URLs)
└── wsgi.py        ← Entry point for Gunicorn
```

### `settings.py` Key Sections

```python
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    'django.contrib.auth',       # ← provides User model + auth system
    'django.contrib.sessions',
    # Third party
    'rest_framework',            # ← DRF (the API framework)
    'corsheaders',               # ← Allows React (port 5173) to call backend (port 8000)
    # YOUR apps (order matters for migrations)
    'core',        # ← must come first (others depend on it)
    'accounts',
    'courses',
    'attendance',
]
```

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',      # CORS headers on every response
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',  # ← decodes JWT, sets request.user
    ...
]
```

**Middleware runs on EVERY request** in the order listed. `AuthenticationMiddleware` is critical — it calls your configured JWT authenticator, decodes the Bearer token, and sets `request.user` before your view code ever runs. That's why you can just write `user = request.user` in any view and it already knows who the person is.

### `urls.py` — The Master Router

```python
urlpatterns = [
    path('api/',         include('accounts.urls')),
    path('api/',         include('attendance.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/core/',    include('core.urls')),

    # JWT endpoints (from simplejwt library)
    path('api/auth/login/',   TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
]
```

`TokenObtainPairView` and `TokenRefreshView` are provided by the `djangorestframework-simplejwt` library — you don't write these views. You just register them in URLs and they handle everything: verify username/password, generate signed JWT pair, return it.

---

## How the Apps Connect — The Dependency Map

```
config
  └─ imports from all apps (URLs only)

core         ← depends on nothing
  └─ Department, Semester, Notification

accounts     ← depends on core
  └─ Student(department→Department)
  └─ Professor(department→Department)

courses      ← depends on core + accounts
  └─ Course(department→Department)
  └─ CourseAssignment(professor→Professor, course→Course, semester→Semester)

attendance   ← depends on core + accounts + courses
  └─ Enrollment(student→Student, course→Course, semester→Semester)
  └─ Session(professor→Professor, course→Course, semester→Semester)
  └─ Attendance(student→Student, session→Session, course→Course)
```

**Rule:** Dependencies only go DOWN. `attendance` imports from `courses`, `accounts`, and `core`. `core` never imports from anyone. This prevents circular imports and keeps the code clean.

---

## Summary Table

| App | Models | Key Feature | Depends On |
|---|---|---|---|
| `core` | Department, Semester, Notification | Single-active semester enforcement | Nothing |
| `accounts` | Student, Professor | Atomic user+profile creation, role detection | `core` |
| `courses` | Course, CourseAssignment | Nested create in 1 request, lecture compliance engine | `core`, `accounts` |
| `attendance` | Enrollment, Session, Attendance | Redis-cached QR scan, DB-level anti-cheat | all above |
| `config` | — | Wires everything together, JWT routing | all above |
