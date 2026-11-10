"""
test_attendance.py — Tests for attendance app endpoints.

Endpoints covered:
  POST /api/sessions/create/                      → SessionCreateView           (IsAuthenticated)
  GET  /api/sessions/course/<id>/                 → CourseSessionsView          (IsAuthenticated)
  GET  /api/sessions/<id>/qr/                     → SessionQRView               (IsAuthenticated)
  POST /api/sessions/<id>/refresh-qr/             → SessionRefreshQRView        (IsAuthenticated)
  GET  /api/sessions/course/<id>/active/          → CourseSessionStatusView     (IsAuthenticated)
  POST /api/sessions/<id>/end-scan/               → SessionEndScanView          (IsAuthenticated)
  PATCH /api/sessions/<id>/manual-end/            → SessionManualEndView        (IsAuthenticated)
  POST /api/attendance/scan/                      → AttendanceScanView          (IsAuthenticated)
  GET  /api/attendance/session/<id>/              → SessionAttendanceListView   (IsAuthenticated)
  GET  /api/attendance/report/                    → AttendanceReportView        (IsAuthenticated)
  GET  /api/attendance/session-report/            → SessionReportView           (IsAuthenticated)
  GET  /api/attendance/course-report/<id>/        → CourseAttendanceReportView  (IsAuthenticated)
  GET  /api/student/<id>/courses/                 → StudentCoursesView          (IsAuthenticated)
  GET  /api/export/course/<id>/                   → CourseExportView            (IsAuthenticated)
  CRUD /api/admin/enrollments/                    → AdminEnrollmentViewSet      (IsAdminUser)
"""
import pytest
from django.urls import reverse
from django.utils.timezone import now, timedelta

from attendance.models import Session, Attendance, Enrollment
from accounts.models import UserDevice


# ─────────────────────────────────────────────────────────────────────────────
# Session Management
# ─────────────────────────────────────────────────────────────────────────────

class TestSessionCreate:

    def test_professor_can_create_session(self, professor_client, professor, course, active_semester):
        url = reverse("session-create")
        payload = {"professor_id": professor.id, "course_id": course.id}
        res = professor_client.post(url, payload, format="json")
        assert res.status_code == 201
        assert "id" in res.data
        assert "qr_token" in res.data

    def test_create_session_unauthenticated(self, anon_client, professor, course):
        url = reverse("session-create")
        res = anon_client.post(url, {"professor_id": professor.id, "course_id": course.id})
        assert res.status_code == 401

    def test_create_session_invalid_ids(self, professor_client):
        url = reverse("session-create")
        res = professor_client.post(url, {"professor_id": 99999, "course_id": 99999}, format="json")
        assert res.status_code == 400


class TestCourseSessionsView:

    def test_professor_can_list_own_sessions(
        self, professor_client, session, course
    ):
        url = reverse("course-sessions", kwargs={"course_id": course.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)

    def test_unauthenticated_cannot_list_sessions(self, anon_client, course):
        url = reverse("course-sessions", kwargs={"course_id": course.id})
        res = anon_client.get(url)
        assert res.status_code == 401

    def test_student_cannot_list_course_sessions(self, student_client, course):
        """Only professors (with professor_profile) can access this view."""
        url = reverse("course-sessions", kwargs={"course_id": course.id})
        res = student_client.get(url)
        assert res.status_code == 403

    def test_course_sessions_course_not_found(self, professor_client, active_semester, professor_user):
        url = reverse("course-sessions", kwargs={"course_id": 99999})
        res = professor_client.get(url)
        assert res.status_code == 404


class TestSessionQRView:

    def test_get_qr_returns_base64_image(self, professor_client, session):
        url = reverse("session-qr", kwargs={"session_id": session.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert "qr_code" in res.data
        assert res.data["qr_code"].startswith("data:image/png;base64,")

    def test_get_qr_session_not_found(self, professor_client):
        url = reverse("session-qr", kwargs={"session_id": 99999})
        res = professor_client.get(url)
        assert res.status_code == 404

    def test_get_qr_requires_auth(self, anon_client, session):
        url = reverse("session-qr", kwargs={"session_id": session.id})
        res = anon_client.get(url)
        assert res.status_code == 401


class TestSessionRefreshQR:

    def test_refresh_qr_updates_token(self, professor_client, session):
        old_token = session.qr_token
        url = reverse("session-refresh-qr", kwargs={"session_id": session.id})
        res = professor_client.post(url)
        assert res.status_code == 200
        assert "qr_token" in res.data
        assert res.data["qr_token"] != old_token

    def test_refresh_qr_session_not_found(self, professor_client):
        url = reverse("session-refresh-qr", kwargs={"session_id": 99999})
        res = professor_client.post(url)
        assert res.status_code == 404


class TestCourseSessionStatusView:

    def test_returns_active_when_session_live(self, professor_client, session, course):
        """Today's open session → is_active: True."""
        url = reverse("course-session-active", kwargs={"course_id": course.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert res.data["is_active"] is True
        assert res.data["session_id"] == session.id

    def test_returns_inactive_when_no_open_session(self, professor_client, course, active_semester):
        """No open session → is_active: False."""
        url = reverse("course-session-active", kwargs={"course_id": course.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert res.data["is_active"] is False

    def test_requires_auth(self, anon_client, course):
        url = reverse("course-session-active", kwargs={"course_id": course.id})
        res = anon_client.get(url)
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Session End
# ─────────────────────────────────────────────────────────────────────────────

class TestSessionEndScan:

    def test_end_scan_sets_end_time(self, student_client, session):
        url = reverse("session-end-scan", kwargs={"session_id": session.id})
        res = student_client.post(url, {"qr_token": session.qr_token}, format="json")
        assert res.status_code == 200
        assert res.data["success"] is True
        assert "end_time" in res.data
        assert "duration_minutes" in res.data

    def test_end_scan_invalid_qr_token(self, student_client, session):
        url = reverse("session-end-scan", kwargs={"session_id": session.id})
        res = student_client.post(url, {"qr_token": "wrong-token"}, format="json")
        assert res.status_code == 400

    def test_end_scan_session_not_found(self, student_client):
        url = reverse("session-end-scan", kwargs={"session_id": 99999})
        res = student_client.post(url, {"qr_token": "anything"}, format="json")
        assert res.status_code == 404


class TestSessionManualEnd:

    def test_professor_can_manually_end_own_session(self, professor_client, session):
        url = reverse("session-manual-end", kwargs={"session_id": session.id})
        end_time = (now() + timedelta(hours=1)).isoformat()
        payload = {"end_time": end_time, "teacher_note": "Class ended early due to power cut."}
        res = professor_client.patch(url, payload, format="json")
        assert res.status_code == 200
        assert res.data["teacher_note"] == "Class ended early due to power cut."

    def test_manual_end_missing_note(self, professor_client, session):
        url = reverse("session-manual-end", kwargs={"session_id": session.id})
        end_time = (now() + timedelta(hours=1)).isoformat()
        res = professor_client.patch(url, {"end_time": end_time}, format="json")
        assert res.status_code == 400

    def test_manual_end_missing_end_time(self, professor_client, session):
        url = reverse("session-manual-end", kwargs={"session_id": session.id})
        res = professor_client.patch(url, {"teacher_note": "Note without time"}, format="json")
        assert res.status_code == 400

    def test_manual_end_end_time_before_start(self, professor_client, session):
        url = reverse("session-manual-end", kwargs={"session_id": session.id})
        bad_time = (session.date_time - timedelta(hours=1)).isoformat()
        payload = {"end_time": bad_time, "teacher_note": "Invalid time"}
        res = professor_client.patch(url, payload, format="json")
        assert res.status_code == 400

    def test_student_cannot_manually_end_session(self, student_client, session):
        url = reverse("session-manual-end", kwargs={"session_id": session.id})
        end_time = (now() + timedelta(hours=1)).isoformat()
        payload = {"end_time": end_time, "teacher_note": "Student trying to end session."}
        res = student_client.patch(url, payload, format="json")
        assert res.status_code == 403

    def test_manual_end_session_not_found(self, professor_client):
        url = reverse("session-manual-end", kwargs={"session_id": 99999})
        end_time = (now() + timedelta(hours=1)).isoformat()
        res = professor_client.patch(
            url, {"end_time": end_time, "teacher_note": "Note"}, format="json"
        )
        assert res.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Attendance Scan  POST /api/attendance/scan/
# ─────────────────────────────────────────────────────────────────────────────

class TestAttendanceScan:

    def test_scan_success(self, student_client, student, session, enrollment, assignment):
        url = reverse("attendance-scan")
        payload = {"student_id": student.student_id, "qr_token": session.qr_token}
        res = student_client.post(url, payload, format="json")
        assert res.status_code == 200
        assert res.data["success"] is True

    def test_scan_missing_student_id(self, student_client, session):
        url = reverse("attendance-scan")
        res = student_client.post(url, {"qr_token": session.qr_token}, format="json")
        assert res.status_code == 400
        assert "error" in res.data

    def test_scan_missing_qr_token(self, student_client, student):
        url = reverse("attendance-scan")
        res = student_client.post(url, {"student_id": student.student_id}, format="json")
        assert res.status_code == 400

    def test_scan_invalid_qr_token(self, student_client, student, enrollment):
        url = reverse("attendance-scan")
        res = student_client.post(
            url, {"student_id": student.student_id, "qr_token": "invalid-token"}, format="json"
        )
        assert res.status_code == 400

    def test_scan_not_enrolled(self, student_client, student, session, assignment):
        """Student not enrolled → 400."""
        url = reverse("attendance-scan")
        res = student_client.post(
            url, {"student_id": student.student_id, "qr_token": session.qr_token}, format="json"
        )
        assert res.status_code == 400

    def test_scan_duplicate_returns_400(
        self, student_client, student, session, enrollment, assignment
    ):
        """Scanning the same session twice → 400 (unique_together constraint)."""
        url = reverse("attendance-scan")
        payload = {"student_id": student.student_id, "qr_token": session.qr_token}
        student_client.post(url, payload, format="json")   # first scan
        res = student_client.post(url, payload, format="json")  # duplicate
        assert res.status_code == 400
        assert "already" in res.data.get("error", "").lower()

    def test_scan_device_mismatch_returns_403(
        self, student_client, student, student_user, session, enrollment, assignment
    ):
        """Wrong device fingerprint → 403."""
        # Link a known device first
        UserDevice.objects.create(user=student_user, device_fingerprint="trusted-device-abc")
        url = reverse("attendance-scan")
        payload = {
            "student_id": student.student_id,
            "qr_token": session.qr_token,
            "device_id": "different-device-xyz",  # mismatch
        }
        res = student_client.post(url, payload, format="json")
        assert res.status_code == 403
        assert res.data.get("device_mismatch") is True

    def test_scan_requires_auth(self, anon_client, student, session):
        url = reverse("attendance-scan")
        res = anon_client.post(
            url, {"student_id": student.student_id, "qr_token": session.qr_token}, format="json"
        )
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Attendance Reports
# ─────────────────────────────────────────────────────────────────────────────

class TestSessionAttendanceList:

    def test_list_attendance_for_session(self, professor_client, session, student, enrollment, assignment):
        # Create an attendance record manually
        Attendance.objects.create(
            session=session,
            student=student,
            course=session.course,
            status="present",
        )
        url = reverse("session-attendance-list", kwargs={"session_id": session.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert isinstance(res.data, list)
        assert len(res.data) >= 1

    def test_list_attendance_requires_auth(self, anon_client, session):
        url = reverse("session-attendance-list", kwargs={"session_id": session.id})
        res = anon_client.get(url)
        assert res.status_code == 401


class TestAttendanceReport:

    def test_report_returns_200(self, professor_client, session, active_semester):
        url = reverse("attendance-report")
        res = professor_client.get(url)
        assert res.status_code == 200
        assert "results" in res.data
        assert "summary" in res.data

    def test_report_filter_by_course(self, professor_client, course, session, active_semester):
        url = reverse("attendance-report")
        res = professor_client.get(url, {"course_id": course.id})
        assert res.status_code == 200

    def test_report_requires_auth(self, anon_client):
        url = reverse("attendance-report")
        res = anon_client.get(url)
        assert res.status_code == 401


class TestSessionReport:

    def test_session_report_returns_200(self, professor_client):
        url = reverse("session-report")
        res = professor_client.get(url)
        assert res.status_code == 200
        assert "count" in res.data
        assert "results" in res.data

    def test_session_report_filter_by_session(self, professor_client, session):
        url = reverse("session-report")
        res = professor_client.get(url, {"session_id": session.id})
        assert res.status_code == 200

    def test_session_report_requires_auth(self, anon_client):
        url = reverse("session-report")
        res = anon_client.get(url)
        assert res.status_code == 401


class TestCourseAttendanceReport:

    def test_course_report_returns_200(self, professor_client, course, active_semester):
        url = reverse("course-attendance-report", kwargs={"course_id": course.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert "course_name" in res.data
        assert "students" in res.data

    def test_course_report_course_not_found(self, professor_client):
        url = reverse("course-attendance-report", kwargs={"course_id": 99999})
        res = professor_client.get(url)
        assert res.status_code == 404

    def test_course_report_requires_auth(self, anon_client, course):
        url = reverse("course-attendance-report", kwargs={"course_id": course.id})
        res = anon_client.get(url)
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Student Courses View
# ─────────────────────────────────────────────────────────────────────────────

class TestStudentCoursesView:

    def test_student_courses_returns_200(
        self, professor_client, student, enrollment, active_semester
    ):
        url = reverse("student-courses", kwargs={"student_id": student.student_id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert res.data["student_id"] == student.student_id
        assert "courses" in res.data

    def test_student_courses_not_found(self, professor_client):
        url = reverse("student-courses", kwargs={"student_id": "NONEXISTENT"})
        res = professor_client.get(url)
        assert res.status_code == 404

    def test_student_courses_requires_auth(self, anon_client, student):
        url = reverse("student-courses", kwargs={"student_id": student.student_id})
        res = anon_client.get(url)
        assert res.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# CSV Export  GET /api/export/course/<id>/
# ─────────────────────────────────────────────────────────────────────────────

class TestCourseExportView:

    def test_professor_can_export_own_course(
        self, professor_client, course, active_semester, assignment
    ):
        url = reverse("course-export", kwargs={"course_id": course.id})
        res = professor_client.get(url)
        assert res.status_code == 200
        assert res.get("Content-Type") == "text/csv"
        assert "attachment" in res.get("Content-Disposition", "")

    def test_export_requires_auth(self, anon_client, course):
        url = reverse("course-export", kwargs={"course_id": course.id})
        res = anon_client.get(url)
        assert res.status_code == 401

    def test_export_another_professors_course_forbidden(
        self, db, course, active_semester
    ):
        """A different professor (not assigned to the course) → 403."""
        from django.contrib.auth.models import User
        from accounts.models import Professor
        from core.models import Department
        from rest_framework.test import APIClient
        from rest_framework_simplejwt.tokens import RefreshToken

        dept = Department.objects.get_or_create(name="Other Dept", code="OTH")[0]
        user2 = User.objects.create_user(username="prof2_export", password="pass2")
        prof2 = Professor.objects.create(user=user2, professor_id="PROF-EXP2", name="Prof Two Export")
        prof2.departments.add(dept)

        token = str(RefreshToken.for_user(user2).access_token)
        client2 = APIClient()
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        url = reverse("course-export", kwargs={"course_id": course.id})
        res = client2.get(url)
        assert res.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# Admin Enrollments ViewSet  /api/admin/enrollments/
# ─────────────────────────────────────────────────────────────────────────────

class TestAdminEnrollmentViewSet:

    def test_admin_can_list_enrollments(self, admin_client, enrollment):
        url = reverse("admin-enrollments-list")
        res = admin_client.get(url)
        assert res.status_code == 200

    def test_non_admin_cannot_list_enrollments(self, professor_client):
        url = reverse("admin-enrollments-list")
        res = professor_client.get(url)
        assert res.status_code == 403

    def test_admin_can_create_enrollment(
        self, admin_client, student, course, active_semester
    ):
        url = reverse("admin-enrollments-list")
        payload = {
            "student": student.id,
            "course": course.id,
            "semester": active_semester.id,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 201

    def test_admin_cannot_create_duplicate_enrollment(
        self, admin_client, enrollment
    ):
        """unique_together prevents duplicate enrollments."""
        url = reverse("admin-enrollments-list")
        payload = {
            "student": enrollment.student.id,
            "course": enrollment.course.id,
            "semester": enrollment.semester.id,
        }
        res = admin_client.post(url, payload, format="json")
        assert res.status_code == 400
