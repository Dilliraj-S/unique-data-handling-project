import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormSelect,
  CFormLabel,
  CFormInput,
  CAlert,
  CSpinner,
  CBadge,
  CProgress,
  CProgressBar
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilEnvelopeOpen, cilArrowLeft, cilCheck, cilSync, cilWarning } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * Email Sent Status Page
 * Mark emails as "sent" in a target database/collection by cross-referencing
 * email_campaign_logs for a selected campaign.
 * 
 * System: central
 * Module: emailsystem
 * Section: emailsentstatus
 */
const Emailsentstatus = () => {
  const navigate = useNavigate();

  // Auth helper
  const getAuthAxios = useCallback(() => {
    const token = AuthService.getToken();
    return axios.create({
      baseURL: '/api',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  }, []);

  // ─── State ───
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [batchSize, setBatchSize] = useState(5000);
  const [emailField, setEmailField] = useState('email');

  // Loading states
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [starting, setStarting] = useState(false);

  // Progress state
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);
  const progressInterval = useRef(null);

  // Messages
  const [message, setMessage] = useState(null);

  // ─── Fetch Campaigns ───
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setMessage({ type: 'danger', text: 'Failed to load campaigns' });
    } finally {
      setLoadingCampaigns(false);
    }
  }, [getAuthAxios]);

  // ─── Fetch Databases ───
  const fetchDatabases = useCallback(async () => {
    try {
      setLoadingDatabases(true);
      const response = await axios.get('/api/import/databases');
      if (response.data.success) {
        setDatabases(response.data.databases);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
      setMessage({ type: 'danger', text: 'Failed to load databases' });
    } finally {
      setLoadingDatabases(false);
    }
  }, []);

  // ─── Fetch Collections ───
  const fetchCollections = useCallback(async (databaseName) => {
    if (!databaseName) {
      setCollections([]);
      return;
    }
    try {
      setLoadingCollections(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      if (response.data.success) {
        setCollections(response.data.collections);
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setCollections([]);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  // ─── Handle Database Change ───
  const handleDatabaseChange = (db) => {
    setSelectedDatabase(db);
    setSelectedCollection('');
    setCollections([]);
    if (db) {
      fetchCollections(db);
    }
  };

  // ─── Poll Job Progress ───
  const pollProgress = useCallback(async (id) => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/email-sent-status?jobId=${id}`);
      if (response.data.success) {
        setJobState(response.data.state);
        setJobProgress(response.data.progress || 0);
        
        if (response.data.result) {
          setJobResult(response.data.result);
        }
        if (response.data.failedReason) {
          setJobError(response.data.failedReason);
        }

        // Stop polling if completed or failed
        if (response.data.state === 'completed' || response.data.state === 'failed') {
          if (progressInterval.current) {
            clearInterval(progressInterval.current);
            progressInterval.current = null;
          }
          if (response.data.state === 'completed') {
            setMessage({ type: 'success', text: `✅ Update completed! ${response.data.result?.totalUpdated || 0} records updated.` });
          } else {
            setMessage({ type: 'danger', text: `❌ Update failed: ${response.data.failedReason || 'Unknown error'}` });
          }
        }
      }
    } catch (error) {
      console.error('Error polling progress:', error);
    }
  }, [getAuthAxios]);

  // ─── Start Update ───
  const handleStartUpdate = async () => {
    if (!selectedCampaign || !selectedDatabase || !selectedCollection) {
      setMessage({ type: 'danger', text: 'Please select campaign, database, and collection' });
      return;
    }

    try {
      setStarting(true);
      setMessage(null);
      setJobId(null);
      setJobState(null);
      setJobProgress(0);
      setJobResult(null);
      setJobError(null);

      const authAxios = getAuthAxios();
      const response = await authAxios.post('/email-sent-status', {
        campaignName: selectedCampaign,
        database: selectedDatabase,
        collection: selectedCollection,
        batchSize: Number(batchSize),
        emailField
      });

      if (response.data.success) {
        setJobId(response.data.jobId);
        setJobState('waiting');
        setMessage({ type: 'info', text: `Job queued: ${response.data.jobId}` });

        // Start polling
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => {
          pollProgress(response.data.jobId);
        }, 2000);
        
        // Immediate first poll
        setTimeout(() => pollProgress(response.data.jobId), 500);
      } else {
        setMessage({ type: 'danger', text: response.data.message || 'Failed to start job' });
      }
    } catch (error) {
      console.error('Failed to start update:', error);
      setMessage({ 
        type: 'danger', 
        text: error.response?.data?.message || 'Failed to start update job' 
      });
    } finally {
      setStarting(false);
    }
  };

  // ─── Initialize ───
  useEffect(() => {
    fetchCampaigns();
    fetchDatabases();

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [fetchCampaigns, fetchDatabases]);

  // State badge color
  const getStateBadge = (state) => {
    switch (state) {
      case 'completed': return 'success';
      case 'active': return 'primary';
      case 'waiting': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader
              className="d-flex align-items-center justify-content-between"
              style={{ background: '#5856D6', color: '#fff', borderBottom: '2px solid #e0e7ef' }}
            >
              <div className="d-flex align-items-center">
                <CIcon icon={cilEnvelopeOpen} className="me-2" />
                <h5 className="mb-0">Email Sent Status Update</h5>
              </div>
              <CButton
                color="light"
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <CIcon icon={cilArrowLeft} className="me-2" />
                Back
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Alert */}
              {message && (
                <CAlert
                  color={message.type}
                  dismissible
                  onClose={() => setMessage(null)}
                  className="mb-3"
                >
                  {message.text}
                </CAlert>
              )}

              {/* ─── Configuration Form ─── */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">
                    Select Campaign <span className="text-danger">*</span>
                  </CFormLabel>
                  {loadingCampaigns ? (
                    <div className="d-flex align-items-center gap-2 py-2">
                      <CSpinner size="sm" /> Loading campaigns...
                    </div>
                  ) : (
                    <CFormSelect
                      value={selectedCampaign}
                      onChange={(e) => setSelectedCampaign(e.target.value)}
                    >
                      <option value="">-- Select Campaign --</option>
                      {campaigns.map((c) => (
                        <option key={c.id || c._id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </CFormSelect>
                  )}
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="fw-semibold">Batch Size</CFormLabel>
                  <CFormInput
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    min={100}
                    max={50000}
                  />
                  <small className="text-muted">Records per bulkWrite (100 – 50,000)</small>
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="fw-semibold">Email Field</CFormLabel>
                  <CFormInput
                    type="text"
                    value={emailField}
                    onChange={(e) => setEmailField(e.target.value)}
                    placeholder="email"
                  />
                  <small className="text-muted">Field name in target collection</small>
                </CCol>
              </CRow>

              <CRow className="mb-4">
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">
                    Select Database <span className="text-danger">*</span>
                  </CFormLabel>
                  {loadingDatabases ? (
                    <div className="d-flex align-items-center gap-2 py-2">
                      <CSpinner size="sm" /> Loading databases...
                    </div>
                  ) : (
                    <CFormSelect
                      value={selectedDatabase}
                      onChange={(e) => handleDatabaseChange(e.target.value)}
                    >
                      <option value="">-- Select Database --</option>
                      {databases.map((db) => (
                        <option key={db.name} value={db.name}>
                          {db.label} ({db.collections?.length || 0} collections)
                        </option>
                      ))}
                    </CFormSelect>
                  )}
                </CCol>
                <CCol md={6}>
                  <CFormLabel className="fw-semibold">
                    Select Collection <span className="text-danger">*</span>
                  </CFormLabel>
                  {loadingCollections ? (
                    <div className="d-flex align-items-center gap-2 py-2">
                      <CSpinner size="sm" /> Loading collections...
                    </div>
                  ) : (
                    <CFormSelect
                      value={selectedCollection}
                      onChange={(e) => setSelectedCollection(e.target.value)}
                      disabled={!selectedDatabase}
                    >
                      <option value="">-- Select Collection --</option>
                      {collections.map((col) => (
                        <option key={col.name} value={col.name}>
                          {col.label || col.name}
                        </option>
                      ))}
                    </CFormSelect>
                  )}
                </CCol>
              </CRow>

              {/* Start Button */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <CButton
                  color="primary"
                  size="lg"
                  disabled={!selectedCampaign || !selectedDatabase || !selectedCollection || starting || (jobState === 'active')}
                  onClick={handleStartUpdate}
                >
                  {starting ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSync} className="me-2" />
                      Start Update
                    </>
                  )}
                </CButton>

                {jobState && (
                  <CBadge color={getStateBadge(jobState)} className="px-3 py-2" style={{ fontSize: '0.85rem' }}>
                    {jobState.toUpperCase()}
                  </CBadge>
                )}
              </div>

              {/* ─── Progress Section ─── */}
              {jobId && (
                <CCard className="border-0" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px' }}>
                  <CCardBody>
                    <div className="d-flex align-items-center gap-4 mb-3">
                      {/* Circular Progress */}
                      <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                        <CircularProgressbar
                          value={jobProgress}
                          text={`${jobProgress}%`}
                          styles={buildStyles({
                            textSize: '22px',
                            pathColor: jobState === 'completed' ? '#22c55e' : jobState === 'failed' ? '#ef4444' : '#5856D6',
                            textColor: '#1f2937',
                            trailColor: '#e5e7eb',
                            pathTransitionDuration: 0.5,
                          })}
                        />
                      </div>

                      {/* Progress Info */}
                      <div className="flex-grow-1">
                        <h5 className="mb-1 fw-bold">
                          {jobState === 'completed' ? '✅ Update Complete' :
                           jobState === 'failed' ? '❌ Update Failed' :
                           jobState === 'active' ? '🔄 Processing...' :
                           '⏳ Waiting in queue...'}
                        </h5>
                        <p className="text-muted mb-2">Job ID: <code>{jobId}</code></p>
                        <CProgress className="mb-2" style={{ height: '8px' }}>
                          <CProgressBar
                            value={jobProgress}
                            color={jobState === 'completed' ? 'success' : jobState === 'failed' ? 'danger' : 'primary'}
                            animated={jobState === 'active'}
                          />
                        </CProgress>
                      </div>
                    </div>

                    {/* Result Summary */}
                    {jobResult && (
                      <CAlert color="success" className="mb-0">
                        <div className="d-flex flex-wrap gap-4">
                          <div>
                            <small className="text-muted d-block">Campaign Logs</small>
                            <strong>{(jobResult.totalLogs || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <small className="text-muted d-block">Unique Emails</small>
                            <strong>{(jobResult.uniqueEmails || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <small className="text-muted d-block">Records Processed</small>
                            <strong>{(jobResult.totalProcessed || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <small className="text-muted d-block">Records Updated</small>
                            <strong style={{ color: '#22c55e' }}>{(jobResult.totalUpdated || 0).toLocaleString()}</strong>
                          </div>
                        </div>
                      </CAlert>
                    )}

                    {/* Error */}
                    {jobError && (
                      <CAlert color="danger" className="mb-0">
                        <CIcon icon={cilWarning} className="me-2" />
                        {jobError}
                      </CAlert>
                    )}
                  </CCardBody>
                </CCard>
              )}

              {/* ─── How it works ─── */}
              {!jobId && (
                <CCard className="border-0 mt-2" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                  <CCardBody>
                    <h6 className="fw-bold mb-3">How it works</h6>
                    <ol className="text-muted mb-0" style={{ lineHeight: '1.8' }}>
                      <li>Select the campaign whose emails were sent</li>
                      <li>Select the target database and collection to update</li>
                      <li>Set the email field name and batch size as needed</li>
                      <li>Click <strong>Start Update</strong> — the process runs in the background</li>
                      <li>All matching records get <code>dls_mail_send_status</code> updated to the latest status, with full send history preserved per campaign (sent count, campaign name, timestamps)</li>
                    </ol>
                    <CAlert color="info" className="mt-3 mb-0">
                      <small>
                        <strong>💡 Performance:</strong> Uses cursor-based streaming and batch bulkWrite — safe for up to 10 crore records.
                        Make sure the <code>email-sent-status-worker.js</code> is running:
                        <code className="d-block mt-1">node email-sent-status-worker.js</code>
                      </small>
                    </CAlert>
                  </CCardBody>
                </CCard>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Emailsentstatus;
