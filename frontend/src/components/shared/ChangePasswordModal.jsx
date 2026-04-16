import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword
      });
      setSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred while changing your password.");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={resetState} className="relative z-50">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="card w-full max-w-sm p-6 animate-scale-in dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Lock size={18} className="text-brand-500" />
              Change Password
            </Dialog.Title>
            <button onClick={resetState} className="btn-ghost p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          {success ? (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-slide-down">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Password Updated!</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Your password has been changed successfully.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password
                </label>
                <input
                  type="password"
                  className="input focus:ring-brand-500"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  className="input focus:ring-brand-500"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input focus:ring-brand-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg animate-slide-down">
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {error}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !oldPassword || !newPassword || !confirmPassword}
                  className="btn-primary w-full justify-center min-h-[44px] shadow-md hover:shadow-lg transition-all"
                >
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin mr-2" /> Saving...</>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </form>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChangePasswordModal;
