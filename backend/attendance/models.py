import uuid
from datetime import timedelta
from django.db import models
from django.utils.timezone import now
from core.models import Semester
from accounts.models import Student, Professor
from courses.models import Course


class Enrollment(models.Model):
    """Tracks which students are enrolled in which course per semester."""
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='enrollments'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='enrollments'
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name='enrollments'
    )

    class Meta:
        unique_together = ('student', 'course', 'semester')
        verbose_name = 'Enrollment'
        verbose_name_plural = 'Enrollments'

    def __str__(self):
        return f"{self.student.name} → {self.course.code} ({self.semester.name})"


class Session(models.Model):
    """A single class session with a QR code for attendance."""
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='sessions'
    )
    professor = models.ForeignKey(
        Professor, on_delete=models.CASCADE, related_name='sessions'
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name='sessions'
    )
    date_time = models.DateTimeField(auto_now_add=True)
    qr_token = models.CharField(max_length=100, unique=True, db_index=True)
    qr_expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-date_time']
        verbose_name = 'Session'
        verbose_name_plural = 'Sessions'
        indexes = [
            models.Index(fields=['qr_token']),
            models.Index(fields=['course', 'semester']),
        ]

    def save(self, *args, **kwargs):
        if not self.qr_token:
            self.qr_token = str(uuid.uuid4())
        if not self.qr_expires_at:
            self.qr_expires_at = now() + timedelta(minutes=15)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.course.code} — {self.date_time.strftime('%Y-%m-%d %H:%M')}"


class Attendance(models.Model):
    """Records a student's attendance for a specific session."""
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('late', 'Late'),
        ('absent', 'Absent'),
    ]

    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name='attendances'
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='attendances'
    )
    scanned_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default='present'
    )

    class Meta:
        unique_together = ('session', 'student')
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendance Records'
        indexes = [
            models.Index(fields=['session', 'student']),
        ]

    def __str__(self):
        return f"{self.student.name} — {self.session} [{self.status}]"
