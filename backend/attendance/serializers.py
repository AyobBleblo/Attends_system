from rest_framework import serializers
from .models import Enrollment, Session, Attendance


class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_code = serializers.CharField(source='course.code', read_only=True)
    semester_name = serializers.CharField(source='semester.name', read_only=True)

    class Meta:
        model = Enrollment
        fields = ['id', 'student', 'student_name', 'course', 'course_name', 'course_code', 'semester', 'semester_name']


class SessionSerializer(serializers.ModelSerializer):
    course_code = serializers.CharField(source='course.code', read_only=True)
    professor_name = serializers.CharField(source='professor.name', read_only=True)

    class Meta:
        model = Session
        fields = [
            'id', 'course', 'course_code', 'professor', 'professor_name',
            'semester', 'date_time', 'qr_token', 'qr_expires_at',
            # Duration-tracking fields
            'end_time', 'duration_minutes', 'teacher_note',
        ]


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    session_date = serializers.DateTimeField(source='session.date_time', read_only=True)
    course_code = serializers.CharField(source='session.course.code', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'session', 'session_date', 'course_code', 'student',
                  'student_name', 'student_id', 'scanned_at', 'status']
