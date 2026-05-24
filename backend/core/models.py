from django.db import models
from django.utils.translation import gettext_lazy as _


class Department(models.Model):
    """An academic department within the university."""
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, db_index=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return f"{self.code} - {self.name}"

class Major(models.Model):
    """An academic major or specialization within a department."""
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='majors'
    )

    class Meta:
        ordering = ['name']
        unique_together = ('name', 'department')
        verbose_name = 'Major'
        verbose_name_plural = 'Majors'

    def __str__(self):
        return f"{self.name} ({self.department.code})"



class StudyYear(models.Model):
    """A study year within the university (e.g., First Year, Second Year)."""
    name = models.CharField(max_length=100, unique=True)
    order = models.PositiveSmallIntegerField(default=1, help_text="Used for sorting years (1 for First Year, 2 for Second Year, etc.)")

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Study Year'
        verbose_name_plural = 'Study Years'

    def __str__(self):
        return self.name


class Semester(models.Model):
    """An academic semester with start/end dates and a lecture quota per course."""
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False, db_index=True)
    total_lectures = models.PositiveSmallIntegerField(
        default=15,
        help_text='Maximum number of lectures per course in this semester (used for attendance quota enforcement and reporting).'
    )

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'Semester'
        verbose_name_plural = 'Semesters'

    def save(self, *args, **kwargs):
        # Ensure only one active semester at a time
        if self.is_active:
            Semester.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Notification(models.Model):
    """
    In-app notification record for a professor.
    Created by the LectureTrackingService when a professor
    hits 100% lecture completion (congratulation) or falls
    below the warning threshold near the semester end (warning).
    """
    class NotificationType(models.TextChoices):
        CONGRATULATION = 'congratulation', _('Congratulation')
        WARNING        = 'warning',        _('Warning')

    professor    = models.ForeignKey(
        'accounts.Professor',
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    message          = models.TextField()
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
    )
    is_read      = models.BooleanField(default=False, db_index=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['professor', 'is_read']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.professor} — {self.created_at:%Y-%m-%d}"


# ── Cache Invalidation Signals ───────────────────────────────────────────────
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver([post_save, post_delete], sender=Department)
@receiver([post_save, post_delete], sender=Major)
@receiver([post_save, post_delete], sender=StudyYear)
@receiver([post_save, post_delete], sender=Semester)
def clear_core_cache(sender, **kwargs):
    cache.clear()
