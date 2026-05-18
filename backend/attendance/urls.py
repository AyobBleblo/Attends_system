from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SessionCreateView,
    SessionQRView,
    SessionRefreshQRView,
    SessionEndScanView,
    SessionManualEndView,
    CourseSessionStatusView,
    AttendanceScanView,
    SessionAttendanceListView,
    AttendanceReportView,
    StudentCoursesView,
    AdminEnrollmentViewSet,
    CourseSessionsView,
    CourseExportView,
    SessionReportView,
    CourseAttendanceReportView,
)

router = DefaultRouter()
router.register(r'admin/enrollments', AdminEnrollmentViewSet, basename='admin-enrollments')

urlpatterns = [
    # Session management
    path('sessions/create/', SessionCreateView.as_view(), name='session-create'),
    path('sessions/course/<int:course_id>/', CourseSessionsView.as_view(), name='course-sessions'),
    path('sessions/<int:session_id>/qr/', SessionQRView.as_view(), name='session-qr'),
    path('sessions/<int:session_id>/refresh-qr/', SessionRefreshQRView.as_view(), name='session-refresh-qr'),

    # Session duration tracking
    path('sessions/<int:session_id>/end-scan/', SessionEndScanView.as_view(), name='session-end-scan'),
    path('sessions/<int:session_id>/manual-end/', SessionManualEndView.as_view(), name='session-manual-end'),

    # Flutter: check if a session is currently live for a course (today, no end_time)
    path('sessions/course/<int:course_id>/active/', CourseSessionStatusView.as_view(), name='course-session-active'),

    # QR Scanning
    path('attendance/scan/', AttendanceScanView.as_view(), name='attendance-scan'),
    path('attendance/session/<int:session_id>/', SessionAttendanceListView.as_view(), name='session-attendance-list'),

    # Legacy report (kept for backwards compatibility)
    path('attendance/report/', AttendanceReportView.as_view(), name='attendance-report'),

    # NEW: Session-level report (filterable by session, teacher, course, student)
    path('attendance/session-report/', SessionReportView.as_view(), name='session-report'),

    # NEW: Comprehensive course attendance report (lecture matrix per student)
    path('attendance/course-report/<int:course_id>/', CourseAttendanceReportView.as_view(), name='course-attendance-report'),

    # Export & Student views
    path('export/course/<int:course_id>/', CourseExportView.as_view(), name='course-export'),
    path('student/<str:student_id>/courses/', StudentCoursesView.as_view(), name='student-courses'),

    path('', include(router.urls)),
]

