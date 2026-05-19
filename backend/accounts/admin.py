from django.contrib import admin
from .models import Student, Professor


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_id', 'name', 'major', 'department', 'study_year')
    list_filter = ('department', 'study_year', 'major')
    search_fields = ('student_id', 'name', 'major__name')
    ordering = ('name',)


@admin.register(Professor)
class ProfessorAdmin(admin.ModelAdmin):
    list_display = ('professor_id', 'name', 'get_departments')
    list_filter = ('departments',)
    search_fields = ('professor_id', 'name')
    ordering = ('name',)

    def get_departments(self, obj):
        return ", ".join([d.name for d in obj.departments.all()])
    get_departments.short_description = 'Departments'
