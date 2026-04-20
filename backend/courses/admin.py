from django.contrib import admin
from .models import Course, CourseAssignment


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department')
    list_filter = ('department',)
    search_fields = ('code', 'name')
    ordering = ('code',)


@admin.register(CourseAssignment)
class CourseAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('professor', 'course', 'semester', 'expected_lectures', 'coverage_pct')
    list_editable = ('expected_lectures',)
    list_filter   = ('semester', 'course__department')
    search_fields = ('professor__name', 'course__code', 'course__name')
    ordering      = ('-semester__start_date',)
    fieldsets = (
        (None, {
            'fields': ('professor', 'course', 'semester'),
        }),
        ('Lecture Compliance Target', {
            'fields': ('expected_lectures',),
            'description': (
                'Set the number of lectures this professor is expected to deliver '
                'for this course this semester. The tracking service will send a '
                'congratulation notification at 100% and a warning at ≤70% coverage '
                'when the semester is within 14 days of ending.'
            ),
        }),
    )

    @admin.display(description='Coverage %')
    def coverage_pct(self, obj):
        from courses.tracking_service import calculate_coverage
        c = calculate_coverage(obj)
        return f"{c['actual']}/{c['expected']} ({c['pct']}%)"
