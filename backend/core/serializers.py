from rest_framework import serializers
from .models import Department, Semester


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'code']


class SemesterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Semester
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'total_lectures']
