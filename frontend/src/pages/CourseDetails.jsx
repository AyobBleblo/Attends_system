import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, StopCircle, Users, ArrowLeft, Download,
  Wifi, Clock, CheckCircle2, Zap, Edit3, X, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Duration formatter ────────────────────────────────────────────────────────
const fmtDuration = (mins) => {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Manual End-Time Override Modal ────────────────────────────────────────────
function ManualEndModal({ session, onClose, onSaved }) {
  const [endTime, setEndTime]     = useState('');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // Default end-time input to now (local)
  useEffect(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    setEndTime(now.toISOString().slice(0, 16));
  }, []);

  const handleSave = async () => {
    if (!note.trim()) { setError('A reason / note is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.patch(`/sessions/${session.id}/manual-end/`, {
        end_time: new Date(endTime).toISOString(),
        teacher_note: note.trim(),
      });
      onSaved(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  };
  const card = {
    background: '#12121a', border: '1px solid rgba(212,175,55,0.3)',
    borderRadius: 18, padding: '2rem', width: '100%', maxWidth: 480,
    boxShadow: '0 0 40px rgba(212,175,55,0.12)',
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div style={card} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1rem', fontWeight: 700 }}>Set End Time Manually</h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#6b7280' }}>Session #{session.id} · {new Date(session.date_time).toLocaleString()}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
        </div>

        <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontWeight: 600 }}>End Time</label>
        <input
          type="datetime-local"
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: 10, marginBottom: '1rem', background: 'rgba(255,255,255,0.06)', color: '#f0f0f0', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' }}
        />

        <label style={{ display: 'block', fontSize: '0.72rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem', fontWeight: 600 }}>
          Reason / Note <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setError(''); }}
          placeholder="e.g. Forgot to generate End Session QR"
          rows={3}
          style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: 10, marginBottom: '1rem', background: 'rgba(255,255,255,0.06)', color: '#f0f0f0', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.12)'}`, outline: 'none', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }}
        />

        {error && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.2rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: '0.6rem 1.4rem', borderRadius: 10, border: '1px solid rgba(212,175,55,0.4)', background: 'rgba(212,175,55,0.15)', color: '#D4AF37', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Session History Table ─────────────────────────────────────────────────────
function SessionHistoryPanel({ sessions, loading, onStart, onExport, onManualEnd }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Session History</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} held this semester
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onExport} className="btn-ghost text-sm gap-2"><Download size={16} /> Export CSV</button>
          <button onClick={onStart} className="btn-gold gap-2"><PlayCircle size={18} /> Start Session</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <Clock size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500 font-medium">No sessions yet.</p>
          <p className="text-xs text-slate-600 mt-1">Start a new session to begin tracking attendance.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {['#', 'Date & Time', 'Professor', 'Duration', 'Note', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessions.map((s, idx) => (
                <motion.tr key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                  <td className="px-4 py-4 text-slate-200 font-medium whitespace-nowrap">{new Date(s.date_time).toLocaleString()}</td>
                  <td className="px-4 py-4 text-slate-300">{s.professor_name}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {s.duration_minutes != null ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                        <Clock size={11} /> {fmtDuration(s.duration_minutes)}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-[180px]">
                    {s.teacher_note ? (
                      <span title={s.teacher_note} className="text-amber-400 text-xs truncate block">{s.teacher_note}</span>
                    ) : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-4">
                    {!s.end_time && (
                      <button
                        onClick={() => onManualEnd(s)}
                        title="Manually set end time"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        <Edit3 size={11} /> Set End Time
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Elapsed Timer ─────────────────────────────────────────────────────────────
function ElapsedTimer({ startIso }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return <span className="font-mono text-gold-400 text-sm font-bold tabular-nums">{elapsed}</span>;
}

// ── Live Counter ──────────────────────────────────────────────────────────────
function LiveCounter({ count }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Scanned Students</p>
      <AnimatePresence mode="popLayout">
        <motion.div key={count} initial={{ scale: 0.5, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.5, opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className="text-7xl font-extrabold text-gold-gradient tabular-nums">
          {count}
        </motion.div>
      </AnimatePresence>
      <p className="text-xs text-slate-500 mt-2">students present</p>
    </div>
  );
}

// ── Active Session Panel ──────────────────────────────────────────────────────
function ActiveSessionPanel({ session, qrCode, attendanceCount, attendanceList, onInitiateEnd, onConfirmEnd, isEndingMode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      <div className="lg:col-span-2 space-y-5">
        {/* Status row */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isEndingMode ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isEndingMode ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </span>
          <span className={`text-sm font-semibold ${isEndingMode ? 'text-red-400' : 'text-emerald-400'}`}>
            {isEndingMode ? 'End Session — Students: scan to confirm' : 'Session Live'}
          </span>
          <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
            <Clock size={11} /> <ElapsedTimer startIso={session.date_time} />
          </span>
        </div>

        {/* QR Card */}
        <div className={`glass-card-gold p-8 flex flex-col items-center gap-6 ${isEndingMode ? 'border-red-500/40' : ''}`}>
          <LiveCounter count={attendanceCount} />
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} className="relative">
            <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: isEndingMode ? '0 0 40px 8px rgba(239,68,68,0.25)' : '0 0 40px 8px rgba(212,175,55,0.35)' }} />
            <div className="bg-white rounded-2xl p-4 shadow-gold-lg relative z-10">
              {qrCode ? <QRCodeSVG value={qrCode} size={224} level="H" includeMargin={false} /> : <div className="w-56 h-56 flex items-center justify-center"><span className="text-slate-400 text-sm">Generating…</span></div>}
            </div>
          </motion.div>

          {!isEndingMode ? (
            <button onClick={onInitiateEnd} className="btn-danger w-full justify-center gap-2 py-3">
              <StopCircle size={18} /> End Session
            </button>
          ) : (
            <div className="w-full space-y-2">
              <p className="text-xs text-center text-red-300 opacity-80">Students scan this QR to confirm their presence</p>
              <button onClick={onConfirmEnd} className="w-full py-3 rounded-xl font-bold text-sm bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2">
                <CheckCircle2 size={16} /> Confirm & Close Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live List */}
      <div className="lg:col-span-3 glass-card p-6 min-h-[480px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-gold-400" />
          <h2 className="text-lg font-bold text-slate-100">Live Attendance</h2>
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1"><Zap size={11} className="text-gold-500" /> updates every 5s</span>
        </div>
        {attendanceList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4"><Users size={28} className="text-slate-600" /></div>
            <p className="text-slate-500 font-medium">Waiting for students to scan…</p>
          </div>
        ) : (
          <ul className="space-y-2 flex-1 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {attendanceList.map((a) => (
                <motion.li key={a.id} layout initial={{ opacity: 0, x: 24, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -24 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/6 hover:bg-white/7 transition-colors">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">{a.student_name?.[0]?.toUpperCase() || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{a.student_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{a.student_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{new Date(a.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400"><CheckCircle2 size={10} /> Present</span>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main CourseDetails page ───────────────────────────────────────────────────
function CourseDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions,        setSessions]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeSession,   setActiveSession]   = useState(null);
  const [qrCode,          setQrCode]          = useState(null);
  const [isEndingMode,    setIsEndingMode]    = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendanceList,  setAttendanceList]  = useState([]);
  const [manualEndTarget, setManualEndTarget] = useState(null);
  const peakCount = useRef(0);

  const fetchHistory = () => {
    setLoading(true);
    api.get(`/sessions/course/${id}/`).then(res => setSessions(res.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [id]);

  // Polling while session is live
  useEffect(() => {
    if (!activeSession) return;
    const qrInterval = setInterval(() => {
      api.post(`/sessions/${activeSession.id}/refresh-qr/`).then(res => setQrCode(res.data.qr_token)).catch(console.error);
    }, 30_000);
    const attendInterval = setInterval(() => {
      api.get(`/attendance/session/${activeSession.id}/`).then(res => {
        const newList = res.data;
        peakCount.current = Math.max(peakCount.current, newList.length);
        setAttendanceCount(peakCount.current);
        setAttendanceList(newList);
      }).catch(console.error);
    }, 5_000);
    return () => { clearInterval(qrInterval); clearInterval(attendInterval); };
  }, [activeSession]);

  const startSession = () => {
    api.post('/sessions/create/', { professor_id: user.id, course_id: id }).then(res => {
      peakCount.current = 0;
      setActiveSession({ ...res.data, course: id });
      setQrCode(res.data.qr_token);
      setIsEndingMode(false);
      setAttendanceCount(0);
      setAttendanceList([]);
    }).catch(err => alert('Error starting session: ' + (err.response?.data?.error || err.message)));
  };

  // Step 1: switch QR to "end mode" — same QR token, different endpoint for students
  const initiateEnd = () => setIsEndingMode(true);

  // Step 2: professor confirms closure
  const confirmEnd = () => {
    setActiveSession(null);
    setQrCode(null);
    setIsEndingMode(false);
    peakCount.current = 0;
    fetchHistory();
  };

  const exportCSV = async () => {
    try {
      const res = await api.get(`/export/course/${id}/`, { responseType: 'blob' });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `course_${id}_attendance.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { alert('Failed to export CSV.'); }
  };

  const handleManualEndSaved = (updatedSession) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    setManualEndTarget(null);
  };

  const courseName = sessions.length > 0 ? sessions[0].course_code : `Course #${id}`;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-7">
        <button onClick={() => navigate('/professor')} className="btn-ghost gap-2 py-2"><ArrowLeft size={16} /> Back</button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">{courseName}</h1>
          <p className="text-sm text-slate-400">{activeSession ? (isEndingMode ? 'End Session QR active — awaiting student scans' : 'Active session — QR live') : 'Session History'}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeSession ? (
          <motion.div key="history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
            <SessionHistoryPanel sessions={sessions} loading={loading} onStart={startSession} onExport={exportCSV} onManualEnd={setManualEndTarget} />
          </motion.div>
        ) : (
          <motion.div key="active" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
            <ActiveSessionPanel session={activeSession} qrCode={qrCode} attendanceCount={attendanceCount} attendanceList={attendanceList} onInitiateEnd={initiateEnd} onConfirmEnd={confirmEnd} isEndingMode={isEndingMode} />
          </motion.div>
        )}
      </AnimatePresence>

      {manualEndTarget && (
        <ManualEndModal session={manualEndTarget} onClose={() => setManualEndTarget(null)} onSaved={handleManualEndSaved} />
      )}
    </div>
  );
}

export default CourseDetails;
