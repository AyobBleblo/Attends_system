from django.utils import timezone
from django.db import IntegrityError, transaction
from core.models import Semester
from accounts.models import Student
from courses.models import CourseAssignment
from attendance.models import Session, Enrollment, Attendance


def record_attendance(student_id: str, qr_token: str) -> dict:
    now = timezone.now()
    today = now.date()

    # ── EARLY EXIT: Fast indexed validation before any heavy logic ────────
    #    These EXISTS queries hit indexed columns and return in < 1ms.
    #    Rejects invalid tokens/students before loading full objects.
    if not Session.objects.filter(qr_token=qr_token).exists():
        return {'success': False, 'error': 'Invalid QR code. No session found.'}

    if not Student.objects.filter(student_id=student_id).exists():
        return {'success': False, 'error': f'No student found with ID: {student_id}'}

    # 1. Find Session by qr_token (full object needed for subsequent checks)
    session = Session.objects.select_related('course', 'professor', 'semester').get(qr_token=qr_token)

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

    # Find the Student (already validated via early-exit above)
    student = Student.objects.only('id', 'student_id', 'name').get(student_id=student_id)

    # 4. Check the Student is enrolled in the Session's course
    #    Using _id FK shortcuts avoids re-fetching related objects
    is_enrolled = Enrollment.objects.filter(
        student_id=student.pk, course_id=session.course_id, semester_id=session.semester_id
    ).exists()
    if not is_enrolled:
        return {'success': False, 'error': f'Student is not enrolled in {session.course.code}.'}

    # Check professor assignment (optional safety check)
    is_assigned = CourseAssignment.objects.filter(
        professor_id=session.professor_id, course_id=session.course_id, semester_id=session.semester_id
    ).exists()
    if not is_assigned:
        return {'success': False, 'error': 'Professor is not assigned to this course.'}

    # ── VALIDATION 1: One scan per day ────────────────────────────────────
    # The DB-level unique_together ('student', 'course', 'date') already enforces
    # this at the integrity level, but we pre-check here for a clean error message.
    already_scanned_today = Attendance.objects.filter(
        student_id=student.pk,
        course_id=session.course_id,
        date=today,
    ).exists()
    if already_scanned_today:
        return {
            'success': False,
            'error': 'You have already scanned your attendance for this course today. Only one scan per day is allowed.'
        }

    # ── VALIDATION 2: Total scans ≤ semester lecture quota ────────────────
    total_lectures_quota = active_semester.total_lectures
    total_scans_so_far = Attendance.objects.filter(
        student_id=student.pk,
        course_id=session.course_id,
        session__semester_id=active_semester.pk,
    ).count()
    if total_scans_so_far >= total_lectures_quota:
        return {
            'success': False,
            'error': (
                f'You have reached the maximum attendance limit for this course '
                f'({total_lectures_quota} lectures). No further scans are allowed.'
            )
        }

    # 5. Create the Attendance record (atomic block keeps connection clean on IntegrityError)
    try:
        with transaction.atomic():
            attendance = Attendance.objects.create(
                session=session, student=student, status='present'
            )
    except IntegrityError:
        return {'success': False, 'error': 'You have already registered your attendance for this lecture.'}

    return {
        'success': True,
        'message': f'Attendance recorded for {student.name}.',
        'attendance_id': attendance.id,
        'scans_used': total_scans_so_far + 1,
        'scans_remaining': total_lectures_quota - (total_scans_so_far + 1),
    }
