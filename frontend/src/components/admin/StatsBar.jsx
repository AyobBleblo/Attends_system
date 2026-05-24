import { Users, GraduationCap, BookOpen, ClipboardList } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const STATS = [
  {
    key: 'students',
    labelKey: 'statStudents',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  },
  {
    key: 'professors',
    labelKey: 'statProfessors',
    icon: GraduationCap,
    color: 'bg-[#D4AF37]/10 text-[#B8860B] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]',
  },
  {
    key: 'courses',
    labelKey: 'statCourses',
    icon: BookOpen,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
  },
  {
    key: 'enrollments',
    labelKey: 'statEnrollments',
    icon: ClipboardList,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
];

/**
 * StatsBar — 4-card summary strip without graph and trend.
 * Props:
 *   counts    : { students, professors, courses, enrollments }
 *   loading   : boolean
 */
const StatsBar = ({ counts = {}, loading = false }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {STATS.map(({ key, labelKey, icon: Icon, color }) => {
        const label = t(labelKey);

        return (
          <div
            key={key}
            className="float-card !rounded-lg p-3 md:p-4 flex items-center gap-4 group overflow-hidden"
          >
            {/* Left: icon */}
            <div className={`${color} p-3 rounded-lg shrink-0 transition-transform duration-300 group-hover:scale-105`}>
              <Icon size={24} />
            </div>

            {/* Right: Count + label */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                {label}
              </p>
              {loading ? (
                <div className="skeleton h-8 w-16 mt-1 rounded" />
              ) : (
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight mt-0.5 truncate">
                  {(counts[key] ?? 0).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsBar;
