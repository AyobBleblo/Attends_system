import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, ChevronRight } from 'lucide-react';

function ProfessorView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'professor') { navigate('/student'); return; }
    // courses come from the /auth/me/ response
    setCourses(user.courses || []);
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <p className="text-muted">
          {user.department} · Professor Dashboard
        </p>
      </header>

      <div>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} /> Your Courses This Semester
        </h3>

        {courses.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
            No courses assigned this semester. Contact admin.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {courses.map(c => (
              <div 
                key={c.id} 
                className="card course-card" 
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => navigate(`/professor/course/${c.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                <div>
                  <span style={{
                    display: 'inline-block',
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '2px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}>
                    {c.code}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {c.name}
                    <ChevronRight size={20} color="var(--text-muted)" />
                  </h3>
                  <p className="text-muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{c.department_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfessorView;
