import { ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * CourseCard — branded professor course card with glassmorphism design.
 * Props:
 *   course   : { id, code, name, department_name }
 *   onClick  : () => void
 *   index    : number — used to alternate accent colors
 */
const ACCENT_COLORS = [
  { bg: 'bg-brand-500',   border: 'border-brand-400',  badge: 'bg-brand-500' },
  { bg: 'bg-sky-500',     border: 'border-sky-400',    badge: 'bg-sky-500' },
  { bg: 'bg-violet-500',  border: 'border-violet-400', badge: 'bg-violet-500' },
  { bg: 'bg-emerald-500', border: 'border-emerald-400',badge: 'bg-emerald-500' },
  { bg: 'bg-amber-500',   border: 'border-amber-400',  badge: 'bg-amber-500' },
];

const CourseCard = ({ course, onClick, index = 0 }) => {
  const { lang } = useLanguage();
  const colors = ACCENT_COLORS[index % ACCENT_COLORS.length];

  return (
    <button
      onClick={onClick}
      className={`
        card w-full text-left p-5 group cursor-pointer
        border-t-4 ${colors.border}
        hover:-translate-y-1 hover:shadow-lg
        transition-all duration-200
      `}
    >
      {/* Badge */}
      <span className={`badge text-white mb-3 ${colors.badge}`}>
        {course.code}
      </span>

      {/* Course name */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-snug">
          {course.name}
        </h3>
        <ChevronRight
          size={18}
          className={`shrink-0 text-slate-400 group-hover:text-brand-500 transition-all ${lang === 'ar' ? 'group-hover:-translate-x-0.5 rotate-180' : 'group-hover:translate-x-0.5'}`}
        />
      </div>

      {/* Department */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{course.department_name}</p>

      {/* Footer CTA */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <span className={`text-xs font-semibold flex items-center gap-1 ${colors.bg.replace('bg-', 'text-')}`}>
          {lang === 'ar' ? 'بدء الجلسة ←' : 'Start Session →'}
        </span>
      </div>
    </button>
  );
};

export default CourseCard;
