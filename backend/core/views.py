from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from .models import Department, Semester, StudyYear, Major
from .serializers import DepartmentSerializer, SemesterSerializer, StudyYearSerializer, MajorSerializer
from accounts.models import Student, Professor
from courses.models import Course


class DepartmentListView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


class MajorListView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        majors = Major.objects.all()
        department_id = request.query_params.get('department_id')
        if department_id:
            majors = majors.filter(department_id=department_id)
        majors = majors.order_by('name')
        serializer = MajorSerializer(majors, many=True)
        return Response(serializer.data)


class StudyYearListView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        study_years = StudyYear.objects.all().order_by('order', 'name')
        serializer = StudyYearSerializer(study_years, many=True)
        return Response(serializer.data)


class SemesterListView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        semesters = Semester.objects.all().order_by('-is_active', '-id')
        serializer = SemesterSerializer(semesters, many=True)
        return Response(serializer.data)


class ActiveSemesterView(APIView):
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60 * 15))
    def get(self, request):
        try:
            semester = Semester.objects.get(is_active=True)
            serializer = SemesterSerializer(semester)
            return Response(serializer.data)
        except Semester.DoesNotExist:
            return Response(
                {'error': 'No active semester found'},
                status=status.HTTP_404_NOT_FOUND
            )


class StatsView(APIView):
    """Returns dashboard statistics."""
    permission_classes = [AllowAny]

    @method_decorator(cache_page(60))
    def get(self, request):
        try:
            active_semester = Semester.objects.get(is_active=True)
            semester_name = active_semester.name
        except Semester.DoesNotExist:
            semester_name = None

        return Response({
            'total_students': Student.objects.count(),
            'total_professors': Professor.objects.count(),
            'total_courses': Course.objects.count(),
            'total_departments': Department.objects.count(),
            'active_semester': semester_name,
        })


class AdminSemesterViewSet(viewsets.ModelViewSet):
    queryset = Semester.objects.all().order_by('-start_date')
    serializer_class = SemesterSerializer
    permission_classes = [IsAdminUser]


class AdminStudyYearViewSet(viewsets.ModelViewSet):
    queryset = StudyYear.objects.all().order_by('order', 'name')
    serializer_class = StudyYearSerializer
    permission_classes = [IsAdminUser]
