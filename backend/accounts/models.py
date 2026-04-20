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
    # student_major is a free-text specialization (e.g. "AI & ML", "Networking").
    # It is intentionally separate from `department` which is an organisational/college unit FK.
    student_major = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Student\'s academic major/specialization (e.g. "Computer Science", "AI & Data Science"). '
                  'Distinct from the college Department.'
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
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='professors'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Professor'
        verbose_name_plural = 'Professors'

    def __str__(self):
        return f"{self.professor_id} - {self.name}"
