import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';

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
      if (userData.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (userData.role === 'professor') {
        navigate('/professor');
      } else if (userData.role === 'student') {
        navigate('/student');
      } else {
        setError('Account not linked to a profile. Please contact administration.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-6 relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] via-[#f2f4f7] to-[#e9ecef] z-0"></div>
      
      {/* Ambient Moving Orbs */}
      <motion.div 
        animate={{ x: [0, 40, -40, 0], y: [0, 20, -20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-[#D4AF37] rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.06] pointer-events-none z-0"
      />
      <motion.div 
        animate={{ x: [0, -30, 30, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-100 rounded-full mix-blend-multiply filter blur-[120px] opacity-[0.15] pointer-events-none z-0"
      />

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Header Section with Prominent Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-120 h-60 mb-4 relative z-10">
            <img 
              src="/Alarab_logo.png" 
              alt="University Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.05)]" 
            />
          </div>
          <h1 className="text-3xl font-black text-[#1a1c20] tracking-tighter uppercase">
            ALARAB UNIVERSITY 
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.08),0_0_40px_rgba(212,175,55,0.03)] p-10 relative">
          
          <h2 className="text-xl font-bold text-[#1a1c20] mb-1 text-center">Welcome Back</h2>
          <p className="text-gray-500 text-sm text-center mb-10">Sign in to access your dashboard</p>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-3 rounded-xl mb-6 bg-red-50 border border-red-100 text-red-600 text-[13px] flex items-center"
            >
              <span className="mr-2">⚠️</span> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username Field */}
            <div className="mb-6 group">
              <label className="block mb-2 text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase ml-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D4AF37] transition-colors">
                  <User size={18} />
                </div>
                <input
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-4 pl-12 pr-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/5 transition-all duration-300"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-10 group">
              <label className="block mb-2 text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase ml-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#D4AF37] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-4 pl-12 pr-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D4AF37]/40 focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/5 transition-all duration-300"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                />
              </div>
            </div>

            {/* Gold Action Button */}
            <motion.button
              whileHover={{ scale: 1.01, translateY: -2 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-[#D4AF37] hover:bg-[#C19A2E] text-white font-bold text-lg tracking-widest uppercase py-5. px-4.5 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-xl shadow-[#D4AF37]/30 disabled:opacity-50"
              disabled={loading}
            >
              <LogIn size={24} />
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            </motion.button>
          </form>
        </div>
        
        {/* Footer Content */}
        <p className="text-center mt-12 text-gray-400 text-xs tracking-wide">
          &copy; ALARAB MEDICAL UNIVERSITY FOR SCIENCE AND TECHNOLOGY 
        </p>
      </motion.div>
    </div>
  );
}

export default LoginPage;