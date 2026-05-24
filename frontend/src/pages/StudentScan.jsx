import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen, Loader2, RefreshCw, KeyRound, X,
  CheckCircle, XCircle, ShieldAlert, Smartphone,
} from 'lucide-react';
import EnrolledCourseCard from '../components/student/EnrolledCourseCard';
import QrScannerModal   from '../components/common/QrScannerModal';
import SkeletonCard      from '../components/common/SkeletonCard';

// ── Gold design tokens ────────────────────────────────────────────────────────
const G = {
  gold:       '#D4AF37',
  goldDim:    'rgba(212,175,55,0.15)',
  goldBorder: 'rgba(212,175,55,0.35)',
  bg:         '#0a0a0f',
  surface:    'rgba(255,255,255,0.04)',
  border:     'rgba(255,255,255,0.09)',
  text:       '#f0f0f0',
  muted:      '#9ca3af',
};

// ── Anti-Gravity Device-Mismatch Modal ────────────────────────────────────────
const DeviceMismatchModal = ({ onClose, t }) => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 24 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      style={{
        background: 'rgba(10,10,15,0.92)',
        border: `1px solid ${G.goldBorder}`,
        borderRadius: 20,
        boxShadow: `0 0 60px rgba(212,175,55,0.18), 0 0 0 1px ${G.goldBorder}`,
        backdropFilter: 'blur(24px)',
        padding: '2.5rem 2rem',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${G.border}`,
          borderRadius: 8, padding: '0.25rem 0.4rem', cursor: 'pointer', color: G.muted,
        }}
        aria-label="Close"
      >
        <X size={16} />
      </button>

      {/* Icon */}
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: G.goldDim, border: `1px solid ${G.goldBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 1.25rem',
      }}>
        <ShieldAlert size={34} color={G.gold} />
      </div>

      <h2 style={{
        margin: '0 0 0.5rem',
        fontSize: '1.35rem', fontWeight: 800,
        color: G.gold,
      }}>
        {t('deviceNotRecognised')}
      </h2>

      <p style={{
        margin: '1rem 0 1.5rem',
        fontSize: '0.9rem', lineHeight: 1.65,
        color: G.text,
      }}>
        {t('deviceBody')}
      </p>

      {/* Instructions box */}
      <div style={{
        background: G.goldDim, border: `1px solid ${G.goldBorder}`,
        borderRadius: 12, padding: '1rem 1.2rem',
        textAlign: 'start', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
          <Smartphone size={16} color={G.gold} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.82rem', color: G.text, lineHeight: 1.55 }}>
            <strong style={{ color: G.gold }}>{t('whatToDo')}</strong>{' '}
            {t('deviceInstructions')}
          </p>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          width: '100%', padding: '0.75rem',
          background: G.goldDim, border: `1px solid ${G.goldBorder}`,
          borderRadius: 12, color: G.gold, fontWeight: 700,
          fontSize: '0.9rem', cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = G.goldDim}
      >
        {t('understood')}
      </button>
    </motion.div>
  </div>
);

// ── Full-screen scan result overlay ──────────────────────────────────────────
const ScanResult = ({ result, onClose, t }) => {
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
          {ok ? t('attendanceRecorded') : t('scanFailed')}
        </p>
        <p className="text-white/70 text-sm max-w-xs">{result.message}</p>
        <button onClick={onClose} className="mt-4 btn-primary bg-white/10 hover:bg-white/20 border border-white/20">
          <X size={16} /> {t('close')}
        </button>
      </div>
    </div>
  );
};

// ── Manual token entry modal ──────────────────────────────────────────────────
const ManualModal = ({ course, studentId, deviceId, onClose, onResult, t }) => {
  const [token,   setToken]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      const payload = { student_id: studentId, qr_token: token.trim() };
      if (deviceId) payload.device_id = deviceId;
      const res = await api.post('/attendance/scan/', payload);
      onResult({ type: 'success', message: res.data.message || t('attendanceRecorded') });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.device_mismatch) {
        onResult({ type: 'device_mismatch' });
      } else {
        onResult({ type: 'error', message: err.response?.data?.error || t('scanFailed') });
      }
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
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{t('enterQrToken')}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {course?.code} — {course?.name}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="form-label">{t('qrTokenCode')}</label>
            <input
              className="input font-mono"
              placeholder={t('pasteToken')}
              value={token}
              onChange={e => setToken(e.target.value)}
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            {loading ? t('submitting') : t('submitAtt')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
function StudentScan() {
  const { user }   = useAuth();
  const { t }      = useLanguage();
  const navigate   = useNavigate();

  const [courses,      setCourses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [semesterName, setSemesterName] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showScanner,    setShowScanner]    = useState(false);
  const [showManual,     setShowManual]     = useState(false);
  const [scanResult,     setScanResult]     = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [showMismatch,   setShowMismatch]   = useState(false);

  const deviceIdRef = useRef(null);

  useEffect(() => {
    FingerprintJS.load()
      .then(fp => fp.get())
      .then(result => { deviceIdRef.current = result.visitorId; })
      .catch(err => console.warn('FingerprintJS failed to load:', err));
  }, []);

  useEffect(() => {
    if (!user)                    { navigate('/login');     return; }
    if (user.role !== 'student')  { navigate('/professor'); return; }
    fetchCourses();
  }, [user]);

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

  const handleScanned = useCallback(async (decodedToken) => {
    setShowScanner(false);
    setSubmitting(true);
    setScanResult(null);
    try {
      const payload = { student_id: user.student_id, qr_token: decodedToken };
      if (deviceIdRef.current) payload.device_id = deviceIdRef.current;

      const res = await api.post('/attendance/scan/', payload);
      setScanResult({ type: 'success', message: res.data.message || t('attendanceRecorded') });
      fetchCourses();
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.device_mismatch) {
        setShowMismatch(true);
      } else {
        setScanResult({
          type:    'error',
          message: err.response?.data?.error || t('scanFailed'),
        });
      }
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const handleScanCard = (course) => {
    setSelectedCourse(course);
    setShowScanner(true);
  };

  const handleScannerClose   = () => setShowScanner(false);
  const handleManualFallback = () => { setShowScanner(false); setShowManual(true); };

  const handleManualResult = (r) => {
    if (r.type === 'device_mismatch') {
      setShowMismatch(true);
    } else {
      setScanResult(r);
      fetchCourses();
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">

      {/* Device Mismatch Modal */}
      <AnimatePresence>
        {showMismatch && (
          <DeviceMismatchModal onClose={() => setShowMismatch(false)} t={t} />
        )}
      </AnimatePresence>

      {/* Scan result overlay */}
      {scanResult && (
        <ScanResult
          result={scanResult}
          onClose={() => { setScanResult(null); setSelectedCourse(null); }}
          t={t}
        />
      )}

      {/* QR Scanner */}
      {showScanner && selectedCourse && (
        <QrScannerModal
          course={selectedCourse}
          onScanned={handleScanned}
          onClose={handleScannerClose}
          onManualFallback={handleManualFallback}
        />
      )}

      {/* Manual token entry */}
      {showManual && selectedCourse && (
        <ManualModal
          course={selectedCourse}
          studentId={user.student_id}
          deviceId={deviceIdRef.current}
          onClose={() => { setShowManual(false); setSelectedCourse(null); }}
          onResult={handleManualResult}
          t={t}
        />
      )}

      {/* ── Student hero header ── */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-7 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
        <div className="relative">
          <p className="text-white/70 text-sm uppercase tracking-wide font-medium mb-1">{t('studentPortal')}</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t('welcomeStudent')}، {user.name}</h1>
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

      {/* ── Section title ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('myEnrolledCourses')}</h2>
        </div>
        <button onClick={fetchCourses} className="btn-ghost text-xs">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('refresh')}
        </button>
      </div>

      {/* ── Course grid ── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={5} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {t('notEnrolled')}
          </p>
          <p className="text-xs text-slate-400 mt-1">{t('contactAdminEnroll')}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold">{courses.length}</span>{' '}
            {t('coursesEnrolled', courses.length)}{' '}
            {t('scanInfo')}
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

      {/* Submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="card p-6 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-brand-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('recordingAttendance')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentScan;
