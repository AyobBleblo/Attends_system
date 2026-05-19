from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from .models import Course, CourseAssignment
from core.models import Department, Semester
from accounts.models import Professor


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    study_year_name = serializers.CharField(source='study_year.name', read_only=True)
    professors = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'department', 'department_name', 'study_year', 'study_year_name', 'professors']

    def get_professors(self, obj):
        try:
            semester = Semester.objects.get(is_active=True)
            assignments = CourseAssignment.objects.filter(course=obj, semester=semester).select_related('professor')
            return [{'id': a.professor.id, 'name': a.professor.name} for a in assignments]
        except Semester.DoesNotExist:
            return []


class CourseProfessorBulkAssignSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    semester_id = serializers.IntegerField()
    professor_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=True
    )

    def save(self):
        course_id = self.validated_data['course_id']
        semester_id = self.validated_data['semester_id']
        professor_ids = self.validated_data['professor_ids']

        with transaction.atomic():
            # Delete old assignments for this course and semester
            CourseAssignment.objects.filter(course_id=course_id, semester_id=semester_id).delete()
            
            # Create new ones
            for prof_id in professor_ids:
                CourseAssignment.objects.create(
                    course_id=course_id,
                    semester_id=semester_id,
                    professor_id=prof_id
                )
        return self.validated_data


class CourseAssignmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    professor_name = serializers.CharField(source='professor.name', read_only=True)
    semester_name = serializers.CharField(source='semester.name', read_only=True)

    class Meta:
        model = CourseAssignment
        fields = ['id', 'professor', 'professor_name', 'course', 'course_code',
                  'course_name', 'semester', 'semester_name']


class NestedCourseAssignmentSerializer(serializers.Serializer):
    """
    Accepts human-readable string identifiers and resolves / creates the full
    Department → Course → Professor → Semester → CourseAssignment chain
    inside a single atomic transaction.
    """
    department_name = serializers.CharField(max_length=100)
    department_code = serializers.CharField(max_length=20)
    course_code     = serializers.CharField(max_length=20)
    course_name     = serializers.CharField(max_length=100)
    professor_id    = serializers.CharField(max_length=20)
    professor_name  = serializers.CharField(max_length=100)
    professor_username = serializers.CharField(max_length=150)
    professor_password = serializers.CharField(max_length=128, write_only=True)
    semester_name   = serializers.CharField(max_length=100)

    def create(self, validated_data):
        with transaction.atomic():
            # 1. Department
            department, _ = Department.objects.get_or_create(
                code=validated_data['department_code'].upper(),
                defaults={'name': validated_data['department_name']}
            )

            # 2. Course
            course, _ = Course.objects.get_or_create(
                code=validated_data['course_code'].upper(),
                defaults={
                    'name': validated_data['course_name'],
                    'department': department,
                }
            )

            # 3. Professor — create Django User if needed
            professor_qs = Professor.objects.filter(
                professor_id=validated_data['professor_id']
            )
            if professor_qs.exists():
                professor = professor_qs.first()
            else:
                user, created = User.objects.get_or_create(
                    username=validated_data['professor_username'],
                    defaults={}
                )
                if created:
                    user.set_password(validated_data['professor_password'])
                    user.save()
                professor = Professor.objects.create(
                    user=user,
                    professor_id=validated_data['professor_id'],
                    name=validated_data['professor_name'],
                    department=department,
                )

            # 4. Semester (must exist; look up by name — admins create semesters separately)
            try:
                semester = Semester.objects.get(name=validated_data['semester_name'])
            except Semester.DoesNotExist:
                raise serializers.ValidationError(
                    {'semester_name': f"Semester '{validated_data['semester_name']}' not found. Create it first."}
                )

            # 5. CourseAssignment
            assignment, created = CourseAssignment.objects.get_or_create(
                professor=professor,
                course=course,
                semester=semester,
            )

        return {
            'assignment_id': assignment.id,
            'created': created,
            'professor': professor.name,
            'course': f"{course.code} — {course.name}",
            'department': department.name,
            'semester': semester.name,
        }

