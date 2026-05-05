import React, { useState, useEffect, useCallback, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { Download, BookOpen, ClipboardList, ChevronDown, ChevronUp, Search, RefreshCw, Smartphone } from 'lucide-react';

// ─── Theme context (consumed from App-level provider) ─────────────────────────
// SidebarDrawer receives `theme` as a prop from App.jsx — we replicate
// that here by reading it from a simple window attribute set by the toggle.
// If your project exposes a ThemeContext, swap this for useContext(ThemeContext).
const useTheme = () => {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

// ─── Theme-aware design tokens ───────────────────────────────────────────────
const makeTokens = (isDark) => ({
  gold:       '#D4AF37',
  goldDim:    'rgba(212,175,55,0.18)',
  goldBorder: 'rgba(212,175,55,0.30)',
  bg:         isDark ? '#0a0a0f'                    : '#f8fafc',
  surface:    isDark ? 'rgba(255,255,255,0.04)'     : 'rgba(255,255,255,0.85)',
  surfaceHov: isDark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.03)',
  border:     isDark ? 'rgba(255,255,255,0.08)'     : 'rgba(0,0,0,0.08)',
  text:       isDark ? '#f0f0f0'                    : '#1e293b',
  textMuted:  isDark ? '#9ca3af'                    : '#64748b',
  present:    '#22c55e',
  absent:     '#ef4444',
  presentBg:  'rgba(34,197,94,0.15)',
  absentBg:   'rgba(239,68,68,0.15)',
});

const makeGlass = (T) => ({
  background:           T.surface,
  backdropFilter:       'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border:               `1px solid ${T.border}`,
  borderRadius:         '16px',
});

const makeGoldGlass = (T, glass) => ({
  ...glass,
  border:     `1px solid ${T.goldBorder}`,
  background: T.goldDim,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pctColor = (pct, T) => {
  if (pct >= 75) return T.present;
  if (pct >= 50) return T.gold;
  return T.absent;
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon, T, glass }) {
  return (
    <div style={{
      ...glass,
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      transition: 'background 0.2s',
    }}>
      {Icon && (
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: T.goldDim,
          border: `1px solid ${T.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} color={T.gold} />
        </div>
      )}
      <div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: color || T.text, lineHeight: 1.2 }}>{value}</p>
      </div>
    </div>
  );
}

function PctRing({ pct, T }) {
  const color = pctColor(pct, T);
  const r = 20, sw = 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      <svg width={52} height={52} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle cx={26} cy={26} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 700, color,
      }}>{pct}%</span>
    </div>
  );
}

function LectureGrid({ lectures, totalQuota, T }) {
  // Render up to `totalQuota` cells; extra cells beyond held sessions = not yet scheduled
  const cells = Array.from({ length: totalQuota }, (_, i) => lectures[i] || null);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.75rem' }}>
      {cells.map((lec, i) => {
        if (!lec) {
          return (
            <div key={i} title={`Lecture ${i + 1} — Not yet held`} style={{
              width: 38, height: 38, borderRadius: 8,
              border: '1px dashed rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', fontWeight: 600,
            }}>
              {i + 1}
            </div>
          );
        }
        const present = lec.status === 'Present';
        return (
          <div
            key={i}
            title={`Lecture ${lec.lecture_number} | ${lec.date} ${lec.time} | ${lec.status}`}
            style={{
              width: 38, height: 38, borderRadius: 8,
              background: present ? T.presentBg : T.absentBg,
              border: `1px solid ${present ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'default', position: 'relative',
            }}
          >
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: present ? T.present : T.absent }}>
              {lec.lecture_number}
            </span>
            <span style={{ fontSize: '0.5rem', color: present ? T.present : T.absent, opacity: 0.8 }}>
              {present ? '✓' : '✗'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StudentRow({ student, totalQuota, T, glass, onResetDevice }) {
  const [open, setOpen] = useState(false);
  const pct = student.attendance_pct;
  const pctCol = pctColor(pct, T);

  return (
    <div style={{ ...glass, marginBottom: '0.75rem', overflow: 'hidden' }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
          color: T.text, textAlign: 'left',
        }}
      >
        <PctRing pct={pct} T={T} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {student.student_name}
          </p>
          <p style={{ margin: 0, fontSize: '0.78rem', color: T.textMuted }}>
            {student.student_id}
            {student.student_major ? ` · ${student.student_major}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: T.textMuted, textTransform: 'uppercase' }}>Present</p>
            <p style={{ margin: 0, fontWeight: 700, color: T.present }}>{student.total_present}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: T.textMuted, textTransform: 'uppercase' }}>Absent</p>
            <p style={{ margin: 0, fontWeight: 700, color: T.absent }}>{student.total_absent}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.65rem', color: T.textMuted, textTransform: 'uppercase' }}>Rate</p>
            <p style={{ margin: 0, fontWeight: 700, color: pctCol }}>{pct}%</p>
          </div>
          <div style={{ color: T.textMuted }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {onResetDevice && (
            <button
              onClick={(e) => { e.stopPropagation(); onResetDevice(student); }}
              title="Reset device fingerprint for this student"
              style={{
                padding: '0.3rem 0.6rem', borderRadius: 8, fontSize: '0.7rem',
                background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
                color: '#D4AF37', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <Smartphone size={12} /> Reset Device
            </button>
          )}
        </div>
      </button>

      {/* Expanded lecture grid */}
      {open && (
        <div style={{
          padding: '0 1.25rem 1.25rem',
          borderTop: `1px solid ${T.border}`,
          animationName: 'fadeSlide', animationDuration: '0.2s', animationFillMode: 'both',
        }}>
          <p style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.75rem', color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Lecture attendance grid ({student.lectures_held} held / {totalQuota} total quota)
          </p>
          <LectureGrid lectures={student.lectures} totalQuota={totalQuota} T={T} />

          {/* Detailed table */}
          <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {['#', 'Date', 'Time', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '0.5rem 0.75rem', textAlign: 'left',
                      color: T.gold, fontWeight: 600, fontSize: '0.7rem',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      borderBottom: `1px solid ${T.goldBorder}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {student.lectures.map(lec => (
                  <tr key={lec.lecture_number} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.textMuted, fontWeight: 600 }}>{lec.lecture_number}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.text }}>{lec.date}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: T.text }}>{lec.time}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                        background: lec.status === 'Present' ? T.presentBg : T.absentBg,
                        color: lec.status === 'Present' ? T.present : T.absent,
                        border: `1px solid ${lec.status === 'Present' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {lec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1: Comprehensive Course Report
// ─────────────────────────────────────────────────────────────────────────────
function CourseReport({ T, glass, goldGlass }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleResetDevice = async (student) => {
    if (!window.confirm(`Reset device fingerprint for ${student.student_name}?\nThey will be able to scan from a new device.`)) return;
    try {
      const res = await api.post(`/reset-fingerprint/${student.student_id}/`);
      setResetMsg(res.data.message || 'Device reset successfully.');
    } catch (e) {
      setResetMsg(e.response?.data?.error || 'Failed to reset device.');
    }
    setTimeout(() => setResetMsg(''), 4000);
  };

  useEffect(() => {
    api.get('/courses/').then(r => setCourses(r.data)).catch(console.error);
  }, []);

  const fetchReport = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    setError('');
    setReport(null);
    api.get(`/attendance/course-report/${courseId}/`)
      .then(r => setReport(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const filtered = report?.students?.filter(s =>
    !search ||
    s?.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s?.student_id?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const exportCSV = () => {
    if (!report || !filtered.length) return;
    const quota = report.total_lectures;
    const header = ['Student ID', 'Student Name', 'Major',
      ...Array.from({ length: quota }, (_, i) => `L${i + 1}`),
      'Present', 'Absent', 'Pct%'];
    const rows = filtered.map(s => [
      s.student_id, s.student_name, s.student_major,
      ...Array.from({ length: quota }, (_, i) => s.lectures[i]?.status || '—'),
      s.total_present, s.total_absent, `${s.attendance_pct}%`,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `course_${report.course_code}_report.csv`;
    a.click();
  };

  return (
    <div>
      {/* Reset Device toast */}
      {resetMsg && (
        <div style={{
          marginBottom: '1rem', padding: '0.75rem 1.25rem', borderRadius: 10,
          background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)',
          color: '#D4AF37', fontSize: '0.85rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Smartphone size={14} /> {resetMsg}
        </div>
      )}
      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 220px', minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontWeight: 600 }}>
            Select Course
          </label>
          <select
            value={courseId}
            onChange={e => setCourseId(e.target.value)}
            style={{
              width: '100%', padding: '0.65rem 1rem', borderRadius: 10, fontSize: '0.875rem',
              background: 'rgba(255,255,255,0.06)', color: T.text,
              border: `1px solid ${T.goldBorder}`, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">— Choose a course —</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
            ))}
          </select>
        </div>

        {report && (
          <div style={{ flex: '1 1 200px', minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', fontWeight: 600 }}>
              Search Students
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Name or ID…"
                style={{
                  width: '100%', padding: '0.65rem 1rem 0.65rem 2.2rem', borderRadius: 10, fontSize: '0.875rem',
                  background: 'rgba(255,255,255,0.06)', color: T.text,
                  border: `1px solid ${T.border}`, outline: 'none',
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
          <button onClick={fetchReport} disabled={!courseId || loading}
            style={{
              padding: '0.65rem 1rem', borderRadius: 10, border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.06)', color: T.textMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem',
            }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCSV} disabled={!report || !filtered.length}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: 10, fontWeight: 600, fontSize: '0.8rem',
              background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Status */}
      {!courseId && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: T.textMuted }}>
          <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>Select a course to generate the attendance report.</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: T.textMuted }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
          <p>Loading report…</p>
        </div>
      )}

      {error && (
        <div style={{ ...glass, padding: '1rem 1.5rem', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {report && !loading && (
        <>
          {/* Course meta banner */}
          <div style={{ ...goldGlass, padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Course</p>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: T.text }}>
                {report.course_code} · {report.course_name}
              </p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: T.textMuted, marginTop: 2 }}>
                Prof. {report.professor_name} &nbsp;·&nbsp; {report.department_name} &nbsp;·&nbsp; {report.semester_name}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '0.3rem 0.8rem', borderRadius: 999, background: T.goldDim, color: T.gold, fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${T.goldBorder}` }}>
                {report.lectures_held} sessions held
              </span>
              <span style={{ padding: '0.3rem 0.8rem', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: T.textMuted, fontSize: '0.75rem', fontWeight: 600, border: `1px solid ${T.border}` }}>
                {report.total_lectures} lecture quota
              </span>
            </div>
          </div>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <StatCard label="Students" value={report?.students?.length || 0} icon={BookOpen} T={T} glass={glass} />
            <StatCard label="Sessions Held" value={report.lectures_held} color={T.gold} T={T} glass={glass} />
            <StatCard label="Lecture Quota" value={report.total_lectures} color={T.textMuted} T={T} glass={glass} />
          </div>

          {/* Student rows */}
          {filtered.length === 0 ? (
            <div style={{ ...glass, padding: '2.5rem', textAlign: 'center', color: T.textMuted }}>
              No students match your search.
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.75rem', color: T.textMuted, marginBottom: '0.75rem' }}>
                Showing {filtered.length} of {report?.students?.length || 0} students — click a row to expand lecture details ↓
              </p>
              {filtered.map(s => (
                <StudentRow
                  key={s.student_id} student={s} totalQuota={report.total_lectures}
                  T={T} glass={glass}
                  onResetDevice={handleResetDevice}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2: Session Report (fine-grained filter)
// ─────────────────────────────────────────────────────────────────────────────
function SessionReport({ T, glass }) {
  const [courses, setCourses]   = useState([]);
  const [filters, setFilters]   = useState({ course_id: '', teacher_id: '', student_id: '', session_id: '' });
  const [results, setResults]   = useState([]);
  const [count, setCount]       = useState(0);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    api.get('/courses/').then(r => setCourses(r.data)).catch(console.error);
  }, []);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    api.get(`/attendance/session-report/?${params}`)
      .then(r => { setResults(r.data.results); setCount(r.data.count); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []); // load all on mount

  const setF = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.9rem', borderRadius: 10, fontSize: '0.85rem',
    background: 'rgba(255,255,255,0.06)', color: T.text,
    border: `1px solid ${T.border}`, outline: 'none',
  };
  const labelStyle = { display: 'block', fontSize: '0.7rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem', fontWeight: 600 };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ ...glass, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Course</label>
            <select value={filters.course_id} onChange={e => setF('course_id', e.target.value)} style={inputStyle}>
              <option value="">All courses</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Session ID</label>
            <input value={filters.session_id} onChange={e => setF('session_id', e.target.value)} placeholder="e.g. 42" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Teacher ID</label>
            <input value={filters.teacher_id} onChange={e => setF('teacher_id', e.target.value)} placeholder="Professor PK" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Student ID</label>
            <input value={filters.student_id} onChange={e => setF('student_id', e.target.value)} placeholder="e.g. STU-001" style={inputStyle} />
          </div>
        </div>
        <button onClick={fetchReport}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
            background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Search size={14} /> Search Records
        </button>
      </div>

      {/* Results */}
      <div style={{ ...glass, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: T.textMuted }}>
            {loading ? 'Loading…' : `${count} record${count !== 1 ? 's' : ''} found`}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                {['Student ID', 'Student Name', 'Course', 'Professor', 'Semester', 'Scanned At', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    color: T.gold, fontWeight: 600, fontSize: '0.7rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    borderBottom: `1px solid ${T.goldBorder}`,
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: T.textMuted }}>
                    {loading ? 'Loading…' : 'No records found. Try adjusting filters.'}
                  </td>
                </tr>
              ) : (
                results.map(row => (
                  <tr key={row.attendance_id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.surfaceHov}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.7rem 1rem', color: T.textMuted, fontFamily: 'monospace' }}>{row.student_id}</td>
                    <td style={{ padding: '0.7rem 1rem', color: T.text, fontWeight: 600 }}>{row.student_name}</td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem', borderRadius: 6, fontSize: '0.72rem',
                        background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`, fontWeight: 600,
                      }}>{row.course_code}</span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', color: T.text }}>{row.professor_name}</td>
                    <td style={{ padding: '0.7rem 1rem', color: T.textMuted, fontSize: '0.78rem' }}>{row.semester_name}</td>
                    <td style={{ padding: '0.7rem 1rem', color: T.textMuted, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(row.scanned_at)} {fmtTime(row.scanned_at)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700,
                        background: row.status === 'present' ? T.presentBg : T.absentBg,
                        color: row.status === 'present' ? T.present : T.absent,
                        border: `1px solid ${row.status === 'present' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {row.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'course',   label: 'Course Report',   icon: BookOpen },
  { id: 'session',  label: 'Session Report',  icon: ClipboardList },
];

export default function AttendanceReport() {
  const [tab, setTab] = useState('course');
  const isDark = useTheme();
  const T       = makeTokens(isDark);
  const glass     = makeGlass(T);
  const goldGlass = makeGoldGlass(T, glass);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '1.5rem', fontFamily: 'Inter, sans-serif', color: T.text, transition: 'background 0.3s, color 0.3s' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        select option { background: ${isDark ? '#1a1a2e' : '#ffffff'}; color: ${isDark ? '#f0f0f0' : '#1e293b'}; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 99px; }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800,
          background: `linear-gradient(135deg, ${T.gold} 0%, #f5e06e 50%, ${T.gold} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Attendance Reports
        </h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: T.textMuted }}>
          Comprehensive academic attendance analytics
        </p>
      </div>

      {/* ── Tab bar — gold accent on deep-black active state ── */}
      <div style={{
        display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        background: 'rgba(255,255,255,0.04)', padding: '0.3rem', borderRadius: 12,
        border: `1px solid ${T.border}`, width: 'fit-content', position: 'relative',
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = tab === id;
          return (
            <motion.button
              key={id}
              onClick={() => setTab(id)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                position: 'relative',
                padding: '0.55rem 1.25rem',
                borderRadius: 9,
                fontSize: '0.85rem',
                fontWeight: 700,
                // Using inline style ensures the active colour is set by React
                // state — it will NEVER revert on click/blur like a CSS rule would.
                background: isActive ? T.bg : 'transparent',
                color:      isActive ? T.gold : T.textMuted,
                border:     isActive ? `1px solid ${T.goldBorder}` : '1px solid transparent',
                boxShadow:  isActive
                  ? `0 0 12px 2px rgba(212,175,55,0.18), inset 0 0 0 1px ${T.goldBorder}`
                  : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                outline: 'none',
                // Smooth colour cross-fade for inactive→active
                transition: 'color 0.2s, background 0.2s, box-shadow 0.25s, border-color 0.2s',
              }}
            >
              <Icon size={15} />
              {label}
              {/* Animated gold underline indicator */}
              {isActive && (
                <motion.span
                  layoutId="reportTabUnderline"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: '20%',
                    right: '20%',
                    height: 2,
                    borderRadius: 99,
                    background: T.gold,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'course'  && <CourseReport  T={T} glass={glass} goldGlass={goldGlass} />}
        {tab === 'session' && <SessionReport T={T} glass={glass} />}
      </div>
    </div>
  );
}
