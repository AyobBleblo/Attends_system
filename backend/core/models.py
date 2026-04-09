from django.db import models


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


class Semester(models.Model):
    """An academic semester with start/end dates."""
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False, db_index=True)

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
