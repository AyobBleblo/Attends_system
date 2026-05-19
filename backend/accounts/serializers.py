from rest_framework import serializers
from .models import Student, Professor
from django.contrib.auth.models import User
from django.db import transaction
from core.serializers import DepartmentSerializer


class StudentSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    study_year_name = serializers.CharField(source='study_year.name', read_only=True)
    major_name = serializers.CharField(source='major.name', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'study_year', 'study_year_name', 'major', 'major_name', 'username']


class ProfessorSerializer(serializers.ModelSerializer):
    department_names = serializers.SerializerMethodField(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Professor
        fields = ['id', 'professor_id', 'name', 'departments', 'department_names', 'username']
        
    def get_department_names(self, obj):
        return [d.name for d in obj.departments.all()]


class AdminStudentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(write_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    study_year_name = serializers.CharField(source='study_year.name', read_only=True)
    major_name = serializers.CharField(source='major.name', read_only=True)

    class Meta:
        model = Student
        fields = ['id', 'student_id', 'name', 'department', 'department_name', 'study_year', 'study_year_name', 'major', 'major_name', 'username', 'password']

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_student_id(self, value):
        if Student.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("A student with this ID already exists.")
        return value

    def create(self, validated_data):
        username = validated_data.pop('username', None)
        if not username:
            username = validated_data.get('student_id')
        
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "A user with this username (or generated from student ID) already exists."})
            
        password = validated_data.pop('password')
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            student = Student.objects.create(user=user, **validated_data)
        return student

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['username'] = instance.user.username if instance.user else None
        return ret

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
    department_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Professor
        fields = ['id', 'professor_id', 'name', 'departments', 'department_names', 'username', 'password']
        
    def get_department_names(self, obj):
        return [d.name for d in obj.departments.all()]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

    def validate_professor_id(self, value):
        if Professor.objects.filter(professor_id=value).exists():
            raise serializers.ValidationError("A professor with this ID already exists.")
        return value

    def create(self, validated_data):
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        departments = validated_data.pop('departments', [])
        with transaction.atomic():
            user = User.objects.create_user(username=username, password=password)
            professor = Professor.objects.create(user=user, **validated_data)
            if departments:
                professor.departments.set(departments)
        return professor

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['username'] = instance.user.username if instance.user else None
        return ret

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
