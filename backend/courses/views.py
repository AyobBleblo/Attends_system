from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Course, CourseAssignment
from .serializers import CourseSerializer, CourseAssignmentSerializer, NestedCourseAssignmentSerializer


class AdminCourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminUser]


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

