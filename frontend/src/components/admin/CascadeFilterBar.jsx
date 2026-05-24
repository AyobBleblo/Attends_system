import React from 'react';
import Select from 'react-select';
import { X, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * CascadeFilterBar — filter selects + active filter chips.
 * Phase 3: adds theme-aware select styles + dismissable filter chips below.
 */
const CascadeFilterBar = ({
  activeTab,
  departments,
  studyYears,
  professors,
  majors,
  selectedDepartment,
  selectedStudyYear,
  selectedProfessor,
  selectedMajor,
  onFilterChange,
}) => {
  const { t } = useLanguage();

  const handleDepartmentChange = (option) => {
    onFilterChange({
      department: option ? option.value : null,
      studyYear: selectedStudyYear,
      professor: null,
      major: null,
    });
  };

  const handleStudyYearChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: option ? option.value : null,
      professor: selectedProfessor,
      major: selectedMajor,
    });
  };

  const handleProfessorChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: selectedStudyYear,
      professor: option ? option.value : null,
      major: selectedMajor,
    });
  };

  const handleMajorChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: selectedStudyYear,
      professor: selectedProfessor,
      major: option ? option.value : null,
    });
  };

  const clearAll = () =>
    onFilterChange({ department: null, studyYear: null, professor: null, major: null });

  /* ── Active chips data ────────────────────────────────────────────── */
  const activeChips = [
    selectedDepartment && {
      key: 'department',
      label: `${t('colDepartment')}: ${departments?.find(d => d.id === selectedDepartment)?.name ?? '…'}`,
      clear: () => onFilterChange({ department: null, studyYear: selectedStudyYear, professor: null, major: null }),
    },
    selectedStudyYear && {
      key: 'studyYear',
      label: `${t('colYear')}: ${studyYears?.find(y => y.id === selectedStudyYear)?.name ?? '…'}`,
      clear: () => onFilterChange({ department: selectedDepartment, studyYear: null, professor: selectedProfessor, major: selectedMajor }),
    },
    selectedProfessor && {
      key: 'professor',
      label: `${t('colProfessor')}: ${professors?.find(p => p.id === selectedProfessor)?.name ?? '…'}`,
      clear: () => onFilterChange({ department: selectedDepartment, studyYear: selectedStudyYear, professor: null, major: selectedMajor }),
    },
    selectedMajor && {
      key: 'major',
      label: `${t('colMajor')}: ${majors?.find(m => m.id === selectedMajor)?.name ?? '…'}`,
      clear: () => onFilterChange({ department: selectedDepartment, studyYear: selectedStudyYear, professor: selectedProfessor, major: null }),
    },
  ].filter(Boolean);

  /* ── react-select theme-aware styles ──────────────────────────────── */
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '0.625rem',
      borderColor: state.isFocused ? '#D4AF37' : 'var(--rs-border)',
      backgroundColor: 'var(--rs-bg)',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(212,175,55,0.2)' : 'none',
      '&:hover': { borderColor: '#D4AF37' },
      transition: 'border-color 0.15s, box-shadow 0.15s, background-color 0.15s',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--rs-menu-bg)',
      border: '1px solid var(--rs-border)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      borderRadius: '0.75rem',
      overflow: 'hidden',
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected
        ? 'rgba(212,175,55,0.15)'
        : isFocused
        ? 'var(--rs-option-hover)'
        : 'transparent',
      color: isSelected
        ? 'var(--rs-text-gold)'
        : 'var(--rs-text)',
      fontWeight: isSelected ? 600 : 400,
      fontSize: '0.8125rem',
      cursor: 'pointer',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'var(--rs-text)',
      fontSize: '0.8125rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: 'var(--rs-placeholder)',
      fontSize: '0.8125rem',
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    clearIndicator: (base) => ({ ...base, color: 'var(--rs-placeholder)', padding: '4px' }),
    dropdownIndicator: (base) => ({ ...base, color: 'var(--rs-placeholder)', padding: '4px' }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
  };

  return (
    <div className="mb-6">
      {/* Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-900/80 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60 backdrop-blur-sm">
        {/* Icon */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-1 md:pt-0">
          <SlidersHorizontal size={15} className="text-[#D4AF37]" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider md:hidden">
            {t('filters')}
          </span>
        </div>

        <div className="flex flex-1 flex-col md:flex-row gap-3">
          {/* Department */}
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              {t('colDepartment')}
            </label>
            <Select
              isClearable
              placeholder={t('allDepartments')}
              styles={selectStyles}
              menuPortalTarget={document.body}
              options={departments?.map(d => ({ value: d.id, label: d.name }))}
              value={selectedDepartment
                ? { value: selectedDepartment, label: departments?.find(d => d.id === selectedDepartment)?.name }
                : null}
              onChange={handleDepartmentChange}
            />
          </div>

          {/* Study Year */}
          {['students', 'courses'].includes(activeTab) && (
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {t('colStudyYear')}
              </label>
              <Select
                isClearable
                placeholder={t('allYears')}
                styles={selectStyles}
                menuPortalTarget={document.body}
                options={studyYears?.map(y => ({ value: y.id, label: y.name }))}
                value={selectedStudyYear
                  ? { value: selectedStudyYear, label: studyYears?.find(y => y.id === selectedStudyYear)?.name }
                  : null}
                onChange={handleStudyYearChange}
              />
            </div>
          )}

          {/* Professor (courses + professors tab) */}
          {['courses', 'professors'].includes(activeTab) && (
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {t('colProfessor')}
              </label>
              <Select
                isClearable
                placeholder={t('allProfessors')}
                styles={selectStyles}
                menuPortalTarget={document.body}
                options={professors?.map(p => ({ value: p.id, label: p.name }))}
                value={selectedProfessor
                  ? { value: selectedProfessor, label: professors?.find(p => p.id === selectedProfessor)?.name }
                  : null}
                onChange={handleProfessorChange}
                isDisabled={!professors || professors.length === 0}
              />
            </div>
          )}

          {/* Major (students tab) */}
          {activeTab === 'students' && (
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                {t('colMajor')}
              </label>
              <Select
                isClearable
                placeholder={t('allMajors')}
                styles={selectStyles}
                menuPortalTarget={document.body}
                options={majors?.map(m => ({ value: m.id, label: m.name }))}
                value={selectedMajor
                  ? { value: selectedMajor, label: majors?.find(m => m.id === selectedMajor)?.name }
                  : null}
                onChange={handleMajorChange}
                isDisabled={!majors || majors.length === 0}
              />
            </div>
          )}
        </div>

        {/* Clear all — only when filters are active */}
        {activeChips.length > 0 && (
          <button
            onClick={clearAll}
            className="shrink-0 self-center text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 mt-auto md:mt-0 whitespace-nowrap"
          >
            {t('clearAll')}
          </button>
        )}
      </div>

      {/* ── Active filter chips ──────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5 px-1">
          {activeChips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                         bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#92700d] dark:text-[#D4AF37]
                         transition-all duration-150"
            >
              {chip.label}
              <button
                onClick={chip.clear}
                aria-label={`Remove ${chip.label} filter`}
                className="hover:bg-[#D4AF37]/20 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CascadeFilterBar;
