import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, GraduationCap, KeyRound } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfessorView from './pages/ProfessorView';
import StudentScan from './pages/StudentScan';
import AttendanceReport from './pages/AttendanceReport';
import AdminDashboard from './pages/AdminDashboard';
import CourseDetails from './pages/CourseDetails';
import ChangePasswordModal from './components/shared/ChangePasswordModal';

// ── Protected Route: redirects to /login if not authenticated ──
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Admin Route: redirects non-admins ──
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    // Redirect to their respective dashboard
    const home = user.role === 'professor' ? '/professor' : '/student';
    return <Navigate to={home} replace />;
  }
  return children;
}

// ── Navbar component ──────────────────────────────────────────────────────────
function Navbar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };

  const links = user?.role === 'admin'    ? [{ to: '/admin-dashboard', label: 'Dashboard' }]
              : user?.role === 'professor' ? [{ to: '/professor', label: 'My Courses' }, { to: '/report', label: 'Reports' }]
              : user?.role === 'student'   ? [{ to: '/student', label: 'My Attendance' }]
              : [];

  return (
    <nav className="sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          to={user ? (user.role === 'admin' ? '/admin-dashboard' : user.role === 'professor' ? '/professor' : '/student') : '/login'}
          className="flex items-center gap-2 font-extrabold text-xl text-brand-600 dark:text-brand-400 no-underline"
        >
          <GraduationCap size={24} />
          <span>UniAttend</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="nav-link px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {l.label}
            </Link>
          ))}
          {user && (
            <span className="text-sm text-slate-400 mx-2">👋 {user.name}</span>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn-ghost p-2"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Logout & Password (desktop) */}
          {user && (
            <div className="hidden md:flex items-center">
              <button onClick={() => setPasswordModalOpen(true)} className="btn-ghost gap-2 text-sm mr-1">
                <KeyRound size={16} /> Password
              </button>
              <button onClick={handleLogout} className="btn-ghost gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden btn-ghost p-2"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 space-y-1 animate-slide-down">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className="block py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <p className="text-xs text-slate-400 px-3 py-1">Signed in as {user.name}</p>
              <button onClick={() => { setPasswordModalOpen(true); setMenuOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2">
                <KeyRound size={15} /> Change Password
              </button>
              <button onClick={handleLogout}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                <LogOut size={15} /> Logout
              </button>
            </>
          )}
        </div>
      )}

      {/* Password Modal */}
      <ChangePasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
    </nav>
  );
}


function AppContent() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    // Apply dark class for Tailwind dark mode
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Navbar theme={theme} toggleTheme={toggleTheme} />

      <main>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute>{user?.role === 'admin' ? <Navigate to="/admin-dashboard" replace /> : <Dashboard />}</ProtectedRoute>} />
          <Route path="/admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/professor" element={<ProtectedRoute><ProfessorView /></ProtectedRoute>} />
          <Route path="/professor/course/:id" element={<ProtectedRoute><CourseDetails /></ProtectedRoute>} />
          <Route path="/student" element={<ProtectedRoute><StudentScan /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><AttendanceReport /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
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
