from django.db import models
from django.contrib.auth.models import User
from core.models import Department


class Student(models.Model):
    """A student enrolled in the university."""
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_profile'
    )
    student_id = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='students'
    )
    study_year = models.ForeignKey(
        'core.StudyYear', on_delete=models.SET_NULL, null=True, blank=True, related_name='students',
        help_text='The current study year of the student.'
    )
    # student_major is now a ForeignKey to the Major model
    major = models.ForeignKey(
        'core.Major', on_delete=models.SET_NULL, null=True, blank=True, related_name='students',
        help_text='Student\'s academic major/specialization.'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Student'
        verbose_name_plural = 'Students'

    def __str__(self):
        return f"{self.student_id} - {self.name}"


class Professor(models.Model):
    """A professor or instructor at the university."""
    user = models.OneToOneField(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='professor_profile'
    )
    professor_id = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    departments = models.ManyToManyField(
        Department, related_name='professors'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Professor'
        verbose_name_plural = 'Professors'

    def __str__(self):
        return f"{self.professor_id} - {self.name}"


class UserDevice(models.Model):
    """
    Stores a single trusted device fingerprint per user account.
    Used to prevent QR attendance proxying — once a fingerprint is
    linked, only scans from that same device are accepted.

    Professors or Admins can delete this record via the reset endpoint
    to allow a student to re-register from a new device.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='device',
        verbose_name='User',
    )
    device_fingerprint = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Device Fingerprint',
        help_text='SHA-256 / FingerprintJS visitor ID of the student\'s trusted device.',
    )
    linked_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Linked At',
    )

    class Meta:
        verbose_name = 'User Device'
        verbose_name_plural = 'User Devices'

    def __str__(self):
        return f"{self.user.username} — {self.device_fingerprint[:16]}…"
