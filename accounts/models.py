from django.db import models
from core.models import Department


class Student(models.Model):
    """Represents a student enrolled in the university."""
    student_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='students'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Student'
        verbose_name_plural = 'Students'

    def __str__(self):
        return f"{self.student_id} - {self.name}"


class Professor(models.Model):
    """Represents a professor/instructor at the university."""
    professor_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='professors'
    )

    class Meta:
        ordering = ['name']
        verbose_name = 'Professor'
        verbose_name_plural = 'Professors'

    def __str__(self):
        return f"{self.professor_id} - {self.name}"
