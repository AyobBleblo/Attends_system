"""
conftest.py — Shared pytest fixtures for the entire test suite.

Fixture hierarchy (each builds on the one above):
  department → major, study_year
  active_semester
  professor_user  → professor (linked to department)
  student_user    → student   (linked to department, major, study_year)
  course          → linked to department
  assignment      → professor ↔ course ↔ semester
  enrollment      → student  ↔ course ↔ semester
  session         → course   ↔ professor ↔ semester (with valid QR token)
  admin_token / professor_token / student_token  — JWT access tokens
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Department, Major, StudyYear, Semester
from accounts.models import Student, Professor
from courses.models import Course, CourseAssignment
from attendance.models import Enrollment, Session


# ─────────────────────────────────────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────────────────────────────────────

def get_token(user: User) -> str:
    """Return a fresh JWT access token string for *user*."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


def auth_client(user: User) -> APIClient:
    """Return an APIClient already authenticated as *user*."""
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {get_token(user)}")
    return client


# ─────────────────────────────────────────────────────────────────────────────
# Core fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def department(db):
    obj, _ = Department.objects.get_or_create(code="CS", defaults={"name": "Computer Science"})
    return obj


@pytest.fixture
def major(db, department):
    obj, _ = Major.objects.get_or_create(name="Software Engineering", department=department)
    return obj


@pytest.fixture
def study_year(db):
    obj, _ = StudyYear.objects.get_or_create(name="Third Year", defaults={"order": 3})
    return obj


@pytest.fixture
def active_semester(db):
    obj, _ = Semester.objects.get_or_create(
        name="Fall 2025",
        defaults={
            "start_date": "2025-09-01",
            "end_date": "2026-01-31",
            "is_active": True,
            "total_lectures": 15,
        },
    )
    # Ensure it's active (another test may have deactivated it)
    if not obj.is_active:
        Semester.objects.filter(pk=obj.pk).update(is_active=True)
        obj.refresh_from_db()
    return obj


# ─────────────────────────────────────────────────────────────────────────────
# User / profile fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def admin_user(db):
    user = User.objects.create_superuser(
        username="admin",
        password="adminpass123",
        email="admin@test.com",
    )
    return user


@pytest.fixture
def professor_user(db, department):
    user = User.objects.create_user(
        username="prof_test",
        password="profpass123",
        email="prof@test.com",
    )
    prof = Professor.objects.create(
        user=user,
        professor_id="PROF-001",
        name="Dr. Test Professor",
    )
    prof.departments.add(department)
    return user


@pytest.fixture
def professor(db, professor_user):
    return Professor.objects.get(user=professor_user)


@pytest.fixture
def student_user(db, department, major, study_year):
    user = User.objects.create_user(
        username="stu_test",
        password="stupass123",
        email="stu@test.com",
    )
    Student.objects.create(
        user=user,
        student_id="STU-001",
        name="Test Student",
        department=department,
        major=major,
        study_year=study_year,
    )
    return user


@pytest.fixture
def student(db, student_user):
    return Student.objects.get(user=student_user)


# ─────────────────────────────────────────────────────────────────────────────
# Course / assignment / enrollment / session fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def course(db, department):
    return Course.objects.create(
        code="CS101",
        name="Introduction to Programming",
        department=department,
    )


@pytest.fixture
def assignment(db, professor, course, active_semester):
    return CourseAssignment.objects.create(
        professor=professor,
        course=course,
        semester=active_semester,
        expected_lectures=15,
    )


@pytest.fixture
def enrollment(db, student, course, active_semester):
    return Enrollment.objects.create(
        student=student,
        course=course,
        semester=active_semester,
    )


@pytest.fixture
def session(db, course, professor, active_semester, assignment):
    """A live session with a valid QR token (no end_time)."""
    return Session.objects.create(
        course=course,
        professor=professor,
        semester=active_semester,
    )


# ─────────────────────────────────────────────────────────────────────────────
# API client fixtures (pre-authenticated)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def anon_client():
    """Unauthenticated API client."""
    return APIClient()


@pytest.fixture
def admin_client(db, admin_user):
    return auth_client(admin_user)


@pytest.fixture
def professor_client(db, professor_user):
    return auth_client(professor_user)


@pytest.fixture
def student_client(db, student_user):
    return auth_client(student_user)
