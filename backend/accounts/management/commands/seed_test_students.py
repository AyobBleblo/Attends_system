from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import Student
from core.models import Department
from django.db import IntegrityError, transaction

class Command(BaseCommand):
    help = 'Seeds the database with exactly 100 test students for Locust Load Testing'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.NOTICE("Starting to seed test students..."))
        
        # 1. Ensure we have a generic department to bind these students to
        department, dep_created = Department.objects.get_or_create(
            code="LOAD_TEST",
            defaults={"name": "Load Testing Department"}
        )
        if dep_created:
            self.stdout.write(self.style.SUCCESS("Created fallback 'LOAD_TEST' department."))

        success_count = 0
        skipped_count = 0

        # Generate exactly 100 students (1 to 100)
        for i in range(1, 101):
            username = f"student_{i}@university.local"
            email = username 
            password = "Student@1234"
            student_id = f"STU{i:03d}"
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
                    
                    if user_created:
                        # CRITICAL: Hash the password properly!
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
                        self.stdout.write(self.style.SUCCESS(f"✅ Configured {username} linked to [{student_id}]"))
                    else:
                        skipped_count += 1

                except IntegrityError as e:
                    self.stdout.write(self.style.ERROR(f"❌ Error linking {username}: {e}"))
                    
        self.stdout.write(self.style.SUCCESS(f"\n🚀 Seed operation complete! Generated/Linked {success_count} | Skipped (Already existed) {skipped_count}"))
