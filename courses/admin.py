from django.contrib import admin
from courses.models import Course, CourseAssignment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department')
    list_filter = ('department',)
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(CourseAssignment)
class CourseAssignmentAdmin(admin.ModelAdmin):
    list_display = ('professor', 'course', 'semester')
    list_filter = ('semester', 'course__department')
    search_fields = ('professor__name', 'course__code', 'course__name')
    ordering = ('-semester__start_date',)
