import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  BarChart2,
  User,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LayoutDashboard,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

// ─────────────────────────────────────────────────────────────────────────────
// Nav items per role
// ─────────────────────────────────────────────────────────────────────────────
function getNavItems(role) {
  if (role === 'admin') {
    return [
      { to: '/admin-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin-report',    icon: BarChart2,        label: 'Reports'   },
    ];
  }
  if (role === 'professor') {
    return [
      { to: '/professor',     icon: BookOpen,      label: 'My Courses' },
      { to: '/report',        icon: BarChart2,     label: 'Reports'    },
    ];
  }
  if (role === 'student') {
    return [
      { to: '/student', icon: BookOpen, label: 'My Attendance' },
    ];
  }
  return [];
}

// ───────────────────────────────────────────────────────────────────────────────
// Individual nav item  — label always visible when expanded; glass tooltip when collapsed
// ───────────────────────────────────────────────────────────────────────────────
function SidebarNavItem({ item, collapsed, onClick }) {
  const Icon = item.icon;
  return (
    // `group` wrapper lets CSS children react to hover on this container
    <div className="relative group">
      <NavLink
        to={item.to}
        end
        onClick={onClick}
        className={({ isActive }) =>
          `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
           ${isActive
             ? 'bg-[#D4AF37]/10 text-[#B8860B] dark:bg-gold-500/15 dark:text-gold-400'
             : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-white/5'
           }`
        }
      >
        {({ isActive }) => (
          <>
            {/* Gold left-bar for active state */}
            {isActive && (
              <motion.div
                layoutId="activeBar"
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold-500"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}

            <Icon
              size={20}
              className={`shrink-0 transition-colors ${
                isActive
                  ? 'text-[#B8860B] dark:text-gold-400'
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
              }`}
            />

            {/* Expanded sidebar: animate label in/out */}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </>
        )}
      </NavLink>

      {/* ✨ Glass Tooltip — only when sidebar is COLLAPSED and user hovers */}
      {collapsed && (
        <div
          className="
            pointer-events-none
            absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[100]
            opacity-0 scale-95 translate-x-1
            group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0
            transition-all duration-200 ease-out
          "
        >
          {/* Frosted-glass chip */}
          <div
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap
              bg-white/90 dark:bg-slate-900/95
              backdrop-blur-md
              border border-white/40 dark:border-white/10
              shadow-[0_8px_32px_rgba(0,0,0,0.14),0_0_0_1px_rgba(212,175,55,0.15)]
              text-sm font-semibold text-slate-700 dark:text-slate-100
            "
          >
            {/* Gold accent dot */}
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
            {item.label}
          </div>
          {/* Triangle arrow pointing left toward the icon */}
          <div
            className="
              absolute right-full top-1/2 -translate-y-1/2 mr-[-1px]
              border-[5px] border-transparent
              border-r-white/90 dark:border-r-slate-900/95
            "
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SidebarDrawer
// ─────────────────────────────────────────────────────────────────────────────
function SidebarDrawer({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate              = useNavigate();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile,   setIsMobile]   = useState(window.innerWidth < 768);
  const [pwdOpen,    setPwdOpen]    = useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = getNavItems(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const homeLink =
    user?.role === 'admin'     ? '/admin-dashboard' :
    user?.role === 'professor' ? '/professor'       :
    user?.role === 'student'   ? '/student'         : '/login';

  return (
    <>
      {/* ── Mobile Hamburger ── */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-5 left-4 z-40 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-gray-200 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-sm"
        >
          <Menu size={20} />
        </button>
      )}

      {/* ── Mobile Backdrop ── */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={
          isMobile
            ? { x: mobileOpen ? 0 : '-100%', width: 260 }
            : { x: 0, width: collapsed ? 68 : 240 }
        }
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`sidebar-glass shrink-0 h-screen flex flex-col overflow-hidden z-50 ${isMobile ? 'fixed top-0 left-0' : 'sticky top-0'}`}
        style={{ minWidth: isMobile ? 260 : (collapsed ? 68 : 240) }}
      >
        {/* ── Logo row ── */}
        <div className="flex items-center justify-between px-3 py-5 border-b border-white/5">
          <NavLink to={homeLink} className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center">
              <img src="/Alarab_logo.png" alt="Logo" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.25)] dark:brightness-0 dark:invert" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="logo-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <span className="text-base font-extrabold text-gold-gradient whitespace-nowrap">
                    AlArab University
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </NavLink>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center
                       text-slate-400 dark:text-slate-500 hover:text-[#B8860B] dark:hover:text-gold-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* ── User profile strip ── */}
        <AnimatePresence initial={false}>
          {!collapsed && user && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 border-b border-white/5 overflow-hidden"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] dark:from-gold-400 dark:to-gold-600 flex items-center justify-center text-white dark:text-[#0a0a0f] font-bold text-sm shrink-0">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                  <p className="text-[11px] text-[#B8860B] dark:text-gold-500 capitalize font-medium">{user.role}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Nav links ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-1">
          {navItems.map(item => (
            <SidebarNavItem key={item.to} item={item} collapsed={!isMobile && collapsed} onClick={() => isMobile && setMobileOpen(false)} />
          ))}
        </nav>

        {/* ── Bottom actions ── */}
        <div className="px-2 py-3 border-t border-white/5 space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                       text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun  size={19} className="shrink-0" />
              : <Moon size={19} className="shrink-0" />}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="theme-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Change Password */}
          {user && (
            <button
              onClick={() => setPwdOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
            >
              <KeyRound size={19} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key="pwd-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Change Password
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* Logout */}
          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                         text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <LogOut size={19} className="shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    key="logout-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )}
        </div>
      </motion.aside>

      {/* Password modal (outside aside so it can be full-screen) */}
      <ChangePasswordModal isOpen={pwdOpen} onClose={() => setPwdOpen(false)} />
    </>
  );
}

export default SidebarDrawer;
