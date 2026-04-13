"""
seed_demo management command
============================
Creates a complete demo dataset:
  - 1 Department  (Computer Science)
  - 1 Active Semester  (Spring 2026)
  - 3 Courses  (MATH101, PHYS101, PROG101)
  - 2 Professors with Django user accounts
  - 3 Students  with Django user accounts
  - CourseAssignments (linking professors → courses)
  - Enrollments       (linking students → courses)

Credentials after seeding
--------------------------
Admin:        admin          / Admin@1234
Professor:    prof_ahmed     / Prof@1234
Professor:    prof_sara      / Prof@1234
Student:      student_ali    / Student@1234
Student:      student_nour   / Student@1234
Student:      student_omar   / Student@1234

This command is idempotent — safe to run multiple times.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction

from core.models import Department, Semester
from accounts.models import Professor, Student
from courses.models import Course, CourseAssignment
from attendance.models import Enrollment

import datetime

User = get_user_model()


def _make_user(username, password, first_name='', last_name=''):
    """Create or update a Django user.

    Always calls set_password so the stored hash stays in sync with whichever
    PASSWORD_HASHERS is currently configured (e.g. USE_FAST_HASHER toggled
    between container restarts).  This makes the command fully idempotent.
    """
    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            'first_name': first_name,
            'last_name': last_name,
            'is_active': True,
        }
    )
    # Re-hash unconditionally — cheap and ensures hasher changes don't
    # leave old users with an incompatible hash prefix.
    user.set_password(password)
    user.save()
    return user, created


class Command(BaseCommand):
    help = 'Seeds demo professors, students, courses and enrollments.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING('\n📦  Running seed_demo…\n'))

        with transaction.atomic():
            # ── Department ──────────────────────────────────────────────────
            dept, _ = Department.objects.get_or_create(
                code='CS',
                defaults={'name': 'Computer Science'}
            )
            self.stdout.write(f'  Department : {dept}')

            # ── Semester ─────────────────────────────────────────────────────
            semester, _ = Semester.objects.get_or_create(
                name='Spring 2026',
                defaults={
                    'start_date': datetime.date(2026, 2, 1),
                    'end_date':   datetime.date(2026, 6, 30),
                    'is_active':  True,
                }
            )
            # Make sure this semester is the active one
            if not semester.is_active:
                semester.is_active = True
                semester.save()
            self.stdout.write(f'  Semester   : {semester}  (active={semester.is_active})')

            # ── Courses ──────────────────────────────────────────────────────
            courses_data = [
                ('MATH101', 'Mathematics I'),
                ('PHYS101', 'Physics I'),
                ('PROG101', 'Introduction to Programming'),
            ]
            courses = {}
            for code, name in courses_data:
                c, _ = Course.objects.get_or_create(
                    code=code,
                    defaults={'name': name, 'department': dept}
                )
                courses[code] = c
                self.stdout.write(f'  Course     : {c}')

            # ── Professors ───────────────────────────────────────────────────
            prof_data = [
                {
                    'professor_id': 'PROF001',
                    'name': 'Ahmed Al-Rashid',
                    'username': 'prof_ahmed',
                    'password': 'Prof@1234',
                    'teaches': ['MATH101', 'PROG101'],
                },
                {
                    'professor_id': 'PROF002',
                    'name': 'Sara Al-Hassan',
                    'username': 'prof_sara',
                    'password': 'Prof@1234',
                    'teaches': ['PHYS101'],
                },
            ]

            for pd in prof_data:
                user, ucreated = _make_user(pd['username'], pd['password'])
                prof, pcreated = Professor.objects.get_or_create(
                    professor_id=pd['professor_id'],
                    defaults={
                        'name': pd['name'],
                        'department': dept,
                        'user': user,
                    }
                )
                # Link user even if professor already existed
                if not prof.user:
                    prof.user = user
                    prof.save()

                label = '✅ created' if pcreated else 'ℹ️  exists'
                self.stdout.write(
                    f'  Professor  : {prof.name} [{pd["username"]} / {pd["password"]}]  {label}'
                )

                # CourseAssignments
                for code in pd['teaches']:
                    ca, _ = CourseAssignment.objects.get_or_create(
                        professor=prof,
                        course=courses[code],
                        semester=semester,
                    )
                    self.stdout.write(f'             ↳ teaches {code}')

            # ── Students ─────────────────────────────────────────────────────
            student_data = [
                {
                    'student_id': 'STU001',
                    'name': 'Ali Khalid',
                    'username': 'student_ali',
                    'password': 'Student@1234',
                    'enrolled_in': ['MATH101', 'PHYS101'],
                },
                {
                    'student_id': 'STU002',
                    'name': 'Nour Ibrahim',
                    'username': 'student_nour',
                    'password': 'Student@1234',
                    'enrolled_in': ['MATH101', 'PROG101'],
                },
                {
                    'student_id': 'STU003',
                    'name': 'Omar Yusuf',
                    'username': 'student_omar',
                    'password': 'Student@1234',
                    'enrolled_in': ['PHYS101', 'PROG101'],
                },
            ]

            for sd in student_data:
                user, ucreated = _make_user(sd['username'], sd['password'])
                stu, screated = Student.objects.get_or_create(
                    student_id=sd['student_id'],
                    defaults={
                        'name': sd['name'],
                        'department': dept,
                        'user': user,
                    }
                )
                if not stu.user:
                    stu.user = user
                    stu.save()

                label = '✅ created' if screated else 'ℹ️  exists'
                self.stdout.write(
                    f'  Student    : {stu.name} [{sd["username"]} / {sd["password"]}]  {label}'
                )

                for code in sd['enrolled_in']:
                    Enrollment.objects.get_or_create(
                        student=stu,
                        course=courses[code],
                        semester=semester,
                    )
                    self.stdout.write(f'             ↳ enrolled in {code}')

        self.stdout.write(self.style.SUCCESS('\n✅  seed_demo completed successfully!\n'))
        self.stdout.write(self.style.WARNING(
            '  Credentials summary:\n'
            '  ─────────────────────────────────────────────────\n'
            '  Django Admin  →  admin          / Admin@1234\n'
            '  Professor     →  prof_ahmed     / Prof@1234\n'
            '  Professor     →  prof_sara      / Prof@1234\n'
            '  Student       →  student_ali    / Student@1234\n'
            '  Student       →  student_nour   / Student@1234\n'
            '  Student       →  student_omar   / Student@1234\n'
            '  ─────────────────────────────────────────────────\n'
        ))
