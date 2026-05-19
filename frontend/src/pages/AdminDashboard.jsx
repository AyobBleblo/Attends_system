import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';
import api from '../api/axios';
import {
  Users, GraduationCap, BookOpen, Link2, ClipboardList,
  UserPlus, RefreshCw, X, Loader2, KeyRound, Search, Unlock, Calendar
} from 'lucide-react';
import StatsBar from '../components/admin/StatsBar';
import DataTable from '../components/admin/DataTable';
import NestedAssignModal from '../components/admin/NestedAssignModal';
import CascadeFilterBar from '../components/admin/CascadeFilterBar';
import ProfessorMultiSelect from '../components/admin/ProfessorMultiSelect';
import ProfessorChipCell from '../components/admin/ProfessorChipCell';
import Select from 'react-select';

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'students',    label: 'Students',    icon: Users },
  { key: 'professors',  label: 'Professors',  icon: GraduationCap },
  { key: 'courses',     label: 'Courses',     icon: BookOpen },
  { key: 'assignments', label: 'Assignments', icon: Link2 },
  { key: 'enrollments', label: 'Enrollments', icon: ClipboardList },
  { key: 'semesters',   label: 'Semesters',   icon: Calendar },
];

const EP = {
  students:    'admin/students/',
  professors:  'admin/professors/',
  courses:     'admin/courses/',
  assignments: 'admin/assignments/',
  enrollments: 'admin/enrollments/',
  semesters:   'admin/semesters/',
};

// ── Column definitions per tab ────────────────────────────────────────────────
const COLUMNS = {
  students: [
    { key: 'student_id',      label: 'ID' },
    { key: 'username',        label: 'Username' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
    { key: 'major_name',      label: 'Major' },
    { key: 'study_year_name', label: 'Year' },
  ],
  professors: [
    { key: 'professor_id',    label: 'ID' },
    { key: 'username',        label: 'Username' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
  ],
  courses: [
    { key: 'code',            label: 'Code' },
    { key: 'name',            label: 'Name' },
    { key: 'department_name', label: 'Department' },
    { key: 'study_year_name', label: 'Study Year' },
    { key: 'professors',      label: 'Professors', render: item => <ProfessorChipCell professors={item.professors} /> },
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
  semesters: [
    { key: 'name', label: 'Name' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'total_lectures', label: 'Total Lectures' },
    {
      key: 'is_active',
      label: 'Active',
      render: item => item.is_active ? 'Yes' : 'No',
    },
  ],
};

// ── Utility ───────────────────────────────────────────────────────────────────
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
  const [data, setData] = useState({ students: [], professors: [], courses: [], assignments: [], enrollments: [], semesters: [] });
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [counts, setCounts] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showNestedModal, setShowNestedModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // Pagination state (students tab is the only paginated endpoint)
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 25;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customPassword, setCustomPassword] = useState('');

  // Relation data for dropdowns
  const [allStudents,   setAllStudents]   = useState([]);
  const [allProfessors, setAllProfessors] = useState([]);
  const [allCourses,    setAllCourses]    = useState([]);
  const [allSemesters,  setAllSemesters]  = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allStudyYears,  setAllStudyYears]  = useState([]);
  const [allMajors,      setAllMajors]      = useState([]);

  // Cascade Filter State
  const [filterState, setFilterState] = useState({
    department: null,
    studyYear: null,
    professor: null,
    major: null
  });

  // ── Fetch table data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (tab, search = searchQuery, pg = page) => {
    setLoading(true);
    try {
      let params = new URLSearchParams();
      if (search) params.append('search', search);
      
      if (tab === 'students') {
        params.append('page', pg);
        params.append('page_size', PAGE_SIZE);
      }
      
      // Apply cascade filters for specific tabs
      if (['courses', 'professors', 'students'].includes(tab)) {
        if (filterState.department) params.append('department_id', filterState.department);
      }
      if (['courses', 'students'].includes(tab)) {
        if (filterState.studyYear) params.append('study_year_id', filterState.studyYear);
      }
      if (tab === 'courses') {
        if (filterState.professor) params.append('professor_id', filterState.professor);
      }
      if (tab === 'students') {
        if (filterState.major) params.append('major_id', filterState.major);
      }
      
      const qs = params.toString() ? `?${params.toString()}` : '';
      
      const res = await api.get(`${EP[tab]}${qs}`);
      // Paginated response has { count, next, previous, results }
      if (tab === 'students' && res.data?.results !== undefined) {
        setData(prev => ({ ...prev, [tab]: res.data.results }));
        setTotalCount(res.data.count ?? 0);
        setPageCount(Math.ceil((res.data.count ?? 0) / PAGE_SIZE));
      } else {
        setData(prev => ({ ...prev, [tab]: res.data }));
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, [searchQuery, page]);

  // Handle Search Debounce — reset to page 1 on new search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchData(activeTab, searchQuery, 1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  // Re-fetch when page changes (students tab)
  useEffect(() => {
    if (activeTab === 'students') fetchData('students', searchQuery, page);
  }, [page]);

  // Re-fetch when cascade filters change
  useEffect(() => {
    if (['courses', 'professors', 'students'].includes(activeTab)) {
      setPage(1);
      fetchData(activeTab, searchQuery, 1);
    }
  }, [filterState]);


  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [studentsRes, professorsRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get(`${EP.students}?page=1&page_size=1`),
        api.get(EP.professors),
        api.get(EP.courses),
        api.get(EP.enrollments),
      ]);
      setCounts({
        // Paginated endpoint returns { count, results }
        students:    studentsRes.data?.count ?? studentsRes.data?.length ?? 0,
        professors:  professorsRes.data.length,
        courses:     coursesRes.data.length,
        enrollments: enrollmentsRes.data.length,
      });
    } catch (e) { console.error(e); }
    finally { setStatsLoading(false); }
  }, []);

  const loadRelations = useCallback(async () => {
    try {
      // Need a larger page size to fetch students for the dropdown if paginated
      const [st, pr, co, sem, dept, sy, mj] = await Promise.all([
        api.get(`${EP.students}?page=1&page_size=1000`).catch(() => ({ data: { results: [] } })),
        api.get(EP.professors).catch(() => ({ data: [] })),
        api.get(EP.courses).catch(() => ({ data: [] })),
        api.get('semesters/').catch(() => ({ data: [] })),
        api.get('departments/').catch(() => ({ data: [] })),
        api.get('study-years/').catch(() => ({ data: [] })),
        api.get('majors/').catch(() => ({ data: [] })),
      ]);
      setAllStudents(st.data.results !== undefined ? st.data.results : (st.data || []));
      setAllProfessors(pr.data.results !== undefined ? pr.data.results : (pr.data || []));
      setAllCourses(co.data);
      setAllSemesters(sem.data);
      setAllDepartments(dept.data);
      setAllStudyYears(sy.data);
      setAllMajors(mj.data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchStats(); loadRelations(); }, []);
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

  // ── Handlers for Password Reset ─────────────────────────────────────────────
  const handleQuickReset = async (item) => {
    if (!window.confirm(`Reset password to '123456' for ${item.name}?`)) return;
    try {
      await api.post(`${EP[activeTab]}${item.id}/reset_password/`);
      alert(`Password reset successfully for ${item.name}`);
    } catch (err) {
      alert(`Error resetting password: ${formatError(err)}`);
    }
  };

  const handleSetCustomPassword = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      await api.post(`${EP[selectedUser.type]}${selectedUser.id}/set_custom_password/`, {
        password: customPassword
      });
      setShowPasswordModal(false);
      setCustomPassword('');
      alert(`Custom password set successfully for ${selectedUser.name}`);
    } catch (err) {
      setFormError(formatError(err));
    } finally {
      setFormLoading(false);
    }
  };

  const openCustomPasswordModal = (item) => {
    setSelectedUser({ id: item.id, type: activeTab, name: item.name });
    setCustomPassword('');
    setFormError(null);
    setShowPasswordModal(true);
  };

  const handleResetFingerprint = async (item) => {
    if (!window.confirm(`Reset device fingerprint for ${item.name}?`)) return;
    try {
      await api.post(`${EP[activeTab]}${item.id}/reset_fingerprint/`);
      alert(`Device fingerprint reset successfully for ${item.name}`);
    } catch (err) {
      alert(`Error resetting device fingerprint: ${formatError(err)}`);
    }
  };

  const renderTableActions = (item) => {
    if (activeTab === 'students' || activeTab === 'professors') {
      return (
        <>
          <button
            onClick={() => handleQuickReset(item)}
            className="btn-ghost p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-500 transition-colors"
            title="Quick Reset Password"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => openCustomPasswordModal(item)}
            className="btn-ghost p-1.5 rounded-lg text-amber-600 hover:text-white hover:bg-amber-500 transition-colors"
            title="Set Custom Password"
          >
            <KeyRound size={15} />
          </button>
          {activeTab === 'students' && (
            <button
              onClick={() => handleResetFingerprint(item)}
              className="btn-ghost p-1.5 rounded-lg text-[#D4AF37] hover:text-white hover:bg-[#D4AF37] transition-colors"
              title="Reset Device Fingerprint"
            >
              <Unlock size={15} />
            </button>
          )}
        </>
      );
    }
    return null;
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      if (activeTab === 'enrollments' && Array.isArray(formData.course)) {
        await Promise.all(
          formData.course.map(courseId => 
             api.post(EP[activeTab], { ...formData, course: courseId })
          )
        );
      } else if (activeTab === 'courses') {
        // Create course first
        const courseData = { ...formData };
        delete courseData.professors;
        const res = await api.post(EP.courses, courseData);
        
        // Then assign professors if any
        if (formData.professors && formData.professors.length > 0) {
          const activeSemester = allSemesters.find(s => s.is_active);
          if (activeSemester) {
            await api.post(`courses/${res.data.id}/assign-professors/`, {
              semester_id: activeSemester.id,
              professor_ids: formData.professors
            });
          }
        }
      } else {
        await api.post(EP[activeTab], formData);
      }
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
            <Inp label="Student ID" name="student_id" value={formData.student_id||''} onChange={change} />
            <Inp label="Full Name" name="name" value={formData.name||''} onChange={change} />
            <Sel label="Department" name="department" options={allDepartments} valKey="id" lblFn={d => d.name} value={formData.department||''} onChange={change} />
            <Sel label="Major/Specialization" name="major" options={formData.department ? allMajors.filter(m => m.department === parseInt(formData.department)) : []} valKey="id" lblFn={m => m.name} value={formData.major||''} onChange={change} />
            <Sel label="Study Year" name="study_year" options={allStudyYears} valKey="id" lblFn={y => y.name} value={formData.study_year||''} onChange={change} />
            <Inp label="Password" name="password" type="password" value={formData.password||''} onChange={change} />
          </>
        );
      case 'professors':
        return (
          <div className="space-y-4">
            <Inp label="Username" name="username" value={formData.username||''} onChange={change} />
            <Inp label="Password" name="password" type="password" value={formData.password||''} onChange={change} />
            <Inp label="Full Name" name="name" value={formData.name||''} onChange={change} />
            <Inp label="Professor ID" name="professor_id" value={formData.professor_id||''} onChange={change} />
            <div>
              <label className="form-label block mb-1">Departments</label>
              <Select
                isMulti
                options={allDepartments.map(d => ({ value: d.id, label: d.name }))}
                onChange={vals => setFormData(f => ({ ...f, departments: vals ? vals.map(v => v.value) : [] }))}
                value={formData.departments ? allDepartments.filter(d => formData.departments.includes(d.id)).map(d => ({ value: d.id, label: d.name })) : []}
                placeholder="Select Departments..."
                menuPortalTarget={document.body}
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="space-y-4">
            <Inp label="Course Code" name="code" value={formData.code||''} onChange={change} />
            <Inp label="Course Name" name="name" value={formData.name||''} onChange={change} />
            <Sel label="Department" name="department" options={allDepartments} valKey="id" lblFn={d => d.name} value={formData.department||''} onChange={change} />
            <Sel label="Study Year" name="study_year" options={allStudyYears} valKey="id" lblFn={y => y.name} value={formData.study_year||''} onChange={change} />
            <div>
              <label className="form-label block mb-1">Professors</label>
              <ProfessorMultiSelect
                options={allProfessors.map(p => ({ value: p.id, label: p.name }))}
                onChange={vals => setFormData(f => ({ ...f, professors: vals ? vals.map(v => v.value) : [] }))}
                value={formData.professors ? allProfessors.filter(p => formData.professors.includes(p.id)).map(p => ({ value: p.id, label: p.name })) : []}
              />
            </div>
          </div>
        );
      case 'enrollments':
        return (
          <div className="space-y-4">
            <div>
              <label className="form-label block mb-1">Student</label>
              <Select
                options={allStudents.map(s => ({ value: s.id, label: `${s.name} (${s.student_id})` }))}
                onChange={val => setFormData(f => ({ ...f, student: val?.value }))}
                value={formData.student ? { value: formData.student, label: allStudents.find(s=>s.id===formData.student)?.name || formData.student } : null}
                placeholder="Search Student..."
                menuPortalTarget={document.body}
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
            <div>
              <label className="form-label block mb-1">Courses (Multiple)</label>
              <Select
                isMulti
                options={allCourses.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                onChange={vals => setFormData(f => ({ ...f, course: vals ? vals.map(v => v.value) : [] }))}
                value={formData.course && Array.isArray(formData.course) ? allCourses.filter(c => formData.course.includes(c.id)).map(c => ({ value: c.id, label: c.name })) : []}
                placeholder="Search Courses..."
                menuPortalTarget={document.body}
                styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
              />
            </div>
            <Sel label="Semester" name="semester" options={allSemesters} valKey="id" lblFn={s => s.name} value={formData.semester||''} onChange={change} />
          </div>
        );
      case 'semesters':
        return (
          <>
            <Inp label="Name" name="name" value={formData.name||''} onChange={change} />
            <Inp label="Start Date" name="start_date" type="date" value={formData.start_date||''} onChange={change} />
            <Inp label="End Date" name="end_date" type="date" value={formData.end_date||''} onChange={change} />
            <Inp label="Total Lectures" name="total_lectures" type="number" value={formData.total_lectures||'15'} onChange={change} />
            <div className="flex items-center gap-2 mt-4 ml-1">
               <input type="checkbox" id="is_active" name="is_active" checked={!!formData.is_active} onChange={e => setFormData(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
               <label htmlFor="is_active" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Set as Active Semester</label>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const TAB_COLORS = {
    students: 'bg-indigo-500', professors: 'bg-violet-500',
    courses: 'bg-sky-500', assignments: 'bg-amber-500', enrollments: 'bg-emerald-500', semesters: 'bg-rose-500'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900/80 p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-slate-800/60">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage users, courses, assignments, and enrollments.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Global Search */}
          <div className="w-full md:w-80 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              className="input pl-10 mb-0 shadow-sm border-gray-200 dark:border-slate-700 focus:ring-[#D4AF37]/20 bg-gray-50 dark:bg-slate-800/80"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="hidden md:flex shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] items-center justify-center text-white font-bold shadow-lg shadow-[#D4AF37]/20">
            A
          </div>
        </div>
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
                ? `bg-[#D4AF37]/10 text-[#B8860B] border-[#D4AF37]/30 shadow-sm dark:bg-[#D4AF37]/20 dark:text-[#D4AF37]`
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'}
            `}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Cascade Filters ── */}
      {['courses', 'professors', 'students'].includes(activeTab) && (
        <CascadeFilterBar
          activeTab={activeTab}
          departments={allDepartments}
          studyYears={allStudyYears}
          professors={allProfessors}
          majors={filterState.department ? allMajors.filter(m => m.department === filterState.department) : allMajors}
          selectedDepartment={filterState.department}
          selectedStudyYear={filterState.studyYear}
          selectedProfessor={filterState.professor}
          selectedMajor={filterState.major}
          onFilterChange={setFilterState}
        />
      )}

      {/* ── Content card ── */}
      <div className="float-card p-5">
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
          actions={renderTableActions}
          emptyText={`No ${activeTab} found.`}
        />

        {/* Pagination controls — students only */}
        {activeTab === 'students' && pageCount > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing page <strong>{page}</strong> of <strong>{pageCount}</strong>
              &nbsp;·&nbsp; {totalCount} students total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount || loading}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Generic Add Modal ── */}
      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="card w-full max-w-md p-6 animate-scale-in dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
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
                className={`btn-gold w-full justify-center border-transparent`}
              >
                {formLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                {formLoading ? 'Creating…' : 'Create'}
              </button>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ── Custom Password Modal ── */}
      <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="card w-full max-w-sm p-6 animate-scale-in dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Unlock size={18} className="text-amber-500" />
                Set Password
              </Dialog.Title>
              <button onClick={() => setShowPasswordModal(false)} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            {selectedUser && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Set a new custom password for <strong className="text-slate-800 dark:text-slate-200">{selectedUser.name}</strong>.
              </p>
            )}

            <form onSubmit={handleSetCustomPassword} className="space-y-4">
              <Inp
                label="New Password"
                name="customPassword"
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                required
              />
              {formError && (
                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 animate-slide-down">
                  {formError}
                </p>
              )}
              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-ghost"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !customPassword.trim()}
                  className="btn-primary bg-amber-500 hover:bg-amber-600 border-transparent text-white justify-center min-w-[100px]"
                >
                  {formLoading ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ── Nested Assign Wizard ── */}
      <NestedAssignModal
        isOpen={showNestedModal}
        onClose={() => setShowNestedModal(false)}
        semesters={allSemesters}
        professors={allProfessors}
        courses={allCourses}
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
