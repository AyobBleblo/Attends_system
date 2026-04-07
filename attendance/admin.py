from django.contrib import admin
from attendance.models import Enrollment, Session, Attendance


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'semester')
    list_filter = ('semester', 'course__department')
    search_fields = ('student__name', 'student__student_id', 'course__code')
    ordering = ('-semester__start_date',)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('course', 'professor', 'semester', 'date_time', 'qr_token', 'qr_expires_at')
    list_filter = ('semester', 'course', 'professor')
    search_fields = ('course__code', 'professor__name', 'qr_token')
    ordering = ('-date_time',)
    readonly_fields = ('qr_token',)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'session', 'scanned_at', 'status')
    list_filter = ('status', 'session__semester', 'session__course')
    search_fields = ('student__name', 'student__student_id', 'session__course__code')
    ordering = ('-scanned_at',)
