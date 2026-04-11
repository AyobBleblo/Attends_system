import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import CourseCard from '../components/professor/CourseCard';
import SkeletonCard from '../components/common/SkeletonCard';

function ProfessorView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Guard ──
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'professor') { navigate('/student'); return; }
    fetchCourses();
  }, [user]);

  // ── Live fetch (not just from login state) ──
  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/professor/${user.id}/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      setCourses(data.courses || []);
      setSemester(data.semester || '');
    } catch (e) {
      // Fallback to context data if API fails
      setCourses(user.courses || []);
      setError('Could not refresh — showing cached data.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Branded header ── */}
      <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet-700 p-8 text-white shadow-brand-lg">
        {/* decorative blobs */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-xl" />

        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1 tracking-wide uppercase">
                Professor Dashboard
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight leading-tight">
                مرحباً، {user.name}
              </h1>
              <p className="text-white/80 text-sm mt-2">
                Welcome back, {user.name}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="badge bg-white/20 text-white border border-white/30 text-sm px-3 py-1">
                {user.department || 'Department'}
              </span>
              {semester && (
                <span className="text-white/60 text-xs font-medium">
                  📅 {semester}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 text-sm backdrop-blur-sm">
              <BookOpen size={15} />
              <span>{courses.length} Course{courses.length !== 1 ? 's' : ''} this semester</span>
            </div>
            <button
              onClick={fetchCourses}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 text-sm backdrop-blur-sm transition-colors duration-150"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Error notice ── */}
      {error && (
        <div className="mb-5 flex items-center gap-2 text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 rounded-xl px-4 py-3 text-sm border border-amber-200 dark:border-amber-700 animate-slide-down">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Section title ── */}
      <div className="flex items-center gap-2 mb-5">
        <BookOpen size={20} className="text-brand-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Your Courses
        </h2>
      </div>

      {/* ── Course grid ── */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No courses assigned this semester.
          </p>
          <p className="text-xs text-slate-400 mt-1">Contact the admin to assign you a course.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              onClick={() => navigate(`/professor/course/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProfessorView;
