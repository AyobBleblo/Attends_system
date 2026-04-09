from rest_framework import serializers
from .models import Student, Professor
from django.contrib.auth.models import User
from django.db import transaction
from core.serializers import DepartmentSerializer


class StudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'username']


class ProfessorSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Professor
        fields = ['id', 'professor_id', 'name', 'department', 'department_name', 'username']


class AdminStudentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'username', 'password']

    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            student = Student.objects.create(user=user, **validated_data)
        return student

    def update(self, instance, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        if username and instance.user:
            instance.user.username = username
            instance.user.save()
        if password and instance.user:
            instance.user.set_password(password)
            instance.user.save()
        return super().update(instance, validated_data)


class AdminProfessorSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Professor
        fields = ['id', 'professor_id', 'name', 'department', 'department_name', 'username', 'password']

    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            professor = Professor.objects.create(user=user, **validated_data)
        return professor

    def update(self, instance, validated_data):
        username = validated_data.pop('username', None)
        password = validated_data.pop('password', None)
        if username and instance.user:
            instance.user.username = username
            instance.user.save()
        if password and instance.user:
            instance.user.set_password(password)
            instance.user.save()
        return super().update(instance, validated_data)
