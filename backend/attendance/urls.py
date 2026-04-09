from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SessionCreateView,
    SessionQRView,
    AttendanceScanView,
    SessionAttendanceListView,
    AttendanceReportView,
    StudentCoursesView,
    AdminEnrollmentViewSet,
    CourseSessionsView,
    CourseExportView,
)

router = DefaultRouter()
router.register(r'admin/enrollments', AdminEnrollmentViewSet, basename='admin-enrollments')

urlpatterns = [
    path('sessions/create/', SessionCreateView.as_view(), name='session-create'),
    path('sessions/course/<int:course_id>/', CourseSessionsView.as_view(), name='course-sessions'),
    path('export/course/<int:course_id>/', CourseExportView.as_view(), name='course-export'),
    path('sessions/<int:session_id>/qr/', SessionQRView.as_view(), name='session-qr'),
    path('attendance/scan/', AttendanceScanView.as_view(), name='attendance-scan'),
    path('attendance/session/<int:session_id>/', SessionAttendanceListView.as_view(), name='session-attendance-list'),
    path('attendance/report/', AttendanceReportView.as_view(), name='attendance-report'),
    path('student/<str:student_id>/courses/', StudentCoursesView.as_view(), name='student-courses'),
    path('', include(router.urls)),
]
