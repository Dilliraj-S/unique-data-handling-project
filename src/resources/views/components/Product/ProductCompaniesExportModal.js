import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CAlert,
  CSpinner,
  CProgress,
  CProgressBar,
  CBadge,
  CFormSelect,
} from '@coreui/react';
import AuthService from 'src/application/Services/AuthService';

// FIX: Use actual field names from companies_products collection
// Bridge docs store company_name / company_li_smtp / industry / company_description / website / location
const DEFAULT_COLUMNS = [
  { data: 'company_name', title: 'Company Name' },
  { data: 'id', title: 'Company ID' },
  { data: 'company_li_smtp', title: 'Domain' },
  { data: 'industry', title: 'Industry' },
  { data: 'company_description', title: 'Description' },
  { data: 'website', title: 'Website' },
  { data: 'location', title: 'Location' },
];

const ProductCompaniesExportModal = ({
  show,
  onClose,
  selectedIds = [],
  totalCount = 0,
  productName = 'company',
}) => {
  const [exportColumns, setExportColumns] = useState(
    DEFAULT_COLUMNS.map(c => c.data)
  );
  const [exporting, setExporting] = useState(false);
  const [exportJobId, setExportJobId] = useState(null);
  const [exportJobState, setExportJobState] = useState(null);
  const [exportProgress, setExportProgress] = useState({});
  const [exportResult, setExportResult] = useState(null);
  const [exportError, setExportError] = useState(null);
  const exportPollRef = useRef(null);

  const exportCount = totalCount || selectedIds.length || 0;

  useEffect(() => {
    if (!show) {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current);
        exportPollRef.current = null;
      }
      if (exportJobState === 'completed' || exportJobState === 'failed' || !exportJobState) {
        setExportJobId(null);
        setExportJobState(null);
        setExportProgress({});
        setExportResult(null);
        setExportError(null);
        setExporting(false);
      }
    }
  }, [show, exportJobState]);

  useEffect(() => {
    setExportColumns(DEFAULT_COLUMNS.map(c => c.data));
  }, [show]);

  useEffect(() => {
    return () => {
      if (exportPollRef.current) clearInterval(exportPollRef.current);
    };
  }, []);

  const pollExportProgress = useCallback(async (jobId) => {
    try {
      const authToken = AuthService.getToken();
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`/api/export-csv?jobId=${jobId}`, { headers });
      const data = await response.json();

      if (data.success) {
        setExportJobState(data.state);
        if (data.progress && typeof data.progress === 'object') {
          setExportProgress(data.progress);
        }
        if (data.result) {
          setExportResult(data.result);
        }
        if (data.failedReason) {
          setExportError(data.failedReason);
        }

        if (data.state === 'completed' || data.state === 'failed') {
          if (exportPollRef.current) {
            clearInterval(exportPollRef.current);
            exportPollRef.current = null;
          }
          setExporting(false);
        }
      }
    } catch (error) {
      console.error('Error polling export progress:', error);
    }
  }, []);

  const handleDownloadExport = async () => {
    if (!exportJobId) return;
    try {
      const authToken = AuthService.getToken();
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`/api/export-csv?jobId=${exportJobId}&download=true`, { headers });
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `companies_${productName}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download export file');
    }
  };

  const handleExport = async () => {
    const visibleCols = exportColumns.filter(c => c);
    if (visibleCols.length === 0) {
      alert('Please select at least one column to export');
      return;
    }
    if (exportCount === 0 || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      alert('No records to export');
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const authToken = AuthService.getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const payload = {
        // Use explicit entity for companies bridge export
        entity: 'companies_products',
        filters: {},
        exportColumns: visibleCols,
        selectedIds: selectedIds,
        totalExpected: exportCount,
        system: 'central',
        tableName: 'companies_products',
      };

      const response = await fetch('/api/export-csv', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to queue export');

      setExportJobId(result.jobId);
      setExportJobState('waiting');
      setExportProgress({ processed: 0, total: exportCount, phase: 'queued' });

      if (exportPollRef.current) clearInterval(exportPollRef.current);
      exportPollRef.current = setInterval(() => pollExportProgress(result.jobId), 2000);
      setTimeout(() => pollExportProgress(result.jobId), 500);
    } catch (err) {
      console.error('Export error:', err);
      setExportError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  const progressPercent = exportProgress.total > 0
    ? Math.round((exportProgress.processed / exportProgress.total) * 100)
    : 0;
  const isJobActive = exportJobState === 'active' || exportJobState === 'waiting';

  return (
    <CModal visible={show} onClose={() => { if (!isJobActive) onClose(); }}>
      <CModalHeader>
        <CModalTitle>
          <i className="fa fa-file-export me-1" />
          Export Companies
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {exportError && (
          <CAlert color="danger" className="mb-3" dismissible onClose={() => setExportError(null)}>
            <i className="fa fa-exclamation-triangle me-1" />
            {exportError}
          </CAlert>
        )}

        {exportJobId && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0 fw-bold">
                {exportJobState === 'completed' ? '✅ Export Complete' :
                 exportJobState === 'failed' ? '❌ Export Failed' :
                 exportJobState === 'active' ? '🔄 Exporting...' :
                 '⏳ Waiting in queue...'}
              </h6>
              {exportJobState && (
                <CBadge
                  color={
                    exportJobState === 'completed' ? 'success' :
                    exportJobState === 'failed' ? 'danger' :
                    exportJobState === 'active' ? 'primary' : 'warning'
                  }
                  className="px-2 py-1"
                >
                  {exportJobState.toUpperCase()}
                </CBadge>
              )}
            </div>
            <CProgress className="mb-2" style={{ height: '10px' }}>
              <CProgressBar
                value={exportJobState === 'completed' ? 100 : progressPercent}
                color={exportJobState === 'completed' ? 'success' : exportJobState === 'failed' ? 'danger' : 'info'}
                animated={isJobActive}
              />
            </CProgress>
            <div className="d-flex flex-wrap gap-3 mt-2">
              <div>
                <small className="text-muted d-block">Records Exported</small>
                <strong>
                  {(exportProgress.processed || 0).toLocaleString()} / {(exportProgress.total || exportCount).toLocaleString()}
                </strong>
              </div>
              <div>
                <small className="text-muted d-block">Progress</small>
                <strong>{exportJobState === 'completed' ? 100 : progressPercent}%</strong>
              </div>
            </div>
            {exportJobState === 'completed' && exportResult && (
              <div className="mt-3">
                <CAlert color="success" className="mb-2 py-2">
                  <div className="d-flex flex-wrap gap-3 align-items-center">
                    <div>
                      <small className="text-muted d-block">Records</small>
                      <strong>{(exportResult.totalRecords || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <small className="text-muted d-block">File Size</small>
                      <strong>{exportResult.fileSizeMB || '0'} MB</strong>
                    </div>
                  </div>
                </CAlert>
                <CButton color="success" className="w-100" onClick={handleDownloadExport}>
                  <i className="fa fa-download me-2" />
                  Download CSV ({(exportResult.totalRecords || 0).toLocaleString()} records)
                </CButton>
              </div>
            )}
          </div>
        )}

        {!exportJobId && (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold">Columns to Export</label>
              <CFormSelect
                multiple
                size={7}
                className="form-select"
                value={exportColumns}
                onChange={(e) => setExportColumns(Array.from(e.target.selectedOptions, o => o.value))}
                disabled={exporting}
              >
                {DEFAULT_COLUMNS.map(col => (
                  <option key={col.data} value={col.data}>
                    {col.title}
                  </option>
                ))}
              </CFormSelect>
              <small className="text-muted">Hold CTRL to select multiple columns</small>
            </div>
            <div className="alert alert-info">
              <strong>Total Records:</strong> {exportCount.toLocaleString()} {exportCount === 1 ? 'record' : 'records'} will be exported
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        {exportJobState === 'completed' ? (
          <CButton
            color="secondary"
            onClick={() => {
              setExportJobId(null);
              setExportJobState(null);
              setExportProgress({});
              setExportResult(null);
              onClose();
            }}
          >
            Close
          </CButton>
        ) : (
          <>
            <CButton color="secondary" onClick={onClose} disabled={isJobActive}>
              Cancel
            </CButton>
            {!exportJobId && (
              <CButton color="primary" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Exporting…
                  </>
                ) : (
                  <>
                    <i className="fa fa-download me-1" />
                    Export
                  </>
                )}
              </CButton>
            )}
          </>
        )}
      </CModalFooter>
    </CModal>
  );
};

export default ProductCompaniesExportModal;

