import { useMemo } from 'react';
import { Users, GraduationCap, BookOpen, ClipboardList, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import SparklineChart from './SparklineChart';

const STATS = [
  {
    key: 'students',
    label: 'Students',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
    sparkColor: '#6366f1',
  },
  {
    key: 'professors',
    label: 'Professors',
    icon: GraduationCap,
    color: 'bg-[#D4AF37]/10 text-[#B8860B] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]',
    sparkColor: '#D4AF37',
  },
  {
    key: 'courses',
    label: 'Courses',
    icon: BookOpen,
    color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400',
    sparkColor: '#0ea5e9',
  },
  {
    key: 'enrollments',
    label: 'Enrollments',
    icon: ClipboardList,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    sparkColor: '#10b981',
  },
];

/**
 * Generate a plausible 7-day trend ending at `total`.
 * Replace with real API data when available.
 * TODO: wire /api/stats/sparklines/ when backend exposes it.
 */
const fakeSparkline = (total) => {
  const base = Math.max(0, total - Math.floor(total * 0.15));
  return Array.from({ length: 7 }, (_, i) => {
    const noise = Math.floor(Math.random() * (total * 0.08 + 2));
    const trend = Math.floor((total - base) * (i / 6));
    return base + trend + noise;
  });
};

/**
 * StatsBar — 4-card summary strip with sparklines and trend badges.
 * Props:
 *   counts    : { students, professors, courses, enrollments }
 *   loading   : boolean
 *   sparklines: { students: number[], ... } (optional — auto-generated if absent)
 */
const StatsBar = ({ counts = {}, loading = false, sparklines }) => {
  const computedSparklines = useMemo(() => {
    if (sparklines) return sparklines;
    return Object.fromEntries(
      STATS.map(s => [s.key, fakeSparkline(counts[s.key] ?? 0)])
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts, sparklines]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {STATS.map(({ key, label, icon: Icon, color, sparkColor }) => {
        const sparkData = computedSparklines[key] ?? [];
        const trendVal = sparkData.length >= 2
          ? ((sparkData[sparkData.length - 1] - sparkData[0]) / (sparkData[0] || 1)) * 100
          : 0;
        const trendUp   = trendVal > 1;
        const trendDown = trendVal < -1;

        return (
          <div
            key={key}
            className="float-card p-5 flex flex-col gap-3 group overflow-hidden relative"
          >
            {/* Top row: icon + trend */}
            <div className="flex items-start justify-between">
              <div className={`${color} p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110`}>
                <Icon size={22} />
              </div>

              {/* Trend badge */}
              {!loading && (
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    trendUp
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                      : trendDown
                      ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {trendUp ? <TrendingUp size={9} /> : trendDown ? <TrendingDown size={9} /> : <Minus size={9} />}
                  {Math.abs(trendVal).toFixed(0)}%
                </span>
              )}
            </div>

            {/* Count + label */}
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                {label}
              </p>
              {loading ? (
                <div className="skeleton h-7 w-14 mt-1 rounded" />
              ) : (
                <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 leading-none mt-0.5 tabular-nums">
                  {(counts[key] ?? 0).toLocaleString()}
                </p>
              )}
            </div>

            {/* Sparkline */}
            {!loading && sparkData.length >= 2 && (
              <div className="mt-auto self-end opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                <SparklineChart data={sparkData} color={sparkColor} height={32} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StatsBar;
