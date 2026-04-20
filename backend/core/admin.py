from django.contrib import admin
from django.contrib import messages
from .models import Department, Semester, Notification


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('name', 'code')
    ordering = ('name',)


def activate_semester(modeladmin, request, queryset):
    """Custom admin action: sets selected semester as the sole active one."""
    if queryset.count() != 1:
        modeladmin.message_user(request, "Please select exactly ONE semester to activate.", messages.WARNING)
        return
    semester = queryset.first()
    Semester.objects.exclude(pk=semester.pk).update(is_active=False)
    semester.is_active = True
    semester.save()
    modeladmin.message_user(request, f'"{semester.name}" is now the active semester.', messages.SUCCESS)

activate_semester.short_description = "✅ Set selected semester as ACTIVE"


@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'total_lectures', 'is_active')
    list_editable = ('total_lectures', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    ordering = ('-start_date',)
    actions = [activate_semester]
    fieldsets = (
        (None, {
            'fields': ('name', 'is_active')
        }),
        ('Date Range', {
            'fields': ('start_date', 'end_date')
        }),
        ('Lecture Quota', {
            'fields': ('total_lectures',),
            'description': (
                'Set the maximum number of lectures for all courses in this semester. '
                'Students cannot exceed this scan count per course.'
            ),
        }),
    )


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ('professor', 'notification_type', 'is_read', 'short_message', 'created_at')
    list_filter   = ('notification_type', 'is_read')
    search_fields = ('professor__name', 'message')
    ordering      = ('-created_at',)
    readonly_fields = ('professor', 'message', 'notification_type', 'created_at')
    actions = ['mark_as_read']

    @admin.display(description='Message')
    def short_message(self, obj):
        return obj.message[:80] + ('…' if len(obj.message) > 80 else '')

    @admin.action(description='Mark selected as read')
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notification(s) marked as read.', messages.SUCCESS)
