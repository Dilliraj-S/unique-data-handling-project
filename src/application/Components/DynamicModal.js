import React, { useState, useEffect } from 'react';
import {
  CModal,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CCol,
  CRow,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilReload, cilFullscreen, cilX } from '@coreui/icons';

/**
 * DynamicModal Component
 * Renders a modal with dynamically generated form fields
 * Based on configuration from backend
 */
const DynamicModal = ({ 
  show, 
  onClose, 
  config, 
  mode = 'add', 
  onSubmit,
  data = null
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});

  // Initialize form data
  useEffect(() => {
    if (config && config.fields) {
      const initialData = {};
      const initialPreviews = {};
      config.fields.forEach(field => {
        // For hidden fields, use the value from field.value, otherwise use empty string
        // For other fields, use field.value or empty string
        initialData[field.name] = field.value !== undefined && field.value !== null ? field.value : '';
        
        // Set image previews for file/image fields
        if ((field.type === 'file' || field.type === 'image') && field.value) {
          initialPreviews[field.name] = field.value;
        }
      });
      setFormData(initialData);
      setImagePreviews(initialPreviews);
      console.log('📋 Form data initialized:', initialData);
    }
  }, [config]);

  // Handle input change
  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle file upload
  const handleFileChange = async (name, file, fieldType = 'profile') => {
    if (!file) {
      handleChange(name, '');
      setImagePreviews(prev => ({ ...prev, [name]: null }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({
        ...prev,
        [name]: 'Please select an image file'
      }));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [name]: 'File size must be less than 10MB'
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => ({
        ...prev,
        [name]: reader.result
      }));
    };
    reader.readAsDataURL(file);

    // Upload file to server
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', fieldType);

      const response = await fetch('/api/users/upload-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.status) {
        handleChange(name, result.path);
        // Clear error if upload successful
        setErrors(prev => ({
          ...prev,
          [name]: null
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          [name]: result.message || 'Upload failed'
        }));
      }
    } catch (error) {
      console.error('File upload error:', error);
      setErrors(prev => ({
        ...prev,
        [name]: 'Failed to upload image'
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    config.fields.forEach(field => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }

      if (field.validation && formData[field.name]) {
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(formData[field.name])) {
            newErrors[field.name] = field.validation.message || 'Invalid format';
          }
        }

        if (field.validation.maxLength) {
          if (formData[field.name].length > field.validation.maxLength) {
            newErrors[field.name] = `Maximum ${field.validation.maxLength} characters allowed`;
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Render form field based on type
  const renderField = (field) => {
    const hasError = errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'password':
        return (
          <CFormInput
            type={field.type}
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            invalid={hasError}
            floatingLabel={config.labelType === 'floating' ? field.label : undefined}
            {...(field.attr || {})}
          />
        );

      case 'number':
        return (
          <CFormInput
            type="number"
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            invalid={hasError}
            floatingLabel={config.labelType === 'floating' ? field.label : undefined}
          />
        );

      case 'select':
        // Normalize options - handle object, array of objects, or array of strings
        let normalizedOptions = [];
        
        if (field.options) {
          if (Array.isArray(field.options)) {
            // Array of objects or strings
            normalizedOptions = field.options.map(opt => {
              if (typeof opt === 'string') {
                return { value: opt, label: opt.charAt(0).toUpperCase() + opt.slice(1) };
              }
              return opt;
            });
          } else if (typeof field.options === 'object') {
            // Object like { 'active': 'Active', 'deactive': 'Deactive' }
            normalizedOptions = Object.entries(field.options).map(([value, label]) => ({
              value,
              label: label || value
            }));
          }
        }

        // Handle multiple select
        const isMultiple = field.attr?.multiple === 'multiple' || field.attr?.multiple === true;
        const selectValue = isMultiple 
          ? (Array.isArray(formData[field.name]) ? formData[field.name] : [])
          : (formData[field.name] || '');

        return (
          <CFormSelect
            id={field.name}
            name={field.name}
            value={selectValue}
            onChange={(e) => {
              if (isMultiple) {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleChange(field.name, selected);
              } else {
                handleChange(field.name, e.target.value);
              }
            }}
            invalid={hasError}
            floatingLabel={config.labelType === 'floating' ? field.label : undefined}
            multiple={isMultiple}
            style={{ color: '#000' }}
          >
            {!isMultiple && (
              <option value="" style={{ color: '#666' }}>Select {field.label}</option>
            )}
            {normalizedOptions.map((opt, idx) => {
              const optValue = opt.value || opt;
              const optLabel = opt.label || opt.value || opt;
              
              return (
                <option 
                  key={optValue || idx} 
                  value={optValue}
                  style={{ color: '#000' }}
                >
                  {optLabel}
                </option>
              );
            })}
          </CFormSelect>
        );

      case 'textarea':
        return (
          <CFormTextarea
            id={field.name}
            name={field.name}
            placeholder={field.placeholder}
            value={formData[field.name] || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            rows={field.rows || 3}
            invalid={hasError}
            floatingLabel={config.labelType === 'floating' ? field.label : undefined}
          />
        );

      case 'checkbox':
        return (
          <CFormCheck
            id={field.name}
            name={field.name}
            label={field.label}
            checked={formData[field.name] || false}
            onChange={(e) => handleChange(field.name, e.target.checked)}
          />
        );

      case 'checkboxgroup':
        const selectedValues = Array.isArray(formData[field.name]) ? formData[field.name] : [];
        return (
          <div>
            {field.options?.map(opt => (
              <CFormCheck
                key={opt.value}
                id={`${field.name}_${opt.value}`}
                name={field.name}
                label={opt.label}
                checked={selectedValues.includes(opt.value)}
                onChange={(e) => {
                  const currentValues = Array.isArray(formData[field.name]) ? formData[field.name] : [];
                  if (e.target.checked) {
                    handleChange(field.name, [...currentValues, opt.value]);
                  } else {
                    handleChange(field.name, currentValues.filter(v => v !== opt.value));
                  }
                }}
                className="mb-2"
              />
            ))}
          </div>
        );

      case 'file':
      case 'image':
        const fieldType = field.name === 'profile' ? 'profile' : (field.name === 'cover' ? 'cover' : 'profile');
        const currentImagePath = formData[field.name] || field.value || '';
        const previewUrl = imagePreviews[field.name] || (currentImagePath ? currentImagePath : null);
        
        return (
          <div>
            <CFormInput
              type="file"
              id={field.name}
              name={field.name}
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileChange(field.name, file, fieldType);
                } else {
                  handleChange(field.name, '');
                  setImagePreviews(prev => ({ ...prev, [field.name]: null }));
                }
              }}
              invalid={hasError}
            />
            {previewUrl && (
              <div className="mt-2">
                <img
                  src={previewUrl}
                  alt={field.label}
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '4px'
                  }}
                />
                {currentImagePath && (
                  <div className="mt-1">
                    <small className="text-muted">Current: {currentImagePath}</small>
                  </div>
                )}
              </div>
            )}
            {field.helpText && (
              <div className="form-text">{field.helpText}</div>
            )}
          </div>
        );

      case 'hidden':
        // Hidden fields are rendered as input[type="hidden"] but not displayed
        // Ensure the value is synced with formData
        const hiddenValue = formData[field.name] !== undefined ? formData[field.name] : (field.value || '');
        return (
          <input
            type="hidden"
            id={field.name}
            name={field.name}
            value={hiddenValue}
            onChange={(e) => handleChange(field.name, e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  if (!config) return null;

  return (
    <CModal
      visible={show}
      onClose={onClose}
      size={config.modal?.size || 'lg'}
      backdrop="static"
      className="skeleton-modal"
    >
      <div className="skeleton-modal-header">
        <div className="skeleton-mdl-hdr-lbl-grp">
          <button type="button" className="btn modal-drag-handle" style={{ cursor: 'move' }}>
            <span className="text-black">⋮⋮</span>
          </button>
          <div className="d-flex flex-column">
            <h5 className="modal-title skeleton-modal-label m-0" dangerouslySetInnerHTML={{ __html: config.modal?.title || 'Form' }} />
            {config.modal?.short_label && (
              <label className="sf-11">{config.modal.short_label}</label>
            )}
          </div>
        </div>
        <div className="skeleton-mdl-hdr-btn-grp">
          <button type="button" className="modal-data-reload-btn update-form-data-dyn" title="Reload">
            <CIcon icon={cilReload} />
          </button>
          <button type="button" className="modal-fullscreen-btn" title="Fullscreen">
            <CIcon icon={cilFullscreen} />
          </button>
          <button type="button" onClick={onClose} title="Close">
            <CIcon icon={cilX} />
          </button>
        </div>
      </div>
      
      <CForm onSubmit={handleSubmit} className="skeleton-form">
        <div className="skeleton-modal-body">
          {/* Display notes if any */}
          {config.notes && config.notes.length > 0 && (
            <CAlert color="info" className="mb-3">
              {config.notes.map((note, idx) => (
                <div key={idx}>{note}</div>
              ))}
            </CAlert>
          )}

          <CRow>
            {config.fields?.map((field, index) => {
              // Skip rendering hidden fields in the UI (they're still in the form)
              if (field.type === 'hidden') {
                return <React.Fragment key={field.name}>{renderField(field)}</React.Fragment>;
              }
              
              return (
              <CCol key={field.name} xs={field.col || 12} className="mb-3">
                {config.labelType !== 'floating' && field.type !== 'checkbox' && (
                  <label htmlFor={field.name} className="form-label">
                    {field.label}
                    {field.required && <span className="text-danger"> *</span>}
                  </label>
                )}
                
                {renderField(field)}

                {field.helpText && (
                  <div className="form-text">{field.helpText}</div>
                )}

                {errors[field.name] && (
                  <div className="invalid-feedback d-block">
                    {errors[field.name]}
                  </div>
                )}
              </CCol>
              );
            })}
          </CRow>
        </div>

        <div className="skeleton-modal-footer">
          <CButton color="secondary" onClick={onClose}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit">
            {config.modal?.button || 'Save'}
          </CButton>
        </div>
      </CForm>
    </CModal>
  );
};

export default DynamicModal;

