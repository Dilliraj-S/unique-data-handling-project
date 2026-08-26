import React, { useState, useRef, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CButton,
  CFormTextarea,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CSpinner,
  CFormInput,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CProgress,
  CProgressBar,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilArrowLeft, cilHome, cilCloudDownload, cilArrowRight, cilReload, cilCloudUpload } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

/**
 * Domain Enrichment Automation
 * --------------------------------------------------------
 * Simple UI for:
 *  - Entering a list of domains
 *  - Creating enrichment jobs
 *  - Starting processing
 *  - Downloading results CSV (domain,company_name,address,phone)
 */
const Domain = () => {
  const navigate = useNavigate();
  const [domainsInput, setDomainsInput] = useState('');
  const [batchId, setBatchId] = useState('');
  const [uploadMessage, setUploadMessage] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [statusStats, setStatusStats] = useState(null);
  const [activeTab, setActiveTab] = useState('manual');
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef(null);

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  };

  const getAuthAxiosMultipart = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'multipart/form-data',
      },
    });
  };

  const handleUploadDomains = async () => {
    setError(null);
    setUploadMessage(null);

    const trimmed = domainsInput.trim();
    if (!trimmed) {
      setError('Please enter at least one domain (one per line or comma separated).');
      return;
    }

    setUploading(true);
    try {
      const authAxios = getAuthAxios();
      const res = await authAxios.post('/api/skeleton-action/central_automations_custom', {
        action: 'domain_enrichment_upload',
        domains: trimmed,
      });

      if (!res.data?.status) {
        throw new Error(res.data?.message || 'Upload failed');
      }

      setBatchId(res.data.batch_id || '');
      setUploadMessage(
        `Created ${res.data.total_jobs} jobs in batch ${res.data.batch_id}. You can now start processing.`,
      );
    } catch (err) {
      console.error('Upload domains error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload domains');
    } finally {
      setUploading(false);
    }
  };

  const handleStartBatch = async () => {
    setError(null);
    if (!batchId) {
      setError('No batch selected. Upload domains first to get a batch ID.');
      return;
    }

    setStarting(true);
    try {
      const authAxios = getAuthAxios();
      const res = await authAxios.post('/api/skeleton-action/central_automations_custom', {
        action: 'domain_enrichment_start',
        batch_id: batchId,
      });

      if (!res.data?.status) {
        throw new Error(res.data?.message || 'Failed to start batch');
      }

      setUploadMessage(
        `Queued ${res.data.queued_jobs} jobs for batch ${res.data.batch_id}. Worker will process them.`,
      );
    } catch (err) {
      console.error('Start batch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to start batch');
    } finally {
      setStarting(false);
    }
  };

  const handleDownload = () => {
    const base = `/api/skeleton-action/central_automations_custom?action=domain_enrichment_export`;
    const token = AuthService.getToken();
    const url = batchId
      ? `${base}&batch_id=${encodeURIComponent(batchId)}&auth_token=${token}`
      : `${base}&auth_token=${token}`;
    window.open(url, '_blank');
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setError(null);
    setUploadMessage(null);
    setCsvUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const authAxios = getAuthAxiosMultipart();
      const res = await authAxios.post('/api/domain-enrichment/upload-csv', formData);

      if (!res.data?.status) {
        throw new Error(res.data?.message || 'CSV upload failed');
      }

      setBatchId(res.data.batch_id || '');
      setUploadMessage(
        `CSV processed successfully! Created ${res.data.total_jobs} jobs from ${res.data.unique_domains} unique domains (${res.data.total_rows} total rows${res.data.header_skipped ? ', header skipped' : ''}) in batch ${res.data.batch_id}. You can now start processing.`,
      );
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Refresh jobs table
      fetchJobs(1);
      setPage(1);
    } catch (err) {
      console.error('CSV upload error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload CSV file');
    } finally {
      setCsvUploading(false);
    }
  };

  const fetchJobs = async (overridePage) => {
    setJobsError(null);
    setJobsLoading(true);
    try {
      const authAxios = getAuthAxios();
      const res = await authAxios.get('/api/domain-enrichment/jobs', {
        params: {
          page: overridePage || page,
          limit: 25,
          batch_id: batchId || undefined,
        },
      });

      if (!res.data?.status) {
        throw new Error(res.data?.message || 'Failed to load jobs');
      }

      setJobs(res.data.data || []);
      const meta = res.data.meta || {};
      // Prefer total jobs for the batch so progress bar is accurate
      setTotalJobs(meta.recordsTotal ?? meta.recordsFiltered ?? 0);
      setStatusStats(meta.statusCounts || null);
    } catch (err) {
      console.error('Fetch jobs error:', err);
      setJobsError(err.response?.data?.message || err.message || 'Failed to load jobs');
    } finally {
      setJobsLoading(false);
    }
  };

  // Auto-load and auto-refresh jobs for the active batch
  useEffect(() => {
    if (!batchId) return;

    let cancelled = false;

    const loadOnce = async () => {
      await fetchJobs(1);
    };

    const interval = setInterval(() => {
      if (!cancelled) {
        fetchJobs(1);
      }
    }, 5000);

    // Initial load when batchId changes
    loadOnce();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [batchId]);

  return (
    <>
      <CRow className="mb-3">
        <CCol xs={12}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <CIcon icon={cilArrowLeft} className="me-1" />
                Back
              </CButton>
              <h3 className="mb-0">Domain Enrichment Agent</h3>
            </div>
            <CButton color="ghost-primary" size="sm" onClick={() => navigate('/dashboard')}>
              <CIcon icon={cilHome} className="me-1" />
              Dashboard
            </CButton>
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol md={4}>
          <CCard className="mb-4">
            <CCardBody>
              <h5 className="mb-3">1. Enter Domains</h5>

              {error && (
                <CAlert color="danger" className="py-2 mb-3">
                  {error}
                </CAlert>
              )}
              {uploadMessage && (
                <CAlert color="success" className="py-2 mb-3">
                  {uploadMessage}
                </CAlert>
              )}

              <CNav variant="tabs" role="tablist" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'manual'}
                    onClick={() => setActiveTab('manual')}
                    style={{ cursor: 'pointer' }}
                  >
                    Manual Entry
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'csv'}
                    onClick={() => setActiveTab('csv')}
                    style={{ cursor: 'pointer' }}
                  >
                    CSV Upload
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent>
                <CTabPane visible={activeTab === 'manual'}>
                  <p className="text-muted mb-2" style={{ fontSize: '12px' }}>
                    One domain per line or comma separated. Example:
                    <br />
                    <code>apexsystems.com</code>, <code>example.com</code>
                  </p>

                  <CFormTextarea
                    rows={8}
                    value={domainsInput}
                    onChange={(e) => setDomainsInput(e.target.value)}
                    placeholder="apexsystems.com&#10;example.com"
                    className="mb-3"
                  />

                  <CButton
                    color="primary"
                    disabled={uploading}
                    onClick={async () => {
                      await handleUploadDomains();
                      fetchJobs(1);
                      setPage(1);
                    }}
                    className="w-100"
                  >
                    {uploading ? 'Uploading...' : 'Create Jobs'}
                  </CButton>
                </CTabPane>

                <CTabPane visible={activeTab === 'csv'}>
                  <p className="text-muted mb-2" style={{ fontSize: '12px' }}>
                    Upload a CSV file with domains/SMTPs. Format:
                    <br />
                    • First row may be header (e.g., "SMTP") - will be skipped automatically
                    <br />
                    • Each subsequent row contains one domain
                    <br />
                    • Supports large files (10,000-100,000 records)
                  </p>

                  <CFormInput
                    type="file"
                    accept=".csv,.txt"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCsvFile(file);
                        setError(null);
                      }
                    }}
                    className="mb-2"
                  />

                  {csvFile && (
                    <div className="mb-2">
                      <small className="text-muted">
                        Selected: <strong>{csvFile.name}</strong> (
                        {(csvFile.size / 1024).toFixed(2)} KB)
                      </small>
                    </div>
                  )}

                  <CButton
                    color="primary"
                    disabled={!csvFile || csvUploading}
                    onClick={handleCsvUpload}
                    className="w-100"
                  >
                    <CIcon icon={cilCloudUpload} className="me-1" />
                    {csvUploading ? 'Processing CSV...' : 'Upload & Create Jobs'}
                  </CButton>
                </CTabPane>
              </CTabContent>

              <hr className="my-3" />

              <div className="d-flex flex-column gap-2">
                <CButton
                  color="info"
                  variant="outline"
                  disabled={!batchId || starting}
                  onClick={async () => {
                    await handleStartBatch();
                    fetchJobs(1);
                    setPage(1);
                  }}
                >
                  <CIcon icon={cilArrowRight} className="me-1" />
                  {starting ? 'Starting…' : 'Start Processing'}
                </CButton>

                <CButton
                  color="warning"
                  variant="outline"
                  disabled={!batchId}
                  onClick={async () => {
                    if (!confirm('Reset stuck "processing" jobs back to "queued"? This will allow the worker to retry them.')) {
                      return;
                    }
                    try {
                      const authAxios = getAuthAxios();
                      const res = await authAxios.post('/api/skeleton-action/central_automations_custom', {
                        action: 'domain_enrichment_reset_stuck',
                        batch_id: batchId,
                      });
                      if (res.data?.status) {
                        setUploadMessage(`Reset ${res.data.reset_count} stuck jobs. They will be retried by the worker.`);
                        fetchJobs(1);
                      } else {
                        setError(res.data?.message || 'Failed to reset stuck jobs');
                      }
                    } catch (err) {
                      setError(err.response?.data?.message || err.message || 'Failed to reset stuck jobs');
                    }
                  }}
                >
                  <CIcon icon={cilReload} className="me-1" />
                  Reset Stuck Jobs
                </CButton>

                <CButton
                  color="success"
                  variant="outline"
                  disabled={false}
                  onClick={handleDownload}
                >
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  Download Results CSV
                </CButton>

                {batchId && (
                  <small className="text-muted mt-1">
                    Active batch: <code>{batchId}</code>
                  </small>
                )}
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={8}>
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">2. Jobs Status</h5>
                <CButton
                  color="light"
                  size="sm"
                  onClick={() => fetchJobs(1)}
                  title="Refresh"
                >
                  <CIcon icon={cilReload} />
                </CButton>
              </div>
              <p className="text-muted mb-3" style={{ fontSize: '12px' }}>
                Monitoring jobs from the <code>automation</code> database. This table is specific to
                domain enrichment and does not use the generic DynamicTable/TableHelper pipeline.
              </p>

              {totalJobs > 0 && statusStats && (
                <div className="mb-3">
                  {(() => {
                    const completed = (statusStats.completed || 0) + (statusStats.failed || 0);
                    const processing = statusStats.processing || 0;
                    const queued =
                      (statusStats.queued || 0) + (statusStats.pending || 0);
                    const total = completed + processing + queued || totalJobs;
                    const pct =
                      total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <small className="text-muted">
                            Progress: <strong>{completed}</strong> /{' '}
                            <strong>{total}</strong> jobs completed ({pct}%)
                          </small>
                          <small className="text-muted">
                            Q:{queued} · P:{processing} · C:{completed}
                          </small>
                        </div>
                        <CProgress thin color="success" className="mb-1">
                          <CProgressBar
                            color="success"
                            value={pct}
                          ></CProgressBar>
                        </CProgress>
                      </>
                    );
                  })()}
                </div>
              )}

              {jobsError && (
                <CAlert color="danger" className="py-2">
                  {jobsError}
                </CAlert>
              )}

              <div className="table-responsive">
                <CTable hover striped small align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell scope="col">Domain</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Company Name</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Address</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Phone</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Status</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Batch</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Attempts</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Updated</CTableHeaderCell>
                      <CTableHeaderCell scope="col">Error</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {jobsLoading ? (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center py-4">
                          <CSpinner size="sm" className="me-2" />
                          Loading jobs...
                        </CTableDataCell>
                      </CTableRow>
                    ) : jobs.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center py-3 text-muted">
                          No jobs found. Create jobs on the left and click Refresh.
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      jobs.map((job) => (
                        <CTableRow key={job.job_id}>
                          <CTableDataCell>{job.domain}</CTableDataCell>
                          <CTableDataCell>{job.company_name || '-'}</CTableDataCell>
                          <CTableDataCell style={{ maxWidth: '260px' }}>
                            <span className="text-wrap text-truncate d-inline-block" style={{ maxWidth: '260px' }}>
                              {job.address || '-'}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>{job.phone || '-'}</CTableDataCell>
                          <CTableDataCell>{job.status}</CTableDataCell>
                          <CTableDataCell>{job.batch_id}</CTableDataCell>
                          <CTableDataCell>{job.attempts ?? 0}</CTableDataCell>
                          <CTableDataCell>
                            {job.updated_at
                              ? new Date(job.updated_at).toLocaleString()
                              : job.created_at
                              ? new Date(job.created_at).toLocaleString()
                              : '-'}
                          </CTableDataCell>
                          <CTableDataCell style={{ maxWidth: '200px' }}>
                            <span className="text-wrap text-truncate d-inline-block" style={{ maxWidth: '200px' }}>
                              {job.error || '-'}
                            </span>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  Total jobs: <strong>{totalJobs}</strong>
                  {batchId && (
                    <>
                      {' '}
                      | Batch: <code>{batchId}</code>
                    </>
                  )}
                </small>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Domain;
