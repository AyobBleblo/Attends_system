import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, GraduationCap } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfessorView from './pages/ProfessorView';
import StudentScan from './pages/StudentScan';
import AttendanceReport from './pages/AttendanceReport';
import AdminDashboard from './pages/AdminDashboard';
import CourseDetails from './pages/CourseDetails';

// ── Protected Route: redirects to /login if not authenticated ──
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Navbar component (needs useAuth inside AuthProvider) ──
function Navbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to={user ? (user.role === 'admin' ? '/admin' : user.role === 'professor' ? '/professor' : '/student') : '/login'} style={{ textDecoration: 'none' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <GraduationCap size={24} /> UniAttend
        </h2>
      </Link>

      <div className="nav-links">
        {user ? (
          <>
            {user.role === 'admin' && (
              <Link to="/admin-dashboard">Admin Dashboard</Link>
            )}
            {user.role === 'professor' && (
              <>
                <Link to="/professor">My Courses</Link>
                <Link to="/report">Reports</Link>
              </>
            )}
            {user.role === 'student' && (
              <Link to="/student">My Attendance</Link>
            )}

            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0 0.5rem' }}>
              👋 {user.name}
            </span>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="btn"
              style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <Link to="/login">Sign In</Link>
        )}

        <button
          onClick={toggleTheme}
          className="btn"
          style={{ marginLeft: '0.5rem', background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </nav>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div className="app-container">
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute>{user?.role === 'admin' ? <Navigate to="/admin-dashboard" replace /> : <Dashboard />}</ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/professor" element={<ProtectedRoute><ProfessorView /></ProtectedRoute>} />
        <Route path="/professor/course/:id" element={<ProtectedRoute><CourseDetails /></ProtectedRoute>} />
        <Route path="/student" element={<ProtectedRoute><StudentScan /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><AttendanceReport /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
