from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourseListView, AdminCourseViewSet, AdminCourseAssignmentViewSet

router = DefaultRouter()
router.register(r'admin/courses', AdminCourseViewSet, basename='admin-courses')
router.register(r'admin/assignments', AdminCourseAssignmentViewSet, basename='admin-assignments')

urlpatterns = [
    path('courses/', CourseListView.as_view(), name='course-list'),
    path('', include(router.urls)),
]
