import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage       from './pages/LoginPage';
import Dashboard       from './pages/Dashboard';
import ProfessorView   from './pages/ProfessorView';
import StudentScan     from './pages/StudentScan';
import AttendanceReport from './pages/AttendanceReport';
import AdminDashboard  from './pages/AdminDashboard';
import AdminReport     from './pages/AdminReport';
import CourseDetails   from './pages/CourseDetails';
import SidebarDrawer   from './components/shared/SidebarDrawer';

// ── Protected Route: redirects to /login if not authenticated ──────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-slate-400">
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// ── Admin Route: redirects non-admins ──────────────────────────────────────
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-slate-400">
      Loading…
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    const home = user.role === 'professor' ? '/professor' : '/student';
    return <Navigate to={home} replace />;
  }
  return children;
}

// ── App shell with sidebar ──────────────────────────────────────────────────
function AppContent() {
  const { user } = useAuth();

  // Anti-Gravity is dark-first; allow toggling back to light
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  // Full-screen login — no sidebar
  const isLoginPage = !user;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-[#0a0a0f] transition-colors duration-300 text-slate-800 dark:text-slate-100">

      {/* Sidebar — only shown when authenticated */}
      {user && (
        <SidebarDrawer theme={theme} toggleTheme={toggleTheme} />
      )}

      {/* Main content area */}
      <main className={`flex-1 min-h-screen overflow-auto ${user ? 'pt-16 md:pt-0' : 'w-full'}`}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {user?.role === 'admin'
                  ? <Navigate to="/admin-dashboard" replace />
                  : <Dashboard />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />
          <Route
            path="/admin-report"
            element={<AdminRoute><AdminReport /></AdminRoute>}
          />
          <Route
            path="/professor"
            element={<ProtectedRoute><ProfessorView /></ProtectedRoute>}
          />
          <Route
            path="/professor/course/:id"
            element={<ProtectedRoute><CourseDetails /></ProtectedRoute>}
          />
          <Route
            path="/student"
            element={<ProtectedRoute><StudentScan /></ProtectedRoute>}
          />
          <Route
            path="/report"
            element={<ProtectedRoute><AttendanceReport /></ProtectedRoute>}
          />

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
