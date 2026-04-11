import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import api from '../api/axios';
import {
  Users, GraduationCap, BookOpen, Link2, ClipboardList,
  UserPlus, RefreshCw, X, Loader2,
} from 'lucide-react';
import StatsBar from '../components/admin/StatsBar';
import DataTable from '../components/admin/DataTable';
import NestedAssignModal from '../components/admin/NestedAssignModal';

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'students',    label: 'Students',    icon: Users },
  { key: 'professors',  label: 'Professors',  icon: GraduationCap },
  { key: 'courses',     label: 'Courses',     icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Link2 },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList },
];

const EP = {
  students:    'admin/students/',
  professors:  'admin/professors/',
  courses:     'admin/courses/',
  assignments: 'admin/assignments/',
  enrollments: 'admin/enrollments/',
};

// ── Column definitions per tab ────────────────────────────────────────────────
const COLUMNS = {
  students: [
    { key: 'student_id',      label: 'ID' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
  ],
  professors: [
    { key: 'professor_id',    label: 'ID' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
  ],
  courses: [
    { key: 'code',            label: 'Code' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
  ],
  assignments: [
    { key: 'professor_name',  label: 'Professor' },
    { key: 'course_code',     label: 'Course Code' },
    { key: 'course_name',     label: 'Course Name' },
    { key: 'semester_name',   label: 'Semester' },
  ],
  enrollments: [
    {
      key: 'student',
      label: 'Student',
      render: item => item.student_name || item.student_id || item.student,
    },
    {
      key: 'course',
      label: 'Course',
      render: item => item.course_code || item.course,
    },
    {
      key: 'semester',
      label: 'Semester',
      render: item => item.semester_name || item.semester,
    },
  ],
};

// ── Utility ───────────────────────────────────────────────────────────────────
// We now use the 'api' instance from ../api/axios which has the interceptor
// but we'll add a helper to format errors cleanly.
const formatError = (err) => {
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
        .join(', ');
    }
    return data;
  }
  return err.message;
};

// ── Add-New modal form per tab ────────────────────────────────────────────────
const Inp = ({ label, name, type = 'text', value, onChange, required = true }) => (
  <div>
    <label className="form-label">{label}</label>
    <input type={type} name={name} value={value} onChange={onChange} required={required} className="input" />
  </div>
);

const Sel = ({ label, name, options, valKey = 'id', lblFn, value, onChange }) => (
  <div>
    <label className="form-label">{label}</label>
    <select name={name} value={value} onChange={onChange} required className="input">
      <option value="">— Select —</option>
      {options.map(o => <option key={o[valKey]} value={o[valKey]}>{lblFn(o)}</option>)}
    </select>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('students');
  const [data, setData] = useState({ students: [], professors: [], courses: [], assignments: [], enrollments: [] });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showNestedModal, setShowNestedModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Relation data for dropdowns
  const [allStudents,   setAllStudents]   = useState([]);
  const [allProfessors, setAllProfessors] = useState([]);
  const [allCourses,    setAllCourses]    = useState([]);
  const [allSemesters,  setAllSemesters]  = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);

  // ── Fetch table data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (tab) => {
    setLoading(true);
    try {
      const res = await api.get(EP[tab]);
      setData(prev => ({ ...prev, [tab]: res.data }));
    } catch (e) {
      console.error(e);
      // If unauthorized, the interceptor might handle it, but we log it here
    }
    finally { setLoading(false); }
  }, []);

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [studentsRes, professorsRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get(EP.students),
        api.get(EP.professors),
        api.get(EP.courses),
        api.get(EP.enrollments),
      ]);
      setCounts({
        students:    studentsRes.data.length,
        professors:  professorsRes.data.length,
        courses:     coursesRes.data.length,
        enrollments: enrollmentsRes.data.length,
      });
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  // ── Load relations for dropdowns ────────────────────────────────────────────
  const loadRelations = useCallback(async () => {
    try {
      const [st, pr, co, sem, dept] = await Promise.all([
        api.get(EP.students).catch(() => ({ data: [] })),
        api.get(EP.professors).catch(() => ({ data: [] })),
        api.get(EP.courses).catch(() => ({ data: [] })),
        api.get('semesters/').catch(() => ({ data: [] })),
        api.get('departments/').catch(() => ({ data: [] })),
      ]);
      setAllStudents(st.data);
      setAllProfessors(pr.data);
      setAllCourses(co.data);
      setAllSemesters(sem.data);
      setAllDepartments(dept.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(activeTab); fetchStats(); }, [activeTab]);
  useEffect(() => {
    if (['assignments', 'enrollments'].includes(activeTab)) loadRelations();
  }, [activeTab]);

  // ── Optimistic delete ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    const prev = data[activeTab];
    setData(d => ({ ...d, [activeTab]: d[activeTab].filter(i => i.id !== id) }));
    try {
      await api.delete(`${EP[activeTab]}${id}/`);
      fetchStats();
    } catch (err) {
      setData(d => ({ ...d, [activeTab]: prev }));
      alert(`Failed to delete: ${formatError(err)}`);
    }
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await api.post(EP[activeTab], formData);
      setShowModal(false);
      setFormData({});
      fetchData(activeTab);
      fetchStats();
    } catch (err) {
      setFormError(formatError(err));
    }
    finally { setFormLoading(false); }
  };

  const change = e => setFormData(f => ({ ...f, [e.target.name]: e.target.value }));

  const renderForm = () => {
    switch (activeTab) {
      case 'students':
        return (
          <>
            <Inp label="Username" name="username" value={formData.username||''} onChange={change} />
            <Inp label="Password" name="password" type="password" value={formData.password||''} onChange={change} />
            <Inp label="Full Name" name="name" value={formData.name||''} onChange={change} />
            <Inp label="Student ID" name="student_id" value={formData.student_id||''} onChange={change} />
            <Sel label="Department" name="department" options={allDepartments} valKey="id" lblFn={d => d.name} value={formData.department||''} onChange={change} />
          </>
        );
      case 'professors':
        return (
          <>
            <Inp label="Username" name="username" value={formData.username||''} onChange={change} />
            <Inp label="Password" name="password" type="password" value={formData.password||''} onChange={change} />
            <Inp label="Full Name" name="name" value={formData.name||''} onChange={change} />
            <Inp label="Professor ID" name="professor_id" value={formData.professor_id||''} onChange={change} />
            <Sel label="Department" name="department" options={allDepartments} valKey="id" lblFn={d => d.name} value={formData.department||''} onChange={change} />
          </>
        );
      case 'courses':
        return (
          <>
            <Inp label="Course Code" name="code" value={formData.code||''} onChange={change} />
            <Inp label="Course Name" name="name" value={formData.name||''} onChange={change} />
            <Sel label="Department" name="department"
              options={allDepartments}
              valKey="id" lblFn={d => d.name} value={formData.department||''} onChange={change}
            />
          </>
        );
      case 'enrollments':
        return (
          <>
            <Sel label="Student" name="student" options={allStudents} valKey="id"
              lblFn={s => `${s.name} (${s.student_id})`} value={formData.student||''} onChange={change} />
            <Sel label="Course" name="course" options={allCourses} valKey="id"
              lblFn={c => `${c.name} (${c.code})`} value={formData.course||''} onChange={change} />
            <Sel label="Semester" name="semester" options={allSemesters} valKey="id"
              lblFn={s => s.name} value={formData.semester||''} onChange={change} />
          </>
        );
      default:
        return null;
    }
  };

  const TAB_COLORS = {
    students: 'bg-indigo-500', professors: 'bg-violet-500',
    courses: 'bg-sky-500', assignments: 'bg-amber-500', enrollments: 'bg-emerald-500',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage users, courses, assignments, and enrollments.
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <StatsBar counts={counts} loading={statsLoading} />

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              transition-all duration-150 border
              ${activeTab === key
                ? `${TAB_COLORS[key]} text-white border-transparent shadow-md`
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'}
            `}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Content card ── */}
      <div className="card p-5">
        {/* Card header */}
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {TABS.find(t => t.key === activeTab)?.label}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => fetchData(activeTab)}
              className="btn-ghost"
            >
              <RefreshCw size={15} /> Refresh
            </button>
            {activeTab === 'assignments' ? (
              <button
                onClick={() => { loadRelations(); setShowNestedModal(true); }}
                className="btn-primary"
              >
                <UserPlus size={15} /> Smart Assign
              </button>
            ) : activeTab !== 'assignments' && (
              <button
                onClick={() => { setFormData({}); setFormError(null); loadRelations(); setShowModal(true); }}
                className="btn-primary"
              >
                <UserPlus size={15} /> Add New
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={COLUMNS[activeTab]}
          data={data[activeTab]}
          loading={loading}
          onDelete={handleDelete}
          emptyText={`No ${activeTab} found.`}
        />
      </div>

      {/* ── Generic Add Modal ── */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="card w-full max-w-md p-6 animate-scale-in dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Add {TABS.find(t => t.key === activeTab)?.label.slice(0, -1)}
              </Dialog.Title>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {renderForm()}
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 animate-slide-down">
                  {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={formLoading}
                className={`btn-primary w-full justify-center ${TAB_COLORS[activeTab]}`}
              >
                {formLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {formLoading ? 'Creating…' : 'Create'}
              </button>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ── Nested Assign Wizard ── */}
      <NestedAssignModal
        isOpen={showNestedModal}
        onClose={() => setShowNestedModal(false)}
        semesters={allSemesters}
        onSuccess={() => {
          setShowNestedModal(false);
          fetchData('assignments');
          fetchStats();
        }}
      />
    </div>
  );
};

export default AdminDashboard;
