"""
test_courses.py — Tests for courses app endpoints.

Endpoints covered:
  GET  /api/courses/                          → CourseListView               (AllowAny)
  CRUD /api/admin/courses/                    → AdminCourseViewSet           (IsAdminUser)
  CRUD /api/admin/assignments/                → AdminCourseAssignmentViewSet (IsAdminUser)
  POST /api/courses/<id>/assign-professors/  → CourseProfessorAssignView    (IsAdminUser)
  POST /api/courses/admin/nested-assign/     → NestedAssignmentCreateView   (IsAdminUser)
"""
import pytest
from django.urls import reverse

from courses.models import Course, CourseAssignment


# ─────────────────────────────────────────────────────────────────────────────
# Public course list (AllowAny)
# ─────────────────────────────────────────────────────────────────────────────

class TestCourseList:

    def test_list_courses_returns_200_for_anyone(self, anon_client, course):
        url = reverse("course-list")
        res = anon_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)

    def test_list_courses_contains_course(self, anon_client, course):
        url = reverse("course-list")
        res = anon_client.get(url)
        codes = [c["code"] for c in res.data]
        assert course.code in codes


# ─────────────────────────────────────────────────────────────────────────────
# Admin Course ViewSet  /api/admin/courses/
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminCourseViewSet:

    def test_admin_can_list_courses(self, admin_client, course):
        url = reverse("admin-courses-list")
        res = admin_client.get(url)
        assert res.status_code == 200

    def test_non_admin_cannot_list_admin_courses(self, professor_client):
        url = reverse("admin-courses-list")
        res = professor_client.get(url)
        assert res.status_code == 403

    def test_admin_can_create_course(self, admin_client, department):
        url = reverse("admin-courses-list")
        payload = {
            "code": "CS202",
            "name": "Data Structures",
            "department": department.id,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 201
        assert res.data["code"] == "CS202"

    def test_admin_create_course_duplicate_code(self, admin_client, course):
        """Duplicate course code → 400."""
        url = reverse("admin-courses-list")
        payload = {
            "code": course.code,   # already exists
            "name": "Another Course",
            "department": course.department.id,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 400

    def test_admin_can_update_course(self, admin_client, course):
        url = reverse("admin-courses-detail", kwargs={"pk": course.pk})
        res = admin_client.patch(url, {"name": "Updated Course Name"}, format="json")
        assert res.status_code == 200
        assert res.data["name"] == "Updated Course Name"

    def test_admin_can_delete_course(self, admin_client, department):
        import uuid
        temp = Course.objects.create(
            code=f"TMP{uuid.uuid4().hex[:4].upper()}",
            name="Temp Course",
            department=department,
        )
        url = reverse("admin-courses-detail", kwargs={"pk": temp.pk})
        res = admin_client.delete(url)
        assert res.status_code == 204
        assert not Course.objects.filter(pk=temp.pk).exists()

    def test_admin_filter_courses_by_department(self, admin_client, course, department):
        url = reverse("admin-courses-list")
        res = admin_client.get(url, {"department_id": department.id})
        assert res.status_code == 200
        codes = [c["code"] for c in res.data]
        assert course.code in codes


# ─────────────────────────────────────────────────────────────────────────────
# Admin Assignment ViewSet  /api/admin/assignments/
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminAssignmentViewSet:

    def test_admin_can_list_assignments(self, admin_client, assignment):
        url = reverse("admin-assignments-list")
        res = admin_client.get(url)
        assert res.status_code == 200

    def test_non_admin_cannot_list_assignments(self, student_client):
        url = reverse("admin-assignments-list")
        res = student_client.get(url)
        assert res.status_code == 403

    def test_admin_can_create_assignment(self, admin_client, professor, course, active_semester):
        url = reverse("admin-assignments-list")
        payload = {
            "professor": professor.id,
            "course": course.id,
            "semester": active_semester.id,
            "expected_lectures": 12,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 201


# ─────────────────────────────────────────────────────────────────────────────
# Assign professors to course  POST /api/courses/<id>/assign-professors/
# ─────────────────────────────────────────────────────────────────────────────

class TestCourseProfessorAssignView:

    def test_admin_can_assign_professor(self, admin_client, course, professor, active_semester):
        url = reverse("course-assign-professors", kwargs={"course_id": course.id})
        payload = {
            "professor_ids": [professor.id],
            "semester_id": active_semester.id,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 200

    def test_non_admin_cannot_assign_professor(self, professor_client, course, active_semester, professor):
        url = reverse("course-assign-professors", kwargs={"course_id": course.id})
        payload = {
            "professor_ids": [professor.id],
            "semester_id": active_semester.id,
        }
        res = professor_client.post(url, payload, format="json")
        assert res.status_code == 403
