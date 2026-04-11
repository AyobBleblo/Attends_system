import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Loader2, RefreshCw, KeyRound, X,
  CheckCircle, XCircle,
} from 'lucide-react';
import EnrolledCourseCard from '../components/student/EnrolledCourseCard';
import QrScannerModal   from '../components/common/QrScannerModal';
import SkeletonCard      from '../components/common/SkeletonCard';

// ── Full-screen scan result overlay (success / fail) ──────────────────────────
const ScanResult = ({ result, onClose }) => {
  if (!result) return null;
  const ok = result.type === 'success';
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 animate-scale-in text-center px-8">
        {ok ? (
          <CheckCircle size={80} className="text-emerald-400" />
        ) : (
          <XCircle size={80} className="text-red-400 animate-shake" />
        )}
        <p className={`text-2xl font-bold ${ok ? 'text-emerald-300' : 'text-red-300'}`}>
          {ok ? 'Attendance Recorded!' : 'Scan Failed'}
        </p>
        <p className="text-white/70 text-sm max-w-xs">{result.message}</p>
        <button onClick={onClose} className="mt-4 btn-primary bg-white/10 hover:bg-white/20 border border-white/20">
          <X size={16} /> Close
        </button>
      </div>
    </div>
  );
};

// ── Manual token entry modal (fallback when camera is unavailable) ─────────────
const ManualModal = ({ course, studentId, onClose, onResult }) => {
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/attendance/scan/', {
        student_id: studentId,
        qr_token: token.trim(),
      });
      onResult({ type: 'success', message: res.data.message || 'Attendance recorded!' });
    } catch (err) {
      onResult({ type: 'error', message: err.response?.data?.error || 'Failed to record attendance.' });
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-md p-6 animate-slide-down dark:bg-slate-900">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Enter QR Token</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {course?.code} — {course?.name}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="form-label">QR Token Code</label>
            <input
              className="input font-mono"
              placeholder="Paste or type the token…"
              value={token}
              onChange={e => setToken(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {loading ? 'Submitting…' : 'Submit Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
function StudentScan() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [courses,      setCourses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [semesterName, setSemesterName] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showScanner,    setShowScanner]    = useState(false);  // ← QrScannerModal
  const [showManual,     setShowManual]     = useState(false);  // ← manual fallback
  const [scanResult,     setScanResult]     = useState(null);   // { type, message }
  const [submitting,     setSubmitting]     = useState(false);

  // ── Guard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user)                    { navigate('/login');     return; }
    if (user.role !== 'student')  { navigate('/professor'); return; }
    fetchCourses();
  }, [user]);

  // ── Fetch enrolled courses ─────────────────────────────────────────────────
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/student/${user.student_id}/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCourses(data.courses || []);
      setSemesterName(data.semester || '');
    } catch {
      setCourses(user.courses || []);
    } finally {
      setLoading(false);
    }
  };

  // ── Called by QrScannerModal the instant a QR code is decoded ─────────────
  //    No submit button, no manual input — 100% automatic.
  const handleScanned = useCallback(async (decodedToken) => {
    setShowScanner(false);
    setSubmitting(true);
    setScanResult(null);
    try {
      const res = await api.post('/attendance/scan/', {
        student_id: user.student_id,
        qr_token:  decodedToken,
      });
      setScanResult({ type: 'success', message: res.data.message || 'Attendance recorded!' });
      fetchCourses();   // refresh attendance % on the cards
    } catch (err) {
      setScanResult({
        type:    'error',
        message: err.response?.data?.error || 'Failed to record attendance.',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  // ── Decide whether to open scanner or manual entry ─────────────────────────
  const handleScanCard = (course) => {
    setSelectedCourse(course);
    // html5-qrcode works on all modern browsers, so try scanner first.
    // If the camera is truly unavailable, QrScannerModal shows an error
    // and user can close it then tap the "manual" path.
    setShowScanner(true);
  };

  // ── Scanner: plain cancel (user pressed Cancel) ────────────────────────────
  const handleScannerClose = () => setShowScanner(false);

  // ── Scanner: user chose "Enter token manually" ────────────────────────────
  const handleManualFallback = () => {
    setShowScanner(false);
    setShowManual(true);
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Scan result overlay ───────────────────────────────────────────── */}
      {scanResult && (
        <ScanResult
          result={scanResult}
          onClose={() => { setScanResult(null); setSelectedCourse(null); }}
        />
      )}

      {/* ── Native QR scanner (html5-qrcode) ─────────────────────────────── */}
      {showScanner && selectedCourse && (
        <QrScannerModal
          course={selectedCourse}
          onScanned={handleScanned}
          onClose={handleScannerClose}
          onManualFallback={handleManualFallback}
        />
      )}

      {/* ── Manual token entry (fallback / accessibility) ─────────────────── */}
      {showManual && selectedCourse && (
        <ManualModal
          course={selectedCourse}
          studentId={user.student_id}
          onClose={() => { setShowManual(false); setSelectedCourse(null); }}
          onResult={(r) => { setScanResult(r); fetchCourses(); }}
        />
      )}

      {/* ── Student hero header ───────────────────────────────────────────── */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-7 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          <p className="text-white/70 text-sm uppercase tracking-wide font-medium mb-1">Student Portal</p>
          <h1 className="text-3xl font-extrabold tracking-tight">أهلاً، {user.name}</h1>
          <p className="text-white/80 text-sm mt-1">Hello, {user.name}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="badge bg-white/20 text-white border border-white/30 text-sm px-3 py-1">
              ID: {user.student_id}
            </span>
            <span className="badge bg-white/20 text-white border border-white/30 text-sm px-3 py-1">
              {user.department}
            </span>
            {semesterName && (
              <span className="text-white/60 text-xs flex items-center gap-1">
                📅 {semesterName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Section title ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">My Enrolled Courses</h2>
        </div>
        <button onClick={fetchCourses} className="btn-ghost text-xs">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Course grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={5} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            You are not enrolled in any courses this semester.
          </p>
          <p className="text-xs text-slate-400 mt-1">Contact the admin to enroll you.</p>
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{courses.length}</span> courses enrolled.
            Tap <span className="font-semibold text-brand-500">Scan Attendance</span> on any card when your professor opens a session.
          </div>


          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <EnrolledCourseCard
                key={course.id}
                course={course}
                onScan={() => handleScanCard(course)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Submitting overlay ────────────────────────────────────────────── */}
      {submitting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card p-6 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-brand-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Recording attendance…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentScan;
