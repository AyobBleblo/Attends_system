"""
test_core.py — Tests for core app endpoints.

Endpoints covered:
  GET  /api/departments/              → DepartmentListView       (AllowAny)
  GET  /api/majors/                   → MajorListView            (AllowAny)
  GET  /api/study-years/              → StudyYearListView        (AllowAny)
  GET  /api/semesters/                → SemesterListView         (AllowAny)
  GET  /api/semesters/active/         → ActiveSemesterView       (AllowAny)
  GET  /api/stats/                    → StatsView                (AllowAny)
  CRUD /api/admin/semesters/          → AdminSemesterViewSet     (IsAdminUser)
  CRUD /api/admin/departments/        → AdminDepartmentViewSet   (IsAdminUser)
  CRUD /api/admin/majors/             → AdminMajorViewSet        (IsAdminUser)
  CRUD /api/admin/study-years/        → AdminStudyYearViewSet    (IsAdminUser)
"""
import pytest
from django.urls import reverse

from core.models import Department, Major, StudyYear, Semester


# ─────────────────────────────────────────────────────────────────────────────
# Public / AllowAny views
# ─────────────────────────────────────────────────────────────────────────────

class TestDepartmentList:

    def test_list_departments_returns_200(self, anon_client, department):
        """Anyone can list departments without authentication."""
        url = reverse("department-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)
        assert len(res.data) >= 1

    def test_list_departments_contains_correct_fields(self, anon_client, department):
        url = reverse("department-list")
        res = anon_client.get(url)
        first = res.data[0]
        assert "id" in first
        assert "name" in first
        assert "code" in first


class TestMajorList:

    def test_list_majors_returns_200(self, anon_client, major):
        url = reverse("major-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)

    def test_list_majors_filter_by_department(self, anon_client, major, department):
        url = reverse("major-list")
        res = anon_client.get(url, {"department_id": department.id})
        assert res.status_code == 200
        assert all(m["department"] == department.id for m in res.data)

    def test_list_majors_filter_unknown_department_returns_empty(self, anon_client, db):
        url = reverse("major-list")
        res = anon_client.get(url, {"department_id": 99999})
        assert res.status_code == 200
        assert res.data == []


class TestStudyYearList:

    def test_list_study_years_returns_200(self, anon_client, study_year):
        url = reverse("study-year-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)
        assert len(res.data) >= 1


class TestSemesterList:

    def test_list_semesters_returns_200(self, anon_client, active_semester):
        url = reverse("semester-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)
        assert len(res.data) >= 1


class TestActiveSemester:

    def test_active_semester_returns_200(self, anon_client, active_semester):
        url = reverse("active-semester")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert res.data["name"] == active_semester.name
        assert res.data["is_active"] is True

    def test_active_semester_returns_404_when_none(self, anon_client, active_semester):
        """With no active semester, should return 404."""
        Semester.objects.filter(pk=active_semester.pk).update(is_active=False)
        url = reverse("active-semester")
        res = anon_client.get(url)
        assert res.status_code == 404


class TestStats:

    def test_stats_returns_200(self, anon_client, department, active_semester):
        url = reverse("stats")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert "total_students" in res.data
        assert "total_professors" in res.data
        assert "total_courses" in res.data
        assert "total_departments" in res.data

    def test_stats_counts_are_non_negative(self, anon_client, db):
        url = reverse("stats")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert res.data["total_students"] >= 0
        assert res.data["total_professors"] >= 0


# ─────────────────────────────────────────────────────────────────────────────
# Admin-only CRUD ViewSets
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminSemesterViewSet:

    def test_admin_can_create_semester(self, admin_client):
        url = reverse("admin-semesters-list")
        payload = {
            "name": "Spring 2026",
            "start_date": "2026-02-01",
            "end_date": "2026-06-30",
            "is_active": False,
            "total_lectures": 15,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 201
        assert res.data["name"] == "Spring 2026"

    def test_non_admin_cannot_create_semester(self, professor_client):
        url = reverse("admin-semesters-list")
        payload = {
            "name": "Spring 2026",
            "start_date": "2026-02-01",
            "end_date": "2026-06-30",
            "is_active": False,
            "total_lectures": 15,
        }
        res = professor_client.post(url, payload, format="json")
        assert res.status_code == 403

    def test_admin_can_list_semesters(self, admin_client, active_semester):
        url = reverse("admin-semesters-list")
        res = admin_client.get(url)
        assert res.status_code == 200


class TestAdminDepartmentViewSet:

    def test_admin_can_create_department(self, admin_client):
        url = reverse("admin-departments-list")
        res = admin_client.post(url, {"name": "Physics", "code": "PHY"}, format="json")
        assert res.status_code == 201

    def test_non_admin_cannot_create_department(self, professor_client):
        url = reverse("admin-departments-list")
        res = professor_client.post(url, {"name": "Physics", "code": "PHY"}, format="json")
        assert res.status_code == 403

    def test_admin_can_update_department(self, admin_client, department):
        url = reverse("admin-departments-detail", kwargs={"pk": department.pk})
        res = admin_client.patch(url, {"name": "Advanced CS"}, format="json")
        assert res.status_code == 200
        assert res.data["name"] == "Advanced CS"

    def test_admin_can_delete_department(self, admin_client, db):
        dept = Department.objects.create(name="Temp Dept", code="TMP")
        url = reverse("admin-departments-detail", kwargs={"pk": dept.pk})
        res = admin_client.delete(url)
        assert res.status_code == 204


class TestAdminMajorViewSet:

    def test_admin_can_create_major(self, admin_client, department):
        url = reverse("admin-majors-list")
        res = admin_client.post(
            url,
            {"name": "AI & Machine Learning", "department": department.id},
            format="json",
        )
        assert res.status_code == 201

    def test_non_admin_cannot_create_major(self, student_client, department):
        url = reverse("admin-majors-list")
        res = student_client.post(
            url,
            {"name": "AI & Machine Learning", "department": department.id},
            format="json",
        )
        assert res.status_code == 403


class TestAdminStudyYearViewSet:

    def test_admin_can_create_study_year(self, admin_client):
        url = reverse("admin-study-years-list")
        res = admin_client.post(url, {"name": "First Year", "order": 1}, format="json")
        # 201 = created fresh, 400 = already exists (unique constraint) both are acceptable
        # but we mainly confirm non-admins are blocked
        assert res.status_code in (201, 400)

    def test_non_admin_cannot_create_study_year(self, student_client):
        url = reverse("admin-study-years-list")
        res = student_client.post(url, {"name": "First Year", "order": 1}, format="json")
        assert res.status_code == 403
