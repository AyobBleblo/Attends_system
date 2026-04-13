from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from .models import Student, Professor
from .serializers import StudentSerializer, ProfessorSerializer, AdminStudentSerializer, AdminProfessorSerializer
from courses.models import Course, CourseAssignment
from courses.serializers import CourseSerializer
from attendance.models import Enrollment
from core.models import Semester


class AdminStudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = AdminStudentSerializer
    permission_classes = [IsAdminUser]


class AdminProfessorViewSet(viewsets.ModelViewSet):
    queryset = Professor.objects.all()
    serializer_class = AdminProfessorSerializer
    permission_classes = [IsAdminUser]


class StudentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        students = Student.objects.select_related('department').all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


class ProfessorListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        professors = Professor.objects.select_related('department').all()
        serializer = ProfessorSerializer(professors, many=True)
        return Response(serializer.data)


class ProfessorCoursesView(APIView):
    """Returns courses assigned to a professor in the active semester."""
    permission_classes = [AllowAny]

    def get(self, request, professor_id):
        try:
            professor = Professor.objects.get(pk=professor_id)
        except Professor.DoesNotExist:
            return Response({'error': 'Professor not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            semester = Semester.objects.get(is_active=True)
        except Semester.DoesNotExist:
            return Response({'error': 'No active semester'}, status=status.HTTP_404_NOT_FOUND)

        assignments = CourseAssignment.objects.filter(
            professor=professor, semester=semester
        ).select_related('course', 'course__department')

        courses = [a.course for a in assignments]
        serializer = CourseSerializer(courses, many=True)
        return Response({
            'professor': ProfessorSerializer(professor).data,
            'semester': semester.name,
            'courses': serializer.data,
        })


class MeView(APIView):
    """Returns the currently authenticated user's role and profile data."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Check if admin
        if user.is_staff or user.is_superuser:
            return Response({
                'role': 'admin',
                'id': user.id,
                'name': user.username,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser
            })

        # Check if professor
        professor = Professor.objects.filter(user=user).first()
        if professor:
            semester = Semester.objects.filter(is_active=True).first()
            courses = []
            if semester:
                assignments = CourseAssignment.objects.filter(
                    professor=professor, semester=semester
                ).select_related('course', 'course__department')
                courses = CourseSerializer([a.course for a in assignments], many=True).data

            return Response({
                'role': 'professor',
                'id': professor.id,
                'professor_id': professor.professor_id,
                'name': professor.name,
                'department': professor.department.name,
                'courses': courses,
            })

        # Check if student
        student = Student.objects.filter(user=user).first()
        if student:
            semester = Semester.objects.filter(is_active=True).first()
            courses = []
            if semester:
                enrollments = Enrollment.objects.filter(
                    student=student, semester=semester
                ).select_related('course', 'course__department')
                courses = CourseSerializer([e.course for e in enrollments], many=True).data

            return Response({
                'role': 'student',
                'id': student.id,
                'student_id': student.student_id,
                'name': student.name,
                'department': student.department.name,
                'courses': courses,
            })

        print(f"DEBUG: Returning 400 for user {user.username} (id: {user.id}). is_staff: {user.is_staff}")
        return Response({'error': f'User {user.username} has no associated profile and is not an admin.'}, status=400)
