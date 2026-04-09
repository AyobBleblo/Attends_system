from django.urls import path
from .views import DepartmentListView, ActiveSemesterView, SemesterListView, StatsView

urlpatterns = [
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('semesters/', SemesterListView.as_view(), name='semester-list'),
    path('semesters/active/', ActiveSemesterView.as_view(), name='active-semester'),
    path('stats/', StatsView.as_view(), name='stats'),
]
