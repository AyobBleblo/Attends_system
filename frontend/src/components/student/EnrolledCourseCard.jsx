import { QrCode } from 'lucide-react';

/**
 * EnrolledCourseCard — student course card with attendance progress bar.
 * Props:
 *   course  : { id, code, name, department_name, attended_count, total_sessions, attendance_pct }
 *   onScan  : () => void — fires when student taps "Scan QR"
 */
const EnrolledCourseCard = ({ course, onScan }) => {
  const pct = course.attendance_pct ?? 0;
  const barColor = pct >= 75 ? 'bg-emerald-500'
                 : pct >= 50 ? 'bg-amber-400'
                 :             'bg-red-400';

  return (
    <div className="card p-5 flex flex-col gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div>
        <span className="badge bg-brand-500 text-white mb-2">{course.code}</span>
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 leading-snug">{course.name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{course.department_name}</p>
      </div>

      {/* Attendance stats */}
      <div>
        <div className="flex justify-between items-center mb-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>Attendance</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {course.attended_count ?? 0} / {course.total_sessions ?? 0} sessions
          </span>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-xs font-semibold mt-1 ${
          pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
        }`}>
          {pct}%
        </p>
      </div>

      {/* Scan button */}
      <button
        onClick={onScan}
        className="btn-primary w-full justify-center mt-auto"
      >
        <QrCode size={16} /> Scan Attendance
      </button>
    </div>
  );
};

export default EnrolledCourseCard;
