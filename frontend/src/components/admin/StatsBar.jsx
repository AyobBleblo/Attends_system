import { Users, GraduationCap, BookOpen, ClipboardList } from 'lucide-react';

const STATS = [
  { key: 'students',    label: 'Students',    icon: Users,          color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' },
  { key: 'professors',  label: 'Professors',  icon: GraduationCap,  color: 'bg-[#D4AF37]/10 text-[#B8860B] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]' },
  { key: 'courses',     label: 'Courses',     icon: BookOpen,       color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400' },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList,  color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
];

/**
 * StatsBar — 4-card summary strip for the Admin Dashboard.
 * Props:
 *   counts : { students: number, professors: number, courses: number, enrollments: number }
 *   loading: boolean
 */
const StatsBar = ({ counts = {}, loading = false }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    {STATS.map(({ key, label, icon: Icon, color }) => (
      <div
        key={key}
        className="float-card p-5 flex items-center gap-4"
      >
        <div className={`${color} p-3.5 rounded-xl shrink-0`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
            {label}
          </p>
          {loading ? (
            <div className="skeleton h-6 w-10 mt-1 rounded" />
          ) : (
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none mt-0.5">
              {counts[key] ?? 0}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default StatsBar;
