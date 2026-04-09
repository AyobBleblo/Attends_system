import React, { useState, useEffect, useCallback } from 'react';
import { Users, GraduationCap, BookOpen, UserPlus, X, Link2, ClipboardList, Trash2, RefreshCw } from 'lucide-react';

const TABS = [
  { key: 'students',    label: 'Students',    icon: Users },
  { key: 'professors',  label: 'Professors',  icon: GraduationCap },
  { key: 'courses',     label: 'Courses',     icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Link2 },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [data, setData] = useState({ students: [], professors: [], courses: [], assignments: [], enrollments: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});

  // Secondary data for relation dropdowns
  const [allStudents, setAllStudents] = useState([]);
  const [allProfessors, setAllProfessors] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allSemesters, setAllSemesters] = useState([]);

  const token = () => localStorage.getItem('access_token');
  const authHeader = { Authorization: `Bearer ${token()}` };

  const EP = {
    students:    'accounts/admin/students/',
    professors:  'accounts/admin/professors/',
    courses:     'courses/admin/courses/',
    assignments: 'courses/admin/assignments/',
    enrollments: 'admin/enrollments/',
  };

  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/${EP[tab]}`, { headers: authHeader });
      if (!res.ok) throw new Error(`Failed to load ${tab}`);
      const result = await res.json();
      setData(prev => ({ ...prev, [tab]: result }));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  // Load dropdown data for forms
  const loadRelations = useCallback(async () => {
    const load = async (url) => {
      const r = await fetch(`/api/${url}`, { headers: authHeader });
      return r.ok ? r.json() : [];
    };
    const [st, pr, co] = await Promise.all([
      load('accounts/admin/students/'),
      load('accounts/admin/professors/'),
      load('courses/admin/courses/'),
    ]);
    setAllStudents(st);
    setAllProfessors(pr);
    setAllCourses(co);
  }, []);

  useEffect(() => { fetchData(activeTab); }, [activeTab]);
  useEffect(() => {
    if (['assignments', 'enrollments'].includes(activeTab)) loadRelations();
    if (activeTab === 'assignments') {
      // Also load semesters
      fetch('/api/semesters/', { headers: authHeader })
        .then(r => r.ok ? r.json() : [])
        .then(setAllSemesters)
        .catch(() => {});
    }
  }, [activeTab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = activeTab === 'students' || activeTab === 'professors'
      ? { ...formData, department: 1 }
      : { ...formData };

    try {
      const res = await fetch(`/api/${EP[activeTab]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      setIsModalOpen(false);
      setFormData({});
      fetchData(activeTab);
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/${EP[activeTab]}${id}/`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete');
      fetchData(activeTab);
    } catch (err) { alert('Error: ' + err.message); }
  };

  // ── Render table columns per tab ──
  const renderHeader = () => {
    if (activeTab === 'students')    return <><th>Student ID</th><th>Name</th><th>Department</th><th></th></>;
    if (activeTab === 'professors')  return <><th>Professor ID</th><th>Name</th><th>Department</th><th></th></>;
    if (activeTab === 'courses')     return <><th>Code</th><th>Name</th><th></th></>;
    if (activeTab === 'assignments') return <><th>Professor</th><th>Course</th><th>Semester</th><th></th></>;
    if (activeTab === 'enrollments') return <><th>Student</th><th>Course</th><th>Semester</th><th></th></>;
  };

  const renderRow = (item) => {
    const del = <td><button className="btn" onClick={() => handleDelete(item.id)} style={{ padding: '0.2rem 0.5rem', color: '#ef4444', background: 'transparent' }}><Trash2 size={16}/></button></td>;
    if (activeTab === 'students')    return <><td>{item.student_id}</td><td>{item.name}</td><td>{item.department_name}</td>{del}</>;
    if (activeTab === 'professors')  return <><td>{item.professor_id}</td><td>{item.name}</td><td>{item.department_name}</td>{del}</>;
    if (activeTab === 'courses')     return <><td>{item.code}</td><td>{item.name}</td>{del}</>;
    if (activeTab === 'assignments') return <><td>{item.professor_name}</td><td>{item.course_name} ({item.course_code})</td><td>{item.semester_name}</td>{del}</>;
    if (activeTab === 'enrollments') return <><td>{item.student_id || item.student}</td><td>{item.course_code || item.course}</td><td>{item.semester}</td>{del}</>;
  };

  // ── Modal form per tab ──
  const renderForm = () => {
    const inp = (label, name, type='text', req=true) => (
      <div className="form-group" key={name}>
        <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>{label}</label>
        <input type={type} name={name} className="input" onChange={e => setFormData(p => ({...p, [name]: e.target.value}))} required={req} />
      </div>
    );
    const sel = (label, name, options, valKey='id', lblFn) => (
      <div className="form-group" key={name}>
        <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.85rem' }}>{label}</label>
        <select name={name} className="input" onChange={e => setFormData(p => ({...p, [name]: e.target.value}))} required>
          <option value="">-- Select --</option>
          {options.map(o => <option key={o[valKey]} value={o[valKey]}>{lblFn(o)}</option>)}
        </select>
      </div>
    );

    if (activeTab === 'students') return <>{inp('Username', 'username')}{inp('Password', 'password', 'password')}{inp('Full Name', 'name')}{inp('Student ID', 'student_id')}</>;
    if (activeTab === 'professors') return <>{inp('Username', 'username')}{inp('Password', 'password', 'password')}{inp('Full Name', 'name')}{inp('Professor ID', 'professor_id')}</>;
    if (activeTab === 'courses') return <>{inp('Course Code', 'code')}{inp('Course Name', 'name')}</>;
    if (activeTab === 'assignments') return <>
      {sel('Professor', 'professor', allProfessors, 'id', p => `${p.name} (${p.professor_id})`)}
      {sel('Course', 'course', allCourses, 'id', c => `${c.name} (${c.code})`)}
      {allSemesters.length > 0 ? sel('Semester', 'semester', allSemesters, 'id', s => s.name) : inp('Semester ID', 'semester')}
    </>;
    if (activeTab === 'enrollments') return <>
      {sel('Student', 'student', allStudents, 'id', s => `${s.name} (${s.student_id})`)}
      {sel('Course', 'course', allCourses, 'id', c => `${c.name} (${c.code})`)}
      {inp('Semester ID', 'semester')}
    </>;
  };

  const tabColors = { students: '#6366f1', professors: '#8b5cf6', courses: '#0ea5e9', assignments: '#f59e0b', enrollments: '#10b981' };

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p className="text-muted">Manage users, courses, assignments, and enrollments.</p>
      </header>

      {error && <div style={{ background: '#fde8e8', color: '#9b1c1c', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #f98080' }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="btn"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: activeTab === key ? tabColors[key] : 'transparent',
              color: activeTab === key ? '#fff' : 'var(--text-main)',
              border: `1px solid ${activeTab === key ? tabColors[key] : 'var(--border)'}`,
              fontWeight: activeTab === key ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>{TABS.find(t => t.key === activeTab)?.label}</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn" onClick={() => fetchData(activeTab)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', background: 'transparent' }}>
              <RefreshCw size={15} /> Refresh
            </button>
            <button
              className="btn"
              onClick={() => { setFormData({}); setIsModalOpen(true); if (['assignments', 'enrollments'].includes(activeTab)) loadRelations(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: tabColors[activeTab], color: '#fff', border: 'none' }}
            >
              <UserPlus size={16} /> Add New
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {React.Children.map(renderHeader(), (th, i) =>
                    <th key={i} style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>{th.props.children}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data[activeTab].length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No {activeTab} found.</td></tr>
                )}
                {data[activeTab].map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {React.Children.map(renderRow(item), (td, i) =>
                      <td key={i} style={{ padding: '0.6rem 0.75rem' }}>{td.props.children}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '440px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--card-bg)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Add New {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}</h3>
              <button className="btn" onClick={() => setIsModalOpen(false)} style={{ padding: '0.3rem' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {renderForm()}
              <button type="submit" className="btn" style={{ background: tabColors[activeTab], color: '#fff', border: 'none', marginTop: '0.5rem' }}>
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
