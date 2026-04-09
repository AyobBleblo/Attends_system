import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Department, Semester
from accounts.models import Professor, Student
from courses.models import Course, CourseAssignment
from attendance.models import Enrollment


class Command(BaseCommand):
    help = 'Seeds the database with initial test data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting database seeding...')

        # Create Superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
            self.stdout.write(self.style.SUCCESS('Created superuser (admin / admin123)'))

        # 1. Departments
        cs, _ = Department.objects.get_or_create(code='CS', defaults={'name': 'Computer Science'})
        it, _ = Department.objects.get_or_create(code='IT', defaults={'name': 'Information Technology'})

        # 2. Semester
        semester, _ = Semester.objects.get_or_create(
            name='Semester 1 - 2025',
            defaults={
                'start_date': datetime.date(2025, 9, 1),
                'end_date': datetime.date(2026, 1, 31),
                'is_active': True
            }
        )

        # 3. Courses
        cs301, _ = Course.objects.get_or_create(code='CS301', defaults={'name': 'Database Systems', 'department': cs})
        cs302, _ = Course.objects.get_or_create(code='CS302', defaults={'name': 'Web Development', 'department': cs})
        it303, _ = Course.objects.get_or_create(code='IT303', defaults={'name': 'Algorithms', 'department': it})

        # 4. Professors — with linked User accounts
        # Professor: Dr. Ahmed → login: ahmed / prof123
        ahmed_user, _ = User.objects.get_or_create(username='ahmed', defaults={
            'first_name': 'Ahmed', 'email': 'ahmed@university.edu'
        })
        ahmed_user.set_password('prof123')
        ahmed_user.save()
        dr_ahmed, _ = Professor.objects.get_or_create(
            professor_id='P101',
            defaults={'name': 'Dr. Ahmed', 'department': cs, 'user': ahmed_user}
        )
        if dr_ahmed.user is None:
            dr_ahmed.user = ahmed_user
            dr_ahmed.save()

        # Professor: Dr. Sara → login: sara / prof123
        sara_user, _ = User.objects.get_or_create(username='sara', defaults={
            'first_name': 'Sara', 'email': 'sara@university.edu'
        })
        sara_user.set_password('prof123')
        sara_user.save()
        dr_sara, _ = Professor.objects.get_or_create(
            professor_id='P102',
            defaults={'name': 'Dr. Sara', 'department': it, 'user': sara_user}
        )
        if dr_sara.user is None:
            dr_sara.user = sara_user
            dr_sara.save()

        self.stdout.write(self.style.SUCCESS('Created professors: ahmed/prof123, sara/prof123'))

        # 5. Students — with linked User accounts
        student_data = [
            ('S1001', 'Ali',   'ali',   cs),
            ('S1002', 'Omar',  'omar',  cs),
            ('S1003', 'Tariq', 'tariq', cs),
            ('S1004', 'Mona',  'mona',  it),
            ('S1005', 'Noor',  'noor',  it),
        ]

        students = {}
        for sid, name, username, dept in student_data:
            u, _ = User.objects.get_or_create(username=username, defaults={
                'first_name': name, 'email': f'{username}@student.edu'
            })
            u.set_password('stu123')
            u.save()
            s, _ = Student.objects.get_or_create(
                student_id=sid,
                defaults={'name': name, 'department': dept, 'user': u}
            )
            if s.user is None:
                s.user = u
                s.save()
            students[sid] = s

        self.stdout.write(self.style.SUCCESS('Created students: ali/stu123, omar/stu123, tariq/stu123, mona/stu123, noor/stu123'))

        # 6. Course Assignments
        try:
            CourseAssignment.objects.get_or_create(professor=dr_ahmed, course=cs301, semester=semester)
            CourseAssignment.objects.get_or_create(professor=dr_ahmed, course=cs302, semester=semester)
            CourseAssignment.objects.get_or_create(professor=dr_sara, course=it303, semester=semester)
        except Exception:
            pass

        # 7. Enrollments
        for sid in ['S1001', 'S1002', 'S1003']:
            s = students[sid]
            try:
                Enrollment.objects.get_or_create(student=s, course=cs301, semester=semester)
                Enrollment.objects.get_or_create(student=s, course=cs302, semester=semester)
            except Exception:
                pass

        for sid in ['S1004', 'S1005']:
            s = students[sid]
            try:
                Enrollment.objects.get_or_create(student=s, course=it303, semester=semester)
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
        self.stdout.write('')
        self.stdout.write('=== LOGIN CREDENTIALS ===')
        self.stdout.write('Admin:      admin       / admin123')
        self.stdout.write('Professors: ahmed       / prof123')
        self.stdout.write('            sara        / prof123')
        self.stdout.write('Students:   ali         / stu123')
        self.stdout.write('            omar        / stu123')
        self.stdout.write('            tariq       / stu123')
        self.stdout.write('            mona        / stu123')
        self.stdout.write('            noor        / stu123')
