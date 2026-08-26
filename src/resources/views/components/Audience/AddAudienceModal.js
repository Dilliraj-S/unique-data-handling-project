import React, { useEffect, useMemo, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormSwitch,
  CRow,
  CCol,
  CButton,
  CAlert,
  CSpinner,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPeople, cilSave, cilX } from '@coreui/icons';

const AddAudienceModal = ({
  visible,
  onClose,
  onSave,
  availableAudiences = [],
  loadingAudiences = false,
  saving = false,
  error = null,
  selectedCount = 0
}) => {
  const [mode, setMode] = useState('existing');
  const [audienceId, setAudienceId] = useState('');
  const [audienceName, setAudienceName] = useState('');
  const [splitFullName, setSplitFullName] = useState(true);
  const [formError, setFormError] = useState('');

  const hasExistingAudiences = useMemo(() => availableAudiences.length > 0, [availableAudiences]);

  useEffect(() => {
    if (visible) {
      setMode(hasExistingAudiences ? 'existing' : 'new');
      setAudienceId('');
      setAudienceName('');
      setSplitFullName(true);
      setFormError('');
    }
  }, [visible, hasExistingAudiences]);

  const normalizedAudiences = useMemo(
    () =>
      availableAudiences.map((audience) => ({
        id:
          typeof audience.id === 'number'
            ? String(audience.id)
            : audience.id?.toString?.() || String(audience.id || ''),
        label: audience.name,
      })),
    [availableAudiences]
  );

  const handleSave = () => {
    if (mode === 'existing' && !audienceId) {
      setFormError('Please choose an existing audience.');
      return;
    }
    if (mode === 'new' && !audienceName.trim()) {
      setFormError('Please provide a name for the new audience.');
      return;
    }
    setFormError('');
    onSave({
      mode,
      audienceId,
      audienceName: audienceName.trim(),
      splitFullName
    });
  };

  const showNewAudienceField = mode === 'new';
  const disableSave =
    saving ||
    (mode === 'existing' && !audienceId) ||
    (mode === 'new' && !audienceName.trim());

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center">
          <CIcon icon={cilPeople} className="me-2" />
          Add Audience
          {selectedCount > 0 && (
            <CBadge color="info" className="ms-3">
              {selectedCount} selected
            </CBadge>
          )}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        {formError && (
          <CAlert color="warning" className="mb-3" onClose={() => setFormError('')} dismissible>
            {formError}
          </CAlert>
        )}
        <CRow className="mb-3">
          <CCol md={6}>
            <CFormLabel className="fw-semibold">
              Mode <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={!hasExistingAudiences && loadingAudiences}
            >
              {hasExistingAudiences && <option value="existing">Existing</option>}
              <option value="new">New</option>
            </CFormSelect>
          </CCol>
          {mode === 'existing' && (
            <CCol md={6}>
              <CFormLabel className="fw-semibold">
                Existing Audience <span className="text-danger">*</span>
              </CFormLabel>
              <div className="d-flex align-items-center gap-2">
                <CFormSelect
                  value={audienceId}
                  onChange={(e) => setAudienceId(e.target.value)}
                  disabled={loadingAudiences}
                >
                  <option value="">Select an audience</option>
                  {normalizedAudiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.label}
                    </option>
                  ))}
                </CFormSelect>
                {loadingAudiences && <CSpinner size="sm" />}
              </div>
              {!hasExistingAudiences && !loadingAudiences && (
                <small className="text-muted">
                  No audiences found. Please create a new audience.
                </small>
              )}
            </CCol>
          )}
          {showNewAudienceField && (
            <CCol md={6} className="mt-3 mt-md-0">
              <CFormLabel className="fw-semibold">
                New Audience Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                placeholder="Enter audience name"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                disabled={saving}
              />
            </CCol>
          )}
        </CRow>
        <CRow className="mb-2">
          <CCol md={12}>
            <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2">
              <div>
                <div className="fw-semibold">Split Full Name</div>
                <small className="text-muted">
                  When enabled, contacts with only a full name will be split into first and last name
                  before saving.
                </small>
              </div>
              <CFormSwitch
                checked={splitFullName}
                onChange={(e) => setSplitFullName(e.target.checked)}
                label=""
              />
            </div>
          </CCol>
        </CRow>
        <CAlert color="info" className="mt-3 mb-0">
          Selected records will be copied to the <strong>subscribers</strong> collection once you
          click <strong>Save Audience</strong>.
        </CAlert>
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          <CIcon icon={cilX} className="me-2" />
          Close
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={disableSave}>
          {saving && <CSpinner size="sm" className="me-2" />}
          <CIcon icon={cilSave} className="me-2" />
          Save Audience
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default AddAudienceModal;


