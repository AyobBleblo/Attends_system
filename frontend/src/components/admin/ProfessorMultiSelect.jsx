import React from 'react';
import Select from 'react-select';

const ProfessorMultiSelect = ({ options, value, onChange, placeholder = "Select professors..." }) => {
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
    multiValue: (base) => ({
      ...base,
      backgroundColor: '#f1f5f9',
      borderRadius: '0.375rem',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#334155',
      fontWeight: '500',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: '#64748b',
      '&:hover': {
        backgroundColor: '#e2e8f0',
        color: '#ef4444',
      },
    }),
    menuPortal: base => ({ ...base, zIndex: 9999 })
  };

  return (
    <Select
      isMulti
      placeholder={placeholder}
      styles={selectStyles}
      menuPortalTarget={document.body}
      options={options}
      value={value}
      onChange={onChange}
    />
  );
};

export default ProfessorMultiSelect;
