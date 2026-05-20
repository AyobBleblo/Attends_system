import { useState, useEffect } from 'react';
import { AlertTriangle, Fingerprint, RefreshCw, Shield, Clock } from 'lucide-react';
import api from '../../api/axios';

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Deterministic colour from a name string (matches student avatar logic) */
export const nameToColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 48%)`;
};

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

const MISMATCH_LABELS = {
  device:  { label: 'Device Mismatch', icon: Fingerprint, color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  geo:     { label: 'Location Flag',   icon: Shield,      color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
  replay:  { label: 'Replay Attack',   icon: Shield,      color: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' },
  unknown: { label: 'Unknown',         icon: AlertTriangle, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400' },
};

/** Format timestamp → relative "5 min ago" */
const timeAgo = (isoStr) => {
  if (!isoStr) return '—';
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60)   return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.round(diff / 3600)}h ago`;
  return new Date(isoStr).toLocaleDateString();
};

/* ── Mock data (remove when backend exposes /api/attendance/anomalies/) ── */
// TODO: Replace MOCK_ANOMALIES with real API call to /api/attendance/anomalies/
const MOCK_ANOMALIES = [
  { id: 1, student_name: 'Ahmed Al-Rashid',  course_name: 'Advanced Algorithms', mismatch_type: 'device',  timestamp: new Date(Date.now() - 5 * 60000).toISOString(),   student_id: 'S2021001' },
  { id: 2, student_name: 'Sara Benmoussa',   course_name: 'Database Systems',    mismatch_type: 'geo',     timestamp: new Date(Date.now() - 18 * 60000).toISOString(),  student_id: 'S2021042' },
  { id: 3, student_name: 'Omar Khalil',      course_name: 'Operating Systems',   mismatch_type: 'replay',  timestamp: new Date(Date.now() - 43 * 60000).toISOString(),  student_id: 'S2020115' },
  { id: 4, student_name: 'Lina Farouk',      course_name: 'Computer Networks',   mismatch_type: 'device',  timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), student_id: 'S2022008' },
];

/* ── AnomalyRow ─────────────────────────────────────────────────────── */
const AnomalyRow = ({ item, onResetFingerprint, resetting }) => {
  const config = MISMATCH_LABELS[item.mismatch_type] ?? MISMATCH_LABELS.unknown;
  const BadgeIcon = config.icon;
  const color = nameToColor(item.student_name);

  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-800 last:border-0 group">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
        style={{ backgroundColor: color }}
      >
        {initials(item.student_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {item.student_name}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {item.course_name}
        </p>
      </div>

      {/* Badge + time */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.color}`}>
          <BadgeIcon size={9} />
          {config.label}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <Clock size={9} />
          {timeAgo(item.timestamp)}
        </span>
      </div>

      {/* Reset fingerprint */}
      {item.mismatch_type === 'device' && (
        <button
          onClick={() => onResetFingerprint(item)}
          disabled={resetting === item.id}
          title="Reset device fingerprint"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all duration-150 disabled:opacity-40 shrink-0"
        >
          {resetting === item.id
            ? <RefreshCw size={13} className="animate-spin" />
            : <Fingerprint size={13} />}
        </button>
      )}
    </div>
  );
};

/* ── AnomaliesPanel ─────────────────────────────────────────────────── */
const AnomaliesPanel = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // TODO: uncomment when backend exposes this endpoint
      // const res = await api.get('attendance/anomalies/');
      // setAnomalies(res.data);
      await new Promise(r => setTimeout(r, 400)); // simulate latency
      setAnomalies(MOCK_ANOMALIES);
    } catch {
      setAnomalies(MOCK_ANOMALIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleResetFingerprint = async (item) => {
    if (!window.confirm(`Reset device fingerprint for ${item.student_name}?`)) return;
    setResetting(item.id);
    try {
      await api.post(`admin/students/${item.student_id}/reset_fingerprint/`);
      setAnomalies(prev => prev.filter(a => a.id !== item.id));
    } catch {
      alert('Failed to reset fingerprint.');
    } finally {
      setResetting(null);
    }
  };

  const isEmpty = !loading && anomalies.length === 0;

  return (
    <div className="float-card p-5 h-fit">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/15">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Anomalies
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Device &amp; security flags
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-[#D4AF37] transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Count badge */}
      {!loading && anomalies.length > 0 && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            ⚠️ {anomalies.length} flagged event{anomalies.length > 1 ? 's' : ''} detected
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 py-2">
              <div className="skeleton w-9 h-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-32 rounded" />
                <div className="skeleton h-2.5 w-24 rounded" />
              </div>
              <div className="skeleton h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        /* Empty state */
        <div className="py-8 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <Shield size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Clear!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">No anomalies detected today 🎉</p>
          </div>
        </div>
      ) : (
        <div className="max-h-[400px] overflow-y-auto -mx-1 px-1">
          {anomalies.map(item => (
            <AnomalyRow
              key={item.id}
              item={item}
              onResetFingerprint={handleResetFingerprint}
              resetting={resetting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnomaliesPanel;
