import React from 'react';

const ProfessorChipCell = ({ professors = [] }) => {
  if (!professors || professors.length === 0) {
    return <span className="text-slate-400 italic">Unassigned</span>;
  }

  const MAX_VISIBLE = 2;
  const visibleProfs = professors.slice(0, MAX_VISIBLE);
  const remainingCount = professors.length - MAX_VISIBLE;

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {visibleProfs.map((p, idx) => (
        <span 
          key={p.id || idx} 
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600"
        >
          {p.name}
        </span>
      ))}
      
      {remainingCount > 0 && (
        <div className="relative group">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 cursor-help transition-colors hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
            +{remainingCount} others
          </span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="bg-slate-800 text-white text-xs rounded-lg py-2 px-3 shadow-xl">
              <div className="flex flex-col gap-1">
                {professors.slice(MAX_VISIBLE).map(p => (
                  <div key={p.id} className="whitespace-nowrap">{p.name}</div>
                ))}
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorChipCell;
