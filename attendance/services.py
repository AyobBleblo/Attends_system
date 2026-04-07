from django.utils import timezone
from django.db import IntegrityError

from core.models import Semester
from accounts.models import Student
from courses.models import CourseAssignment
from attendance.models import Session, Enrollment, Attendance


def record_attendance(student_id: str, qr_token: str) -> dict:
    """
    Record attendance for a student by scanning a QR code.

    Performs the following validations:
    1. Finds the Session by qr_token
    2. Checks QR is not expired
    3. Checks the active Semester matches the Session's semester
    4. Checks the Student is enrolled in the Session's course
    5. Checks the Professor is assigned to the course
    6. Prevents duplicate attendance
    7. Creates the Attendance record if all checks pass

    Args:
        student_id: The unique student identifier
        qr_token: The QR code token from the session

    Returns:
        dict with 'success' (bool) and 'message' (str), plus 'attendance' on success
    """
    now = timezone.now()

    # Step 1: Find the Session by qr_token
    try:
        session = Session.objects.select_related(
            'course', 'professor', 'semester'
        ).get(qr_token=qr_token)
    except Session.DoesNotExist:
        return {
            'success': False,
            'error': 'INVALID_QR',
            'message': 'Invalid QR code. No session found for this token.'
        }

    # Step 2: Check QR is not expired
    if session.qr_expires_at <= now:
        return {
            'success': False,
            'error': 'QR_EXPIRED',
            'message': 'This QR code has expired. Please ask your professor for a new one.'
        }

    # Step 3: Check the active Semester matches the Session's semester
    try:
        active_semester = Semester.objects.get(is_active=True)
    except Semester.DoesNotExist:
        return {
            'success': False,
            'error': 'NO_ACTIVE_SEMESTER',
            'message': 'No active semester found. Please contact administration.'
        }

    if session.semester != active_semester:
        return {
            'success': False,
            'error': 'SEMESTER_MISMATCH',
            'message': 'This session does not belong to the current active semester.'
        }

    # Find the Student
    try:
        student = Student.objects.get(student_id=student_id)
    except Student.DoesNotExist:
        return {
            'success': False,
            'error': 'STUDENT_NOT_FOUND',
            'message': f'No student found with ID: {student_id}'
        }

    # Step 4: Check the Student is enrolled in the Session's course
    is_enrolled = Enrollment.objects.filter(
        student=student,
        course=session.course,
        semester=session.semester
    ).exists()

    if not is_enrolled:
        return {
            'success': False,
            'error': 'NOT_ENROLLED',
            'message': f'Student {student.name} is not enrolled in {session.course.code} for {session.semester.name}.'
        }

    # Step 5: Check the Professor is assigned to the course
    is_assigned = CourseAssignment.objects.filter(
        professor=session.professor,
        course=session.course,
        semester=session.semester
    ).exists()

    if not is_assigned:
        return {
            'success': False,
            'error': 'PROFESSOR_NOT_ASSIGNED',
            'message': 'The professor is not assigned to this course for this semester.'
        }

    # Step 6 & 7: Create the Attendance record (unique_together prevents duplicates)
    try:
        attendance = Attendance.objects.create(
            session=session,
            student=student,
            status='present'
        )
    except IntegrityError:
        return {
            'success': False,
            'error': 'DUPLICATE_ATTENDANCE',
            'message': f'Attendance already recorded for {student.name} in this session.'
        }

    return {
        'success': True,
        'message': f'Attendance recorded successfully for {student.name}.',
        'attendance': {
            'id': attendance.id,
            'student': student.name,
            'student_id': student.student_id,
            'course': session.course.code,
            'session_date': session.date_time.isoformat(),
            'scanned_at': attendance.scanned_at.isoformat() if attendance.scanned_at else None,
            'status': attendance.status,
        }
    }
