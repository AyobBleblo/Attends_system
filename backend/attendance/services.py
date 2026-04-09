from django.utils import timezone
from django.db import IntegrityError
from core.models import Semester
from accounts.models import Student
from courses.models import CourseAssignment
from attendance.models import Session, Enrollment, Attendance


def record_attendance(student_id: str, qr_token: str) -> dict:
    now = timezone.now()

    # 1. Find Session by qr_token
    try:
        session = Session.objects.select_related('course', 'professor', 'semester').get(qr_token=qr_token)
    except Session.DoesNotExist:
        return {'success': False, 'error': 'Invalid QR code. No session found.'}

    # 2. Check QR not expired
    if session.qr_expires_at <= now:
        return {'success': False, 'error': 'This QR code has expired.'}

    # 3. Check active semester matches session semester
    try:
        active_semester = Semester.objects.get(is_active=True)
        if session.semester != active_semester:
            return {'success': False, 'error': 'Session does not belong to the current active semester.'}
    except Semester.DoesNotExist:
        return {'success': False, 'error': 'No active semester found.'}

    # Find the Student
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return {'success': False, 'error': f'No student found with ID: {student_id}'}

    # 4. Check the Student is enrolled in the Session's course
    is_enrolled = Enrollment.objects.filter(
        student=student, course=session.course, semester=session.semester
    ).exists()
    if not is_enrolled:
        return {'success': False, 'error': f'Student is not enrolled in {session.course.code}.'}

    # Check professor assignment (optional safety check)
    is_assigned = CourseAssignment.objects.filter(
        professor=session.professor, course=session.course, semester=session.semester
    ).exists()
    if not is_assigned:
        return {'success': False, 'error': 'Professor is not assigned to this course.'}

    # 5. Create the Attendance record
    try:
        attendance = Attendance.objects.create(
            session=session, student=student, status='present'
        )
    except IntegrityError:
        return {'success': False, 'error': 'Attendance already recorded for this session.'}

    return {
        'success': True,
        'message': f'Attendance recorded for {student.name}.',
        'attendance_id': attendance.id
    }
