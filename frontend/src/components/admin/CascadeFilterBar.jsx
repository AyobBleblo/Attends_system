import React from 'react';
import Select from 'react-select';

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
  onFilterChange 
}) => {
  
  const handleDepartmentChange = (option) => {
    onFilterChange({ 
      department: option ? option.value : null,
      studyYear: selectedStudyYear,
      professor: null, // Reset professor because it depends on department
      major: null      // Reset major because it depends on department
    });
  };

  const handleStudyYearChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: option ? option.value : null,
      professor: selectedProfessor,
      major: selectedMajor
    });
  };

  const handleProfessorChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: selectedStudyYear,
      professor: option ? option.value : null,
      major: selectedMajor
    });
  };

  const handleMajorChange = (option) => {
    onFilterChange({
      department: selectedDepartment,
      studyYear: selectedStudyYear,
      professor: selectedProfessor,
      major: option ? option.value : null
    });
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '0.5rem',
      borderColor: '#e2e8f0',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#cbd5e1'
      }
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-6">
      <div className="flex-1">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Department
        </label>
        <Select
          isClearable
          placeholder="All Departments"
          styles={selectStyles}
          menuPortalTarget={document.body}
          options={departments?.map(d => ({ value: d.id, label: d.name }))}
          value={selectedDepartment ? { value: selectedDepartment, label: departments?.find(d => d.id === selectedDepartment)?.name } : null}
          onChange={handleDepartmentChange}
        />
      </div>
      
      <div className="flex-1">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Study Year
        </label>
        <Select
          isClearable
          placeholder="All Years"
          styles={selectStyles}
          menuPortalTarget={document.body}
          options={studyYears?.map(y => ({ value: y.id, label: y.name }))}
          value={selectedStudyYear ? { value: selectedStudyYear, label: studyYears?.find(y => y.id === selectedStudyYear)?.name } : null}
          onChange={handleStudyYearChange}
        />
      </div>

      {['courses', 'professors'].includes(activeTab) && (
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Professor
          </label>
          <Select
            isClearable
            placeholder="All Professors"
            styles={selectStyles}
            menuPortalTarget={document.body}
            options={professors?.map(p => ({ value: p.id, label: p.name }))}
            value={selectedProfessor ? { value: selectedProfessor, label: professors?.find(p => p.id === selectedProfessor)?.name } : null}
            onChange={handleProfessorChange}
            isDisabled={!professors || professors.length === 0}
          />
        </div>
      )}

      {activeTab === 'students' && (
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Major
          </label>
          <Select
            isClearable
            placeholder="All Majors"
            styles={selectStyles}
            menuPortalTarget={document.body}
            options={majors?.map(m => ({ value: m.id, label: m.name }))}
            value={selectedMajor ? { value: selectedMajor, label: majors?.find(m => m.id === selectedMajor)?.name } : null}
            onChange={handleMajorChange}
            isDisabled={!majors || majors.length === 0}
          />
        </div>
      )}
    </div>
  );
};

export default CascadeFilterBar;
