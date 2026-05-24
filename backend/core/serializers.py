from rest_framework import serializers
from .models import Department, Semester, StudyYear, Major


class MajorSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Major
        fields = ['id', 'name', 'department', 'department_name']


class DepartmentSerializer(serializers.ModelSerializer):
    majors = MajorSerializer(many=True, read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'majors']


class StudyYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyYear
        fields = ['id', 'name', 'order']


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'total_lectures']
