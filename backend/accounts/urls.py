from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentListView, ProfessorListView, ProfessorCoursesView,
    MeView, AdminStudentViewSet, AdminProfessorViewSet,
    ChangePasswordView, ResetFingerprintView,
)

router = DefaultRouter()
router.register(r'admin/students', AdminStudentViewSet, basename='admin-students')
router.register(r'admin/professors', AdminProfessorViewSet, basename='admin-professors')

urlpatterns = [
    path('students/', StudentListView.as_view(), name='student-list'),
    path('professors/', ProfessorListView.as_view(), name='professor-list'),
    path('professor/<int:professor_id>/courses/', ProfessorCoursesView.as_view(), name='professor-courses'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    # Professor/Admin endpoint — reset a student's device fingerprint by their string ID
    path('reset-fingerprint/<str:student_id>/', ResetFingerprintView.as_view(), name='reset-fingerprint'),
    path('', include(router.urls)),
]
