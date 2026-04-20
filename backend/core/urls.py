from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepartmentListView, ActiveSemesterView, SemesterListView, StatsView, AdminSemesterViewSet

router = DefaultRouter()
router.register(r'admin/semesters', AdminSemesterViewSet, basename='admin-semesters')

urlpatterns = [
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('semesters/', SemesterListView.as_view(), name='semester-list'),
    path('semesters/active/', ActiveSemesterView.as_view(), name='active-semester'),
    path('stats/', StatsView.as_view(), name='stats'),
    path('', include(router.urls)),
]
