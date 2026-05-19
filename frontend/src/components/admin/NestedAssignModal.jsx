import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import Select from 'react-select';

const STEPS = ['Select Professor & Course', 'Confirm Assignment'];

/**
 * NestedAssignModal — 2-step wizard to assign an existing Professor to an existing Course.
 */
const NestedAssignModal = ({ isOpen, onClose, onSuccess, semesters = [], professors = [], courses = [] }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ professor: null, course: null, semester: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const reset = () => { setStep(0); setForm({ professor: null, course: null, semester: null }); setError(null); setDone(null); };
  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      // POST to standard admin assignments endpoint (AdminCourseAssignmentViewSet)
      const res = await fetch('/api/admin/assignments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          professor: form.professor,
          course: form.course,
          semester: form.semester,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      
      const profName = professors.find(p => p.id === form.professor)?.name;
      const courseName = courses.find(c => c.id === form.course)?.name;
      const semName = semesters.find(s => s.id === form.semester)?.name;

      setDone({ professor: profName, course: courseName, semester: semName });
      onSuccess?.(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.professor && form.course && form.semester;
    return true;
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '0.5rem',
      borderColor: '#e2e8f0',
      boxShadow: 'none',
      '&:hover': { borderColor: '#cbd5e1' }
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="card w-full max-w-md p-6 animate-scale-in dark:bg-slate-900 overflow-visible">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {done ? 'Assignment Created ✓' : 'Smart Assign'}
            </Dialog.Title>
            <button onClick={handleClose} className="btn-ghost p-1.5">
              <X size={18} />
            </button>
          </div>

          {done ? (
            <div className="text-center py-4 animate-scale-in">
              <CheckCircle size={52} className="mx-auto text-emerald-500 mb-4" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">{done.professor}</p>
              <p className="text-sm text-slate-500 mt-1">→ {done.course}</p>
              <p className="text-xs text-slate-400 mt-0.5">{done.semester}</p>
              <p className="text-xs text-emerald-600 mt-3 font-medium">Assignment created successfully</p>
              <button onClick={handleClose} className="btn-primary mt-5 mx-auto">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                {STEPS.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block transition-colors ${i <= step ? 'text-brand-500' : 'text-slate-400'}`}>
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded transition-all ${i < step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                {step === 0 && (
                  <>
                    <div>
                      <label className="form-label block mb-1">Professor</label>
                      <Select
                        placeholder="Search Professor..."
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        options={professors.map(p => ({ value: p.id, label: `${p.name} (${p.professor_id})` }))}
                        value={form.professor ? { value: form.professor, label: professors.find(p => p.id === form.professor)?.name } : null}
                        onChange={val => setForm(f => ({ ...f, professor: val ? val.value : null }))}
                      />
                    </div>
                    <div>
                      <label className="form-label block mb-1">Course</label>
                      <Select
                        placeholder="Search Course..."
                        styles={selectStyles}
                        menuPortalTarget={document.body}
                        options={courses.map(c => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                        value={form.course ? { value: form.course, label: courses.find(c => c.id === form.course)?.name } : null}
                        onChange={val => setForm(f => ({ ...f, course: val ? val.value : null }))}
                      />
                    </div>
                    <div>
                      <label className="form-label block mb-1">Semester</label>
                      <select name="semester" value={form.semester || ''} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="input" required>
                        <option value="">— Select semester —</option>
                        {semesters.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {step === 1 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Review Assignment</h3>
                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <p><strong className="text-slate-800 dark:text-slate-300">Professor:</strong> {professors.find(p => p.id === form.professor)?.name}</p>
                      <p><strong className="text-slate-800 dark:text-slate-300">Course:</strong> {courses.find(c => c.id === form.course)?.name}</p>
                      <p><strong className="text-slate-800 dark:text-slate-300">Semester:</strong> {semesters.find(s => s.id === parseInt(form.semester))?.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 animate-slide-down">
                  {error}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex-1">
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="btn-primary flex-1">
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button onClick={submit} disabled={loading || !canNext()} className="btn-primary flex-1">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                    {loading ? 'Creating…' : 'Create Assignment'}
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default NestedAssignModal;
