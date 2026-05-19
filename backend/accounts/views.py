from rest_framework.views import APIView
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
from .models import Student, Professor, UserDevice
from .serializers import StudentSerializer, ProfessorSerializer, AdminStudentSerializer, AdminProfessorSerializer
from courses.models import Course, CourseAssignment
from courses.serializers import CourseSerializer
from attendance.models import Enrollment
from core.models import Semester


# ─────────────────────────────────────────────────────────────────────────────
# Pagination
# ─────────────────────────────────────────────────────────────────────────────
class StudentPagination(PageNumberPagination):
    """
    Returns 25 students per page by default.
    Clients can override with ?page_size=50 (capped at 100).
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


# ─────────────────────────────────────────────────────────────────────────────
# Admin ViewSets
# ─────────────────────────────────────────────────────────────────────────────
class AdminStudentViewSet(viewsets.ModelViewSet):
    """
    CRUD for students — paginated (25/page) and select_related optimised
    to prevent N+1 queries on department & user joins.
    """
    # select_related: join department + user in ONE SQL query instead of
    # issuing separate queries for each row.
    queryset = Student.objects.select_related('department', 'user', 'study_year', 'major').all()
    serializer_class = AdminStudentSerializer
    permission_classes = [IsAdminUser]
    pagination_class = StudentPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'student_id', 'user__username', 'user__email']

    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department_id')
        study_year_id = self.request.query_params.get('study_year_id')
        major_id = self.request.query_params.get('major_id')

        if department_id:
            queryset = queryset.filter(department_id=department_id)
        if study_year_id:
            queryset = queryset.filter(study_year_id=study_year_id)
        if major_id:
            queryset = queryset.filter(major_id=major_id)
        
        return queryset

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        student = self.get_object()
        if student.user:
            student.user.set_password('123456')
            student.user.save()
            return Response({'status': 'Password reset to default successfully'})
        return Response({'error': 'No user account associated with this student'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_custom_password(self, request, pk=None):
        student = self.get_object()
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        if student.user:
            student.user.set_password(password)
            student.user.save()
            return Response({'status': 'Custom password set successfully'})
        return Response({'error': 'No user account associated with this student'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reset_fingerprint')
    def reset_fingerprint(self, request, pk=None):
        """
        Deletes the stored device fingerprint for this student's user account,
        allowing them to re-register from a new device on their next scan.
        Accessible by Admins only (IsAdminUser guards the whole viewset).
        """
        student = self.get_object()
        if not student.user:
            return Response(
                {'error': 'No user account associated with this student.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted_count, _ = UserDevice.objects.filter(user=student.user).delete()
        if deleted_count:
            return Response({'status': f'Device fingerprint reset for {student.name}. '
                                       f'They can now register from a new device.'})
        return Response({'status': f'No device fingerprint was linked to {student.name}.'})


class AdminProfessorViewSet(viewsets.ModelViewSet):
    queryset = Professor.objects.prefetch_related('departments', 'user').all()
    serializer_class = AdminProfessorSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'professor_id', 'user__username', 'user__email']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(departments__id=department_id).distinct()
        return queryset

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        professor = self.get_object()
        if professor.user:
            professor.user.set_password('123456')
            professor.user.save()
            return Response({'status': 'Password reset to default successfully'})
        return Response({'error': 'No user account associated with this professor'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_custom_password(self, request, pk=None):
        professor = self.get_object()
        password = request.data.get('password')
        if not password:
            return Response({'error': 'Password is required'}, status=status.HTTP_400_BAD_REQUEST)
        if professor.user:
            professor.user.set_password(password)
            professor.user.save()
            return Response({'status': 'Custom password set successfully'})
        return Response({'error': 'No user account associated with this professor'}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────────────────────────────────────
# Professor-accessible fingerprint reset (for a student by student_id string)
# POST /api/reset-fingerprint/<student_id>/
# ─────────────────────────────────────────────────────────────────────────────
class ResetFingerprintView(APIView):
    """
    Allows a Professor or Admin to clear a student's device fingerprint.
    Uses the string student_id (e.g. "STU-001"), NOT the database PK.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, student_id):
        # Only Professors or Admins may call this endpoint
        user = request.user
        is_professor = hasattr(user, 'professor_profile')
        if not (user.is_staff or user.is_superuser or is_professor):
            return Response(
                {'error': 'Only professors or admins can reset device fingerprints.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            student = Student.objects.select_related('user').get(student_id=student_id)
        except Student.DoesNotExist:
            return Response({'error': f'Student "{student_id}" not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not student.user:
            return Response(
                {'error': 'This student has no linked user account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted_count, _ = UserDevice.objects.filter(user=student.user).delete()
        if deleted_count:
            return Response({
                'status': 'reset',
                'message': f'Device fingerprint cleared for {student.name}. '
                           f'They can now attend from a new device.',
            })
        return Response({
            'status': 'no_device',
            'message': f'No fingerprint was linked to {student.name}.',
        })


# ─────────────────────────────────────────────────────────────────────────────
# Public list views
# ─────────────────────────────────────────────────────────────────────────────
class StudentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        students = Student.objects.select_related('department').all()
        serializer = StudentSerializer(students, many=True)
        return Response(serializer.data)


class ProfessorListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        department_id = request.query_params.get('department_id')
        professors = Professor.objects.all()
        if department_id:
            professors = professors.filter(departments__id=department_id)
        professors = professors.prefetch_related('departments').distinct()
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


class ChangePasswordView(APIView):
    """Allows authenticated users to change their password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Both old and new passwords are required'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'Incorrect old password'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({'success': 'Password changed successfully'})
