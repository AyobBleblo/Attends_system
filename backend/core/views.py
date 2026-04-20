from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Department, Semester
from .serializers import DepartmentSerializer, SemesterSerializer
from accounts.models import Student, Professor
from courses.models import Course


class DepartmentListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        departments = Department.objects.all()
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data)


class SemesterListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        semesters = Semester.objects.all().order_by('-is_active', '-id')
        serializer = SemesterSerializer(semesters, many=True)
        return Response(serializer.data)


class ActiveSemesterView(APIView):
    permission_classes = [AllowAny]

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
