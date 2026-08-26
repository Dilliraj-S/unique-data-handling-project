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
  CProgressBar,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilArrowLeft, cilPencil, cilWarning, cilCheckCircle, cilSync, cilColumns, cilTransfer } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * Bulk Update Page
 * Two tabs: Column Update (rename fields) and Value Update (set values)
 * Both use queue-based batch processing for 20 crore+ scale
 */
const Bulkupdate = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('column');

  // ─── Column Update tab state ───
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [columns, setColumns] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [newColumnName, setNewColumnName] = useState('');
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobData, setJobData] = useState(null);
  const progressInterval = useRef(null);
  const [message, setMessage] = useState(null);

  // ─── Value Update tab state ───
  const [valSelectedDatabase, setValSelectedDatabase] = useState('');
  const [valCollections, setValCollections] = useState([]);
  const [valSelectedCollection, setValSelectedCollection] = useState('');
  const [valColumns, setValColumns] = useState([]);
  const [valSelectedColumn, setValSelectedColumn] = useState('');
  const [valValue, setValValue] = useState('');
  const [valLoadingCollections, setValLoadingCollections] = useState(false);
  const [valLoadingColumns, setValLoadingColumns] = useState(false);
  const [valSubmitting, setValSubmitting] = useState(false);
  const [valJobId, setValJobId] = useState(null);
  const [valJobData, setValJobData] = useState(null);
  const valProgressInterval = useRef(null);
  const [valMessage, setValMessage] = useState(null);

  // ─── Compare Update tab state ───
  const [cmpBaseDb, setCmpBaseDb] = useState('');
  const [cmpBaseCollections, setCmpBaseCollections] = useState([]);
  const [cmpBaseCollection, setCmpBaseCollection] = useState('');
  const [cmpTargetDb, setCmpTargetDb] = useState('');
  const [cmpTargetCollections, setCmpTargetCollections] = useState([]);
  const [cmpTargetCollection, setCmpTargetCollection] = useState('');
  const [cmpCompareField, setCmpCompareField] = useState('');
  const [cmpSourceField, setCmpSourceField] = useState('');
  const [cmpValueToStore, setCmpValueToStore] = useState('');
  const [cmpLoadingBaseCollections, setCmpLoadingBaseCollections] = useState(false);
  const [cmpLoadingTargetCollections, setCmpLoadingTargetCollections] = useState(false);
  const [cmpSubmitting, setCmpSubmitting] = useState(false);
  const [cmpJobId, setCmpJobId] = useState(null);
  const [cmpJobData, setCmpJobData] = useState(null);
  const cmpProgressInterval = useRef(null);
  const [cmpMessage, setCmpMessage] = useState(null);

  // ─── Shared: Fetch Databases ───
  const fetchDatabases = useCallback(async () => {
    try {
      setLoadingDatabases(true);
      const response = await axios.get('/api/import/databases');
      if (response.data.success) {
        setDatabases(response.data.databases);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    } finally {
      setLoadingDatabases(false);
    }
  }, []);

  // ─── Shared: Fetch Collections ───
  const fetchCollectionsFor = useCallback(async (databaseName, setter, loadSetter) => {
    if (!databaseName) { setter([]); return; }
    try {
      loadSetter(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      setter(response.data.success ? response.data.collections : []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setter([]);
    } finally {
      loadSetter(false);
    }
  }, []);

  // ─── Shared: Fetch Columns ───
  const fetchColumnsFor = useCallback(async (databaseName, collectionName, setter, loadSetter) => {
    if (!databaseName || !collectionName) { setter([]); return; }
    try {
      loadSetter(true);
      const response = await axios.get(
        `/api/System/Central/crudoperations/getSchema?database=${databaseName}&collection=${collectionName}`
      );
      if (response.data.success && Array.isArray(response.data.columns)) {
        const cols = response.data.columns.map(c => c.name).filter(Boolean).filter(n => n !== '_id');
        setter(Array.from(new Set(cols)).sort((a, b) => a.localeCompare(b)));
      } else {
        setter([]);
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error);
      setter([]);
    } finally {
      loadSetter(false);
    }
  }, []);

  // ─── Column Update Handlers ───
  const handleDatabaseChange = (db) => {
    setSelectedDatabase(db);
    setSelectedCollection(''); setCollections([]); setColumns([]); setSelectedColumn(''); setNewColumnName('');
    if (db) fetchCollectionsFor(db, setCollections, setLoadingCollections);
  };
  const handleCollectionChange = (col) => {
    setSelectedCollection(col);
    setColumns([]); setSelectedColumn(''); setNewColumnName('');
    if (selectedDatabase && col) fetchColumnsFor(selectedDatabase, col, setColumns, setLoadingColumns);
  };

  // ─── Value Update Handlers ───
  const handleValDatabaseChange = (db) => {
    setValSelectedDatabase(db);
    setValSelectedCollection(''); setValCollections([]); setValColumns([]); setValSelectedColumn(''); setValValue('');
    if (db) fetchCollectionsFor(db, setValCollections, setValLoadingCollections);
  };
  const handleValCollectionChange = (col) => {
    setValSelectedCollection(col);
    setValColumns([]); setValSelectedColumn(''); setValValue('');
    if (valSelectedDatabase && col) fetchColumnsFor(valSelectedDatabase, col, setValColumns, setValLoadingColumns);
  };

  // ─── Compare Update Handlers ───
  const handleCmpBaseDatabaseChange = (db) => {
    setCmpBaseDb(db);
    setCmpBaseCollection(''); setCmpBaseCollections([]);
    if (db) fetchCollectionsFor(db, setCmpBaseCollections, setCmpLoadingBaseCollections);
  };
  const handleCmpTargetDatabaseChange = (db) => {
    setCmpTargetDb(db);
    setCmpTargetCollection(''); setCmpTargetCollections([]);
    if (db) fetchCollectionsFor(db, setCmpTargetCollections, setCmpLoadingTargetCollections);
  };

  // ─── Column Update: Poll Progress ───
  const pollProgress = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/querynest/bulk-column-update?job_id=${id}`);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setJobData(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
          if (data.status === 'completed') {
            setMessage({ type: 'success', text: `✅ ${data.message}` });
            if (data.database && data.collection) fetchColumnsFor(data.database, data.collection, setColumns, setLoadingColumns);
            setSelectedColumn(''); setNewColumnName('');
          } else {
            setMessage({ type: 'danger', text: `❌ Rename failed: ${data.message || 'Unknown error'}` });
          }
        }
      }
    } catch (error) { console.error('Error polling progress:', error); }
  }, [fetchColumnsFor]);

  // ─── Value Update: Poll Progress ───
  const pollValProgress = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/querynest/bulk-column-update?job_id=${id}`);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setValJobData(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (valProgressInterval.current) { clearInterval(valProgressInterval.current); valProgressInterval.current = null; }
          if (data.status === 'completed') {
            setValMessage({ type: 'success', text: `✅ ${data.message}` });
          } else {
            setValMessage({ type: 'danger', text: `❌ Value update failed: ${data.message || 'Unknown error'}` });
          }
        }
      }
    } catch (error) { console.error('Error polling value progress:', error); }
  }, []);

  // ─── Compare Update: Poll Progress ───
  const pollCmpProgress = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/querynest/compare-update?job_id=${id}`);
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        setCmpJobData(data);
        if (data.status === 'completed' || data.status === 'failed') {
          if (cmpProgressInterval.current) { clearInterval(cmpProgressInterval.current); cmpProgressInterval.current = null; }
          if (data.status === 'completed') {
            setCmpMessage({ type: 'success', text: `✅ ${data.message}` });
          } else {
            setCmpMessage({ type: 'danger', text: `❌ Compare update failed: ${data.message || 'Unknown error'}` });
          }
        }
      }
    } catch (error) { console.error('Error polling compare progress:', error); }
  }, []);

  // ─── Submit Rename ───
  const handleSubmitRename = async () => {
    if (!selectedDatabase || !selectedCollection || !selectedColumn || !newColumnName.trim()) {
      setMessage({ type: 'danger', text: 'Please fill all fields' }); return;
    }
    if (selectedColumn === newColumnName.trim()) {
      setMessage({ type: 'danger', text: 'New column name must be different from the old one' }); return;
    }
    try {
      setSubmitting(true); setMessage(null); setJobId(null); setJobData(null);
      const response = await axios.post('/api/querynest/bulk-column-update', {
        action: 'rename', database: selectedDatabase, collection: selectedCollection,
        oldColumn: selectedColumn, newColumn: newColumnName.trim()
      });
      if (response.data.success) {
        setJobId(response.data.job_id);
        setJobData({ status: 'queued', total_docs: response.data.total_docs, updated: 0, old_column: selectedColumn, new_column: newColumnName.trim() });
        setMessage({ type: 'info', text: response.data.message });
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => pollProgress(response.data.job_id), 2000);
        setTimeout(() => pollProgress(response.data.job_id), 500);
      } else {
        setMessage({ type: 'danger', text: response.data.message || 'Failed to queue rename' });
      }
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to submit column rename' });
    } finally { setSubmitting(false); }
  };

  // ─── Submit Value Update ───
  const handleSubmitValueUpdate = async () => {
    if (!valSelectedDatabase || !valSelectedCollection || !valSelectedColumn) {
      setValMessage({ type: 'danger', text: 'Please select database, collection, and column' }); return;
    }
    if (valValue === '') {
      setValMessage({ type: 'danger', text: 'Please enter a value to store' }); return;
    }
    try {
      setValSubmitting(true); setValMessage(null); setValJobId(null); setValJobData(null);
      const response = await axios.post('/api/querynest/bulk-column-update', {
        action: 'value-update', database: valSelectedDatabase, collection: valSelectedCollection,
        column: valSelectedColumn, value: valValue
      });
      if (response.data.success) {
        setValJobId(response.data.job_id);
        setValJobData({ status: 'queued', total_docs: response.data.total_docs, updated: 0, column: valSelectedColumn, value: valValue });
        setValMessage({ type: 'info', text: response.data.message });
        if (valProgressInterval.current) clearInterval(valProgressInterval.current);
        valProgressInterval.current = setInterval(() => pollValProgress(response.data.job_id), 2000);
        setTimeout(() => pollValProgress(response.data.job_id), 500);
      } else {
        setValMessage({ type: 'danger', text: response.data.message || 'Failed to queue value update' });
      }
    } catch (error) {
      setValMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to submit value update' });
    } finally { setValSubmitting(false); }
  };

  // ─── Submit Compare Update ───
  const handleSubmitCompareUpdate = async () => {
    if (!cmpBaseDb || !cmpBaseCollection || !cmpTargetDb || !cmpTargetCollection || !cmpCompareField.trim() || !cmpSourceField.trim()) {
      setCmpMessage({ type: 'danger', text: 'Please fill all required fields' }); return;
    }
    if (cmpValueToStore === '') {
      setCmpMessage({ type: 'danger', text: 'Please enter a value to store' }); return;
    }
    try {
      setCmpSubmitting(true); setCmpMessage(null); setCmpJobId(null); setCmpJobData(null);
      const response = await axios.post('/api/querynest/compare-update', {
        baseDatabase: cmpBaseDb, baseCollection: cmpBaseCollection,
        targetDatabase: cmpTargetDb, targetCollection: cmpTargetCollection,
        compareField: cmpCompareField.trim(), sourceField: cmpSourceField.trim(), valueToStore: cmpValueToStore
      });
      if (response.data.success) {
        setCmpJobId(response.data.job_id);
        setCmpJobData({ status: 'queued', total_docs: response.data.total_docs, processed: 0, matched: 0, updated: 0 });
        setCmpMessage({ type: 'info', text: response.data.message });
        if (cmpProgressInterval.current) clearInterval(cmpProgressInterval.current);
        cmpProgressInterval.current = setInterval(() => pollCmpProgress(response.data.job_id), 2000);
        setTimeout(() => pollCmpProgress(response.data.job_id), 500);
      } else {
        setCmpMessage({ type: 'danger', text: response.data.message || 'Failed to queue compare update' });
      }
    } catch (error) {
      setCmpMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to submit compare update' });
    } finally { setCmpSubmitting(false); }
  };

  // ─── Resets ───
  const handleReset = () => {
    setJobId(null); setJobData(null); setMessage(null); setSelectedColumn(''); setNewColumnName('');
    if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
  };
  const handleValReset = () => {
    setValJobId(null); setValJobData(null); setValMessage(null); setValSelectedColumn(''); setValValue('');
    if (valProgressInterval.current) { clearInterval(valProgressInterval.current); valProgressInterval.current = null; }
  };
  const handleCmpReset = () => {
    setCmpJobId(null); setCmpJobData(null); setCmpMessage(null); setCmpCompareField(''); setCmpSourceField(''); setCmpValueToStore('');
    if (cmpProgressInterval.current) { clearInterval(cmpProgressInterval.current); cmpProgressInterval.current = null; }
  };

  // ─── Initialize ───
  useEffect(() => {
    fetchDatabases();
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      if (valProgressInterval.current) clearInterval(valProgressInterval.current);
      if (cmpProgressInterval.current) clearInterval(cmpProgressInterval.current);
    };
  }, [fetchDatabases]);

  // Progress helpers
  const progressPercent = jobData?.total_docs > 0 ? Math.round((jobData.updated / jobData.total_docs) * 100) : 0;
  const isJobActive = jobData?.status === 'processing' || jobData?.status === 'queued';
  const valProgressPercent = valJobData?.total_docs > 0 ? Math.round((valJobData.updated / valJobData.total_docs) * 100) : 0;
  const isValJobActive = valJobData?.status === 'processing' || valJobData?.status === 'queued';
  const cmpProgressPercent = cmpJobData?.total_docs > 0 ? Math.round(((cmpJobData.processed || 0) / cmpJobData.total_docs) * 100) : 0;
  const isCmpJobActive = cmpJobData?.status === 'processing' || cmpJobData?.status === 'queued';

  const getStateBadge = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'queued': return 'warning';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', borderBottom: '2px solid #6d28d9' }}>
              <div className="d-flex align-items-center">
                <CIcon icon={cilSync} className="me-2" size="lg" />
                <h5 className="mb-0 fw-bold">Bulk Update</h5>
              </div>
              <CButton color="light" variant="outline" size="sm" onClick={() => navigate(-1)}>
                <CIcon icon={cilArrowLeft} className="me-2" />Back
              </CButton>
            </CCardHeader>
            <CCardBody>
              {/* Tabs */}
              <CNav variant="tabs" className="mb-4">
                <CNavItem>
                  <CNavLink active={activeTab === 'column'} onClick={() => setActiveTab('column')} style={{ cursor: 'pointer' }}>
                    <CIcon icon={cilColumns} className="me-1" /> Column Update
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={activeTab === 'value'} onClick={() => setActiveTab('value')} style={{ cursor: 'pointer' }}>
                    <CIcon icon={cilPencil} className="me-1" /> Value Update
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={activeTab === 'compare'} onClick={() => setActiveTab('compare')} style={{ cursor: 'pointer' }}>
                    <CIcon icon={cilTransfer} className="me-1" /> Compare Update
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent>
                {/* ═══ TAB 1: Column Update ═══ */}
                <CTabPane visible={activeTab === 'column'}>
                  {message && <CAlert color={message.type} dismissible onClose={() => setMessage(null)} className="mb-3">{message.text}</CAlert>}

                  <CCard className="mb-4 border-0" style={{ background: '#faf5ff', borderRadius: '12px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3" style={{ color: '#6d28d9' }}>
                        <CIcon icon={cilColumns} className="me-2" />Rename Column
                      </h6>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">1. Select Database <span className="text-danger">*</span></CFormLabel>
                          {loadingDatabases ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={selectedDatabase} onChange={(e) => handleDatabaseChange(e.target.value)} disabled={isJobActive}>
                              <option value="">-- Select Database --</option>
                              {databases.map((db) => <option key={db.name} value={db.name}>{db.label} ({db.collections?.length || 0} collections)</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">2. Select Collection <span className="text-danger">*</span></CFormLabel>
                          {loadingCollections ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={selectedCollection} onChange={(e) => handleCollectionChange(e.target.value)} disabled={!selectedDatabase || isJobActive}>
                              <option value="">-- Select Collection --</option>
                              {collections.map((col) => <option key={col.name} value={col.name}>{col.label || col.name}</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">3. Select Column to Rename <span className="text-danger">*</span></CFormLabel>
                          {loadingColumns ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)} disabled={!selectedCollection || isJobActive || columns.length === 0}>
                              <option value="">{columns.length === 0 && selectedCollection ? 'No columns found' : '-- Select Column --'}</option>
                              {columns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </CFormSelect>
                          )}
                          {columns.length > 0 && <small className="text-muted">{columns.length} columns available</small>}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">4. New Column Name <span className="text-danger">*</span></CFormLabel>
                          <CFormInput type="text" placeholder="e.g. source, company_email" value={newColumnName} onChange={(e) => setNewColumnName(e.target.value)} disabled={!selectedColumn || isJobActive} />
                          <small className="text-muted">Use letters, numbers, underscores, and dots only</small>
                        </CCol>
                      </CRow>
                      {selectedColumn && newColumnName.trim() && (
                        <CAlert color="info" className="mb-0">
                          <strong>Preview:</strong> <code>{selectedDatabase}.{selectedCollection}</code> → Rename <CBadge color="danger" className="mx-1">{selectedColumn}</CBadge> to <CBadge color="success" className="mx-1">{newColumnName.trim()}</CBadge>
                        </CAlert>
                      )}
                    </CCardBody>
                  </CCard>

                  <div className="d-flex align-items-center gap-3 mb-4">
                    <CButton color="primary" size="lg" disabled={!selectedDatabase || !selectedCollection || !selectedColumn || !newColumnName.trim() || submitting || isJobActive} onClick={handleSubmitRename} style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                      {submitting ? <><CSpinner size="sm" className="me-2" /> Submitting...</> : <><CIcon icon={cilSync} className="me-2" /> Start Column Rename</>}
                    </CButton>
                    {(jobData?.status === 'completed' || jobData?.status === 'failed') && <CButton color="secondary" variant="outline" onClick={handleReset}>New Rename</CButton>}
                    {jobData?.status && <CBadge color={getStateBadge(jobData.status)} className="px-3 py-2" style={{ fontSize: '0.85rem' }}>{jobData.status.toUpperCase()}</CBadge>}
                  </div>

                  {jobId && jobData && (
                    <CCard className="border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #faf5ff 100%)', borderRadius: '16px' }}>
                      <CCardBody>
                        <div className="d-flex align-items-center gap-4 mb-3">
                          <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                            <CircularProgressbar value={jobData.status === 'completed' ? 100 : progressPercent} text={`${jobData.status === 'completed' ? 100 : progressPercent}%`} styles={buildStyles({ textSize: '22px', pathColor: jobData.status === 'completed' ? '#22c55e' : jobData.status === 'failed' ? '#ef4444' : '#7c3aed', textColor: '#1f2937', trailColor: '#e5e7eb', pathTransitionDuration: 0.5 })} />
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-1 fw-bold">
                              {jobData.status === 'completed' ? '✅ Rename Complete' : jobData.status === 'failed' ? '❌ Rename Failed' : jobData.status === 'processing' ? '🔄 Renaming columns...' : '⏳ Waiting in queue...'}
                            </h5>
                            <p className="text-muted mb-2"><code>{jobData.old_column}</code> → <code>{jobData.new_column}</code> <small>| Job: <code>{jobId}</code></small></p>
                            <CProgress className="mb-2" style={{ height: '8px' }}>
                              <CProgressBar value={jobData.status === 'completed' ? 100 : progressPercent} color={jobData.status === 'completed' ? 'success' : jobData.status === 'failed' ? 'danger' : 'info'} animated={jobData.status === 'processing'} />
                            </CProgress>
                            <div className="d-flex flex-wrap gap-4 mt-2">
                              <div><small className="text-muted d-block">Documents Updated</small><strong>{(jobData.updated || 0).toLocaleString()} / {(jobData.total_docs || 0).toLocaleString()}</strong></div>
                              {jobData.current_batch > 0 && <div><small className="text-muted d-block">Batch</small><strong>{jobData.current_batch} / {jobData.total_batches || '?'}</strong></div>}
                            </div>
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

                  {!jobId && (
                    <CCard className="border-0 mt-2" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                      <CCardBody>
                        <h6 className="fw-bold mb-3">How it works</h6>
                        <ol className="text-muted mb-0" style={{ lineHeight: '1.8' }}>
                          <li>Select the target database and collection</li>
                          <li>Choose the column you want to rename</li>
                          <li>Type the new column name</li>
                          <li>The system renames the field across <strong>all documents</strong> using MongoDB <code>$rename</code></li>
                          <li>Large collections (20 crore+) are processed in batches of 50,000</li>
                        </ol>
                        <CAlert color="warning" className="mt-3 mb-0">
                          <small><strong>⚠️</strong> Column rename is <strong>irreversible</strong>. <br /><strong>💡</strong> Run <code>node bulkupdate-worker.js</code> to process jobs.</small>
                        </CAlert>
                      </CCardBody>
                    </CCard>
                  )}
                </CTabPane>

                {/* ═══ TAB 2: Value Update ═══ */}
                <CTabPane visible={activeTab === 'value'}>
                  {valMessage && <CAlert color={valMessage.type} dismissible onClose={() => setValMessage(null)} className="mb-3">{valMessage.text}</CAlert>}

                  <CCard className="mb-4 border-0" style={{ background: '#fefce8', borderRadius: '12px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3" style={{ color: '#a16207' }}>
                        <CIcon icon={cilPencil} className="me-2" />Update Column Value
                      </h6>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">1. Select Database <span className="text-danger">*</span></CFormLabel>
                          {loadingDatabases ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={valSelectedDatabase} onChange={(e) => handleValDatabaseChange(e.target.value)} disabled={isValJobActive}>
                              <option value="">-- Select Database --</option>
                              {databases.map((db) => <option key={db.name} value={db.name}>{db.label} ({db.collections?.length || 0} collections)</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">2. Select Collection <span className="text-danger">*</span></CFormLabel>
                          {valLoadingCollections ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={valSelectedCollection} onChange={(e) => handleValCollectionChange(e.target.value)} disabled={!valSelectedDatabase || isValJobActive}>
                              <option value="">-- Select Collection --</option>
                              {valCollections.map((col) => <option key={col.name} value={col.name}>{col.label || col.name}</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">3. Select Column <span className="text-danger">*</span></CFormLabel>
                          {valLoadingColumns ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={valSelectedColumn} onChange={(e) => setValSelectedColumn(e.target.value)} disabled={!valSelectedCollection || isValJobActive || valColumns.length === 0}>
                              <option value="">{valColumns.length === 0 && valSelectedCollection ? 'No columns found' : '-- Select Column --'}</option>
                              {valColumns.map((col) => <option key={col} value={col}>{col}</option>)}
                            </CFormSelect>
                          )}
                          {valColumns.length > 0 && <small className="text-muted">{valColumns.length} columns available</small>}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">4. Value to Store <span className="text-danger">*</span></CFormLabel>
                          <CFormInput type="text" placeholder="e.g. dls, active, pending" value={valValue} onChange={(e) => setValValue(e.target.value)} disabled={!valSelectedColumn || isValJobActive} />
                          <small className="text-muted">This value will be set on <strong>every record</strong> in the collection</small>
                        </CCol>
                      </CRow>
                      {valSelectedColumn && valValue !== '' && (
                        <CAlert color="warning" className="mb-0">
                          <strong>Preview:</strong> <code>{valSelectedDatabase}.{valSelectedCollection}</code> → Set <CBadge color="info" className="mx-1">{valSelectedColumn}</CBadge> = <CBadge color="success" className="mx-1">"{valValue}"</CBadge> on <strong>ALL</strong> records
                        </CAlert>
                      )}
                    </CCardBody>
                  </CCard>

                  <div className="d-flex align-items-center gap-3 mb-4">
                    <CButton color="warning" size="lg" disabled={!valSelectedDatabase || !valSelectedCollection || !valSelectedColumn || valValue === '' || valSubmitting || isValJobActive} onClick={handleSubmitValueUpdate} style={{ background: '#d97706', borderColor: '#d97706', color: '#fff' }}>
                      {valSubmitting ? <><CSpinner size="sm" className="me-2" /> Submitting...</> : <><CIcon icon={cilPencil} className="me-2" /> Start Value Update</>}
                    </CButton>
                    {(valJobData?.status === 'completed' || valJobData?.status === 'failed') && <CButton color="secondary" variant="outline" onClick={handleValReset}>New Update</CButton>}
                    {valJobData?.status && <CBadge color={getStateBadge(valJobData.status)} className="px-3 py-2" style={{ fontSize: '0.85rem' }}>{valJobData.status.toUpperCase()}</CBadge>}
                  </div>

                  {valJobId && valJobData && (
                    <CCard className="border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #fefce8 100%)', borderRadius: '16px' }}>
                      <CCardBody>
                        <div className="d-flex align-items-center gap-4 mb-3">
                          <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                            <CircularProgressbar value={valJobData.status === 'completed' ? 100 : valProgressPercent} text={`${valJobData.status === 'completed' ? 100 : valProgressPercent}%`} styles={buildStyles({ textSize: '22px', pathColor: valJobData.status === 'completed' ? '#22c55e' : valJobData.status === 'failed' ? '#ef4444' : '#d97706', textColor: '#1f2937', trailColor: '#e5e7eb', pathTransitionDuration: 0.5 })} />
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-1 fw-bold">
                              {valJobData.status === 'completed' ? '✅ Value Update Complete' : valJobData.status === 'failed' ? '❌ Value Update Failed' : valJobData.status === 'processing' ? '🔄 Updating values...' : '⏳ Waiting in queue...'}
                            </h5>
                            <p className="text-muted mb-2">Setting <code>{valJobData.column}</code> = <code>"{valJobData.value}"</code> <small>| Job: <code>{valJobId}</code></small></p>
                            <CProgress className="mb-2" style={{ height: '8px' }}>
                              <CProgressBar value={valJobData.status === 'completed' ? 100 : valProgressPercent} color={valJobData.status === 'completed' ? 'success' : valJobData.status === 'failed' ? 'danger' : 'warning'} animated={valJobData.status === 'processing'} />
                            </CProgress>
                            <div className="d-flex flex-wrap gap-4 mt-2">
                              <div><small className="text-muted d-block">Documents Updated</small><strong>{(valJobData.updated || 0).toLocaleString()} / {(valJobData.total_docs || 0).toLocaleString()}</strong></div>
                              {valJobData.current_batch > 0 && <div><small className="text-muted d-block">Batch</small><strong>{valJobData.current_batch} / {valJobData.total_batches || '?'}</strong></div>}
                            </div>
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

                  {!valJobId && (
                    <CCard className="border-0 mt-2" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                      <CCardBody>
                        <h6 className="fw-bold mb-3">How it works</h6>
                        <ol className="text-muted mb-0" style={{ lineHeight: '1.8' }}>
                          <li>Select the target database and collection</li>
                          <li>Choose the column to update</li>
                          <li>Type the value you want to store</li>
                          <li>The system sets that value on <strong>every document</strong> using MongoDB <code>$set</code></li>
                          <li>If the column doesn't exist in a document, it will be <strong>created automatically</strong></li>
                          <li>Large collections (20 crore+) are processed in batches of 50,000</li>
                        </ol>
                        <CAlert color="warning" className="mt-3 mb-0">
                          <small><strong>⚠️</strong> This will <strong>overwrite</strong> existing values in the selected column. <br /><strong>💡</strong> Run <code>node bulkupdate-worker.js</code> to process jobs.</small>
                        </CAlert>
                      </CCardBody>
                    </CCard>
                  )}
                </CTabPane>

                {/* ═══ TAB 3: Compare Update ═══ */}
                <CTabPane visible={activeTab === 'compare'}>
                  {cmpMessage && <CAlert color={cmpMessage.type} dismissible onClose={() => setCmpMessage(null)} className="mb-3">{cmpMessage.text}</CAlert>}

                  <CCard className="mb-4 border-0" style={{ background: '#f0fdf4', borderRadius: '12px' }}>
                    <CCardBody>
                      <h6 className="fw-bold mb-3" style={{ color: '#15803d' }}>
                        <CIcon icon={cilTransfer} className="me-2" />Cross-Collection Compare & Update
                      </h6>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">1. Base Database <span className="text-danger">*</span></CFormLabel>
                          {loadingDatabases ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={cmpBaseDb} onChange={(e) => handleCmpBaseDatabaseChange(e.target.value)} disabled={isCmpJobActive}>
                              <option value="">-- Select Base Database --</option>
                              {databases.map((db) => <option key={db.name} value={db.name}>{db.label} ({db.collections?.length || 0} collections)</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">2. Base Collection <span className="text-danger">*</span></CFormLabel>
                          {cmpLoadingBaseCollections ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={cmpBaseCollection} onChange={(e) => setCmpBaseCollection(e.target.value)} disabled={!cmpBaseDb || isCmpJobActive}>
                              <option value="">-- Select Base Collection --</option>
                              {cmpBaseCollections.map((col) => <option key={col.name} value={col.name}>{col.label || col.name}</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">3. Target Database <span className="text-danger">*</span></CFormLabel>
                          {loadingDatabases ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={cmpTargetDb} onChange={(e) => handleCmpTargetDatabaseChange(e.target.value)} disabled={isCmpJobActive}>
                              <option value="">-- Select Target Database --</option>
                              {databases.map((db) => <option key={db.name} value={db.name}>{db.label} ({db.collections?.length || 0} collections)</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                        <CCol md={6}>
                          <CFormLabel className="fw-semibold">4. Target Collection <span className="text-danger">*</span></CFormLabel>
                          {cmpLoadingTargetCollections ? <div className="d-flex align-items-center gap-2 py-2"><CSpinner size="sm" /> Loading...</div> : (
                            <CFormSelect value={cmpTargetCollection} onChange={(e) => setCmpTargetCollection(e.target.value)} disabled={!cmpTargetDb || isCmpJobActive}>
                              <option value="">-- Select Target Collection --</option>
                              {cmpTargetCollections.map((col) => <option key={col.name} value={col.name}>{col.label || col.name}</option>)}
                            </CFormSelect>
                          )}
                        </CCol>
                      </CRow>
                      <CRow className="mb-3">
                        <CCol md={4}>
                          <CFormLabel className="fw-semibold">5. Compare Field <span className="text-danger">*</span></CFormLabel>
                          <CFormInput type="text" placeholder="e.g. email" value={cmpCompareField} onChange={(e) => setCmpCompareField(e.target.value)} disabled={isCmpJobActive} />
                          <small className="text-muted">Field to match between base & target</small>
                        </CCol>
                        <CCol md={4}>
                          <CFormLabel className="fw-semibold">6. Source Field <span className="text-danger">*</span></CFormLabel>
                          <CFormInput type="text" placeholder="e.g. source" value={cmpSourceField} onChange={(e) => setCmpSourceField(e.target.value)} disabled={isCmpJobActive} />
                          <small className="text-muted">Field to create/update on target</small>
                        </CCol>
                        <CCol md={4}>
                          <CFormLabel className="fw-semibold">7. Value to Store <span className="text-danger">*</span></CFormLabel>
                          <CFormInput type="text" placeholder="e.g. zoom, active" value={cmpValueToStore} onChange={(e) => setCmpValueToStore(e.target.value)} disabled={isCmpJobActive} />
                          <small className="text-muted">Value written into Source Field</small>
                        </CCol>
                      </CRow>
                      {cmpBaseCollection && cmpTargetCollection && cmpCompareField.trim() && cmpSourceField.trim() && cmpValueToStore !== '' && (
                        <CAlert color="info" className="mb-0">
                          <strong>Preview:</strong> <code>{cmpBaseDb}.{cmpBaseCollection}</code> → <code>{cmpTargetDb}.{cmpTargetCollection}</code> | Match on <CBadge color="primary" className="mx-1">{cmpCompareField.trim()}</CBadge> → Set <CBadge color="success" className="mx-1">{cmpSourceField.trim()}</CBadge> = <CBadge color="warning" className="mx-1">"{cmpValueToStore}"</CBadge>
                        </CAlert>
                      )}
                    </CCardBody>
                  </CCard>

                  <div className="d-flex align-items-center gap-3 mb-4">
                    <CButton color="success" size="lg" disabled={!cmpBaseDb || !cmpBaseCollection || !cmpTargetDb || !cmpTargetCollection || !cmpCompareField.trim() || !cmpSourceField.trim() || cmpValueToStore === '' || cmpSubmitting || isCmpJobActive} onClick={handleSubmitCompareUpdate} style={{ background: '#15803d', borderColor: '#15803d' }}>
                      {cmpSubmitting ? <><CSpinner size="sm" className="me-2" /> Submitting...</> : <><CIcon icon={cilTransfer} className="me-2" /> Start Compare Update</>}
                    </CButton>
                    {(cmpJobData?.status === 'completed' || cmpJobData?.status === 'failed') && <CButton color="secondary" variant="outline" onClick={handleCmpReset}>New Compare</CButton>}
                    {cmpJobData?.status && <CBadge color={getStateBadge(cmpJobData.status)} className="px-3 py-2" style={{ fontSize: '0.85rem' }}>{cmpJobData.status.toUpperCase()}</CBadge>}
                  </div>

                  {cmpJobId && cmpJobData && (
                    <CCard className="border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)', borderRadius: '16px' }}>
                      <CCardBody>
                        <div className="d-flex align-items-center gap-4 mb-3">
                          <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                            <CircularProgressbar value={cmpJobData.status === 'completed' ? 100 : cmpProgressPercent} text={`${cmpJobData.status === 'completed' ? 100 : cmpProgressPercent}%`} styles={buildStyles({ textSize: '22px', pathColor: cmpJobData.status === 'completed' ? '#22c55e' : cmpJobData.status === 'failed' ? '#ef4444' : '#15803d', textColor: '#1f2937', trailColor: '#e5e7eb', pathTransitionDuration: 0.5 })} />
                          </div>
                          <div className="flex-grow-1">
                            <h5 className="mb-1 fw-bold">
                              {cmpJobData.status === 'completed' ? '✅ Compare Update Complete' : cmpJobData.status === 'failed' ? '❌ Compare Update Failed' : cmpJobData.status === 'processing' ? '🔄 Comparing & updating...' : '⏳ Waiting in queue...'}
                            </h5>
                            <p className="text-muted mb-2">Match <code>{cmpJobData.compare_field || cmpCompareField}</code> → Set <code>{cmpJobData.source_field || cmpSourceField}</code> = <code>"{cmpJobData.value_to_store || cmpValueToStore}"</code> <small>| Job: <code>{cmpJobId}</code></small></p>
                            <CProgress className="mb-2" style={{ height: '8px' }}>
                              <CProgressBar value={cmpJobData.status === 'completed' ? 100 : cmpProgressPercent} color={cmpJobData.status === 'completed' ? 'success' : cmpJobData.status === 'failed' ? 'danger' : 'success'} animated={cmpJobData.status === 'processing'} />
                            </CProgress>
                            <div className="d-flex flex-wrap gap-4 mt-2">
                              <div><small className="text-muted d-block">Processed</small><strong>{(cmpJobData.processed || 0).toLocaleString()} / {(cmpJobData.total_docs || 0).toLocaleString()}</strong></div>
                              <div><small className="text-muted d-block">Matched</small><strong style={{ color: '#2563eb' }}>{(cmpJobData.matched || 0).toLocaleString()}</strong></div>
                              <div><small className="text-muted d-block">Updated</small><strong style={{ color: '#15803d' }}>{(cmpJobData.updated || 0).toLocaleString()}</strong></div>
                              {cmpJobData.current_batch > 0 && <div><small className="text-muted d-block">Batch</small><strong>{cmpJobData.current_batch} / {cmpJobData.total_batches || '?'}</strong></div>}
                            </div>
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

                  {!cmpJobId && (
                    <CCard className="border-0 mt-2" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                      <CCardBody>
                        <h6 className="fw-bold mb-3">How it works</h6>
                        <ol className="text-muted mb-0" style={{ lineHeight: '1.8' }}>
                          <li>Select a <strong>base</strong> database & collection (source of compare values)</li>
                          <li>Select a <strong>target</strong> database & collection (where updates happen)</li>
                          <li>Enter the <strong>compare field</strong> (e.g. <code>email</code>) — used to match records</li>
                          <li>Enter the <strong>source field</strong> name to create/update on target (e.g. <code>source</code>)</li>
                          <li>Enter the <strong>value</strong> to write (e.g. <code>zoom</code>)</li>
                          <li>The system reads base collection in batches of <strong>10,000</strong>, matches in target using <code>$in</code>, and updates via <code>bulkWrite</code></li>
                          <li>Safe for <strong>10 crore+</strong> records — no memory issues, no timeouts</li>
                        </ol>
                        <CAlert color="warning" className="mt-3 mb-0">
                          <small><strong>⚠️</strong> Existing values in the source field will be <strong>overwritten</strong>. <br /><strong>💡</strong> Run <code>node bulkupdate-worker.js</code> to process jobs.</small>
                        </CAlert>
                      </CCardBody>
                    </CCard>
                  )}
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Bulkupdate;
