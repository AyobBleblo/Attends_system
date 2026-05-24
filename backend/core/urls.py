from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentListView, ActiveSemesterView, SemesterListView, StatsView, AdminSemesterViewSet, StudyYearListView, AdminStudyYearViewSet, MajorListView, AdminDepartmentViewSet, AdminMajorViewSet

router = DefaultRouter()
router.register(r'admin/semesters', AdminSemesterViewSet, basename='admin-semesters')
router.register(r'admin/study-years', AdminStudyYearViewSet, basename='admin-study-years')
router.register(r'admin/departments', AdminDepartmentViewSet, basename='admin-departments')
router.register(r'admin/majors', AdminMajorViewSet, basename='admin-majors')

urlpatterns = [
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('majors/', MajorListView.as_view(), name='major-list'),
    path('study-years/', StudyYearListView.as_view(), name='study-year-list'),
    path('semesters/', SemesterListView.as_view(), name='semester-list'),
    path('semesters/active/', ActiveSemesterView.as_view(), name='active-semester'),
    path('stats/', StatsView.as_view(), name='stats'),
    path('', include(router.urls)),
]
