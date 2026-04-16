import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Semester, Department
from accounts.models import Professor, Student
from courses.models import Course

print("Students:", Student.objects.count())
print("Professors:", Professor.objects.count())
print("Courses:", Course.objects.count())
print("Semesters:", Semester.objects.count())
print("Departments:", Department.objects.count())