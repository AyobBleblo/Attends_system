"""
test_accounts.py — Tests for accounts app endpoints.

Endpoints covered:
  GET  /api/students/                              → StudentListView          (AllowAny)
  GET  /api/professors/                            → ProfessorListView        (AllowAny)
  GET  /api/professor/<id>/courses/               → ProfessorCoursesView     (AllowAny)
  GET  /api/auth/me/                              → MeView                   (IsAuthenticated)
  POST /api/auth/change-password/                 → ChangePasswordView       (IsAuthenticated)
  POST /api/reset-fingerprint/<student_id>/       → ResetFingerprintView     (IsAuthenticated)
  CRUD /api/admin/students/                       → AdminStudentViewSet      (IsAdminUser)
  POST /api/admin/students/<pk>/reset_password/   → AdminStudentViewSet      (IsAdminUser)
  POST /api/admin/students/<pk>/set_custom_password/ → AdminStudentViewSet   (IsAdminUser)
  POST /api/admin/students/<pk>/reset_fingerprint/   → AdminStudentViewSet   (IsAdminUser)
  CRUD /api/admin/professors/                     → AdminProfessorViewSet    (IsAdminUser)
  POST /api/admin/professors/<pk>/reset_password/ → AdminProfessorViewSet    (IsAdminUser)
"""
import pytest
from django.urls import reverse

from accounts.models import Student, Professor, UserDevice


# ─────────────────────────────────────────────────────────────────────────────
# Public list views (AllowAny)
# ─────────────────────────────────────────────────────────────────────────────

class TestStudentList:

    def test_list_students_returns_200_for_anyone(self, anon_client, student):
        url = reverse("student-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)

    def test_list_students_contains_student(self, anon_client, student):
        url = reverse("student-list")
        res = anon_client.get(url)
        ids = [s["student_id"] for s in res.data]
        assert student.student_id in ids


class TestProfessorList:

    def test_list_professors_returns_200_for_anyone(self, anon_client, professor):
        url = reverse("professor-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)

    def test_list_professors_filter_by_department(self, anon_client, professor, department):
        url = reverse("professor-list")
        res = anon_client.get(url, {"department_id": department.id})
        assert res.status_code == 200
        assert len(res.data) >= 1

    def test_list_professors_filter_unknown_department_empty(self, anon_client, db):
        url = reverse("professor-list")
        res = anon_client.get(url, {"department_id": 99999})
        assert res.status_code == 200
        assert res.data == []


class TestProfessorCoursesView:

    def test_professor_courses_returns_200(self, anon_client, professor, active_semester, assignment):
        url = reverse("professor-courses", kwargs={"professor_id": professor.id})
        res = anon_client.get(url)
        assert res.status_code == 200
        assert "professor" in res.data
        assert "courses" in res.data
        assert "semester" in res.data

    def test_professor_courses_contains_assigned_course(
        self, anon_client, professor, course, active_semester, assignment
    ):
        url = reverse("professor-courses", kwargs={"professor_id": professor.id})
        res = anon_client.get(url)
        course_codes = [c["code"] for c in res.data["courses"]]
        assert course.code in course_codes

    def test_professor_courses_not_found(self, anon_client, db):
        url = reverse("professor-courses", kwargs={"professor_id": 99999})
        res = anon_client.get(url)
        assert res.status_code == 404

    def test_professor_courses_no_active_semester(self, anon_client, professor, db):
        """If no active semester exists, view returns 404."""
        from core.models import Semester
        Semester.objects.all().update(is_active=False)
        url = reverse("professor-courses", kwargs={"professor_id": professor.id})
        res = anon_client.get(url)
        assert res.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# /api/auth/me/  (IsAuthenticated)
# ─────────────────────────────────────────────────────────────────────────────

class TestMeView:

    def test_me_unauthenticated_returns_401(self, anon_client):
        url = reverse("auth-me")
        res = anon_client.get(url)
        assert res.status_code == 401

    def test_me_as_admin(self, admin_client):
        url = reverse("auth-me")
        res = admin_client.get(url)
        assert res.status_code == 200
        assert res.data["role"] == "admin"

    def test_me_as_professor(self, professor_client, professor):
        url = reverse("auth-me")
        res = professor_client.get(url)
        assert res.status_code == 200
        assert res.data["role"] == "professor"
        assert res.data["professor_id"] == professor.professor_id

    def test_me_as_student(self, student_client, student):
        url = reverse("auth-me")
        res = student_client.get(url)
        assert res.status_code == 200
        assert res.data["role"] == "student"
        assert res.data["student_id"] == student.student_id


# ─────────────────────────────────────────────────────────────────────────────
# /api/auth/change-password/  (IsAuthenticated)
# ─────────────────────────────────────────────────────────────────────────────

class TestChangePassword:

    def test_change_password_unauthenticated_returns_401(self, anon_client):
        url = reverse("change-password")
        res = anon_client.post(url, {"old_password": "x", "new_password": "y"})
        assert res.status_code == 401

    def test_change_password_success(self, student_client):
        url = reverse("change-password")
        res = student_client.post(
            url,
            {"old_password": "stupass123", "new_password": "newSecure456!"},
            format="json",
        )
        assert res.status_code == 200
        assert "success" in res.data

    def test_change_password_wrong_old_password(self, student_client):
        url = reverse("change-password")
        res = student_client.post(
            url,
            {"old_password": "wrongold", "new_password": "newSecure456!"},
            format="json",
        )
        assert res.status_code == 400
        assert "error" in res.data

    def test_change_password_missing_fields(self, student_client):
        url = reverse("change-password")
        res = student_client.post(url, {}, format="json")
        assert res.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# /api/reset-fingerprint/<student_id>/  (IsAuthenticated, professor/admin only)
# ─────────────────────────────────────────────────────────────────────────────

class TestResetFingerprintView:

    def test_professor_can_reset_fingerprint(self, professor_client, student, student_user):
        """Professor resets a student's fingerprint → 200."""
        UserDevice.objects.create(user=student_user, device_fingerprint="abc123")
        url = reverse("reset-fingerprint", kwargs={"student_id": student.student_id})
        res = professor_client.post(url)
        assert res.status_code == 200
        assert res.data["status"] == "reset"
        assert not UserDevice.objects.filter(user=student_user).exists()

    def test_professor_reset_when_no_device(self, professor_client, student):
        """Reset when student has no linked device → 200 with no_device status."""
        url = reverse("reset-fingerprint", kwargs={"student_id": student.student_id})
        res = professor_client.post(url)
        assert res.status_code == 200
        assert res.data["status"] == "no_device"

    def test_student_cannot_reset_fingerprint(self, student_client, student):
        """Students are not allowed to call this endpoint."""
        url = reverse("reset-fingerprint", kwargs={"student_id": student.student_id})
        res = student_client.post(url)
        assert res.status_code == 403

    def test_reset_fingerprint_student_not_found(self, professor_client):
        url = reverse("reset-fingerprint", kwargs={"student_id": "NONEXISTENT"})
        res = professor_client.post(url)
        assert res.status_code == 404

    def test_unauthenticated_cannot_reset_fingerprint(self, anon_client, student):
        url = reverse("reset-fingerprint", kwargs={"student_id": student.student_id})
        res = anon_client.post(url)
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Admin Student ViewSet  /api/admin/students/
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminStudentViewSet:

    def test_admin_can_list_students(self, admin_client, student):
        url = reverse("admin-students-list")
        res = admin_client.get(url)
        assert res.status_code == 200

    def test_non_admin_cannot_list_admin_students(self, professor_client):
        url = reverse("admin-students-list")
        res = professor_client.get(url)
        assert res.status_code == 403

    def test_admin_search_student_by_name(self, admin_client, student):
        url = reverse("admin-students-list")
        res = admin_client.get(url, {"search": student.name})
        assert res.status_code == 200
        ids = [s["student_id"] for s in res.data["results"]]
        assert student.student_id in ids

    def test_admin_filter_by_department(self, admin_client, student, department):
        url = reverse("admin-students-list")
        res = admin_client.get(url, {"department_id": department.id})
        assert res.status_code == 200
        assert res.data["count"] >= 1

    def test_admin_student_reset_password(self, admin_client, student):
        url = reverse("admin-students-reset-password", kwargs={"pk": student.pk})
        res = admin_client.post(url)
        assert res.status_code == 200
        assert "status" in res.data

    def test_admin_student_set_custom_password(self, admin_client, student):
        url = reverse("admin-students-set-custom-password", kwargs={"pk": student.pk})
        res = admin_client.post(url, {"password": "CustomPass#99!"}, format="json")
        assert res.status_code == 200

    def test_admin_student_set_custom_password_missing(self, admin_client, student):
        url = reverse("admin-students-set-custom-password", kwargs={"pk": student.pk})
        res = admin_client.post(url, {}, format="json")
        assert res.status_code == 400

    def test_admin_student_reset_fingerprint_action(self, admin_client, student, student_user):
        UserDevice.objects.create(user=student_user, device_fingerprint="fp123")
        url = reverse("admin-students-reset-fingerprint", kwargs={"pk": student.pk})
        res = admin_client.post(url)
        assert res.status_code == 200
        assert not UserDevice.objects.filter(user=student_user).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Admin Professor ViewSet  /api/admin/professors/
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminProfessorViewSet:

    def test_admin_can_list_professors(self, admin_client, professor):
        url = reverse("admin-professors-list")
        res = admin_client.get(url)
        assert res.status_code == 200

    def test_non_admin_cannot_list_professors(self, student_client):
        url = reverse("admin-professors-list")
        res = student_client.get(url)
        assert res.status_code == 403

    def test_admin_professor_reset_password(self, admin_client, professor):
        url = reverse("admin-professors-reset-password", kwargs={"pk": professor.pk})
        res = admin_client.post(url)
        assert res.status_code == 200

    def test_admin_professor_set_custom_password(self, admin_client, professor):
        url = reverse("admin-professors-set-custom-password", kwargs={"pk": professor.pk})
        res = admin_client.post(url, {"password": "NewProf#2026!"}, format="json")
        assert res.status_code == 200
