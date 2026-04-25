from django.utils import timezone
from django.db import IntegrityError
from django.core.cache import cache
from core.models import Semester
from accounts.models import Student
from courses.models import CourseAssignment
from attendance.models import Session, Enrollment, Attendance

def record_attendance(student_id: str, qr_token: str) -> dict:
    now = timezone.now()

    # ── 1. FAST REDIS CACHE (0 DB Queries for 999 out of 1000 students) ──
    cache_key = f"session_qr_{qr_token}"
    session_data = cache.get(cache_key)

    if not session_data:
        try:
            session = Session.objects.select_related('course', 'semester').get(qr_token=qr_token)
            active_semester = Semester.objects.get(is_active=True)
            
            if session.semester_id != active_semester.id:
                return {'success': False, 'error': 'Session does not belong to the current active semester.'}
            
            is_assigned = CourseAssignment.objects.filter(
                professor_id=session.professor_id, course_id=session.course_id, semester_id=active_semester.id
            ).exists()
            
            if not is_assigned:
                return {'success': False, 'error': 'Professor is not assigned to this course.'}
                
            session_data = {
                'session_id': session.id,
                'course_id': session.course_id,
                'semester_id': active_semester.id,
                'expires_at': session.qr_expires_at,
                'quota': active_semester.total_lectures
            }
            # Cache the validated session data for 15 minutes (lifetime of the QR)
            cache.set(cache_key, session_data, 900)
            
        except Session.DoesNotExist:
            return {'success': False, 'error': 'Invalid QR code. No session found.'}
        except Semester.DoesNotExist:
            return {'success': False, 'error': 'No active semester found.'}

    if session_data['expires_at'] <= now:
        return {'success': False, 'error': 'This QR code has expired.'}

    # ── 2. SINGLE-QUERY STUDENT & ENROLLMENT CHECK (1 DB Query) ──
    student = Student.objects.filter(
        student_id=student_id,
        enrollments__course_id=session_data['course_id'],
        enrollments__semester_id=session_data['semester_id']
    ).only('id', 'name').first()

    if not student:
        return {'success': False, 'error': f'Student not found or not enrolled in this course.'}

    # ── 3. LECTURE QUOTA CHECK (1 DB Query) ──
    total_scans_so_far = Attendance.objects.filter(
        student_id=student.id,
        course_id=session_data['course_id'],
        session__semester_id=session_data['semester_id']
    ).count()

    if total_scans_so_far >= session_data['quota']:
        return {'success': False, 'error': 'Maximum attendance limit reached.'}

    # ── 4. RAW INSERT CATCHING DUPLICATES (1 DB Query) ──
    try:
        # DB-level unique_together handles the "one scan per day" rule natively.
        attendance = Attendance.objects.create(
            session_id=session_data['session_id'],
            student_id=student.id,
            course_id=session_data['course_id'],  # ← prevents save() from issuing 2 hidden SELECTs
            status='present'
        )
    except IntegrityError:
        return {'success': False, 'error': 'You have already registered your attendance for this lecture.'}

    return {
        'success': True,
        'message': f'Attendance recorded for {student.name}.',
        'attendance_id': attendance.id,
        'scans_used': total_scans_so_far + 1,
        'scans_remaining': session_data['quota'] - (total_scans_so_far + 1),
    }