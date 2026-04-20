import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle, StopCircle, Users, ArrowLeft, Download,
  Wifi, Clock, CheckCircle2, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Session History Table — Glassmorphic card with proper padding
// ─────────────────────────────────────────────────────────────────────────────
function SessionHistoryPanel({ sessions, loading, onStart, onExport, courseId }) {
  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Session History</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} held this semester
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onExport}
            className="btn-ghost text-sm gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={onStart}
            className="btn-gold gap-2"
          >
            <PlayCircle size={18} /> Start Session
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-12 rounded-xl" />
          ))}
        </div>
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Date &amp; Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Professor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sessions.map((s, idx) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-white/3 transition-colors"
                >
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{idx + 1}</td>
                  <td className="px-6 py-4 text-slate-200 font-medium">
                    {new Date(s.date_time).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-300">{s.professor_name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 size={11} /> Completed
                    </span>
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

// ─────────────────────────────────────────────────────────────────────────────
// Animated Counter — never decreases
// ─────────────────────────────────────────────────────────────────────────────
function LiveCounter({ count }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
        Scanned Students
      </p>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={count}
          initial={{ scale: 0.5, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="text-7xl font-extrabold text-gold-gradient tabular-nums"
        >
          {count}
        </motion.div>
      </AnimatePresence>
      <p className="text-xs text-slate-500 mt-2">students present</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Session Panel — premium QR dashboard
// ─────────────────────────────────────────────────────────────────────────────
function ActiveSessionPanel({ qrCode, attendanceCount, attendanceList, onEnd }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* ── Left: QR + Counter ── */}
      <div className="lg:col-span-2 space-y-5">

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-sm font-semibold text-emerald-400">Session Live</span>
          <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
            <Wifi size={12} /> QR refreshes every 30s
          </span>
        </div>

        {/* QR Card */}
        <div className="glass-card-gold p-8 flex flex-col items-center gap-6">
          {/* Counter above QR */}
          <LiveCounter count={attendanceCount} />

          {/* Floating QR */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            {/* Gold glow ring behind QR */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: '0 0 40px 8px rgba(212,175,55,0.35), 0 0 80px 16px rgba(212,175,55,0.15)',
              }}
            />
            {/* White QR container */}
            <div className="bg-white rounded-2xl p-4 shadow-gold-lg relative z-10">
              {qrCode ? (
                <QRCodeSVG
                  value={qrCode}
                  size={224}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <span className="text-slate-400 text-sm">Generating…</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* End Session */}
          <button
            onClick={onEnd}
            className="btn-danger w-full justify-center gap-2 py-3"
          >
            <StopCircle size={18} /> End Session
          </button>
        </div>
      </div>

      {/* ── Right: Live Attendance List ── */}
      <div className="lg:col-span-3 glass-card p-6 min-h-[480px] flex flex-col">
        <div className="flex items-center gap-2 mb-5">
          <Users size={18} className="text-gold-400" />
          <h2 className="text-lg font-bold text-slate-100">Live Attendance</h2>
          <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
            <Zap size={11} className="text-gold-500" /> updates every 5s
          </span>
        </div>

        {attendanceList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
              <Users size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-500 font-medium">Waiting for students to scan…</p>
            <p className="text-xs text-slate-600 mt-1">Students will appear here in real time</p>
          </div>
        ) : (
          <ul className="space-y-2 flex-1 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {attendanceList.map((a, idx) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, x: 24, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                             bg-white/4 border border-white/6 hover:bg-white/7 transition-colors"
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-purple-600
                                  flex items-center justify-center text-white font-bold text-sm">
                    {a.student_name?.[0]?.toUpperCase() || '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 truncate">{a.student_name}</p>
                    <p className="text-xs text-slate-500 font-mono">{a.student_id}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      {new Date(a.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 size={10} /> Present
                    </span>
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

// ─────────────────────────────────────────────────────────────────────────────
// Main CourseDetails page
// ─────────────────────────────────────────────────────────────────────────────
function CourseDetails() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();

  const [sessions,        setSessions]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [activeSession,   setActiveSession]   = useState(null);
  const [qrCode,          setQrCode]          = useState(null);

  // ── Counter NEVER decreases — use max(prev, new) on every poll ──
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendanceList,  setAttendanceList]  = useState([]);
  const peakCount = useRef(0);

  const fetchHistory = () => {
    setLoading(true);
    api.get(`/sessions/course/${id}/`)
      .then(res => setSessions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHistory(); }, [id]);

  // ── Polling while session is live ──
  useEffect(() => {
    if (!activeSession) return;

    // QR auto-refresh every 30 s — refreshes existing token without creating a new Session
    const qrInterval = setInterval(() => {
      api.post(`/sessions/${activeSession.id}/refresh-qr/`)
        .then(res => setQrCode(res.data.qr_token))
        .catch(console.error);
    }, 30_000);

    // Attendance poll every 5 s — count never decreases
    const attendInterval = setInterval(() => {
      api.get(`/attendance/session/${activeSession.id}/`)
        .then(res => {
          const newList  = res.data;
          const newCount = newList.length;
          peakCount.current = Math.max(peakCount.current, newCount);
          setAttendanceCount(peakCount.current);
          setAttendanceList(newList);
        })
        .catch(console.error);
    }, 5_000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(attendInterval);
    };
  }, [activeSession]);

  const startSession = () => {
    api.post('/sessions/create/', {
      professor_id: user.id,
      course_id: id,
    }).then(res => {
      peakCount.current = 0;
      setActiveSession({ ...res.data, course: id });
      setQrCode(res.data.qr_token);
      setAttendanceCount(0);
      setAttendanceList([]);
    }).catch(err =>
      alert('Error starting session: ' + (err.response?.data?.error || err.message))
    );
  };

  const endSession = () => {
    setActiveSession(null);
    setQrCode(null);
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
    } catch {
      alert('Failed to export CSV. Make sure you have attendance data.');
    }
  };

  const courseName = sessions.length > 0 ? sessions[0].course_code : `Course #${id}`;

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 mb-7">
        <button
          onClick={() => navigate('/professor')}
          className="btn-ghost gap-2 py-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">{courseName}</h1>
          <p className="text-sm text-slate-400">
            {activeSession ? 'Active session — QR live' : 'Session History'}
          </p>
        </div>
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {!activeSession ? (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <SessionHistoryPanel
              sessions={sessions}
              loading={loading}
              onStart={startSession}
              onExport={exportCSV}
              courseId={id}
            />
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <ActiveSessionPanel
              qrCode={qrCode}
              attendanceCount={attendanceCount}
              attendanceList={attendanceList}
              onEnd={endSession}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseDetails;
