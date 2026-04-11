import base64
import io
import qrcode
import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from .models import Session, Attendance, Enrollment
from .serializers import SessionSerializer, AttendanceSerializer, EnrollmentSerializer
from .services import record_attendance
from accounts.models import Professor
from courses.models import Course, CourseAssignment
from core.models import Semester


class AdminEnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAdminUser]


class CourseSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        user = request.user
        
        # Verify the user is a professor teaching this course
        try:
            professor = user.professor_profile
            course = Course.objects.get(id=course_id)
            semester = Semester.objects.get(is_active=True)
            
            # Allow admins to bypass course ownership check here if needed in future
            if not user.is_staff and not user.is_superuser:
                # Confirm professor actually teaches this
                is_teaching = Course.objects.filter(assignments__professor=professor, id=course.id, assignments__semester=semester).exists()
                if not is_teaching:
                    return Response({'error': 'Not authorized for this course.'}, status=403)
                    
            sessions = Session.objects.filter(course=course, semester=semester).order_by('-date_time')
            serializer = SessionSerializer(sessions, many=True)
            return Response(serializer.data)
            
        except Professor.DoesNotExist:
            return Response({'error': 'Only professors can view course session history.'}, status=403)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=404)
        except Semester.DoesNotExist:
            return Response({'error': 'No active semester.'}, status=400)


class SessionCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        professor_id = request.data.get('professor_id')
        course_id = request.data.get('course_id')
        
        try:
            professor = Professor.objects.get(pk=professor_id)
            course = Course.objects.get(pk=course_id)
            semester = Semester.objects.get(is_active=True)
            
            session = Session.objects.create(
                professor=professor,
                course=course,
                semester=semester
            )
            serializer = SessionSerializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SessionQRView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        try:
            session = Session.objects.get(pk=session_id)
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(session.qr_token)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            img_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return Response({'qr_code': f"data:image/png;base64,{img_b64}"})
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class AttendanceScanView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        student_id = request.data.get('student_id')
        qr_token = request.data.get('qr_token')

        if not student_id or not qr_token:
            return Response(
                {'error': 'student_id and qr_token are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = record_attendance(student_id, qr_token)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)


class SessionAttendanceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        attendances = Attendance.objects.filter(
            session_id=session_id
        ).select_related('student', 'session__course')
        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)


class AttendanceReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        course_id = request.GET.get('course_id')
        semester_id = request.GET.get('semester_id')
        professor_id = request.GET.get('professor_id')

        queryset = Attendance.objects.select_related('student', 'session__course').all()

        if course_id:
            queryset = queryset.filter(session__course_id=course_id)
        if semester_id:
            queryset = queryset.filter(session__semester_id=semester_id)
        if professor_id:
            queryset = queryset.filter(session__professor_id=professor_id)

        serializer = AttendanceSerializer(queryset, many=True)

        total_present = queryset.filter(status='present').count()
        total_enrollments = 0
        if course_id and semester_id:
            total_enrollments = Enrollment.objects.filter(
                course_id=course_id, semester_id=semester_id
            ).count()

        return Response({
            'results': serializer.data,
            'summary': {
                'total_present': total_present,
                'total_enrollments': total_enrollments,
                'total_records': queryset.count()
            }
        })


class StudentCoursesView(APIView):
    """Returns courses a student is enrolled in for the active semester,
    including per-course attendance stats (attended_count / total_sessions)."""
    permission_classes = [AllowAny]

    def get(self, request, student_id):
        from accounts.models import Student
        from courses.serializers import CourseSerializer

        try:
            student = Student.objects.get(student_id=student_id)
        except Student.DoesNotExist:
            return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            semester = Semester.objects.get(is_active=True)
        except Semester.DoesNotExist:
            return Response({'error': 'No active semester'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = Enrollment.objects.filter(
            student=student, semester=semester
        ).select_related('course', 'course__department')

        courses_data = []
        for enrollment in enrollments:
            course = enrollment.course
            total_sessions = Session.objects.filter(
                course=course, semester=semester
            ).count()
            attended_count = Attendance.objects.filter(
                student=student,
                session__course=course,
                session__semester=semester,
                status='present'
            ).count()

            course_info = CourseSerializer(course).data
            course_info['attended_count'] = attended_count
            course_info['total_sessions'] = total_sessions
            course_info['attendance_pct'] = (
                round((attended_count / total_sessions) * 100)
                if total_sessions > 0 else 0
            )
            courses_data.append(course_info)

        return Response({
            'student_id': student.student_id,
            'name': student.name,
            'department': student.department.name,
            'semester': semester.name,
            'courses': courses_data,
        })


class CourseExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        user = request.user
        
        try:
            course = Course.objects.get(id=course_id)
            semester = Semester.objects.get(is_active=True)
            
            # Authorization check
            if not user.is_staff and not user.is_superuser:
                try:
                    professor = user.professor_profile
                    if not CourseAssignment.objects.filter(professor=professor, course=course, semester=semester).exists():
                        return Response({'error': 'Not authorized.'}, status=403)
                except Professor.DoesNotExist:
                    return Response({'error': 'Not authorized.'}, status=403)

            # Gather data
            sessions = Session.objects.filter(course=course, semester=semester).order_by('date_time')
            enrollments = Enrollment.objects.filter(course=course, semester=semester).select_related('student')
            students = [e.student for e in enrollments]

            # Prepare CSV
            response = HttpResponse(
                content_type='text/csv',
                headers={'Content-Disposition': f'attachment; filename="course_{course.code}_attendance.csv"'},
            )
            
            writer = csv.writer(response)
            
            # Header Row
            header = ['Student ID', 'Student Name']
            for s in sessions:
                header.append(s.date_time.strftime('%Y-%m-%d %H:%M'))
            header.append('Total Attended')
            header.append('Attendance %')
            writer.writerow(header)
            
            # Pre-fetch attendance mapped by student and session
            attendances = Attendance.objects.filter(session__in=sessions).select_related('student', 'session')
            attn_dict = {}
            for a in attendances:
                attn_dict[(a.student.id, a.session.id)] = True
                
            total_sessions = sessions.count()

            # Data Rows
            for student in students:
                row = [student.student_id, student.name]
                attended_count = 0
                for s in sessions:
                    if (student.id, s.id) in attn_dict:
                        row.append('Present')
                        attended_count += 1
                    else:
                        row.append('Absent')
                
                row.append(attended_count)
                if total_sessions > 0:
                    row.append(f"{(attended_count / total_sessions) * 100:.1f}%")
                else:
                    row.append("0%")
                
                writer.writerow(row)

            return response
            
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=404)
        except Semester.DoesNotExist:
            return Response({'error': 'Active semester not found.'}, status=404)
