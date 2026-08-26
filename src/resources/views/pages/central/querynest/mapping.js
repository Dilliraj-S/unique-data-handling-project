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
import { cilArrowLeft, cilCloudUpload, cilDataTransferDown, cilFile, cilWarning, cilCheckCircle, cilSearch } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * Mapping Page — Field-based CSV Lookup
 * Upload a CSV with a match field column (e.g. li_company_name, li_smtp),
 * match against a MongoDB collection, and download all matched records as CSV.
 * 
 * System: central
 * Module: querynest
 * Section: mapping
 */
const Mapping = () => {
  const navigate = useNavigate();

  // ─── State ───
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [matchField, setMatchField] = useState('li_company_name');
  const [matchFieldOptions, setMatchFieldOptions] = useState([]);
  const [loadingMatchFields, setLoadingMatchFields] = useState(false);

  // Loading states
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Job state
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState(null);
  const [jobProgress, setJobProgress] = useState({});
  const [jobResult, setJobResult] = useState(null);
  const [jobError, setJobError] = useState(null);
  const progressInterval = useRef(null);

  // CSV preview info
  const [csvPreview, setCsvPreview] = useState(null);

  // Messages
  const [message, setMessage] = useState(null);

  const fileInputRef = useRef(null);

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

  // ─── Fetch Match Field Options (collection columns) ───
  const fetchMatchFields = useCallback(async (databaseName, collectionName) => {
    if (!databaseName || !collectionName) {
      setMatchFieldOptions([]);
      return;
    }
    try {
      setLoadingMatchFields(true);
      // Reuse existing schema API to get columns for the collection
      const response = await axios.get(
        `/api/System/Central/crudoperations/getSchema?database=${databaseName}&collection=${collectionName}`
      );
      if (response.data.success && Array.isArray(response.data.columns)) {
        const cols = response.data.columns.map((c) => c.name).filter(Boolean);
        const uniqueSorted = Array.from(new Set(cols)).sort((a, b) => a.localeCompare(b));
        setMatchFieldOptions(uniqueSorted);

        // Auto-select a sensible default if current matchField is not in the list
        if (!uniqueSorted.includes(matchField)) {
          const preferred = uniqueSorted.find((n) => n === 'li_company_name')
            || uniqueSorted.find((n) => n === 'li_smtp')
            || uniqueSorted[0];
          if (preferred) {
            setMatchField(preferred);
          }
        }
      } else {
        setMatchFieldOptions([]);
      }
    } catch (error) {
      console.error('Failed to fetch match fields (schema):', error);
      setMatchFieldOptions([]);
    } finally {
      setLoadingMatchFields(false);
    }
  }, [matchField]);

  // ─── Handle Database Change ───
  const handleDatabaseChange = (db) => {
    setSelectedDatabase(db);
    setSelectedCollection('');
    setCollections([]);
    setMatchFieldOptions([]);
    setMatchField('li_company_name');
    if (db) {
      fetchCollections(db);
    }
  };

  // ─── Handle Collection Change ───
  const handleCollectionChange = (collectionName) => {
    setSelectedCollection(collectionName);
    setMatchFieldOptions([]);
    if (selectedDatabase && collectionName) {
      fetchMatchFields(selectedDatabase, collectionName);
    }
  };

  // ─── Handle File Selection ───
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCsvFile(null);
      setCsvPreview(null);
      return;
    }

    setCsvFile(file);
    setMessage(null);

    // Read preview info (first few lines)
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')) : [];
        const hasMatchColumn = headers.some(h => h.toLowerCase() === matchField.toLowerCase());
        
        setCsvPreview({
          fileName: file.name,
          fileSize: (file.size / (1024 * 1024)).toFixed(2),
          totalRows: lines.length - 1, // Exclude header
          totalColumns: headers.length,
          headers: headers.slice(0, 15), // Show first 15 headers
          hasMatchColumn,
          allHeaders: headers
        });
      } catch (err) {
        setCsvPreview({
          fileName: file.name,
          fileSize: (file.size / (1024 * 1024)).toFixed(2),
          totalRows: '?',
          totalColumns: '?',
          headers: [],
          hasMatchColumn: false,
          allHeaders: []
        });
      }
    };
    // Only read first 100KB for preview
    reader.readAsText(file.slice(0, 100 * 1024));
  };

  // ─── Poll Job Progress ───
  const pollProgress = useCallback(async (id) => {
    try {
      const response = await axios.get(`/api/mapping-lookup?jobId=${id}`);
      if (response.data.success) {
        setJobState(response.data.state);
        
        if (response.data.progress && typeof response.data.progress === 'object') {
          setJobProgress(response.data.progress);
        }
        
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
            const matched = response.data.result?.totalMatched || 0;
            setMessage({ 
              type: 'success', 
              text: `✅ Mapping complete! ${matched.toLocaleString()} records matched and ready for download.` 
            });
          } else {
            setMessage({ 
              type: 'danger', 
              text: `❌ Mapping failed: ${response.data.failedReason || 'Unknown error'}` 
            });
          }
        }
      }
    } catch (error) {
      console.error('Error polling progress:', error);
    }
  }, []);

  // ─── Start Mapping Lookup ───
  const handleStartLookup = async () => {
    if (!selectedDatabase || !selectedCollection || !csvFile) {
      setMessage({ type: 'danger', text: 'Please select database, collection, and upload a CSV file' });
      return;
    }

    if (csvPreview && !csvPreview.hasMatchColumn) {
      setMessage({ 
        type: 'danger', 
        text: `Column "${matchField}" not found in the uploaded CSV. Available columns: ${csvPreview.allHeaders.join(', ')}` 
      });
      return;
    }

    try {
      setUploading(true);
      setMessage(null);
      setJobId(null);
      setJobState(null);
      setJobProgress({});
      setJobResult(null);
      setJobError(null);

      // Upload CSV via FormData
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('database', selectedDatabase);
      formData.append('collection', selectedCollection);
      formData.append('matchField', matchField);

      const response = await axios.post('/api/mapping-lookup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      if (response.data.success) {
        setJobId(response.data.jobId);
        setJobState('waiting');
        setMessage({ 
          type: 'info', 
          text: `Job queued — ${(response.data.totalUniqueValues || response.data.totalUniqueCompanies || 0).toLocaleString()} unique values extracted from ${response.data.totalCsvRows.toLocaleString()} rows (match field: ${matchField})` 
        });

        // Start polling
        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => {
          pollProgress(response.data.jobId);
        }, 2000);

        // Immediate first poll
        setTimeout(() => pollProgress(response.data.jobId), 500);
      } else {
        setMessage({ type: 'danger', text: response.data.message || 'Failed to start mapping job' });
      }
    } catch (error) {
      console.error('Failed to start mapping:', error);
      const serverMessage = error.response?.data?.message;
      const availableCols = error.response?.data?.availableColumns;
      
      let errText = serverMessage || 'Failed to start mapping lookup';
      if (availableCols) {
        errText += `\n\nAvailable columns: ${availableCols.join(', ')}`;
      }
      
      setMessage({ type: 'danger', text: errText });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ─── Download Result CSV ───
  const handleDownload = async () => {
    if (!jobId) return;
    try {
      const response = await axios.get(`/api/mapping-lookup?jobId=${jobId}&download=true`, {
        responseType: 'blob'
      });

      // Detect file type from response content-type
      const contentType = response.headers['content-type'] || '';
      const isZip = contentType.includes('zip');
      const ext = isZip ? 'zip' : 'csv';

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mapping_results_${selectedDatabase}_${selectedCollection}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      setMessage({ type: 'danger', text: 'Failed to download result file' });
    }
  };

  // ─── Reset Form ───
  const handleReset = () => {
    setJobId(null);
    setJobState(null);
    setJobProgress({});
    setJobResult(null);
    setJobError(null);
    setCsvFile(null);
    setCsvPreview(null);
    setMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  // ─── Initialize ───
  useEffect(() => {
    fetchDatabases();
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [fetchDatabases]);

  // Compute progress percentage
  const progressPercent = jobProgress.total > 0 
    ? Math.round((jobProgress.processed / jobProgress.total) * 100) 
    : 0;

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

  const isJobActive = jobState === 'active' || jobState === 'waiting';

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader
              className="d-flex align-items-center justify-content-between"
              style={{ background: '#0ea5e9', color: '#fff', borderBottom: '2px solid #0284c7' }}
            >
              <div className="d-flex align-items-center">
                <CIcon icon={cilSearch} className="me-2" />
                <h5 className="mb-0">Field Mapping Lookup</h5>
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
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {message.text}
                </CAlert>
              )}

              {/* ─── Configuration Form ─── */}
              <CRow className="mb-3">
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
                      disabled={isJobActive}
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
                      onChange={(e) => handleCollectionChange(e.target.value)}
                      disabled={!selectedDatabase || isJobActive}
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

              <CRow className="mb-4">
                <CCol md={4}>
                  <CFormLabel className="fw-semibold">Match Field</CFormLabel>
                  <CFormSelect
                    value={matchField}
                    onChange={(e) => setMatchField(e.target.value)}
                    disabled={!selectedDatabase || !selectedCollection || isJobActive || loadingMatchFields || matchFieldOptions.length === 0}
                  >
                    <option value="">
                      {loadingMatchFields ? 'Loading fields...' : '-- Select Match Field --'}
                    </option>
                    {matchFieldOptions.map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </CFormSelect>
                  <small className="text-muted">
                    Column name in CSV &amp; field name in MongoDB. Options come from the selected collection&apos;s schema.
                  </small>
                </CCol>
                <CCol md={8}>
                  <CFormLabel className="fw-semibold">
                    Upload CSV File <span className="text-danger">*</span>
                  </CFormLabel>
                  <CFormInput
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    disabled={isJobActive}
                  />
                  <small className="text-muted">CSV must contain a column named "{matchField}" for matching (e.g. li_company_name, li_smtp)</small>
                </CCol>
              </CRow>

              {/* ─── CSV Preview ─── */}
              {csvPreview && !jobId && (
                <CCard className="mb-4 border-0" style={{ background: '#f0f9ff', borderRadius: '12px' }}>
                  <CCardBody>
                    <div className="d-flex align-items-center mb-3">
                      <CIcon icon={cilFile} className="me-2" style={{ color: '#0ea5e9' }} />
                      <h6 className="mb-0 fw-bold" style={{ color: '#0c4a6e' }}>CSV Preview</h6>
                    </div>
                    <div className="d-flex flex-wrap gap-4 mb-3">
                      <div>
                        <small className="text-muted d-block">File Name</small>
                        <strong>{csvPreview.fileName}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">File Size</small>
                        <strong>{csvPreview.fileSize} MB</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">Data Rows</small>
                        <strong>{typeof csvPreview.totalRows === 'number' ? csvPreview.totalRows.toLocaleString() : csvPreview.totalRows}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">Columns</small>
                        <strong>{csvPreview.totalColumns}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">Match Column</small>
                        {csvPreview.hasMatchColumn ? (
                          <CBadge color="success" className="px-2 py-1">
                            <CIcon icon={cilCheckCircle} size="sm" className="me-1" />
                            {matchField} found
                          </CBadge>
                        ) : (
                          <CBadge color="danger" className="px-2 py-1">
                            <CIcon icon={cilWarning} size="sm" className="me-1" />
                            {matchField} NOT found
                          </CBadge>
                        )}
                      </div>
                    </div>
                    {csvPreview.headers.length > 0 && (
                      <div>
                        <small className="text-muted d-block mb-1">Detected Columns:</small>
                        <div className="d-flex flex-wrap gap-1">
                          {csvPreview.headers.map((h, i) => (
                            <CBadge 
                              key={i} 
                              color={h.toLowerCase() === matchField.toLowerCase() ? 'primary' : 'light'}
                              className="px-2 py-1"
                              style={{ 
                                color: h.toLowerCase() === matchField.toLowerCase() ? '#fff' : '#475569',
                                fontSize: '0.75rem'
                              }}
                            >
                              {h}
                            </CBadge>
                          ))}
                          {csvPreview.allHeaders.length > 15 && (
                            <CBadge color="light" className="px-2 py-1" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                              +{csvPreview.allHeaders.length - 15} more
                            </CBadge>
                          )}
                        </div>
                      </div>
                    )}
                  </CCardBody>
                </CCard>
              )}

              {/* ─── Action Buttons ─── */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <CButton
                  color="primary"
                  size="lg"
                  disabled={!selectedDatabase || !selectedCollection || !csvFile || uploading || isJobActive}
                  onClick={handleStartLookup}
                  style={{ background: '#0ea5e9', borderColor: '#0ea5e9' }}
                >
                  {uploading ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Uploading... {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilCloudUpload} className="me-2" />
                      Start Mapping Lookup
                    </>
                  )}
                </CButton>

                {(jobState === 'completed' || jobState === 'failed') && (
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={handleReset}
                  >
                    New Lookup
                  </CButton>
                )}

                {jobState && (
                  <CBadge color={getStateBadge(jobState)} className="px-3 py-2" style={{ fontSize: '0.85rem' }}>
                    {jobState.toUpperCase()}
                  </CBadge>
                )}
              </div>

              {/* ─── Progress Section ─── */}
              {jobId && (
                <CCard className="border-0 mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)', borderRadius: '16px' }}>
                  <CCardBody>
                    <div className="d-flex align-items-center gap-4 mb-3">
                      {/* Circular Progress */}
                      <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                        <CircularProgressbar
                          value={jobState === 'completed' ? 100 : progressPercent}
                          text={`${jobState === 'completed' ? 100 : progressPercent}%`}
                          styles={buildStyles({
                            textSize: '22px',
                            pathColor: jobState === 'completed' ? '#22c55e' : jobState === 'failed' ? '#ef4444' : '#0ea5e9',
                            textColor: '#1f2937',
                            trailColor: '#e5e7eb',
                            pathTransitionDuration: 0.5,
                          })}
                        />
                      </div>

                      {/* Progress Info */}
                      <div className="flex-grow-1">
                        <h5 className="mb-1 fw-bold">
                          {jobState === 'completed' ? '✅ Mapping Complete' :
                           jobState === 'failed' ? '❌ Mapping Failed' :
                           jobState === 'active' ? '🔄 Processing...' :
                           '⏳ Waiting in queue...'}
                        </h5>
                        <p className="text-muted mb-2">Job ID: <code>{jobId}</code></p>
                        <CProgress className="mb-2" style={{ height: '8px' }}>
                          <CProgressBar
                            value={jobState === 'completed' ? 100 : progressPercent}
                            color={jobState === 'completed' ? 'success' : jobState === 'failed' ? 'danger' : 'info'}
                            animated={jobState === 'active'}
                          />
                        </CProgress>

                        {/* Live Stats */}
                        {jobProgress.total > 0 && (
                          <div className="d-flex flex-wrap gap-4 mt-2">
                            <div>
                              <small className="text-muted d-block">Values Processed</small>
                              <strong>{(jobProgress.processed || 0).toLocaleString()} / {(jobProgress.total || 0).toLocaleString()}</strong>
                            </div>
                            <div>
                              <small className="text-muted d-block">Records Matched</small>
                              <strong style={{ color: '#0ea5e9' }}>{(jobProgress.matched || 0).toLocaleString()}</strong>
                            </div>
                            {jobProgress.currentBatch && (
                              <div>
                                <small className="text-muted d-block">Batch</small>
                                <strong>{jobProgress.currentBatch} / {jobProgress.totalBatches}</strong>
                              </div>
                            )}
                            {jobProgress.phase && (
                              <div>
                                <small className="text-muted d-block">Phase</small>
                                <CBadge color="info" className="px-2 py-1">{jobProgress.phase}</CBadge>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Result Summary */}
                    {jobResult && (
                      <CAlert color="success" className="mb-0">
                        <div className="d-flex flex-wrap gap-4 align-items-center">
                          <div>
                            <small className="text-muted d-block">Unique Values</small>
                            <strong>{(jobResult.totalValues || jobResult.totalCompanies || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <small className="text-muted d-block">Records Matched</small>
                            <strong style={{ color: '#22c55e' }}>{(jobResult.totalMatched || 0).toLocaleString()}</strong>
                          </div>
                          <div>
                            <small className="text-muted d-block">File Size</small>
                            <strong>{jobResult.fileSizeMB || '0'} MB</strong>
                          </div>
                          {(jobResult.totalParts || 1) > 1 && (
                            <div>
                              <small className="text-muted d-block">File Parts</small>
                              <CBadge color="info" className="px-2 py-1">
                                {jobResult.totalParts} CSV files (ZIP)
                              </CBadge>
                            </div>
                          )}
                          <div className="ms-auto">
                            <CButton
                              color="success"
                              size="lg"
                              onClick={handleDownload}
                              className="px-4"
                            >
                              <CIcon icon={cilDataTransferDown} className="me-2" />
                              {(jobResult.totalParts || 1) > 1
                                ? `Download ZIP (${(jobResult.totalMatched || 0).toLocaleString()} records, ${jobResult.totalParts} parts)`
                                : `Download CSV (${(jobResult.totalMatched || 0).toLocaleString()} records)`
                              }
                            </CButton>
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
                      <li>Select the target database and collection to search in</li>
                      <li>Upload a CSV file containing a <code>{matchField}</code> column</li>
                      <li>The system extracts all unique values from the <code>{matchField}</code> column</li>
                      <li>Each value is matched (exact match) against the selected collection</li>
                      <li>All matched records are compiled into a downloadable CSV file</li>
                    </ol>
                    <CAlert color="info" className="mt-3 mb-0">
                      <small>
                        <strong>💡 Performance:</strong> Uses batch <code>$in</code> queries (5,000 per batch) with cursor-based streaming — safe for 10 lakh+ records.
                        Make sure the <code>mapping-worker.js</code> is running:
                        <code className="d-block mt-1">node mapping-worker.js</code>
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

export default Mapping;
