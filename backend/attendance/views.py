import base64
import io
import threading
import qrcode
import csv
import uuid
from datetime import timedelta
from django.utils.timezone import now
from django.db.models.functions import TruncDate
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        professor_id = request.data.get('professor_id')
        course_id    = request.data.get('course_id')

        try:
            professor = Professor.objects.get(pk=professor_id)
            course    = Course.objects.get(pk=course_id)
            semester  = Semester.objects.get(is_active=True)

            session = Session.objects.create(
                professor=professor,
                course=course,
                semester=semester,
            )
            serializer = SessionSerializer(session)

            # ── Fire compliance check in a background thread ──────────────────
            # We do NOT block the response. The tracking service runs after the
            # response is already on its way back to the professor's browser.
            assignment = CourseAssignment.objects.filter(
                professor=professor,
                course=course,
                semester=semester,
            ).select_related('professor', 'course', 'semester').first()

            if assignment:
                from courses.tracking_service import check_and_notify  # local import avoids circular dep
                t = threading.Thread(
                    target=check_and_notify,
                    args=(assignment,),
                    daemon=True,
                )
                t.start()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)



class SessionQRView(APIView):
    permission_classes = [IsAuthenticated]

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


class SessionRefreshQRView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        try:
            session = Session.objects.get(pk=session_id)
            session.qr_token = str(uuid.uuid4())
            session.qr_expires_at = now() + timedelta(minutes=15)
            session.save()
            return Response({'qr_token': session.qr_token})
        except Session.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


class AttendanceScanView(APIView):
    # Students must be logged in (JWT) before they can submit a scan.
    permission_classes = [IsAuthenticated]

    def post(self, request):
        student_id = request.data.get('student_id')
        qr_token   = request.data.get('qr_token')
        # device_id is the FingerprintJS visitorId sent by the frontend.
        # It is optional so old clients / tests still work without it.
        device_id  = request.data.get('device_id') or None

        if not student_id or not qr_token:
            return Response(
                {'error': 'student_id and qr_token are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = record_attendance(student_id, qr_token, device_id)

        if result.get('device_mismatch'):
            # Return 403 so the React frontend can show the dedicated
            # Anti-Gravity "Device Mismatch" modal.
            return Response(result, status=status.HTTP_403_FORBIDDEN)

        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)



class SessionAttendanceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        attendances = Attendance.objects.filter(
            session_id=session_id
        ).select_related('student', 'session__course')
        serializer = AttendanceSerializer(attendances, many=True)
        return Response(serializer.data)


class AttendanceReportView(APIView):
    permission_classes = [IsAuthenticated]

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


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Session Report — filterable by session, teacher, course, student
# GET /api/attendance/session-report/
# Query params: session_id, teacher_id, course_id, student_id
# ─────────────────────────────────────────────────────────────────────────────
class SessionReportView(APIView):
    """
    Returns attendance records for a specific session, filterable by
    teacher (professor), course, or student. Designed for fine-grained,
    per-session reporting from the admin/professor dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        session_id = request.GET.get('session_id')
        teacher_id = request.GET.get('teacher_id')
        course_id  = request.GET.get('course_id')
        student_id = request.GET.get('student_id')

        queryset = Attendance.objects.select_related(
            'student', 'session', 'session__course', 'session__professor', 'session__semester'
        ).all()

        if session_id:
            queryset = queryset.filter(session_id=session_id)
        if teacher_id:
            queryset = queryset.filter(session__professor_id=teacher_id)
        if course_id:
            queryset = queryset.filter(session__course_id=course_id)
        if student_id:
            queryset = queryset.filter(student__student_id=student_id)

        results = []
        for att in queryset:
            results.append({
                'attendance_id':  att.id,
                'student_id':     att.student.student_id,
                'student_name':   att.student.name,
                'course_code':    att.session.course.code,
                'course_name':    att.session.course.name,
                'professor_name': att.session.professor.name,
                'semester_name':  att.session.semester.name,
                'session_id':     att.session.id,
                'scanned_at':     att.scanned_at.isoformat(),
                'status':         att.status,
            })

        return Response({
            'count': len(results),
            'results': results,
        })


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Comprehensive Course Report
# GET /api/attendance/course-report/<int:course_id>/
# Returns full attendance matrix per enrolled student for the active semester.
# ─────────────────────────────────────────────────────────────────────────────
class CourseAttendanceReportView(APIView):
    """
    Returns a comprehensive, per-student attendance report for a course in the
    active semester.

    Response shape per student:
    {
      student_id, student_name, student_major,
      course_name, professor_name, department_name, semester_name,
      total_lectures,          # from semester.total_lectures
      lectures: [              # one entry per actual session held
        { lecture_number, date, time, status: 'Present'|'Absent' }
      ],
      total_present, total_absent, attendance_pct
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, course_id):
        try:
            course = Course.objects.select_related('department').get(id=course_id)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found.'}, status=404)

        try:
            semester = Semester.objects.get(is_active=True)
        except Semester.DoesNotExist:
            return Response({'error': 'No active semester found.'}, status=400)

        # Resolve assigned professor for this course/semester
        assignment = (
            CourseAssignment.objects
            .filter(course=course, semester=semester)
            .select_related('professor')
            .first()
        )
        professor_name = assignment.professor.name if assignment else '—'

        # All distinct session dates (chronological) for this course/semester
        # If multiple sessions are held on the same day, group them as 1 lecture.
        sessions = (
            Session.objects
            .filter(course=course, semester=semester)
            .order_by('date_time')
        )
        
        lecture_dates_map = {} # date -> first session of that day
        for sess in sessions:
            dt = sess.date_time.date()
            if dt not in lecture_dates_map:
                lecture_dates_map[dt] = sess
                
        lecture_dates_list = list(lecture_dates_map.keys())
        total_lectures_held = len(lecture_dates_list)

        # All enrolled students
        enrollments = (
            Enrollment.objects
            .filter(course=course, semester=semester)
            .select_related('student', 'student__department')
        )
        students = [e.student for e in enrollments]

        if not students:
            return Response({
                'course_name':    course.name,
                'course_code':    course.code,
                'professor_name': professor_name,
                'department_name':course.department.name,
                'semester_name':  semester.name,
                'total_lectures': semester.total_lectures,
                'students':       [],
            })

        # Pre-fetch attendance for all students in this course/semester
        attendances = (
            Attendance.objects
            .filter(session__course=course, session__semester=semester, student__in=students)
            .select_related('student', 'session')
        )

        # attendance_map[(student_id, lecture_date)] = True
        attendance_map = {}
        for att in attendances:
            if att.status == 'present':
                att_date = att.session.date_time.date()
                attendance_map[(att.student_id, att_date)] = True

        student_rows = []
        for student in students:
            lectures = []
            total_present = 0

            for idx, l_date in enumerate(lecture_dates_list):
                is_present = attendance_map.get((student.pk, l_date), False)
                if is_present:
                    total_present += 1
                
                sess = lecture_dates_map[l_date] # first session of that day

                lectures.append({
                    'lecture_number': idx + 1,
                    'date': l_date.strftime('%Y-%m-%d'),
                    'time': sess.date_time.strftime('%H:%M'),
                    'datetime_iso': sess.date_time.isoformat(),
                    'session_id': sess.id,
                    'status': 'Present' if is_present else 'Absent',
                })

            total_absent = total_lectures_held - total_present
            attendance_pct = (
                round((total_present / total_lectures_held) * 100, 1)
                if total_lectures_held > 0 else 0.0
            )

            student_rows.append({
                'student_id':      student.student_id,
                'student_name':    student.name,
                'student_major':   student.student_major,
                'department_name': student.department.name,
                'course_name':     course.name,
                'course_code':     course.code,
                'professor_name':  professor_name,
                'semester_name':   semester.name,
                'total_lectures':  semester.total_lectures,     # quota (e.g. 15)
                'lectures_held':   total_lectures_held,         # actual sessions run so far
                'lectures':        lectures,
                'total_present':   total_present,
                'total_absent':    total_absent,
                'attendance_pct':  attendance_pct,
            })

        return Response({
            'course_name':    course.name,
            'course_code':    course.code,
            'professor_name': professor_name,
            'department_name':course.department.name,
            'semester_name':  semester.name,
            'total_lectures': semester.total_lectures,
            'lectures_held':  total_lectures_held,
            'students':       student_rows,
        })


class StudentCoursesView(APIView):
    """Returns courses a student is enrolled in for the active semester,
    including per-course attendance stats (attended_count / total_sessions)."""
    permission_classes = [IsAuthenticated]

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
            ).annotate(lecture_date=TruncDate('date_time')).values('lecture_date').distinct().count()
            
            attended_count = Attendance.objects.filter(
                student=student,
                session__course=course,
                session__semester=semester,
                status='present'
            ).annotate(lecture_date=TruncDate('session__date_time')).values('lecture_date').distinct().count()

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
            lecture_dates = Session.objects.filter(
                course=course, semester=semester
            ).annotate(lecture_date=TruncDate('date_time')).values_list('lecture_date', flat=True).distinct().order_by('lecture_date')
            
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
            for d in lecture_dates:
                header.append(d.strftime('%Y-%m-%d'))
            header.append('Total Attended')
            header.append('Attendance %')
            writer.writerow(header)
            
            # Pre-fetch attendance mapped by student and distinct lecture date
            attendances = Attendance.objects.filter(
                session__course=course, session__semester=semester, student__in=students, status='present'
            ).annotate(lecture_date=TruncDate('session__date_time'))
            
            attn_dict = {}
            for a in attendances:
                attn_dict[(a.student.id, a.lecture_date)] = True
                
            total_lectures = len(lecture_dates)

            # Data Rows
            for student in students:
                row = [student.student_id, student.name]
                attended_count = 0
                for d in lecture_dates:
                    if (student.id, d) in attn_dict:
                        row.append('Present')
                        attended_count += 1
                    else:
                        row.append('Absent')
                
                row.append(attended_count)
                if total_lectures > 0:
                    row.append(f"{(attended_count / total_lectures) * 100:.1f}%")
                else:
                    row.append("0%")
                
                writer.writerow(row)

            return response
            
            return Response({'error': 'Course not found.'}, status=404)
        except Semester.DoesNotExist:
            return Response({'error': 'Active semester not found.'}, status=404)


