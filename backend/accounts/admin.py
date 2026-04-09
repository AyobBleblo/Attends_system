from django.contrib import admin
from .models import Student, Professor


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'name', 'department')
    list_filter = ('department',)
    search_fields = ('student_id', 'name')
    ordering = ('name',)


@admin.register(Professor)
class ProfessorAdmin(admin.ModelAdmin):
    list_display = ('professor_id', 'name', 'department')
    list_filter = ('department',)
    search_fields = ('professor_id', 'name')
    ordering = ('name',)
