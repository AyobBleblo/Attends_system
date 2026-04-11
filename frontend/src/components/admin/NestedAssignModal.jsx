import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, ChevronRight, ChevronLeft, Loader2, CheckCircle } from 'lucide-react';

const STEPS = ['Department', 'Course', 'Professor'];

const Field = ({ label, name, value, onChange, placeholder, type = 'text', required = true }) => (
  <div>
    <label className="form-label">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      className="input"
    />
  </div>
);

const EMPTY = {
  department_name: '', department_code: '',
  course_code: '', course_name: '',
  professor_id: '', professor_name: '', professor_username: '', professor_password: '',
  semester_name: '',
};

/**
 * NestedAssignModal — 3-step wizard to create Dept → Course → Professor + Assignment.
 * Props:
 *   isOpen       : boolean
 *   onClose      : () => void
 *   onSuccess    : (result) => void
 *   semesters    : [{ id, name }]  — for semester selection
 */
const NestedAssignModal = ({ isOpen, onClose, onSuccess, semesters = [] }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const change = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const reset = () => { setStep(0); setForm(EMPTY); setError(null); setDone(null); };
  const handleClose = () => { reset(); onClose(); };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/courses/admin/nested-assign/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(body));
      setDone(body);
      onSuccess?.(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.department_name && form.department_code;
    if (step === 1) return form.course_code && form.course_name;
    return (
      form.professor_id && form.professor_name &&
      form.professor_username && form.professor_password &&
      form.semester_name
    );
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="card w-full max-w-md p-6 animate-scale-in dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {done ? 'Assignment Created ✓' : 'New Course Assignment'}
            </Dialog.Title>
            <button onClick={handleClose} className="btn-ghost p-1.5">
              <X size={18} />
            </button>
          </div>

          {done ? (
            /* ── Success state ── */
            <div className="text-center py-4 animate-scale-in">
              <CheckCircle size={52} className="mx-auto text-emerald-500 mb-4" />
              <p className="font-semibold text-slate-800 dark:text-slate-100">{done.professor}</p>
              <p className="text-sm text-slate-500 mt-1">→ {done.course}</p>
              <p className="text-xs text-slate-400 mt-0.5">{done.department} · {done.semester}</p>
              <p className="text-xs text-emerald-600 mt-3 font-medium">
                {done.created ? 'New assignment created' : 'Assignment already existed (no duplicate)'}
              </p>
              <button onClick={handleClose} className="btn-primary mt-5 mx-auto">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-6">
                {STEPS.map((label, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${i <= step
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}
                    `}>
                      {i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block transition-colors
                      ${i <= step ? 'text-brand-500' : 'text-slate-400'}`}>
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 rounded transition-all
                        ${i < step ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step content */}
              <div className="space-y-4">
                {step === 0 && (
                  <>
                    <Field label="Department Name" name="department_name" value={form.department_name} onChange={change} placeholder="e.g. Computer Science" />
                    <Field label="Department Code" name="department_code" value={form.department_code} onChange={change} placeholder="e.g. CS" />
                  </>
                )}
                {step === 1 && (
                  <>
                    <Field label="Course Code" name="course_code" value={form.course_code} onChange={change} placeholder="e.g. CS301" />
                    <Field label="Course Name" name="course_name" value={form.course_name} onChange={change} placeholder="e.g. Data Structures" />
                  </>
                )}
                {step === 2 && (
                  <>
                    <Field label="Professor ID"       name="professor_id"       value={form.professor_id}       onChange={change} placeholder="e.g. PROF001" />
                    <Field label="Professor Full Name" name="professor_name"     value={form.professor_name}     onChange={change} placeholder="e.g. Dr. Said Ali" />
                    <Field label="Login Username"      name="professor_username" value={form.professor_username} onChange={change} placeholder="e.g. said.ali" />
                    <Field label="Login Password"      name="professor_password" value={form.professor_password} onChange={change} placeholder="••••••••" type="password" />
                    <div>
                      <label className="form-label">Semester</label>
                      <select name="semester_name" value={form.semester_name} onChange={change} className="input" required>
                        <option value="">— Select semester —</option>
                        {semesters.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Error message */}
              {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 animate-slide-down">
                  {error}
                </p>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} className="btn-ghost flex-1">
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={!canNext()}
                    className="btn-primary flex-1"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={loading || !canNext()}
                    className="btn-primary flex-1"
                  >
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
