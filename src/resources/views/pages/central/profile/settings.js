import React, { useState } from 'react';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked, cilTrash, cilSave } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertVariant, setAlertVariant] = useState('success');
  const [alertMessage, setAlertMessage] = useState('Success! Your password has been updated.');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Modern, theme-aware styles aligned with the rest of the template
  const styles = {
    page: {
      maxWidth: '1060px',
      margin: '0 auto',
      padding: '12px 16px 36px'
    },
    sectionHeader: {
      marginBottom: '18px'
    },
    card: {
      border: '1px solid var(--cui-border-color-translucent)',
      boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
      borderRadius: '14px',
      marginBottom: '28px',
      overflow: 'hidden',
      backgroundColor: 'var(--cui-body-bg)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    },
    header: {
      backgroundColor: 'var(--cui-body-bg)',
      borderBottom: '1px solid var(--cui-border-color-translucent)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    headerIcon: {
      color: '#667eea'
    },
    deleteHeaderIcon: {
      color: '#e55353'
    },
    label: {
      fontWeight: 600,
      color: 'var(--cui-body-color)',
      marginBottom: '6px',
      fontSize: '0.92rem'
    },
    input: {
      padding: '12px',
      borderRadius: '10px',
      border: '1px solid var(--cui-border-color-translucent)',
      backgroundColor: 'var(--cui-gray-100, #f8fafc)',
      transition: 'all 0.2s'
    },
    buttonPrimary: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        borderRadius: '10px',
        padding: '12px 24px',
        fontSize: '1rem',
        fontWeight: 600,
        boxShadow: '0 10px 24px rgba(102, 126, 234, 0.35)',
        transition: 'transform 0.2s'
    },
    buttonDanger: {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: '1px solid #fecaca',
        borderRadius: '10px',
        padding: '12px 24px',
        fontSize: '1rem',
        fontWeight: 600,
        boxShadow: 'none',
    },
    dangerZone: {
        backgroundColor: '#fff5f5',
        border: '1px solid #fecaca',
        borderRadius: '14px'
    }
  };

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = 'Current password is required';
    }
    if (!form.newPassword.trim()) {
      nextErrors.newPassword = 'New password is required';
    } else if (form.newPassword.trim().length < 8) {
      nextErrors.newPassword = 'New password must be at least 8 characters';
    }
    if (!form.confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Please confirm your new password';
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }
    if (form.newPassword && form.currentPassword && form.newPassword === form.currentPassword) {
      nextErrors.newPassword = 'New password must be different from current password';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setLoading(true);
      setShowAlert(false);
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/profile/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      if (response.data.status) {
        setAlertVariant('success');
        setAlertMessage(response.data.message || 'Password updated successfully');
        setShowAlert(true);
        setForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setErrors({});
      } else {
        setAlertVariant('danger');
        setAlertMessage(response.data.message || 'Failed to update password');
        setShowAlert(true);
      }
    } catch (err) {
      setAlertVariant('danger');
      setAlertMessage(err.response?.data?.message || 'Failed to update password');
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmed) return;
    try {
      setDeleteLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.delete('/api/profile/delete-account');
      if (response.data.status) {
        setAlertVariant('success');
        setAlertMessage(response.data.message || 'Account deleted');
        setShowAlert(true);
        // Optional: logout after deletion
        await AuthService.logout();
        window.location.href = '/login';
      } else {
        setAlertVariant('danger');
        setAlertMessage(response.data.message || 'Failed to delete account');
        setShowAlert(true);
      }
    } catch (err) {
      setAlertVariant('danger');
      setAlertMessage(err.response?.data?.message || 'Failed to delete account');
      setShowAlert(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="container-fluid p-0 fade-in">
      <div style={styles.page}>
        {/* Page Title */}
        <div className="mb-3" style={styles.sectionHeader}>
          <h2 className="fw-bold text-dark mb-1">Account Settings</h2>
          <p className="text-secondary small mb-0">Manage your security and account preferences.</p>
        </div>

        {/* 1. Change Password Section */}
        <CCard style={styles.card} className="mb-4">
            <CCardHeader style={styles.header}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#eef2ff' }}>
                    <CIcon icon={cilLockLocked} size="lg" style={styles.headerIcon}/>
                </div>
                <div>
                    <h5 className="mb-0 fw-bold text-dark">Change Password</h5>
                    <small className="text-secondary">Ensure your account uses a strong, secure password.</small>
                </div>
            </CCardHeader>
            <CCardBody className="p-4 p-md-5">
                {showAlert && (
                    <CAlert color={alertVariant} dismissible onClose={() => setShowAlert(false)} className="mb-4 shadow-sm border-0">
                        {alertMessage}
                    </CAlert>
                )}
                <CForm onSubmit={handlePasswordUpdate}>
                    <div className="mb-4">
                        <CFormLabel style={styles.label}>Current Password</CFormLabel>
                        <CFormInput 
                            type="password" 
                            placeholder="Enter current password"
                            value={form.currentPassword}
                            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                            style={styles.input}
                        />
                        {errors.currentPassword && <small className="text-danger">{errors.currentPassword}</small>}
                    </div>
                    <div className="mb-4">
                        <CFormLabel style={styles.label}>New Password</CFormLabel>
                        <CFormInput 
                            type="password" 
                            placeholder="Enter new password"
                            value={form.newPassword}
                            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                            style={styles.input}
                        />
                        {errors.newPassword && <small className="text-danger">{errors.newPassword}</small>}
                    </div>
                    <div className="mb-4">
                        <CFormLabel style={styles.label}>Confirm New Password</CFormLabel>
                        <CFormInput 
                            type="password" 
                            placeholder="Re-enter new password"
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            style={styles.input}
                        />
                        {errors.confirmPassword && <small className="text-danger">{errors.confirmPassword}</small>}
                    </div>
                    <div className="d-grid d-md-flex justify-content-md-end">
                        <CButton type="submit" style={styles.buttonPrimary}>
                            {loading ? <CSpinner size="sm"/> : <><CIcon icon={cilSave} className="me-2"/> Update Password</>}
                        </CButton>
                    </div>
                </CForm>
            </CCardBody>
        </CCard>

        {/* 2. Delete Account Section */}
        <CCard style={{...styles.card, ...styles.dangerZone}}>
            <CCardHeader style={{...styles.header, backgroundColor: 'transparent', borderBottom: '1px solid #fecaca'}}>
                <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#fef2f2' }}>
                    <CIcon icon={cilTrash} size="lg" style={styles.deleteHeaderIcon}/>
                </div>
                <div>
                     <h5 className="mb-0 fw-bold text-danger">Delete Account</h5>
                     <small className="text-danger-emphasis">Permanently remove your account and data.</small>
                </div>
            </CCardHeader>
            <CCardBody className="p-4 p-md-5">
                <p className="text-secondary mb-4 small">
                    Once you delete your account, there is no going back. Please be certain. All your data including leads, companies, and settings will be permanently removed.
                </p>
                <div className="d-flex justify-content-end">
                     <CButton
                       color="danger"
                       variant="ghost"
                       className="text-danger fw-bold border-danger"
                       onClick={handleDeleteAccount}
                       disabled={deleteLoading}
                       style={{ ...styles.buttonDanger, minWidth: '170px' }}
                     >
                         {deleteLoading ? <CSpinner size="sm" /> : 'Delete My Account'}
                     </CButton>
                </div>
            </CCardBody>
        </CCard>
      </div>
    </div>
  );
};

export default Settings;
