import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, GraduationCap, BookOpen, Lock, User } from 'lucide-react';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userData = await login(username, password);
      if (userData.role === 'professor') {
        navigate('/professor');
      } else if (userData.role === 'student') {
        navigate('/student');
      } else {
        setError('Your account is not linked to a professor or student profile. Please contact the admin.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '20px',
            background: 'var(--accent)',
            marginBottom: '1.25rem',
            boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <GraduationCap size={36} color="#fff" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
            UniAttend
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Sign in to your account
          </p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              background: '#fde8e8',
              color: '#9b1c1c',
              border: '1px solid #f98080',
              fontSize: '0.9rem',
            }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <User size={16} />
                </div>
                <input
                  id="login-username"
                  className="input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <Lock size={16} />
                </div>
                <input
                  id="login-password"
                  className="input"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-success"
              style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem' }}
              disabled={loading}
            >
              <LogIn size={18} />
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo Credentials — clickable to auto-fill */}
        <div style={{ marginTop: '1.5rem' }}>
          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            🧪 Demo accounts — click any card to auto-fill login
          </p>

          {/* Professors row */}
          <div style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <BookOpen size={11} /> Professors — password: Prof@1234
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { label: 'Dr. Ahmed', username: 'prof_ahmed', courses: 'Math, Programming' },
                { label: 'Dr. Sara',  username: 'prof_sara',  courses: 'Physics' },
              ].map(acc => (
                <button
                  key={acc.username}
                  id={`quick-login-${acc.username}`}
                  onClick={() => { setUsername(acc.username); setPassword('Prof@1234'); setError(''); }}
                  className="card"
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: '0.65rem 0.85rem',
                    border: username === acc.username ? '2px solid var(--accent)' : '2px solid var(--border)',
                    background: username === acc.username ? 'rgba(99,102,241,0.07)' : 'var(--card-bg)',
                    transition: 'border-color 0.15s, background 0.15s', borderRadius: '9px',
                  }}
                  onMouseEnter={e => { if (username !== acc.username) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={e => { if (username !== acc.username) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{acc.label}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--accent)', marginTop: '0.1rem' }}>{acc.username}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>📚 {acc.courses}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Students row */}
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <GraduationCap size={11} /> Students — password: Student@1234
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
              {[
                { label: 'Ali',   username: 'student_ali',   courses: 'Math, Physics' },
                { label: 'Noor',  username: 'student_nour',  courses: 'Math, Programming' },
                { label: 'Omar',  username: 'student_omar',  courses: 'Physics, Programming' },
              ].map(acc => (
                <button
                  key={acc.username}
                  id={`quick-login-${acc.username}`}
                  onClick={() => { setUsername(acc.username); setPassword('Student@1234'); setError(''); }}
                  className="card"
                  style={{
                    textAlign: 'left', cursor: 'pointer', padding: '0.6rem 0.75rem',
                    border: username === acc.username ? '2px solid var(--success)' : '2px solid var(--border)',
                    background: username === acc.username ? 'rgba(16,185,129,0.07)' : 'var(--card-bg)',
                    transition: 'border-color 0.15s, background 0.15s', borderRadius: '9px',
                  }}
                  onMouseEnter={e => { if (username !== acc.username) e.currentTarget.style.borderColor = 'var(--success)'; }}
                  onMouseLeave={e => { if (username !== acc.username) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>{acc.label}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--success)', marginTop: '0.1rem' }}>{acc.username}</div>
                  <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{acc.courses}</div>
                </button>
              ))}
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>
            Admin panel: <code>admin</code> / <code>Admin@1234</code> at <code>/admin/</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
