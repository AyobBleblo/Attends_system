import { CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * StatusBanner — animated slide-down banner for success / error feedback.
 * Props:
 *   status  : 'success' | 'error' | null
 *   message : string
 *   onClose : () => void
 *   autoClose: number (ms, default 4000)  — set to 0 to disable
 */
const StatusBanner = ({ status, message, onClose, autoClose = 4000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status) {
      setVisible(true);
      if (autoClose > 0) {
        const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, autoClose);
        return () => clearTimeout(t);
      }
    } else {
      setVisible(false);
    }
  }, [status, message]);

  if (!status) return null;

  const isSuccess = status === 'success';

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
        transition-all duration-300
        ${visible ? 'animate-slide-down opacity-100' : 'opacity-0 -translate-y-2'}
        ${isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300'
          : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300 animate-shake'}
      `}
    >
      {isSuccess
        ? <CheckCircle size={18} className="shrink-0 text-emerald-500" />
        : <XCircle size={18} className="shrink-0 text-red-500" />
      }
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default StatusBanner;
