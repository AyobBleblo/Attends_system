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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';

// ─────────────────────────────────────────────────────────────────────────────
// Nav items per role
// ─────────────────────────────────────────────────────────────────────────────
function getNavItems(role) {
  if (role === 'admin') {
    return [{ to: '/admin-dashboard', icon: LayoutDashboard, label: 'Dashboard' }];
  }
  if (role === 'professor') {
    return [
      { to: '/professor', icon: BookOpen,   label: 'My Courses' },
      { to: '/report',    icon: BarChart2,  label: 'Reports'    },
    ];
  }
  if (role === 'student') {
    return [
      { to: '/student', icon: BookOpen, label: 'My Attendance' },
    ];
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual nav item
// ─────────────────────────────────────────────────────────────────────────────
function SidebarNavItem({ item, collapsed }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
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
            className={`shrink-0 transition-colors ${isActive ? 'text-[#B8860B] dark:text-gold-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}
          />

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
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SidebarDrawer
// ─────────────────────────────────────────────────────────────────────────────
function SidebarDrawer({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate              = useNavigate();
  const [collapsed,  setCollapsed]  = useState(false);
  const [pwdOpen,    setPwdOpen]    = useState(false);

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
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="sidebar-glass shrink-0 h-screen sticky top-0 flex flex-col overflow-hidden z-40"
        style={{ minWidth: collapsed ? 68 : 240 }}
      >
        {/* ── Logo row ── */}
        <div className="flex items-center justify-between px-3 py-5 border-b border-white/5">
          <NavLink to={homeLink} className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <GraduationCap size={18} className="text-gold-400" />
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
                    UniAttend
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
            <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* ── Bottom actions ── */}
        <div className="px-2 py-3 border-t border-white/5 space-y-1">

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
