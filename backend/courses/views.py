from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Course, CourseAssignment
from .serializers import CourseSerializer, CourseAssignmentSerializer, NestedCourseAssignmentSerializer, CourseProfessorBulkAssignSerializer


class AdminCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related('department', 'study_year').all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department_id')
        study_year_id = self.request.query_params.get('study_year_id')
        professor_id = self.request.query_params.get('professor_id')
        
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        if study_year_id:
            queryset = queryset.filter(study_year_id=study_year_id)
        if professor_id:
            # course has assignments which have professors
            queryset = queryset.filter(assignments__professor_id=professor_id).distinct()
            
        return queryset


class AdminCourseAssignmentViewSet(viewsets.ModelViewSet):
    queryset = CourseAssignment.objects.all()
    serializer_class = CourseAssignmentSerializer
    permission_classes = [IsAdminUser]


class CourseListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        courses = Course.objects.select_related('department').all()
        serializer = CourseSerializer(courses, many=True)
        return Response(serializer.data)


class NestedAssignmentCreateView(APIView):
    """
    POST /api/courses/admin/nested-assign/
    Creates Dept → Course → Professor → Assignment in one atomic request.
    All string fields — backend uses get_or_create to avoid duplicates.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = NestedCourseAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CourseProfessorAssignView(APIView):
    """
    POST /api/courses/<course_id>/assign-professors/
    Bulk assigns professors to a course for a specific semester.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, course_id):
        data = request.data.copy()
        data['course_id'] = course_id
        
        serializer = CourseProfessorBulkAssignSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'Professors assigned successfully'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

