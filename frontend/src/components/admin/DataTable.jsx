import { useState, useEffect } from 'react';
import { Trash2, Download, UserCog, Search, CheckSquare, Square } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/* ── Avatar helpers ───────────────────────────────────────────────────── */

/** Deterministic colour from a name string */
export const nameToColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 48%)`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/* ── Avatar Cell ─────────────────────────────────────────────────────── */
const AvatarCell = ({ name }) => (
  <div className="flex items-center gap-2.5">
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm"
      style={{ backgroundColor: nameToColor(name) }}
    >
      {initials(name)}
    </div>
    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">{name}</span>
  </div>
);

/* ── Empty state ─────────────────────────────────────────────────────── */
const EmptyState = ({ text, onClearFilters, t }) => (
  <tr>
    <td colSpan={99} className="px-4 py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <svg
          width="80"
          height="64"
          viewBox="0 0 80 64"
          fill="none"
          aria-hidden="true"
          className="opacity-40 dark:opacity-30"
        >
          <rect x="8" y="12" width="64" height="44" rx="6" fill="currentColor" className="text-slate-200 dark:text-slate-700" />
          <rect x="16" y="22" width="36" height="4" rx="2" fill="currentColor" className="text-slate-300 dark:text-slate-600" />
          <rect x="16" y="30" width="24" height="4" rx="2" fill="currentColor" className="text-slate-300 dark:text-slate-600" />
          <rect x="16" y="38" width="28" height="4" rx="2" fill="currentColor" className="text-slate-300 dark:text-slate-600" />
          <circle cx="60" cy="20" r="14" fill="currentColor" className="text-[#D4AF37]/20" />
          <path d="M54 20 L60 26 L68 16" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{text}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {t('tryAdjusting')}
          </p>
        </div>

        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                       bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#92700d] dark:text-[#D4AF37]
                       hover:bg-[#D4AF37]/20 transition-colors"
          >
            <Search size={11} /> {t('clearFilters')}
          </button>
        )}
      </div>
    </td>
  </tr>
);

/* ── Bulk Action Toolbar ─────────────────────────────────────────────── */
const BulkToolbar = ({ count, onDelete, onExport, onClear, t }) => (
  <div
    className={`
      fixed bottom-6 left-1/2 -translate-x-1/2 z-40
      flex items-center gap-3 px-5 py-3 rounded-2xl
      bg-slate-900 dark:bg-slate-800 border border-slate-700 dark:border-slate-600
      shadow-2xl shadow-black/40
      transition-all duration-300 ease-out
      ${count > 0 ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}
    `}
  >
    <span className="text-xs font-bold text-[#D4AF37] whitespace-nowrap">
      {t('selected', count)}
    </span>
    <div className="h-4 w-px bg-slate-600" />
    <button
      onClick={onExport}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
    >
      <Download size={13} /> {t('export')}
    </button>
    <button
      onClick={() => alert('Bulk Assign coming soon')}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
    >
      <UserCog size={13} /> {t('assign')}
    </button>
    <button
      onClick={onDelete}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
    >
      <Trash2 size={13} /> {t('delete')}
    </button>
    <div className="h-4 w-px bg-slate-600" />
    <button
      onClick={onClear}
      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
    >
      ✕
    </button>
  </div>
);

/* ── Constants ───────────────────────────────────────────────────────── */
const SKELETON_ROWS = 5;

/**
 * DataTable — generic table with:
 *   - skeleton loading rows
 *   - illustrated empty state + "Clear filters" CTA
 *   - avatar initials for 'name' column
 *   - checkbox multi-select + slide-up bulk toolbar
 *
 * Props:
 *   columns      : [{ key, label, render? }]
 *   data         : object[]
 *   loading      : boolean
 *   onDelete     : (id) => void
 *   actions      : (item) => ReactNode
 *   emptyText    : string
 *   onClearFilters: () => void  — if provided, shows "Clear filters" in empty state
 *   showAvatarFor : string[]   — column keys where avatar should be used (default: ['name'])
 */
const DataTable = ({
  tableId,
  columns = [],
  data = [],
  loading = false,
  onDelete,
  actions,
  emptyText = 'No data found.',
  onClearFilters,
  showAvatarFor = ['name'],
}) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(new Set());

  // ── Drag and Drop Column Reordering ──
  const [draggedCol, setDraggedCol] = useState(null);
  const [columnOrder, setColumnOrder] = useState([]);

  useEffect(() => {
    setColumnOrder(prev => {
      const newKeys = columns.map(c => c.key);
      const savedOrder = tableId ? JSON.parse(localStorage.getItem(`table-cols-${tableId}`) || 'null') : null;
      let baseOrder = prev.length > 0 ? prev : (savedOrder || newKeys);
      
      const existing = baseOrder.filter(k => newKeys.includes(k));
      const added = newKeys.filter(k => !existing.includes(k));
      return [...existing, ...added];
    });
  }, [columns, tableId]);

  useEffect(() => {
    if (tableId && columnOrder.length > 0 && columnOrder.length === columns.length) {
      localStorage.setItem(`table-cols-${tableId}`, JSON.stringify(columnOrder));
    }
  }, [columnOrder, tableId, columns.length]);

  const handleDragStart = (e, colKey) => {
    setDraggedCol(colKey);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedCol(null);
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === colKey) return;
    
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedCol);
      const toIdx = newOrder.indexOf(colKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedCol);
      return newOrder;
    });
  };

  const activeCols = columnOrder.length === columns.length 
    ? columnOrder.map(key => columns.find(c => c.key === key)).filter(Boolean)
    : columns;

  // ── Selection Logic ──
  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map(r => r.id)));
    }
  };

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (!window.confirm(t('deleteRecord'))) return;
    // Call onDelete for each selected id
    if (onDelete) {
      [...selected].forEach(id => onDelete(id));
    }
    setSelected(new Set());
  };

  const handleBulkExport = () => {
    const rows = data.filter(r => selected.has(r.id));
    const csv = [
      activeCols.map(c => c.label).join(','),
      ...rows.map(r =>
        activeCols.map(c => {
          const v = r[c.key] ?? '';
          return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
        }).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
        <table className="w-full text-sm text-start">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              {/* Select all */}
              <th className="pl-4 pr-2 py-3 w-10">
                <button
                  onClick={toggleAll}
                  className="text-slate-400 dark:text-slate-500 hover:text-[#D4AF37] transition-colors"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                >
                  {allSelected || someSelected
                    ? <CheckSquare size={15} className={allSelected ? 'text-[#D4AF37]' : 'text-slate-400'} />
                    : <Square size={15} />}
                </button>
              </th>

              {activeCols.map(col => (
                <th
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.key)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  className={`px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-grab active:cursor-grabbing transition-colors duration-200 ${draggedCol === col.key ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-end text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('colActions')}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  <td className="pl-4 pr-2 py-3">
                    <div className="skeleton h-4 w-4 rounded" />
                  </td>
                  {activeCols.map(col => (
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
              <EmptyState text={emptyText} onClearFilters={onClearFilters} t={t} />
            ) : (
              data.map(item => {
                const isSelected = selected.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`
                      transition-colors duration-100
                      ${isSelected
                        ? 'bg-[#D4AF37]/5 dark:bg-[#D4AF37]/8'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                    `}
                  >
                    {/* Row checkbox */}
                    <td className="pl-4 pr-2 py-3">
                      <button
                        onClick={() => toggleRow(item.id)}
                        className="text-slate-400 dark:text-slate-500 hover:text-[#D4AF37] transition-colors"
                      >
                        {isSelected
                          ? <CheckSquare size={15} className="text-[#D4AF37]" />
                          : <Square size={15} />}
                      </button>
                    </td>

                    {activeCols.map(col => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-[200px]"
                      >
                        {col.render
                          ? col.render(item)
                          : showAvatarFor.includes(col.key) && item[col.key]
                          ? <AvatarCell name={String(item[col.key])} />
                          : (
                            <span className="truncate block">
                              {item[col.key] ?? '—'}
                            </span>
                          )}
                      </td>
                    ))}

                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {actions && actions(item)}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item.id)}
                            className="btn-danger p-1.5 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Toolbar */}
      <BulkToolbar
        count={selected.size}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClear={() => setSelected(new Set())}
        t={t}
      />
    </>
  );
};

export default DataTable;
