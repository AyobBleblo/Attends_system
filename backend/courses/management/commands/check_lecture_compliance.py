"""
Management command: check_lecture_compliance
============================================
Runs the lecture compliance check for all CourseAssignments in the active
semester and reports results.

Usage
-----
  python manage.py check_lecture_compliance

Cron (example — run every morning at 08:00)
  0 8 * * * /path/to/venv/bin/python manage.py check_lecture_compliance >> /var/log/compliance.log 2>&1

Options
-------
  --dry-run    Print coverage stats without creating any notifications.
  --verbose    Print per-assignment details even if no notification was created.
"""
import logging

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError

from courses.models import CourseAssignment
from courses.tracking_service import (
    calculate_coverage,
    check_and_notify,
    run_compliance_check_for_active_semester,
    WARNING_DAYS_BEFORE_END,
    WARNING_THRESHOLD,
)
from core.models import Semester

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Checks professor lecture compliance for the active semester and '
        'creates in-app Notification records when thresholds are crossed.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Print coverage stats only — do NOT create any notifications.',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            default=False,
            help='Print details for every assignment, even if no notification was sent.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        verbose = options['verbose']

        self.stdout.write(self.style.MIGRATE_HEADING(
            '\n🔍  Lecture Compliance Check — Anti-Gravity System\n'
        ))

        # ── Get active semester ───────────────────────────────────────────────
        try:
            semester = Semester.objects.get(is_active=True)
        except Semester.DoesNotExist:
            raise CommandError('No active semester found. Aborting.')
        except OperationalError as exc:
            raise CommandError(f'Database error: {exc}')

        self.stdout.write(f'  Semester : {semester.name}')
        self.stdout.write(f'  End date : {semester.end_date}')
        self.stdout.write(
            f'  Warning window : ≤{WARNING_THRESHOLD*100:.0f}% coverage '
            f'within {WARNING_DAYS_BEFORE_END} days of end\n'
        )

        # ── Load assignments ──────────────────────────────────────────────────
        assignments = (
            CourseAssignment.objects
            .filter(semester=semester)
            .select_related('professor', 'course', 'semester')
            .order_by('professor__name', 'course__code')
        )

        if not assignments.exists():
            self.stdout.write(self.style.WARNING(
                '  No course assignments found for this semester.\n'
            ))
            return

        total     = 0
        notified  = 0
        errors    = 0

        for assignment in assignments:
            total += 1
            coverage = calculate_coverage(assignment)
            label = (
                f'{assignment.professor.name:<30} | '
                f'{assignment.course.code:<12} | '
                f'{coverage["actual"]:>3}/{coverage["expected"]:<3} '
                f'({coverage["pct"]:>5.1f}%) [{coverage["status"]}]'
            )

            if dry_run:
                if verbose or coverage['status'] in ('warning', 'critical', 'complete'):
                    color = (
                        self.style.SUCCESS   if coverage['status'] == 'complete' else
                        self.style.WARNING   if coverage['status'] in ('warning', 'critical') else
                        self.style.NOTICE
                    )
                    self.stdout.write('  ' + color(label))
                continue

            try:
                result = check_and_notify(assignment)
                if result:
                    notified += 1
                    color = (
                        self.style.SUCCESS if result['type'] == 'congratulation'
                        else self.style.WARNING
                    )
                    self.stdout.write('  ' + color(f'✉  Notification → {label}'))
                elif verbose:
                    self.stdout.write('  ' + self.style.NOTICE(f'   No action  → {label}'))
            except Exception as exc:
                errors += 1
                logger.exception('Error processing assignment pk=%s', assignment.pk)
                self.stdout.write('  ' + self.style.ERROR(f'❌ Error       → {label} | {exc}'))

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'  DRY RUN — {total} assignments checked. No notifications created.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'  ✅  Done — {total} checked, {notified} notification(s) created, {errors} error(s).'
            ))
        self.stdout.write('')
