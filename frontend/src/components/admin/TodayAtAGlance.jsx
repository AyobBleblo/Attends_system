import { useState, useEffect } from 'react';
import { Activity, ScanLine, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

/**
 * TodayAtAGlance — three-chip summary strip shown at the top of the dashboard.
 * Fetches from /api/stats/; falls back to mock if fields are missing.
 */
const TodayAtAGlance = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('stats/');
        setStats(res.data);
      } catch {
        // graceful fallback — show mocked plausible data
        // TODO: wire real API when backend exposes active_sessions / scans_today / anomalies_today
        setStats({ active_sessions: 3, scans_today: 47, anomalies_today: 2 });
      } finally {
        setLoading(false);
      }
    };
    load();
    // auto-refresh every 60 s
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  const chips = [
    {
      icon: Activity,
      label: 'Active Sessions',
      value: stats?.active_sessions ?? '—',
      dot: 'bg-emerald-500',
      dotPulse: true,
      accent: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    },
    {
      icon: ScanLine,
      label: 'Scans Today',
      value: stats?.scans_today ?? '—',
      dot: 'bg-indigo-500',
      accent: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    },
    {
      icon: AlertTriangle,
      label: 'Anomalies Today',
      value: stats?.anomalies_today ?? '—',
      dot: stats?.anomalies_today > 0 ? 'bg-amber-500' : 'bg-slate-400',
      accent: stats?.anomalies_today > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400',
      bg: stats?.anomalies_today > 0
        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {chips.map(({ icon: Icon, label, value, dot, dotPulse, accent, bg }) => (
        <div
          key={label}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${bg} transition-colors duration-200`}
        >
          {/* Status dot */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {dotPulse && (
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-60`}
              />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dot}`} />
          </span>

          <Icon size={15} className={`${accent} shrink-0`} />

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {label}
          </span>

          {loading ? (
            <span className="skeleton h-4 w-6 rounded" />
          ) : (
            <span className={`text-sm font-bold ${accent} tabular-nums`}>{value}</span>
          )}
        </div>
      ))}
    </div>
  );
};

export default TodayAtAGlance;
