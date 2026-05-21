import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import {
  Download, BookOpen, GraduationCap, ChevronDown, ChevronUp,
  Search, RefreshCw, Smartphone, BarChart2, Users
} from 'lucide-react';

// ─── Theme-aware helpers (mirrors AttendanceReport approach) ──────────────────
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

const makeTokens = (isDark) => ({
  gold:       '#D4AF37',
  goldDim:    'rgba(212,175,55,0.18)',
  goldBorder: 'rgba(212,175,55,0.30)',
  bg:         isDark ? '#0a0a0f'                : '#f8fafc',
  surface:    isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
  surfaceHov: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.03)',
  border:     isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  text:       isDark ? '#f0f0f0'                : '#1e293b',
  textMuted:  isDark ? '#9ca3af'                : '#64748b',
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pctColor = (pct, T) => {
  if (pct >= 75) return T.present;
  if (pct >= 50) return T.gold;
  return T.absent;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon: Icon, T, glass }) {
  return (
    <div style={{
      ...glass,
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
    }}>
      {Icon && (
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: T.goldDim, border: `1px solid ${T.goldBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
          <div key={i} title={`Lecture ${lec.lecture_number} | ${lec.date} ${lec.time} | ${lec.status}`}
            style={{
              width: 38, height: 38, borderRadius: 8,
              background: present ? T.presentBg : T.absentBg,
              border: `1px solid ${present ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: present ? T.present : T.absent }}>{lec.lecture_number}</span>
            <span style={{ fontSize: '0.5rem', color: present ? T.present : T.absent, opacity: 0.8 }}>{present ? '✓' : '✗'}</span>
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
            {student.student_id}{student.student_major ? ` · ${student.student_major}` : ''}
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

// ─── Main AdminReport Component ───────────────────────────────────────────────
export default function AdminReport() {
  const isDark = useTheme();
  const T      = makeTokens(isDark);
  const glass     = makeGlass(T);
  const goldGlass = makeGoldGlass(T, glass);

  // Step 1: select professor
  const [professors, setProfessors]   = useState([]);
  const [professorId, setProfessorId] = useState('');
  const [professorName, setProfessorName] = useState('');

  // Step 2: courses for that professor
  const [courses, setCourses]   = useState([]);
  const [courseId, setCourseId] = useState('');

  // Step 3: report
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Load all professors on mount
  useEffect(() => {
    api.get('admin/professors/').then(r => setProfessors(r.data)).catch(console.error);
  }, []);

  // When professor changes, reset course + report and load that prof's courses
  useEffect(() => {
    setCourseId('');
    setReport(null);
    setError('');
    if (!professorId) { setCourses([]); return; }

    // Use admin courses endpoint filtered by professor_id
    api.get(`admin/courses/?professor_id=${professorId}`)
      .then(r => setCourses(r.data || []))
      .catch(() => {
        // Fallback: load all courses
        api.get('/courses/').then(r => setCourses(r.data || [])).catch(console.error);
      });
  }, [professorId]);

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

  const filtered = report?.students?.filter(s =>
    !search ||
    s?.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    s?.student_id?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  // ── CSV Export — enriched with Prof name + Course if not present ─────────────
  const exportCSV = () => {
    if (!report || !filtered.length) return;
    const quota = report.total_lectures;

    const lectureDateHeaders = Array.from({ length: quota }, (_, i) => {
      const lec = filtered[0]?.lectures?.[i];
      if (lec?.date) return new Date(lec.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `L${i + 1}`;
    });

    // Build header — always include Professor Name and Course Name/Code
    const header = [
      'Professor Name',
      'Course Code',
      'Course Name',
      'Student ID',
      'Student Name',
      'Major',
      ...lectureDateHeaders,
      'Present',
      'Absent',
      'Pct%'
    ];

    const rows = filtered.map(s => [
      report.professor_name || professorName || '—',
      report.course_code    || '—',
      report.course_name    || '—',
      s.student_id,
      s.student_name,
      s.student_major,
      ...Array.from({ length: quota }, (_, i) => s.lectures[i]?.status || '—'),
      s.total_present,
      s.total_absent,
      `${s.attendance_pct}%`,
    ]);

    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `admin_report_${report.professor_name || 'prof'}_${report.course_code || courseId}.csv`;
    a.click();
  };

  // ── Input style helpers ──────────────────────────────────────────────────────
  const selectStyle = {
    width: '100%', padding: '0.7rem 1rem', borderRadius: 10, fontSize: '0.875rem',
    background: 'rgba(255,255,255,0.06)', color: T.text,
    border: `1px solid ${T.goldBorder}`, outline: 'none', cursor: 'pointer',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.7rem', color: T.gold,
    textTransform: 'uppercase', letterSpacing: '0.08em',
    marginBottom: '0.4rem', fontWeight: 600,
  };

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, padding: '1.5rem',
      fontFamily: 'Inter, sans-serif', color: T.text, transition: 'background 0.3s, color 0.3s',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        select option { background: ${isDark ? '#1a1a2e' : '#ffffff'}; color: ${isDark ? '#f0f0f0' : '#1e293b'}; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.25); border-radius: 99px; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: T.goldDim, border: `1px solid ${T.goldBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart2 size={20} color={T.gold} />
          </div>
          <h1 style={{
            margin: 0, fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 800,
            background: `linear-gradient(135deg, ${T.gold} 0%, #f5e06e 50%, ${T.gold} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Admin Attendance Report
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: T.textMuted, paddingLeft: '3.25rem' }}>
          Select a professor and course to view & export the attendance report
        </p>
      </div>

      {/* ── Step 1 + 2: Professor → Course selectors ── */}
      <div style={{ ...glass, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Filter by Professor &amp; Course
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>

          {/* Professor selector */}
          <div>
            <label style={labelStyle}>
              <GraduationCap size={12} style={{ display: 'inline', marginRight: 4 }} />
              1 · Select Professor
            </label>
            <select
              value={professorId}
              onChange={e => {
                const id = e.target.value;
                const found = professors.find(p => String(p.id) === id);
                setProfessorId(id);
                setProfessorName(found?.name || '');
              }}
              style={selectStyle}
            >
              <option value="">— Choose a professor —</option>
              {professors.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Course selector */}
          <div>
            <label style={{ ...labelStyle, opacity: !professorId ? 0.4 : 1 }}>
              <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />
              2 · Select Course
            </label>
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              disabled={!professorId}
              style={{ ...selectStyle, opacity: !professorId ? 0.5 : 1, cursor: !professorId ? 'not-allowed' : 'pointer' }}
            >
              <option value="">— Choose a course —</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code} · {c.name}</option>
              ))}
            </select>
          </div>

          {/* Search students */}
          {report && (
            <div>
              <label style={labelStyle}>
                <Search size={12} style={{ display: 'inline', marginRight: 4 }} />
                Search Students
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or ID…"
                  style={{ ...selectStyle, paddingLeft: '2.2rem' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button onClick={fetchReport} disabled={!courseId || loading}
            style={{
              padding: '0.65rem 1.1rem', borderRadius: 10, border: `1px solid ${T.border}`,
              background: 'rgba(255,255,255,0.06)', color: T.textMuted, cursor: (!courseId || loading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem',
              opacity: (!courseId || loading) ? 0.5 : 1,
            }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Load Report'}
          </button>
          <button onClick={exportCSV} disabled={!report || !filtered.length}
            style={{
              padding: '0.65rem 1.2rem', borderRadius: 10, fontWeight: 600, fontSize: '0.82rem',
              background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}`,
              cursor: (!report || !filtered.length) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: (!report || !filtered.length) ? 0.5 : 1,
            }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Reset Device toast ── */}
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

      {/* ── Empty states ── */}
      {!professorId && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', color: T.textMuted }}>
          <GraduationCap size={52} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>Start by selecting a professor above.</p>
        </div>
      )}

      {professorId && !courseId && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: T.textMuted }}>
          <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: '1rem' }}>
            {courses.length === 0
              ? 'No courses found for this professor in the active semester.'
              : 'Now select a course to generate the attendance report.'}
          </p>
        </div>
      )}

      {error && (
        <div style={{ ...glass, padding: '1rem 1.5rem', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* ── Report content ── */}
      {report && !loading && (
        <>
          {/* Course meta banner */}
          <div style={{ ...goldGlass, padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Report For</p>
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
            <StatCard label="Students"       value={report?.students?.length || 0} icon={Users}    T={T} glass={glass} />
            <StatCard label="Sessions Held"  value={report.lectures_held}           color={T.gold}  T={T} glass={glass} />
            <StatCard label="Lecture Quota"  value={report.total_lectures}          color={T.textMuted} T={T} glass={glass} />
            {report.total_instructor_hours != null && (
              <StatCard
                label="Instructor Hours"
                value={(() => {
                  const h = Math.floor(report.total_instructor_hours);
                  const m = Math.round((report.total_instructor_hours - h) * 60);
                  return h > 0 ? `${h}h ${m}m` : `${m}m`;
                })()}
                color={T.gold} T={T} glass={glass}
              />
            )}
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
