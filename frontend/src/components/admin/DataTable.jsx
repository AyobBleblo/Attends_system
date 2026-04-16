import { Trash2 } from 'lucide-react';

/**
 * DataTable — generic sortable table with skeleton loading rows.
 * Props:
 *   columns : [{ key, label, render?: (item) => ReactNode }]
 *   data    : array of objects
 *   loading : boolean
 *   onDelete: (id) => void
 *   emptyText?: string
 */
const SKELETON_ROWS = 5;

const DataTable = ({ columns = [], data = [], loading = false, onDelete, actions, emptyText = 'No data found.' }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          {columns.map(col => (
            <th
              key={col.key}
              className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >
              {col.label}
            </th>
          ))}
          <th className="px-4 py-3 w-12 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3">
                  <div className={`skeleton h-4 rounded ${i % 3 === 0 ? 'w-24' : i % 2 === 0 ? 'w-32' : 'w-20'}`} />
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="skeleton h-7 w-7 rounded ml-auto" />
              </td>
            </tr>
          ))
        ) : data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length + 1}
              className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
            >
              {emptyText}
            </td>
          </tr>
        ) : (
          data.map(item => (
            <tr
              key={item.id}
              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-100"
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-slate-700 dark:text-slate-300"
                >
                  {col.render ? col.render(item) : (item[col.key] ?? '—')}
                </td>
              ))}
              <td className="px-4 py-3 flex gap-2 justify-end">
                {actions && actions(item)}
                {onDelete && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="btn-danger p-1.5 rounded-lg text-red-600 hover:text-white"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default DataTable;
