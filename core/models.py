from django.db import models


class Department(models.Model):
    """Represents an academic department within the university."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Semester(models.Model):
    """Represents an academic semester with start/end dates."""
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']
        verbose_name = 'Semester'
        verbose_name_plural = 'Semesters'

    def __str__(self):
        return self.name
