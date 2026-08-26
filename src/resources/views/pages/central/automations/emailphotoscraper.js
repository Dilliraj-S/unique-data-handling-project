import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton,
  CProgress, CProgressBar, CBadge, CAlert, CSpinner,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CFormInput
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilCloudUpload, cilMediaPlay, cilMediaPause, cilMediaStop,
  cilCloudDownload, cilReload, cilCheckCircle, cilXCircle,
  cilImage, cilUser
} from '@coreui/icons';
import axios from 'axios';

/**
 * Gmail Profile Photo Scraper Page
 * 
 * System: central
 * Module: automations
 * Section: emailphotoscraper
 * 
 * Upload CSV → Start scraping → Live progress → Download results
 */
const Emailphotoscraper = () => {
  // ─── State ─────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentResults, setRecentResults] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [browserCount, setBrowserCount] = useState(3);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const recentPollRef = useRef(null);

  // ─── API Helpers ───────────────────────────────────────────────────
  const api = useCallback((method, params = {}, data = null) => {
    const config = { method, url: '/api/gmail-scraper', params };
    if (data) config.data = data;
    if (data instanceof FormData) {
      config.headers = { 'Content-Type': 'multipart/form-data' };
    }
    return axios(config);
  }, []);

  // ─── Polling ───────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!sessionId) return;
    try {
      const resp = await api('GET', { session_id: sessionId });
      if (resp.data.status) setStats(resp.data.data);
    } catch (e) {
      console.error('Stats poll error:', e.message);
    }
  }, [sessionId, api]);

  const fetchRecent = useCallback(async () => {
    if (!sessionId) return;
    try {
      const resp = await api('GET', { session_id: sessionId, recent: 'true' });
      if (resp.data.status) setRecentResults(resp.data.results);
    } catch (e) {
      console.error('Recent poll error:', e.message);
    }
  }, [sessionId, api]);

  useEffect(() => {
    if (!sessionId) return;
    // Initial fetch
    fetchStats(); 
    fetchRecent();

    const isActive = stats?.is_running;
    const statsInterval = isActive ? 3000 : 8000;
    const recentInterval = isActive ? 4000 : 0;

    pollRef.current = setInterval(fetchStats, statsInterval);
    if (recentInterval > 0) {
      recentPollRef.current = setInterval(fetchRecent, recentInterval);
    }

    return () => {
      clearInterval(pollRef.current);
      clearInterval(recentPollRef.current);
    };
  }, [sessionId, stats?.is_running, fetchStats, fetchRecent]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csv', file);
      const resp = await api('POST', {}, formData);
      if (resp.data.status) {
        setSessionId(resp.data.session_id);
        setUploadResult(resp.data);
        setSuccess(`Uploaded: ${resp.data.total_emails} emails ready (${resp.data.skipped} skipped)`);
      } else {
        setError(resp.data.message);
      }
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      setError(null);
      const payload = { session_id: sessionId, action };
      if (action === 'start') {
        payload.browser_count = browserCount;
      }
      await axios.put('/api/gmail-scraper', payload);
      fetchStats();
      if (action === 'start') setSuccess(`Scraping started with ${browserCount} browser(s)! They will open shortly.`);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    }
  };

  const handleDownload = (type) => {
    const url = `/api/gmail-scraper?session_id=${sessionId}&download=true&type=${type}`;
    window.open(url, '_blank');
  };

  // ─── Login Status Banner ──────────────────────────────────────────
  const getLoginBanner = () => {
    if (!stats) return null;
    const { login_status } = stats;
    const banners = {
      waiting: { color: 'warning', icon: '⏳', text: 'Click Start — Gmail will open in Chrome browser' },
      logged_in: { color: 'success', icon: '✅', text: 'Logged into Gmail — scraping in progress' },
      session_expired: { color: 'warning', icon: '⚠️', text: 'Gmail session expired — please re-login in the browser window' },
      error: { color: 'danger', icon: '❌', text: 'Login failed — click Stop and try again' },
    };
    const b = banners[login_status] || banners.waiting;
    return (
      <CAlert color={b.color} className="mb-3 d-flex align-items-center">
        <span style={{ fontSize: '1.3rem', marginRight: '10px' }}>{b.icon}</span>
        <strong>{b.text}</strong>
      </CAlert>
    );
  };

  // ─── Delay Phase Display ──────────────────────────────────────────
  const getDelayPhase = () => {
    if (!stats || !stats.is_running) return null;
    const idx = stats.processed || 0;
    if (idx < 150) return '⚡ Warmup (~2,400 emails/min)';
    if (idx < 750) return '🔄 Steady (~3,200 emails/min)';
    if (idx < 3000) return '🐢 Sustained (~2,800 emails/min)';
    return '🛡️ Protection (~2,000 emails/min)';
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <>
      <CRow className="mb-4">
        <CCol xs={12}>
          <h3 style={{ fontWeight: 700, color: '#1e293b' }}>
            📧 Gmail Profile Photo Scraper
          </h3>
          <p className="text-muted mb-0">
            Upload a CSV with email addresses, scrape Gmail profile photos, and export results.
          </p>
        </CCol>
      </CRow>

      {/* Alerts */}
      {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
      {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

      {/* ═══ Upload Section ══════════════════════════════════════════ */}
      <CRow className="mb-4">
        <CCol md={8}>
          <CCard>
            <CCardHeader>
              <strong>📁 Upload CSV</strong>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex gap-3 align-items-center">
                <CFormInput
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  style={{ maxWidth: '400px' }}
                />
                <CButton
                  color="primary"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <><CSpinner size="sm" className="me-1" /> Uploading...</>
                  ) : (
                    <><CIcon icon={cilCloudUpload} className="me-1" /> Upload</>
                  )}
                </CButton>
              </div>
              {uploadResult && (
                <div className="mt-3 p-3 bg-light rounded">
                  <strong>Session:</strong> <code>{uploadResult.session_id}</code><br />
                  <strong>Emails:</strong> {uploadResult.total_emails} ready
                  {uploadResult.skipped > 0 && <span className="text-muted"> ({uploadResult.skipped} skipped)</span>}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ═══ Session Dashboard (visible after upload) ═══════════════ */}
      {sessionId && (
        <>
          {/* Login Banner */}
          {getLoginBanner()}

          {/* Controls */}
          <CRow className="mb-4">
            <CCol xs={12}>
              <CCard>
                <CCardHeader className="d-flex justify-content-between align-items-center">
                  <strong>🎛️ Controls</strong>
                  <div className="d-flex gap-2 align-items-center">
                    {(!stats || stats.status === 'pending') && (
                      <>
                        <div className="d-flex align-items-center gap-2 me-2">
                          <label style={{ whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.85rem' }}>Browsers:</label>
                          <CFormInput
                            type="number"
                            min={1}
                            max={40}
                            value={browserCount}
                            onChange={(e) => setBrowserCount(Math.min(40, Math.max(1, parseInt(e.target.value) || 1)))}
                            style={{ width: '70px' }}
                            size="sm"
                          />
                        </div>
                        <CButton color="success" size="sm" onClick={() => handleAction('start')}>
                          <CIcon icon={cilMediaPlay} className="me-1" /> Start
                        </CButton>
                      </>
                    )}
                    {stats?.is_running && (
                      <CButton color="warning" size="sm" onClick={() => handleAction('pause')}>
                        <CIcon icon={cilMediaPause} className="me-1" /> Pause
                      </CButton>
                    )}
                    {stats?.is_paused && (
                      <CButton color="info" size="sm" onClick={() => handleAction('resume')}>
                        <CIcon icon={cilMediaPlay} className="me-1" /> Resume
                      </CButton>
                    )}
                    {(stats?.is_running || stats?.is_paused) && (
                      <CButton color="danger" size="sm" onClick={() => handleAction('stop')}>
                        <CIcon icon={cilMediaStop} className="me-1" /> Stop
                      </CButton>
                    )}
                    <CButton color="secondary" size="sm" onClick={fetchStats}>
                      <CIcon icon={cilReload} />
                    </CButton>
                  </div>
                </CCardHeader>
                <CCardBody>
                  {stats && (
                    <>
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Progress</span>
                          <span><strong>{stats.percent_complete}%</strong> — {stats.processed}/{stats.total}</span>
                        </div>
                        <CProgress>
                          <CProgressBar
                            value={stats.percent_complete}
                            color={stats.status === 'completed' ? 'success' : stats.is_paused ? 'warning' : 'primary'}
                            animated={stats.is_running}
                          />
                        </CProgress>
                      </div>

                      {/* Stats Grid */}
                      <div className="d-flex gap-3 flex-wrap">
                        <div className="text-center p-3 bg-light rounded" style={{ minWidth: '120px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>{stats.total}</div>
                          <small className="text-muted">Total</small>
                        </div>
                        <div className="text-center p-3 bg-light rounded" style={{ minWidth: '120px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d' }}>{stats.with_image}</div>
                          <small className="text-muted">✅ With Photo</small>
                        </div>
                        <div className="text-center p-3 bg-light rounded" style={{ minWidth: '120px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#94a3b8' }}>{stats.no_image}</div>
                          <small className="text-muted">🚫 No Photo</small>
                        </div>
                        <div className="text-center p-3 bg-light rounded" style={{ minWidth: '120px' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{stats.failed}</div>
                          <small className="text-muted">❌ Failed</small>
                        </div>
                        <div className="text-center p-3 bg-light rounded" style={{ minWidth: '120px' }}>
                          <CBadge color={
                            stats.status === 'running' ? 'success' :
                            stats.status === 'paused' ? 'warning' :
                            stats.status === 'completed' ? 'info' :
                            stats.status === 'failed' ? 'danger' : 'secondary'
                          } style={{ fontSize: '0.9rem' }}>
                            {stats.status?.toUpperCase()}
                          </CBadge>
                          <br /><small className="text-muted">Status</small>
                        </div>
                      </div>

                      {/* Delay Phase */}
                      {getDelayPhase() && (
                        <div className="mt-3 text-muted" style={{ fontSize: '0.85rem' }}>
                          <strong>Rate Phase:</strong> {getDelayPhase()}
                        </div>
                      )}
                    </>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Download Buttons */}
          {stats && stats.processed > 0 && (
            <CRow className="mb-4">
              <CCol xs={12}>
                <CCard>
                  <CCardHeader><strong>📥 Download Results</strong></CCardHeader>
                  <CCardBody>
                    <div className="d-flex gap-3">
                      <CButton color="primary" onClick={() => handleDownload('all')}>
                        <CIcon icon={cilCloudDownload} className="me-1" />
                        All Results ({stats.processed} emails)
                      </CButton>
                      <CButton
                        color="success"
                        onClick={() => handleDownload('with-images')}
                        disabled={stats.with_image === 0}
                      >
                        <CIcon icon={cilImage} className="me-1" />
                        With Photos Only ({stats.with_image})
                      </CButton>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}

          {/* Recent Results Table */}
          {recentResults.length > 0 && (
            <CRow className="mb-4">
              <CCol xs={12}>
                <CCard>
                  <CCardHeader>
                    <strong>📋 Recent Results</strong>
                    <small className="text-muted ms-2">(last 20)</small>
                  </CCardHeader>
                  <CCardBody style={{ padding: 0 }}>
                    <CTable hover responsive striped style={{ marginBottom: 0 }}>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell style={{ width: '40px' }}>#</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: '50px' }}>Photo</CTableHeaderCell>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                          <CTableHeaderCell>Image URL</CTableHeaderCell>
                          <CTableHeaderCell style={{ width: '100px' }}>Status</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {recentResults.map((r, i) => (
                          <CTableRow key={i}>
                            <CTableDataCell>{i + 1}</CTableDataCell>
                            <CTableDataCell>
                              {r.has_image && r.image_url ? (
                                <img
                                  src={r.image_url}
                                  alt=""
                                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <span style={{ fontSize: '1.3rem' }}>👤</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              {r.email}
                            </CTableDataCell>
                            <CTableDataCell>
                              {r.image_url ? (
                                <span
                                  style={{ fontSize: '0.8rem', color: '#3b82f6', cursor: 'pointer', wordBreak: 'break-all' }}
                                  onClick={() => { navigator.clipboard.writeText(r.image_url); }}
                                  title="Click to copy"
                                >
                                  {r.image_url.length > 60 ? r.image_url.substring(0, 60) + '...' : r.image_url}
                                </span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              {r.has_image ? (
                                <CBadge color="success">✅ Found</CBadge>
                              ) : (
                                <CBadge color="secondary">🚫 None</CBadge>
                              )}
                            </CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}
        </>
      )}

      {/* How it Works — shown when no session active */}
      {!sessionId && (
        <CRow>
          <CCol md={8}>
            <CCard>
              <CCardHeader><strong>ℹ️ How it Works</strong></CCardHeader>
              <CCardBody>
                <ol style={{ lineHeight: 2 }}>
                  <li><strong>Upload</strong> a CSV file containing email addresses</li>
                  <li>Select number of <strong>browsers</strong> and click <strong>Start</strong></li>
                  <li><strong>Login to Gmail manually</strong> in each Chrome window (one-time)</li>
                  <li>Scraping starts <strong>automatically</strong> after login — no extra clicks needed</li>
                  <li>Emails are processed in <strong>batches of 20</strong> using DOM extraction (~3,200/min with 40 browsers)</li>
                  <li>Download results as CSV when complete</li>
                </ol>
                <CAlert color="info" className="mb-0 mt-3">
                  <strong>💡 Tip:</strong> Run the worker in a separate terminal:
                  <code className="d-block mt-1">npm run queue:gmail-scraper</code>
                </CAlert>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </>
  );
};

export default Emailphotoscraper;
