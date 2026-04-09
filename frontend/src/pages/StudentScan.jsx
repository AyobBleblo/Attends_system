import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { BookOpen, QrCode, CheckCircle, XCircle, Camera, CameraOff, KeyRound } from 'lucide-react';

function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [qrToken, setQrToken] = useState('');
  const [scanStatus, setScanStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraMode, setCameraMode] = useState(false); // false = manual, true = camera
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'student') { navigate('/professor'); return; }
  }, [user, navigate]);

  // Cleanup camera on unmount or when leaving camera mode
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraMode(true);
      startScanLoop();
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera permission or use manual input.');
      setCameraMode(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraMode(false);
  };

  // Use BarcodeDetector API (Chrome/Edge) or fallback to ZXing-style canvas scanning
  const startScanLoop = () => {
    if (!('BarcodeDetector' in window)) {
      setCameraError('Your browser does not support automatic QR scanning. Please enter the code manually.');
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0) {
          const value = codes[0].rawValue;
          stopCamera();
          setQrToken(value);
          submitAttendance(value);
        }
      } catch (e) { /* keep scanning */ }
    }, 500);
  };

  const submitAttendance = async (token) => {
    if (!selectedCourse || !token) return;
    setScanStatus(null);
    setLoading(true);
    try {
      const res = await api.post('/attendance/scan/', {
        student_id: user.student_id,
        qr_token: token,
      });
      setScanStatus({ type: 'success', text: res.data.message || 'Attendance recorded successfully!' });
      setQrToken('');
    } catch (err) {
      setScanStatus({ type: 'error', text: err.response?.data?.error || 'Failed to record attendance.' });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    submitAttendance(qrToken);
  };

  if (!user) return null;
  const courses = user.courses || [];

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <p className="text-muted">
          {user.department} · Student ID: <strong>{user.student_id}</strong>
        </p>
      </header>

      {!selectedCourse ? (
        /* ── Step 1: Pick a course ── */
        <div>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} /> My Enrolled Courses
          </h3>

          {courses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
              You are not enrolled in any courses this semester. Contact admin.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {courses.map(c => (
                <button
                  key={c.id}
                  className="card"
                  style={{
                    textAlign: 'left', cursor: 'pointer',
                    border: '2px solid var(--border)',
                    background: 'var(--card-bg)',
                    transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                    padding: '1.25rem', borderRadius: '12px', width: '100%',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--success)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
                  onClick={() => { setSelectedCourse(c); setScanStatus(null); setQrToken(''); }}
                >
                  <span style={{
                    display: 'inline-block', background: 'var(--success)',
                    color: '#fff', borderRadius: '6px', padding: '2px 10px',
                    fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem',
                  }}>
                    {c.code}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{c.name}</h3>
                  <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{c.department_name}</p>
                  <div style={{ marginTop: '0.75rem', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <QrCode size={14} /> Tap to record attendance
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Step 2: Scan or enter QR ── */
        <div style={{ maxWidth: '540px' }}>
          <button
            className="btn"
            style={{ marginBottom: '1.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => { setSelectedCourse(null); setScanStatus(null); stopCamera(); }}
          >
            ← Back to Courses
          </button>

          <div className="card" style={{ padding: '2rem' }}>
            {/* Course Header */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{
                display: 'inline-block', background: 'var(--success)', color: '#fff',
                borderRadius: '6px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem',
              }}>
                {selectedCourse.code}
              </span>
              <h2 style={{ margin: 0 }}>{selectedCourse.name}</h2>
              <p className="text-muted" style={{ marginTop: '0.25rem' }}>
                Student: <strong>{user.name}</strong> · ID: <strong>{user.student_id}</strong>
              </p>
            </div>

            {/* Status Banner */}
            {scanStatus && (
              <div style={{
                padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem',
                background: scanStatus.type === 'success' ? '#def7ec' : '#fde8e8',
                color: scanStatus.type === 'success' ? '#03543f' : '#9b1c1c',
                border: `1px solid ${scanStatus.type === 'success' ? '#31c48d' : '#f98080'}`,
                display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                {scanStatus.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                {scanStatus.text}
              </div>
            )}

            {cameraError && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.9rem' }}>
                ⚠️ {cameraError}
              </div>
            )}

            {/* Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                className="btn"
                onClick={() => { setCameraMode(false); stopCamera(); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: !cameraMode ? 'var(--accent)' : 'transparent',
                  color: !cameraMode ? '#fff' : 'var(--text-main)',
                  border: `1px solid ${!cameraMode ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                <KeyRound size={16} /> Manual Code
              </button>
              <button
                className="btn"
                onClick={startCamera}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: cameraMode ? 'var(--success)' : 'transparent',
                  color: cameraMode ? '#fff' : 'var(--text-main)',
                  border: `1px solid ${cameraMode ? 'var(--success)' : 'var(--border)'}`,
                }}
              >
                <Camera size={16} /> Scan Camera
              </button>
            </div>

            {/* Camera View */}
            {cameraMode && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                  <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                  {/* Scanner overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      width: 180, height: 180, border: '3px solid #10b981',
                      borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    }}/>
                  </div>
                </div>
                <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  Point your camera at the professor's QR code
                </p>
                <button
                  className="btn"
                  onClick={stopCamera}
                  style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)' }}
                >
                  <CameraOff size={16} /> Stop Camera
                </button>
              </div>
            )}

            {/* Manual Input */}
            {!cameraMode && (
              <form onSubmit={handleManualSubmit}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                    QR Token Code
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Paste or type the QR token from your professor..."
                    value={qrToken}
                    onChange={e => setQrToken(e.target.value)}
                    required
                    style={{ marginBottom: 0 }}
                  />
                  <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    Ask your professor for the QR code token shown on-screen.
                  </p>
                </div>
                <button
                  type="submit"
                  className="btn btn-success"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  disabled={loading}
                >
                  {loading ? 'Recording...' : <><CheckCircle size={18} /> Submit Attendance</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
