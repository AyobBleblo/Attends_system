import { Users, GraduationCap, BookOpen, ClipboardList } from 'lucide-react';

const STATS = [
  { key: 'students',    label: 'Students',    icon: Users,          color: 'bg-indigo-500',  ring: 'ring-indigo-200' },
  { key: 'professors',  label: 'Professors',  icon: GraduationCap,  color: 'bg-violet-500',  ring: 'ring-violet-200' },
  { key: 'courses',     label: 'Courses',     icon: BookOpen,       color: 'bg-sky-500',     ring: 'ring-sky-200' },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList,  color: 'bg-emerald-500', ring: 'ring-emerald-200' },
];

/**
 * StatsBar — 4-card summary strip for the Admin Dashboard.
 * Props:
 *   counts : { students: number, professors: number, courses: number, enrollments: number }
 *   loading: boolean
 */
const StatsBar = ({ counts = {}, loading = false }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    {STATS.map(({ key, label, icon: Icon, color, ring }) => (
      <div
        key={key}
        className={`card p-4 flex items-center gap-4 ring-1 ${ring}`}
      >
        <div className={`${color} p-3 rounded-xl text-white shadow-md shrink-0`}>
          <Icon size={20} />
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
