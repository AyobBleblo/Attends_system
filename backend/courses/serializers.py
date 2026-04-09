from rest_framework import serializers
from .models import Course, CourseAssignment


class CourseSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'code', 'name', 'department', 'department_name']


class CourseAssignmentSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    professor_name = serializers.CharField(source='professor.name', read_only=True)
    semester_name = serializers.CharField(source='semester.name', read_only=True)

    class Meta:
        model = CourseAssignment
        fields = ['id', 'professor', 'professor_name', 'course', 'course_code',
                  'course_name', 'semester', 'semester_name']
