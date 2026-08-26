import React, { useState, useEffect, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CBadge,
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormSelect,
  CInputGroup,
  CListGroup,
  CListGroupItem,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilArrowLeft,
  cilReload,
  cilMediaStop,
  cilMediaPause,
  cilMediaPlay,
  cilTrash,
  cilInfo,
  cilWarning,
  cilTerminal,
} from '@coreui/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL_MS = 5000;
const API_BASE = '/api/queues';

/**
 * Queue Control Center
 * Manage all Bull queues from the UI: start/stop workers, pause/resume, clear, retry.
 * Process start/stop requires PM2 (optional).
 */
const Queuecontrolcenter = () => {
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [pm2Available, setPm2Available] = useState(false);
  const [pm2Connected, setPm2Connected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [clearModal, setClearModal] = useState(null);
  const [clearType, setClearType] = useState('waiting');
  const [failedModal, setFailedModal] = useState(null);
  const [failedJobs, setFailedJobs] = useState([]);
  const [logsModal, setLogsModal] = useState(null);
  const [logsLines, setLogsLines] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [instancesByQueue, setInstancesByQueue] = useState({});

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/status`);
      if (data.success && data.data) {
        const newQueues = data.data.queues || [];
        setQueues(newQueues);
        setPm2Available(data.data.pm2Available === true);
        setPm2Connected(data.data.pm2Connected === true);

        // Initialise / sync desired instances per queue based on server data
        setInstancesByQueue((prev) => {
          const next = { ...prev };
          (newQueues || []).forEach((q) => {
            const current = prev[q.id];
            const runningInstances = q.process?.instanceCount || 0;
            const defaultInstances = q.defaultInstances || 1;
            const maxInstances = q.maxInstances || 1;
            let initial = current != null ? current : runningInstances || defaultInstances || 1;
            if (initial < 1) initial = 1;
            if (initial > maxInstances) initial = maxInstances;
            next[q.id] = initial;
          });
          return next;
        });
        setError(null);
      } else {
        setError(data.error || 'Failed to load queue status');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch queue status');
      setQueues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!autoRefresh || loading) return;
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoRefresh, loading, fetchStatus]);

  const setAction = (queueId, v) => {
    setActionLoading((prev) => (v ? { ...prev, [queueId]: true } : { ...prev, [queueId]: false }));
  };

  const showMessage = (msg, isError = false) => {
    setMessage({ text: msg, error: isError });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleStart = async (queueId, instances) => {
    setAction(queueId, true);
    try {
      const payload = instances != null ? { queueId, instances } : { queueId };
      const { data } = await axios.post(`${API_BASE}/start`, payload);
      if (data.success) {
        showMessage('Worker started');
        fetchStatus();
      } else {
        showMessage(data.error || 'Start failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Start failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const handleStop = async (queueId) => {
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/stop`, { queueId });
      if (data.success) {
        showMessage('Worker stopped');
        fetchStatus();
      } else {
        showMessage(data.error || 'Stop failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Stop failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const handlePause = async (queueId) => {
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/pause`, { queueId });
      if (data.success) {
        showMessage('Queue paused');
        fetchStatus();
      } else {
        showMessage(data.error || 'Pause failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Pause failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const handleResume = async (queueId) => {
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/resume`, { queueId });
      if (data.success) {
        showMessage('Queue resumed');
        fetchStatus();
      } else {
        showMessage(data.error || 'Resume failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Resume failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const openClearModal = (q) => {
    setClearModal(q);
    setClearType('waiting');
  };
  const handleClear = async (queueId, type) => {
    setClearModal(null);
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/clear`, { queueId, type });
      if (data.success) {
        showMessage(`Cleared ${type} jobs`);
        fetchStatus();
      } else {
        showMessage(data.error || 'Clear failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Clear failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const handleRetry = async (queueId, jobId = null) => {
    setFailedModal(null);
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/retry`, { queueId, jobId });
      if (data.success) {
        showMessage(data.retried != null ? `Retried ${data.retried} job(s)` : 'Job retried');
        fetchStatus();
      } else {
        showMessage(data.error || 'Retry failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Retry failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const openFailedModal = async (q) => {
    setFailedModal(q);
    setFailedJobs([]);
    try {
      const { data } = await axios.get(`${API_BASE}/failed?queueId=${q.id}&limit=50`);
      if (data.success && data.data) setFailedJobs(data.data.jobs || []);
    } catch {
      setFailedJobs([]);
    }
  };

  const handleStartTrigger = async (queueId) => {
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/start-trigger`, { queueId });
      if (data.success) {
        showMessage('Trigger started (job feeder running)');
        fetchStatus();
      } else {
        showMessage(data.error || 'Start trigger failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Start trigger failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const handleStopTrigger = async (queueId) => {
    setAction(queueId, true);
    try {
      const { data } = await axios.post(`${API_BASE}/stop-trigger`, { queueId });
      if (data.success) {
        showMessage('Trigger stopped');
        fetchStatus();
      } else {
        showMessage(data.error || 'Stop trigger failed', true);
      }
    } catch (err) {
      showMessage(err.response?.data?.error || err.message || 'Stop trigger failed', true);
    } finally {
      setAction(queueId, false);
    }
  };

  const openLogsModal = async (q) => {
    setLogsModal(q);
    setLogsLines([]);
    setLogsLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/logs?queueId=${q.id}&lines=200`);
      if (data.success && data.data) setLogsLines(data.data.logs || []);
    } catch {
      setLogsLines([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const formatUptime = (ms) => {
    if (ms == null || ms <= 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const formatMemory = (bytes) => {
    if (bytes == null) return '—';
    const mb = Math.round(bytes / 1024 / 1024);
    return `${mb} MB`;
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate(-1)}>
                  <CIcon icon={cilArrowLeft} className="me-1" />
                  Back
                </CButton>
                <h5 className="mb-0">Queue Control Center</h5>
              </div>
              <div className="d-flex align-items-center gap-2">
                <label className="d-flex align-items-center gap-1 small text-nowrap">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  Auto-refresh
                </label>
                <CButton color="primary" size="sm" onClick={() => fetchStatus()} disabled={loading}>
                  <CIcon icon={cilReload} className={loading ? 'spin' : ''} />
                  <span className="ms-1">Refresh</span>
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {message && (
                <CAlert
                  color={message.error ? 'danger' : 'success'}
                  dismissible
                  onClose={() => setMessage(null)}
                  className="mb-3"
                >
                  {message.text}
                </CAlert>
              )}

              {!pm2Available && (
                <CAlert color="info" className="mb-3 d-flex align-items-center">
                  <CIcon icon={cilInfo} className="me-2" />
                  <span>
                    Start/Stop workers require PM2. Install with <code>npm install pm2</code> and run your app with PM2 (e.g. <code>pm2 start npm --name "app" -- start</code>). Pause, Resume, Clear, and Retry work without PM2.
                  </span>
                </CAlert>
              )}

              {pm2Available && !pm2Connected && (
                <CAlert color="warning" className="mb-3 d-flex align-items-center">
                  <CIcon icon={cilWarning} className="me-2" />
                  <span>PM2 is installed but the daemon is not connected. Start/Stop may not work until PM2 is running.</span>
                </CAlert>
              )}

              <CAlert color="info" className="mb-3 small">
                <strong>queue:email-sync (Global Email Sync):</strong> Start the <strong>worker</strong> first, then start the <strong>trigger</strong> (emails:init-sync:global:daemon) so jobs are added to the queue. Without the trigger, the worker runs but has nothing to process.
              </CAlert>

              {loading && queues.length === 0 ? (
                <div className="text-center py-5">
                  <CSpinner />
                  <p className="mt-2 text-muted">Loading queue status...</p>
                </div>
              ) : error && queues.length === 0 ? (
                <CAlert color="danger">{error}</CAlert>
              ) : (
                <CRow>
                  {queues.map((q) => {
                    const counts = q.counts || {};
                    const processRunning = q.process?.running === true;
                    const isPaused = q.isPaused === true;
                    const busy = actionLoading[q.id];
                    const maxInstances = q.maxInstances || 1;
                    const desiredInstances = instancesByQueue[q.id] || 1;
                    const runningInstances = q.process?.runningInstances ?? q.process?.instanceCount ?? 0;

                    return (
                      <CCol key={q.id} xs={12} md={6} lg={4} className="mb-4">
                        <CCard className="h-100">
                          <CCardHeader className="d-flex justify-content-between align-items-center py-2">
                            <span className="fw-semibold text-truncate" title={q.label}>
                              {q.label}
                            </span>
                            <div className="d-flex flex-column align-items-end gap-1">
                              {processRunning ? (
                                <CBadge color="success">Running</CBadge>
                              ) : (
                                <CBadge color="secondary">Stopped</CBadge>
                              )}
                              {isPaused && <CBadge color="warning">Paused</CBadge>}
                              {pm2Available && maxInstances > 1 && (
                                <span className="small text-muted">
                                  Workers:&nbsp;
                                  <strong>{runningInstances}</strong>
                                  {` / ${maxInstances}`}
                                </span>
                              )}
                            </div>
                          </CCardHeader>
                          <CCardBody className="py-3">
                            <div className="small text-muted mb-2">
                              Waiting: <strong>{counts.waiting ?? 0}</strong>
                              {' · '}Active: <strong>{counts.active ?? 0}</strong>
                              {' · '}Completed: <strong>{counts.completed ?? 0}</strong>
                              {' · '}Failed: <strong>{counts.failed ?? 0}</strong>
                            </div>
                            {(q.activeJobs?.length > 0) && (
                              <div className="small text-primary mb-2">
                                {q.activeJobs.map((job) => (
                                  <span key={job.id}>
                                    Processing job #{job.id} ({Number(job.progress) || 0}%)
                                  </span>
                                ))}
                              </div>
                            )}
                            {q.trigger && (
                              <div className="small mb-2">
                                Trigger ({q.triggerLabel || 'job feeder'}):{' '}
                                {q.trigger.running ? <CBadge color="success">Running</CBadge> : <CBadge color="secondary">Stopped</CBadge>}
                              </div>
                            )}
                            {processRunning && q.process?.uptime != null && (
                              <div className="small text-muted mb-2">
                                Uptime: {formatUptime(q.process.uptime)}
                                {q.process.memory != null && ` · ${formatMemory(q.process.memory)}`}
                              </div>
                            )}
                            {pm2Available && maxInstances > 1 && (
                              <div className="mb-2">
                                <CFormSelect
                                  size="sm"
                                  value={desiredInstances}
                                  onChange={(e) =>
                                    setInstancesByQueue((prev) => ({
                                      ...prev,
                                      [q.id]: Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), maxInstances),
                                    }))
                                  }
                                  style={{ maxWidth: '140px' }}
                                >
                                  {Array.from({ length: maxInstances }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>
                                      {n} worker{n > 1 ? 's' : ''}
                                    </option>
                                  ))}
                                </CFormSelect>
                              </div>
                            )}

                            <div className="d-flex flex-wrap gap-1">
                              {pm2Available && (
                                <>
                                  {!processRunning ? (
                                    <CButton
                                      color="success"
                                      size="sm"
                                      onClick={() => handleStart(q.id, maxInstances > 1 ? desiredInstances : undefined)}
                                      disabled={busy}
                                    >
                                      {busy ? <CSpinner size="sm" /> : <CIcon icon={cilMediaPlay} />}
                                      <span className="ms-1">Start</span>
                                    </CButton>
                                  ) : (
                                    <CButton
                                      color="danger"
                                      size="sm"
                                      onClick={() => handleStop(q.id)}
                                      disabled={busy}
                                    >
                                      {busy ? <CSpinner size="sm" /> : <CIcon icon={cilMediaStop} />}
                                      <span className="ms-1">Stop</span>
                                    </CButton>
                                  )}
                                </>
                              )}
                              {!isPaused ? (
                                <CButton color="warning" size="sm" onClick={() => handlePause(q.id)} disabled={busy}>
                                  <CIcon icon={cilMediaPause} />
                                  <span className="ms-1">Pause</span>
                                </CButton>
                              ) : (
                                <CButton color="info" size="sm" onClick={() => handleResume(q.id)} disabled={busy}>
                                  <CIcon icon={cilMediaPlay} />
                                  <span className="ms-1">Resume</span>
                                </CButton>
                              )}
                              <CButton
                                color="secondary"
                                size="sm"
                                onClick={() => openClearModal(q)}
                                disabled={busy}
                              >
                                <CIcon icon={cilTrash} />
                                <span className="ms-1">Clear</span>
                              </CButton>
                              {(counts.failed ?? 0) > 0 && (
                                <CButton
                                  color="primary"
                                  size="sm"
                                  onClick={() => openFailedModal(q)}
                                  disabled={busy}
                                >
                                  <CIcon icon={cilReload} />
                                  <span className="ms-1">Retry ({counts.failed})</span>
                                </CButton>
                              )}
                              {pm2Available && processRunning && (
                                <CButton color="secondary" size="sm" onClick={() => openLogsModal(q)}>
                                  <CIcon icon={cilTerminal} />
                                  <span className="ms-1">Logs</span>
                                </CButton>
                              )}
                              {q.triggerScript && pm2Available && (
                                q.trigger?.running ? (
                                  <CButton color="danger" size="sm" onClick={() => handleStopTrigger(q.id)} disabled={busy}>
                                    Stop trigger
                                  </CButton>
                                ) : (
                                  <CButton color="info" size="sm" onClick={() => handleStartTrigger(q.id)} disabled={busy}>
                                    Start trigger
                                  </CButton>
                                )
                              )}
                            </div>
                          </CCardBody>
                        </CCard>
                      </CCol>
                    );
                  })}
                </CRow>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Clear jobs modal */}
      <CModal visible={!!clearModal} onClose={() => setClearModal(null)}>
        <CModalHeader>Clear jobs</CModalHeader>
        <CModalBody>
          {clearModal && (
            <>
              <p className="mb-2">Queue: <strong>{clearModal.label}</strong></p>
              <CInputGroup>
                <CFormSelect value={clearType} onChange={(e) => setClearType(e.target.value)}>
                  <option value="waiting">Waiting</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="delayed">Delayed</option>
                  <option value="all">All</option>
                </CFormSelect>
              </CInputGroup>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setClearModal(null)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={() => clearModal && handleClear(clearModal.id, clearType)}>
            Clear
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Failed jobs modal */}
      <CModal size="lg" visible={!!failedModal} onClose={() => setFailedModal(null)}>
        <CModalHeader>Failed jobs</CModalHeader>
        <CModalBody>
          {failedModal && (
            <>
              <p className="mb-2">Queue: <strong>{failedModal.label}</strong></p>
              <div className="mb-2">
                <CButton color="primary" size="sm" onClick={() => handleRetry(failedModal.id)}>
                  Retry all ({failedJobs.length})
                </CButton>
              </div>
              <CListGroup>
                {failedJobs.length === 0 ? (
                  <CListGroupItem>No failed jobs.</CListGroupItem>
                ) : (
                  failedJobs.slice(0, 20).map((job) => (
                    <CListGroupItem key={job.id}>
                      <div className="d-flex justify-content-between">
                        <span>Job #{job.id}</span>
                        <CButton color="primary" size="sm" onClick={() => handleRetry(failedModal.id, job.id)}>
                          Retry
                        </CButton>
                      </div>
                      <small className="text-danger">{job.failedReason}</small>
                    </CListGroupItem>
                  ))
                )}
              </CListGroup>
              {failedJobs.length > 20 && (
                <p className="small text-muted mt-2">Showing first 20. Use &quot;Retry all&quot; to retry every failed job.</p>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setFailedModal(null)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Logs modal */}
      <CModal size="xl" visible={!!logsModal} onClose={() => setLogsModal(null)}>
        <CModalHeader>Worker logs — {logsModal?.label}</CModalHeader>
        <CModalBody>
          {logsLoading ? (
            <div className="text-center py-4"><CSpinner /></div>
          ) : (
            <pre className="bg-dark text-light p-3 rounded small mb-0" style={{ maxHeight: '70vh', overflow: 'auto', fontSize: '12px' }}>
              {logsLines.length === 0 ? 'No logs (worker may not be running or log file not found).' : logsLines.join('\n')}
                            </pre>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setLogsModal(null)}>Close</CButton>
          {logsModal && (
            <>
              <CButton
                color="danger"
                size="sm"
                onClick={async () => {
                  try {
                    await axios.post(`${API_BASE}/flush-logs`, { queueId: logsModal.id });
                    showMessage('Logs cleared');
                    openLogsModal(logsModal);
                  } catch (err) {
                    showMessage(err.response?.data?.error || 'Failed to clear logs', true);
                  }
                }}
                disabled={logsLoading}
              >
                <CIcon icon={cilTrash} /> Clear
              </CButton>
              <CButton color="primary" onClick={() => openLogsModal(logsModal)} disabled={logsLoading}>
                <CIcon icon={cilReload} /> Refresh
              </CButton>
            </>
          )}
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Queuecontrolcenter;
