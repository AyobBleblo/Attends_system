from django.db import models
from core.models import Department, Semester
from accounts.models import Professor


class Course(models.Model):
    """An academic course offered by a department."""
    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name='courses'
    )

    class Meta:
        ordering = ['code']
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'

    def __str__(self):
        return f"{self.code} - {self.name}"


class CourseAssignment(models.Model):
    """Links a professor to a course for a specific semester."""
    professor = models.ForeignKey(
        Professor, on_delete=models.CASCADE, related_name='course_assignments'
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name='assignments'
    )
    semester = models.ForeignKey(
        Semester, on_delete=models.CASCADE, related_name='course_assignments'
    )
    # Per-assignment lecture target — how many sessions this professor is
    # expected to create for this course this semester.  Intentionally
    # independent from Semester.total_lectures (which is a student scan quota).
    # Default: 15. Admin can override per-assignment from the admin panel.
    expected_lectures = models.PositiveSmallIntegerField(
        default=15,
        help_text=(
            'Number of lectures this professor is expected to deliver '
            'for this course in this semester. Used for compliance tracking '
            '(congratulation at 100%, warning at ≤70% near semester end).'
        ),
    )

    class Meta:
        unique_together = ('professor', 'course', 'semester')
        verbose_name = 'Course Assignment'
        verbose_name_plural = 'Course Assignments'

    def __str__(self):
        return f"{self.professor.name} → {self.course.code} ({self.semester.name})"
