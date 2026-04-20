"""
Lecture Tracking Service
========================
Monitors professor compliance with their expected lecture count per course
assignment. Creates in-app Notification records (no email) when thresholds
are crossed.

Thresholds
----------
- 100% completion  → CONGRATULATION notification (once per assignment/semester).
- ≤ 70% coverage with < WARNING_DAYS_BEFORE_END days left → WARNING notification.

Usage
-----
Called from:
  - attendance/views.py SessionCreateView (fire-and-forget thread after every session)
  - management command: python manage.py check_lecture_compliance  (cron / manual)
"""
from __future__ import annotations

import logging
from datetime import date

from django.utils import timezone
from django.db import transaction
from django.db.models import Count, Q

from courses.models import CourseAssignment
from attendance.models import Session
from core.models import Notification, Semester

logger = logging.getLogger(__name__)

# Days before semester end at which the warning threshold is evaluated
WARNING_DAYS_BEFORE_END: int = 14
# Coverage threshold (as a fraction) below which a warning is sent
WARNING_THRESHOLD: float = 0.70


# ─────────────────────────────────────────────────────────────────────────────
# Core helpers
# ─────────────────────────────────────────────────────────────────────────────

def calculate_coverage(assignment: CourseAssignment) -> dict:
    """
    Returns coverage stats for a single CourseAssignment.

    Uses a single COUNT query to get the number of sessions the professor has
    created for this course/semester combination — no N+1 issues.

    Returns
    -------
    {
      'actual':   int,    # sessions actually created
      'expected': int,    # from assignment.expected_lectures
      'pct':      float,  # 0.0 – 100.0
      'status':   str,    # 'complete' | 'adequate' | 'warning' | 'critical'
    }
    """
    actual = Session.objects.filter(
        professor_id=assignment.professor_id,
        course_id=assignment.course_id,
        semester_id=assignment.semester_id,
    ).annotate(
        lecture_date=TruncDate('date_time')
    ).values('lecture_date').distinct().count()

    expected = assignment.expected_lectures
    pct = (actual / expected * 100) if expected > 0 else 0.0
    pct = round(pct, 1)

    if pct >= 100:
        status = 'complete'
    elif pct >= 70:
        status = 'adequate'
    elif pct >= 50:
        status = 'warning'
    else:
        status = 'critical'

    return {
        'actual':   actual,
        'expected': expected,
        'pct':      pct,
        'status':   status,
    }


def _notification_already_sent(professor_id: int, notification_type: str, semester_id: int) -> bool:
    """
    Guard against duplicate notifications for the same event in the same semester.
    Uses an efficient EXISTS query on indexed columns.
    """
    return Notification.objects.filter(
        professor_id=professor_id,
        notification_type=notification_type,
        # Only deduplicate within the same semester by embedding it in the message's
        # uniqueness check via a separate field would be cleaner; here we use a
        # semester-scoped message prefix as a practical guard.
        message__startswith=f'[SEM-{semester_id}]',
    ).exists()


# ─────────────────────────────────────────────────────────────────────────────
# Main notification dispatcher
# ─────────────────────────────────────────────────────────────────────────────

def check_and_notify(assignment: CourseAssignment) -> dict | None:
    """
    Evaluates lecture compliance for a single CourseAssignment and creates an
    in-app Notification if a threshold is crossed.

    Rules
    -----
    1. 100% completion  → CONGRATULATION (sent once per assignment).
    2. ≤ WARNING_THRESHOLD coverage AND semester ends within WARNING_DAYS_BEFORE_END days
       → WARNING (sent once per assignment per semester).

    Returns
    -------
    The created Notification instance dict if one was created, else None.
    """
    try:
        coverage = calculate_coverage(assignment)
        professor = assignment.professor
        course    = assignment.course
        semester  = assignment.semester
        today     = timezone.now().date()

        sem_tag = f'[SEM-{semester.pk}] [{course.code}]'

        # ── Congratulations: professor hit 100% ──────────────────────────────
        if coverage['pct'] >= 100:
            notif_type = Notification.NotificationType.CONGRATULATION
            # Only send once
            already = _notification_already_sent(
                professor.pk, notif_type, semester.pk
            )
            if not already:
                msg = (
                    f'{sem_tag} 🎉 Congratulations, Dr. {professor.name}! '
                    f'You have successfully completed all {coverage["expected"]} '
                    f'expected lectures for {course.code} – {course.name} '
                    f'in the {semester.name} semester. Excellent work!'
                )
                with transaction.atomic():
                    notif = Notification.objects.create(
                        professor=professor,
                        message=msg,
                        notification_type=notif_type,
                    )
                logger.info(
                    'Congratulation notification created: professor=%s course=%s',
                    professor.professor_id, course.code,
                )
                return {
                    'type': notif_type,
                    'professor': professor.name,
                    'course': course.code,
                    'pct': coverage['pct'],
                    'notification_id': notif.pk,
                }

        # ── Warning: below threshold and semester ending soon ────────────────
        days_left = (semester.end_date - today).days if semester.end_date >= today else 0
        coverage_fraction = coverage['pct'] / 100

        if coverage_fraction <= WARNING_THRESHOLD and 0 < days_left <= WARNING_DAYS_BEFORE_END:
            notif_type = Notification.NotificationType.WARNING
            already = _notification_already_sent(
                professor.pk, notif_type, semester.pk
            )
            if not already:
                msg = (
                    f'{sem_tag} ⚠️ Reminder, Dr. {professor.name}: '
                    f'You have only held {coverage["actual"]} of {coverage["expected"]} '
                    f'expected lectures for {course.code} – {course.name} '
                    f'({coverage["pct"]}% coverage). '
                    f'The {semester.name} semester ends in {days_left} day(s). '
                    f'Please use the QR attendance system for all remaining lectures.'
                )
                with transaction.atomic():
                    notif = Notification.objects.create(
                        professor=professor,
                        message=msg,
                        notification_type=notif_type,
                    )
                logger.info(
                    'Warning notification created: professor=%s course=%s pct=%.1f days_left=%d',
                    professor.professor_id, course.code, coverage['pct'], days_left,
                )
                return {
                    'type': notif_type,
                    'professor': professor.name,
                    'course': course.code,
                    'pct': coverage['pct'],
                    'days_left': days_left,
                    'notification_id': notif.pk,
                }

    except Exception:
        logger.exception(
            'Error in check_and_notify for assignment pk=%s', assignment.pk
        )

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Batch runner — used by the management command
# ─────────────────────────────────────────────────────────────────────────────

def run_compliance_check_for_active_semester() -> list[dict]:
    """
    Runs check_and_notify() for every CourseAssignment in the current active
    semester. Optimised: loads all assignments with select_related in a single
    query, then iterates — no per-item DB round-trips for the basic coverage
    check (each assignment still needs one COUNT query via calculate_coverage).

    Returns
    -------
    List of notification dicts for all notifications created in this run.
    """
    try:
        semester = Semester.objects.get(is_active=True)
    except Semester.DoesNotExist:
        logger.warning('No active semester found. Skipping compliance check.')
        return []

    assignments = (
        CourseAssignment.objects
        .filter(semester=semester)
        .select_related('professor', 'course', 'semester')
    )

    results = []
    for assignment in assignments:
        result = check_and_notify(assignment)
        if result:
            results.append(result)

    logger.info(
        'Compliance check complete: %d assignments checked, %d notifications created.',
        assignments.count(), len(results),
    )
    return results
