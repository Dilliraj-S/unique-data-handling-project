import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormSelect,
  CFormLabel,
  CSpinner,
  CBadge,
  CAlert,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilHistory, cilCloudDownload, cilArrowLeft } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';
/**
 * Process Logs Page
 * Displays previous workflow/master flow execution results
 * Equivalent to BV project's process logs view
 */
const ProcessLogs = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [error, setError] = useState(null);

  // Fetch process logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = AuthService.getToken();
      const response = await axios.get('/api/System/Central/querychain/process-logs', {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (response.data.status && response.data.data) {
        const fetchedLogs = response.data.data;
        
        // Sort by created_at descending
        fetchedLogs.sort((a, b) => {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateB - dateA;
        });

        setLogs(fetchedLogs);
        
        // Set initial selected process
        if (fetchedLogs.length > 0 && !selectedProcessId) {
          setSelectedProcessId(fetchedLogs[0].process_id);
          setSelectedLog(fetchedLogs[0]);
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch process logs');
      }
    } catch (err) {
      console.error('Failed to fetch process logs:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load process logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Update selected log when process ID changes
  useEffect(() => {
    if (selectedProcessId && logs.length > 0) {
      const log = logs.find((l) => l.process_id === selectedProcessId);
      setSelectedLog(log || null);
    }
  }, [selectedProcessId, logs]);

  // Compute download URL.
  // Prefer backend-normalised URLs (input_url/output_url from ProcessFlowHelper.fetchLogs),
  // and only fall back to path heuristics for very old records that might not have them.
  const getDownloadUrl = (record, type) => {
    if (!record) return null;

    // 1) Prefer canonical URLs provided by the API (already points to /api/download-file)
    if (type === 'input' && record.input_url) return record.input_url;
    if (type === 'output' && record.output_url) return record.output_url;

    // 2) Fallback for legacy records that only have raw paths stored
    const filePath =
      type === 'input'
        ? record.input_location || record.input_path
        : record.output_location || record.output_path;

    if (!filePath) return null;

    // If already a full URL (http/https or /api/download-file), return as-is
    if (/^https?:\/\//i.test(filePath) || filePath.startsWith('/api/')) {
      return filePath;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');

    // Extract relative path for the download API
    let relativePath = null;

    // If path contains 'public/', extract relative path
    if (normalizedPath.includes('/public/')) {
      const publicIndex = normalizedPath.indexOf('/public/');
      relativePath = normalizedPath.substring(publicIndex + '/public/'.length);
    }
    // If path already contains uploads/exports, extract relative path
    else if (normalizedPath.includes('uploads/') || normalizedPath.includes('exports/')) {
      const idx = normalizedPath.indexOf('uploads/') >= 0
        ? normalizedPath.indexOf('uploads/')
        : normalizedPath.indexOf('exports/');
      relativePath = normalizedPath.substring(idx);
    }

    // Route through the download API so it works in both dev and production (PM2)
    if (relativePath) {
      return `/api/download-file?path=${encodeURIComponent(relativePath)}`;
    }

    // Default: return as-is (may still be handled by the server)
    return filePath;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <CSpinner />
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 py-4">
      <CRow>
        <CCol xs={12}>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="javascript:void(0);" onClick={() => navigate(-1)}>
                  Query Chain
                </a>
              </li>
              <li className="breadcrumb-item active fw-bold">Process Logs</li>
            </ol>
          </nav>
        </CCol>

        <CCol xs={12}>
          <CCard className="shadow-sm">
            <CCardHeader className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <CIcon icon={cilHistory} className="me-2" />
                  Process Log Details
                </h5>
                <CButton
                  color="light"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/central/querychain/masterflows')}
                >
                  <CIcon icon={cilArrowLeft} className="me-1" />
                  Back to Master Flows
                </CButton>
              </div>
            </CCardHeader>

            <CCardBody className="p-4">
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}

              {logs.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">No process logs found.</p>
                  <CButton
                    color="primary"
                    onClick={() => navigate('/central/querychain/masterflows')}
                  >
                    Start a New Process
                  </CButton>
                </div>
              ) : (
                <>
                  {/* Process Selector */}
                  <div className="mb-4">
                    <CFormLabel className="fw-bold">Select a Process</CFormLabel>
                    <CFormSelect
                      id="processSelector"
                      value={selectedProcessId}
                      onChange={(e) => setSelectedProcessId(e.target.value)}
                    >
                      {logs.map((log) => (
                        <option key={log.process_id} value={log.process_id}>
                          {log.process_name} ({log.process_id})
                        </option>
                      ))}
                    </CFormSelect>
                  </div>

                  {/* Process Details */}
                  {selectedLog && (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      <div className="mb-4">
                        <h5 className="fw-semibold">
                          {selectedLog.process_name} ({selectedLog.process_id})
                        </h5>
                        <div className="d-flex flex-wrap gap-2 mb-3">
                          <CBadge color={getStatusColor(selectedLog.status)}>
                            {selectedLog.status?.toUpperCase() || 'UNKNOWN'}
                          </CBadge>
                          <CBadge color="info">{selectedLog.mode || 'N/A'}</CBadge>
                          <CBadge color="secondary">{selectedLog.process_mode || 'N/A'}</CBadge>
                          <CBadge color="dark">{formatDate(selectedLog.created_at)}</CBadge>
                          {selectedLog.created_by && (
                            <CBadge color="secondary">{selectedLog.created_by}</CBadge>
                          )}
                        </div>

                        {/* Metrics */}
                        <div className="row mb-3">
                          <div className="col-md-3">
                            <strong>Total:</strong> {selectedLog.total || 0}
                          </div>
                          <div className="col-md-3">
                            <strong>Processed:</strong> {selectedLog.processed || 0}
                          </div>
                          <div className="col-md-3">
                            <strong>Rejected:</strong> {selectedLog.rejected || 0}
                          </div>
                          <div className="col-md-3">
                            <strong>Skipped:</strong> {selectedLog.skipped || 0}
                          </div>
                        </div>

                        {/* Download Buttons */}
                        <div className="mb-3">
                          {getDownloadUrl(selectedLog, 'input') && (
                            <CButton
                              color="primary"
                              variant="outline"
                              size="sm"
                              className="me-2 mb-2"
                              href={getDownloadUrl(selectedLog, 'input')}
                              download
                              target="_blank"
                              rel="noopener"
                            >
                              <CIcon icon={cilCloudDownload} className="me-1" />
                              Download Input
                            </CButton>
                          )}
                          {getDownloadUrl(selectedLog, 'output') && (
                            <CButton
                              color="primary"
                              variant="outline"
                              size="sm"
                              className="me-2 mb-2"
                              href={getDownloadUrl(selectedLog, 'output')}
                              download
                              target="_blank"
                              rel="noopener"
                            >
                              <CIcon icon={cilCloudDownload} className="me-1" />
                              Download Output
                            </CButton>
                          )}
                        </div>
                      </div>

                      {/* Trace Details */}
                      {selectedLog.trace_details && selectedLog.trace_details.length > 0 && (
                        <div className="d-flex flex-column gap-3">
                          {selectedLog.process_mode === 'flow' && selectedLog.trace_details.length > 1 ? (
                            // Master Flow: Multiple steps
                            selectedLog.trace_details.map((trace, index) => (
                              <div key={index} className="border-start border-3 border-primary ps-3">
                                <div className="fw-bold mb-1">
                                  Step {index + 1}: {trace.workflow}
                                </div>
                                <div className="mb-1">
                                  Status:{' '}
                                  <span className={`text-${getStatusColor(trace.status)}`}>
                                    {trace.status}
                                  </span>
                                </div>
                                <div className="mb-1">{trace.details}</div>
                                {trace.metrics && (
                                  <div className="small text-muted">
                                    Metrics: Total: {trace.metrics.total || 0}, Affected:{' '}
                                    {trace.metrics.affected || 0}, Rejected: {trace.metrics.rejected || 0}, Skipped:{' '}
                                    {trace.metrics.skipped || 0}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            // Single Workflow
                            <div className="card shadow-sm border">
                              <div className="card-body">
                                <h6 className="card-title fw-bold">
                                  {selectedLog.trace_details[0]?.workflow || 'Workflow'}
                                </h6>
                                <p className="card-text mb-1">
                                  <strong>Status:</strong>{' '}
                                  <span
                                    className={`text-${getStatusColor(selectedLog.trace_details[0]?.status)}`}
                                  >
                                    {selectedLog.trace_details[0]?.status || 'N/A'}
                                  </span>
                                </p>
                                <p className="card-text">{selectedLog.trace_details[0]?.details || 'N/A'}</p>
                                {selectedLog.trace_details[0]?.metrics && (
                                  <div className="small text-muted">
                                    Metrics: Total: {selectedLog.trace_details[0].metrics.total || 0}, Affected:{' '}
                                    {selectedLog.trace_details[0].metrics.affected || 0}, Rejected:{' '}
                                    {selectedLog.trace_details[0].metrics.rejected || 0}, Skipped:{' '}
                                    {selectedLog.trace_details[0].metrics.skipped || 0}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default ProcessLogs;

