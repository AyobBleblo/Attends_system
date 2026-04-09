from django.contrib import admin
from .models import Enrollment, Session, Attendance


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'semester')
    list_filter = ('semester', 'course__department')
    search_fields = ('student__name', 'student__student_id', 'course__code')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('course', 'professor', 'semester', 'date_time', 'qr_token', 'qr_expires_at')
    list_filter = ('semester', 'course', 'professor')
    search_fields = ('course__code', 'professor__name', 'qr_token')
    readonly_fields = ('qr_token', 'qr_expires_at')


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'session', 'scanned_at', 'status')
    list_filter = ('status', 'session__semester', 'session__course')
    search_fields = ('student__name', 'student__student_id', 'session__course__code')
