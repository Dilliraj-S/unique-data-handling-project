import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CRow,
  CCol,
  CFormSelect,
  CFormTextarea,
  CFormInput,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CProgress,
  CProgressBar
} from '@coreui/react';
import { useNavigate, useParams } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import DynamicTable from 'src/application/Components/DynamicTable';

const defaultStats = { total: 0, subscribed: 0, unsubscribed: 0 };

const AudienceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audience, setAudience] = useState(null);
  const [audienceStats, setAudienceStats] = useState(defaultStats);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('subscribers');
  const [manageTab, setManageTab] = useState('manual');
  const [manualFormat, setManualFormat] = useState('first-email');
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [manageMessage, setManageMessage] = useState('');
  const [csvFormat, setCsvFormat] = useState('first-email');
  const [csvFile, setCsvFile] = useState(null);
  const [csvError, setCsvError] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvJobId, setCsvJobId] = useState(null);
  const [csvProgress, setCsvProgress] = useState(0);
  const [csvJobState, setCsvJobState] = useState(null);
  const csvProgressIntervalRef = useRef(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState(null);
  const [actionSubscriberId, setActionSubscriberId] = useState(null);
  const [globalError, setGlobalError] = useState('');
  const [sourceTable, setSourceTable] = useState('');
  const [sourceSystem, setSourceSystem] = useState('sun');

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const fetchAudience = async () => {
    setLoadingAudience(true);
    setGlobalError('');
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/api/audiences/${id}`);
      const data = response.data?.data;
      setAudience(data || null);
      setAudienceStats(data?.stats || defaultStats);
    } catch (err) {
      console.error('Failed to load audience:', err);
      setGlobalError(err.response?.data?.message || 'Failed to load audience details.');
    } finally {
      setLoadingAudience(false);
    }
  };

  useEffect(() => {
    if (id) {
      console.log('🔍 AudienceDetails - Audience ID from URL:', id, 'Type:', typeof id);
      fetchAudience();
    }
  }, [id]);

  const parseLinesToSubscribers = (lines = [], format = 'first-email') => {
    return lines
      .map((line) => line.split(',').map((segment) => segment.trim()))
      .map((parts) => {
        if (format === 'first-email' && parts.length >= 2) {
          return {
            first_name: parts[0],
            last_name: '',
            email: parts[1]
          };
        }
        if (format === 'first-last-email' && parts.length >= 3) {
          return {
            first_name: parts[0],
            last_name: parts[1],
            email: parts[2]
          };
        }
        return null;
      })
      .filter((subscriber) => subscriber && subscriber.email);
  };

  const saveSubscribers = async (records) => {
    if (!records.length) {
      setManualError('No valid subscribers found in the input.');
      return;
    }
    setManualError('');
    setManageMessage('');
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/subscribers/bulk', {
        audience_id: id,
        subscribers: records,
        source_table: sourceTable || null,
        source_system: sourceSystem || null
      });
      
      // Check if job was queued
      if (response.data?.queued && response.data?.jobId) {
        setManageMessage(`Large import queued! Processing ${response.data.total || records.length} subscribers in background. Job ID: ${response.data.jobId}`);
        // Refresh after a delay to show progress
        setTimeout(async () => {
          setRefreshTrigger(prev => prev + 1);
          await fetchAudience();
        }, 5000);
      } else {
        setManageMessage(response.data?.message || `${records.length} subscriber(s) added.`);
        setManualInput('');
        setCsvFile(null);
        setRefreshTrigger(prev => prev + 1);
        await fetchAudience();
      }
    } catch (err) {
      console.error('Failed to add subscribers:', err);
      // Check if it's a 401 error (token expired)
      if (err.response?.status === 401) {
        setManualError('Authentication expired. Please refresh the page and try again.');
      } else {
        setManualError(err.response?.data?.message || 'Failed to add subscribers.');
      }
    }
  };

  const handleManualAdd = () => {
    const lines = manualInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      setManualError('Please enter at least one subscriber.');
      return;
    }

    const parsed = parseLinesToSubscribers(lines, manualFormat);
    if (!parsed.length) {
      setManualError('No valid rows detected. Use comma separated values.');
      return;
    }

    saveSubscribers(parsed);
  };

  const startCsvProgressPolling = (jobId) => {
    if (!jobId) return;

    // Clear previous interval if any
    if (csvProgressIntervalRef.current) {
      clearInterval(csvProgressIntervalRef.current);
    }

    setCsvJobId(jobId);
    setCsvProgress(0);
    setCsvJobState('waiting');

    const poll = async () => {
      try {
        const authAxios = getAuthAxios();
        const response = await authAxios.get(`/api/import-jobs/${jobId}`);
        const data = response.data;
        if (!data?.status) return;

        const progressValue = typeof data.progress === 'number' ? data.progress : 0;
        setCsvProgress(progressValue);
        setCsvJobState(data.state || null);

        if (data.state === 'completed' || data.state === 'failed') {
          if (csvProgressIntervalRef.current) {
            clearInterval(csvProgressIntervalRef.current);
            csvProgressIntervalRef.current = null;
          }

          // Refresh audience and subscribers once completed
          setRefreshTrigger(prev => prev + 1);
          await fetchAudience();
        }
      } catch (err) {
        console.error('Failed to fetch import job status:', err);
      }
    };

    // Initial poll and then every 3 seconds
    poll();
    csvProgressIntervalRef.current = setInterval(poll, 3000);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setCsvError('Please select a CSV file.');
      return;
    }

    setCsvLoading(true);
    setCsvError('');
    try {
      // Always use queue-based CSV import (Bull/Redis) for all file sizes
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('audience_id', id);
      formData.append('format', csvFormat);
      if (sourceTable) formData.append('source_table', sourceTable);
      if (sourceSystem) formData.append('source_system', sourceSystem);

      const authAxios = getAuthAxios();
      const uploadResponse = await authAxios.post('/api/subscribers/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (uploadResponse.data?.queued && uploadResponse.data?.jobId) {
        setManageMessage(
          `CSV import queued for background processing. Job ID: ${uploadResponse.data.jobId}. The import will continue in the background.`
        );
        setCsvFile(null);
        startCsvProgressPolling(uploadResponse.data.jobId);
      } else {
        throw new Error(uploadResponse.data?.message || 'Failed to queue CSV import');
      }
    } catch (err) {
      console.error('Failed to process CSV file:', err);
      // Check if it's a 401 error (token expired)
      if (err.response?.status === 401) {
        setCsvError('Authentication expired. Please refresh the page and try again.');
      } else {
        setCsvError(err.response?.data?.message || 'Failed to process CSV file.');
      }
    } finally {
      setCsvLoading(false);
    }
  };

  const handleStatusChange = async (subscriber, status) => {
    setActionSubscriberId(subscriber.id);
    try {
      const authAxios = getAuthAxios();
      await authAxios.put(`/api/subscribers/${subscriber.id}`, { status });
      setRefreshTrigger(prev => prev + 1);
      await fetchAudience();
    } catch (err) {
      console.error('Failed to update subscriber status:', err);
      setGlobalError(err.response?.data?.message || 'Failed to update subscriber status.');
    } finally {
      setActionSubscriberId(null);
    }
  };

  const handleDeleteSubscriber = async (subscriber) => {
    if (!window.confirm('Delete this subscriber?')) return;
    setActionSubscriberId(subscriber.id);
    try {
      const authAxios = getAuthAxios();
      await authAxios.delete(`/api/subscribers/${subscriber.id}`);
      setRefreshTrigger(prev => prev + 1);
      await fetchAudience();
    } catch (err) {
      console.error('Failed to delete subscriber:', err);
      setGlobalError(err.response?.data?.message || 'Failed to delete subscriber.');
    } finally {
      setActionSubscriberId(null);
    }
  };

  const openEditModal = (subscriber) => {
    setEditingSubscriber({
      ...subscriber,
      first_name: subscriber.first_name || '',
      last_name: subscriber.last_name || '',
      email: subscriber.email || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveSubscriberChanges = async () => {
    if (!editingSubscriber) return;
    if (!editingSubscriber.first_name?.trim() || !editingSubscriber.email?.trim()) {
      setGlobalError('First name and email are required.');
      return;
    }
    setActionSubscriberId(editingSubscriber.id);
    try {
      const authAxios = getAuthAxios();
      await authAxios.put(`/api/subscribers/${editingSubscriber.id}`, {
        first_name: editingSubscriber.first_name,
        last_name: editingSubscriber.last_name,
        email: editingSubscriber.email
      });
      setEditModalOpen(false);
      setEditingSubscriber(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to update subscriber:', err);
      setGlobalError(err.response?.data?.message || 'Failed to update subscriber.');
    } finally {
      setActionSubscriberId(null);
    }
  };

  const statusBadge = (status) => {
    if (status === 'subscribed') {
      return <CBadge color="success">Subscribed</CBadge>;
    }
    if (status === 'unsubscribed') {
      return <CBadge color="secondary">Unsubscribed</CBadge>;
    }
    return <CBadge color="info">{status || 'unknown'}</CBadge>;
  };

  const statsDisplay = useMemo(() => {
    return [
      { label: 'Total', value: audienceStats.total },
      { label: 'Subscribed', value: audienceStats.subscribed },
      { label: 'Unsubscribed', value: audienceStats.unsubscribed }
    ];
  }, [audienceStats]);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Email Marketing Audience Details</h3>
          <p className="text-muted mb-0">Manage subscribers and audience membership</p>
        </div>
        <CButton color="secondary" onClick={() => navigate(-1)}>
          Back
        </CButton>
      </div>

      {globalError && (
        <CAlert color="danger" className="mb-3" dismissible onClose={() => setGlobalError('')}>
          {globalError}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          {loadingAudience ? (
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" /> Loading audience...
            </div>
          ) : (
            <div className="d-flex justify-content-between flex-wrap gap-3">
              <div>
                <h4 className="mb-1">{audience?.name || 'Unnamed Audience'}</h4>
                <small className="text-muted">
                  Audience ID: {audience?.id} | Created:{' '}
                  {audience?.created_at ? new Date(audience.created_at).toLocaleString() : 'N/A'}
                </small>
              </div>
              <div className="d-flex gap-3">
                {statsDisplay.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="fw-bold fs-4">{stat.value}</div>
                    <small className="text-muted">{stat.label}</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CCardHeader>
        <CCardBody>
          <CNav variant="tabs">
            <CNavItem>
              <CNavLink
                active={activeTab === 'subscribers'}
                component="button"
                onClick={() => setActiveTab('subscribers')}
              >
                Subscribers
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={activeTab === 'manage'}
                component="button"
                onClick={() => setActiveTab('manage')}
              >
                Manage Subscribers
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent className="mt-4">
            <CTabPane visible={activeTab === 'subscribers'}>
              {id ? (
                <DynamicTable
                  key={`subscribers-${refreshTrigger}`}
                  token="central_emails_subscribers_t"
                  tableName="subscribers"
                  system="central"
                  columns={{
                    id: ['id', true],
                    first_name: ['first_name', true],
                    last_name: ['last_name', true],
                    email: ['email', true],
                    status: ['status', true],
                    created_at: ['created_at', true],
                    updated_at: ['updated_at', true]
                  }}
                  custom={[]}
                  reqSet={{
                    token: 'central_emails_subscribers_t',
                    key: 'central_emails_subscribers',
                    table: 'subscribers',
                    actions: 'e', // Only edit action (custom actions will be added)
                    act: 'id',
                    system: 'central'
                  }}
                  initialFilters={{
                    columns: {
                      audience_id: {
                        search: { value: [String(id)] }
                      }
                    },
                    filterType: {
                      audience_id: 'strict'
                    },
                    pagination: { page: 1, limit: 10 }
                  }}
                  onAction={(actionType, row) => {
                    if (!row) return;
                    if (actionType === 'edit') openEditModal(row);
                  }}
                  autoFetch={true}
                  emptyMessage="No subscribers found. Add subscribers using the 'Manage Subscribers' tab."
                />
              ) : (
                <div className="text-center py-5">
                  <p className="text-muted">Loading audience information...</p>
                </div>
              )}
            </CTabPane>

            <CTabPane visible={activeTab === 'manage'}>
              <CNav variant="pills" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={manageTab === 'manual'}
                    component="button"
                    onClick={() => setManageTab('manual')}
                  >
                    Manually Add
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={manageTab === 'csv'}
                    component="button"
                    onClick={() => setManageTab('csv')}
                  >
                    Import CSV
                  </CNavLink>
                </CNavItem>
              </CNav>

              {/* Source Collection — shared by both tabs */}
              <CCard className="mb-3 border" style={{ backgroundColor: '#f8f9fa' }}>
                <CCardBody className="py-2">
                  <CRow className="g-2 align-items-end">
                    <CCol md={4}>
                      <CFormLabel className="mb-1 small fw-semibold">Source Collection <small className="text-muted">(optional)</small></CFormLabel>
                      <CFormInput
                        size="sm"
                        placeholder="e.g. master_leads, karurwithoutemail"
                        value={sourceTable}
                        onChange={(e) => setSourceTable(e.target.value)}
                      />
                    </CCol>
                    <CCol md={3}>
                      <CFormLabel className="mb-1 small fw-semibold">Source Database</CFormLabel>
                      <CFormSelect
                        size="sm"
                        value={sourceSystem}
                        onChange={(e) => setSourceSystem(e.target.value)}
                      >
                        <option value="sun">sun</option>
                        <option value="pluto">pluto</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={5}>
                      <small className="text-muted">
                        Enter the source collection name to enable automated bounce & sent-status updates after campaigns.
                      </small>
                    </CCol>
                  </CRow>
                </CCardBody>
              </CCard>

              {manageTab === 'manual' && (
                <>
                  {manageMessage && (
                    <CAlert color="success" className="mb-3" dismissible onClose={() => setManageMessage('')}>
                      {manageMessage}
                    </CAlert>
                  )}
                  {manualError && (
                    <CAlert color="danger" className="mb-3" dismissible onClose={() => setManualError('')}>
                      {manualError}
                    </CAlert>
                  )}
                  <CRow className="g-3">
                    <CCol md={4}>
                      <CFormSelect value={manualFormat} onChange={(e) => setManualFormat(e.target.value)}>
                        <option value="first-email">First Name, Email</option>
                        <option value="first-last-email">First Name, Last Name, Email</option>
                      </CFormSelect>
                    </CCol>
                    <CCol xs={12}>
                      <CFormTextarea
                        rows={6}
                        placeholder="e.g. John, john@example.com"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                      />
                    </CCol>
                    <CCol xs={12}>
                      <CButton color="success" onClick={handleManualAdd}>
                        Add Subscribers
                      </CButton>
                    </CCol>
                  </CRow>
                </>
              )}

              {manageTab === 'csv' && (
                <>
                  {csvError && (
                    <CAlert color="danger" className="mb-3" dismissible onClose={() => setCsvError('')}>
                      {csvError}
                    </CAlert>
                  )}
                  {manageMessage && (
                    <CAlert color="success" className="mb-3" dismissible onClose={() => setManageMessage('')}>
                      {manageMessage}
                    </CAlert>
                  )}
                  <CRow className="g-3">
                    <CCol md={4}>
                      <CFormSelect value={csvFormat} onChange={(e) => setCsvFormat(e.target.value)}>
                        <option value="first-email">First Name, Email</option>
                        <option value="first-last-email">First Name, Last Name, Email</option>
                      </CFormSelect>
                    </CCol>
                    <CCol md={8}>
                      <CFormInput
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      />
                    </CCol>
                    <CCol xs={12}>
                      <CButton color="primary" onClick={handleCsvUpload} disabled={csvLoading}>
                        {csvLoading && <CSpinner size="sm" className="me-2" />}
                        Upload CSV
                      </CButton>
                    </CCol>
                    {csvJobId && (
                      <CCol xs={12}>
                        <CFormLabel className="fw-semibold">Import Progress</CFormLabel>
                        <div className="mb-2">
                          <small className="text-muted">
                            Job ID: {csvJobId} | Status: {csvJobState || 'queued'}
                          </small>
                        </div>
                        <CRow>
                          <CCol md={8}>
                            <CProgress>
                              <CProgressBar
                                value={csvProgress}
                                color={csvJobState === 'failed' ? 'danger' : csvProgress === 100 ? 'success' : 'info'}
                                animated={csvJobState !== 'completed' && csvJobState !== 'failed'}
                              >
                                {Math.round(csvProgress)}%
                              </CProgressBar>
                            </CProgress>
                          </CCol>
                        </CRow>
                      </CCol>
                    )}
                  </CRow>
                </>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      <CModal visible={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <CModalHeader>
          <CModalTitle>Edit Subscriber</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel htmlFor="edit-first-name">First Name</CFormLabel>
            <CFormInput
              id="edit-first-name"
              value={editingSubscriber?.first_name || ''}
              onChange={(e) =>
                setEditingSubscriber((prev) => ({ ...prev, first_name: e.target.value }))
              }
            />
          </div>
          <div className="mb-3">
            <CFormLabel htmlFor="edit-last-name">Last Name</CFormLabel>
            <CFormInput
              id="edit-last-name"
              value={editingSubscriber?.last_name || ''}
              onChange={(e) =>
                setEditingSubscriber((prev) => ({ ...prev, last_name: e.target.value }))
              }
            />
          </div>
          <div>
            <CFormLabel htmlFor="edit-email">Email</CFormLabel>
            <CFormInput
              id="edit-email"
              value={editingSubscriber?.email || ''}
              onChange={(e) =>
                setEditingSubscriber((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setEditModalOpen(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveSubscriberChanges} disabled={actionSubscriberId === editingSubscriber?.id}>
            {actionSubscriberId === editingSubscriber?.id && <CSpinner size="sm" className="me-2" />}
            Save Changes
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default AudienceDetails;

