from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Student
from core.models import Department
from django.db import IntegrityError, transaction

class Command(BaseCommand):
    help = 'Seeds the database with test students for Locust Load Testing'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=1000, help='Number of students to seed (default: 1000)')

    def handle(self, *args, **kwargs):
        count = kwargs['count']
        self.stdout.write(self.style.NOTICE(f"Starting to seed {count} test students..."))
        
        # 1. Ensure we have a generic department to bind these students to
        department, dep_created = Department.objects.get_or_create(
            code="LOAD_TEST",
            defaults={"name": "Load Testing Department"}
        )
        if dep_created:
            self.stdout.write(self.style.SUCCESS("Created fallback 'LOAD_TEST' department."))

        success_count = 0
        skipped_count = 0

        for i in range(1, count + 1):
            username = f"student_{i}@university.local"
            email = username 
            password = "Student@1234"
            student_id = f"STU{i:04d}"
            name = f"Test Student {i}"

            # Use atomic transactions to ensure no partial creations happen on failure
            with transaction.atomic():
                try:
                    # Check/Create the Base User
                    user, user_created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'email': email,
                            'first_name': 'Test',
                            'last_name': f"Student {i}"
                        }
                    )
                    
                    # CRITICAL: Always update password for hasher changes
                    user.set_password(password)
                    user.save()

                    # Check/Create the connected Student Profile
                    student, student_created = Student.objects.get_or_create(
                        student_id=student_id,
                        defaults={
                            'user': user,
                            'name': name,
                            'department': department
                        }
                    )
                    
                    # Self-healing mapping if db got misaligned previously
                    if not student_created and student.user != user:
                        student.user = user
                        student.save()

                    # Console Output Logic
                    if user_created or student_created:
                        success_count += 1
                        if success_count % 50 == 0 or success_count <= 5:
                            self.stdout.write(self.style.SUCCESS(f"✅ {success_count}/{count} — {username} → [{student_id}]"))
                    else:
                        skipped_count += 1

                except IntegrityError as e:
                    self.stdout.write(self.style.ERROR(f"❌ Error linking {username}: {e}"))
                    
        self.stdout.write(self.style.SUCCESS(f"\n🚀 Seed complete! Created {success_count} | Skipped {skipped_count} | Total {count}"))
