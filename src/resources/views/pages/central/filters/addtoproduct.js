import React, { useState, useRef, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CFormInput,
  CFormSelect,
  CAlert,
  CBadge,
  CSpinner,
  CProgress,
  CProgressBar,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilCheckCircle, cilXCircle, cilArrowRight, cilX } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';



const COLLECTIONS = [
  // NOTE: "products" is the Zoom products collection in this app
  { value: 'products', label: 'Zoom Products' },
  { value: 'apolloproduct', label: 'Apollo Products' },
  { value: 'g2product', label: 'G2 Products' },
  { value: 'linkedinprodcut', label: 'LinkedIn Products' },
  { value: 'MSSPsproduct', label: 'MSSPs Products' },
  { value: 'MSPsproduct', label: 'MSPs Products' }
];

const Addtoproduct = () => {
  // Active tab
  const [activeTab, setActiveTab] = useState('products');

  // Step state (Products tab)
  const [collection, setCollection] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [inserting, setInserting] = useState(false);

  // Mapping state (Products tab)
  const [showMapping, setShowMapping] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [collectionFields, setCollectionFields] = useState([]);
  const [mappedColumns, setMappedColumns] = useState({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [fileName, setFileName] = useState('');

  // Result state
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [importProgress, setImportProgress] = useState(null); // {status, inserted, total, message}

  const fileInputRef = useRef(null);

  // ── Companies Tab State ──
  const [compProductType, setCompProductType] = useState('');
  const [compExistingProducts, setCompExistingProducts] = useState([]);
  const [compProductSearch, setCompProductSearch] = useState('');
  const [compSelectedProduct, setCompSelectedProduct] = useState('');
  const [compDropdownOpen, setCompDropdownOpen] = useState(false);
  const [compLoadingProducts, setCompLoadingProducts] = useState(false);
  const [compCsvFile, setCompCsvFile] = useState(null);
  const [compUploading, setCompUploading] = useState(false);
  const [compInserting, setCompInserting] = useState(false);
  const [compShowMapping, setCompShowMapping] = useState(false);
  const [compTransferId, setCompTransferId] = useState('');
  const [compCsvHeaders, setCompCsvHeaders] = useState([]);
  const [compCollectionFields, setCompCollectionFields] = useState([]);
  const [compMappedColumns, setCompMappedColumns] = useState({});
  const [compTotalRecords, setCompTotalRecords] = useState(0);
  const [compFileName, setCompFileName] = useState('');
  const [compResult, setCompResult] = useState(null);
  const [compError, setCompError] = useState(null);
  const compFileInputRef = useRef(null);
  const compSearchTimeoutRef = useRef(null);

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
  };

  // ─── Step 2: Upload CSV ──────────────────────────────────────────────
  const handleUpload = async () => {
    if (!csvFile || !collection) {
      setError('Please select a collection and a CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('collection', collection);
      formData.append('action', 'upload');

      const response = await axios.post('/api/products/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status) {
        const { transfer_id, csv_headers, collection_fields, total_records, file_name } = response.data;
        setTransferId(transfer_id);
        setCsvHeaders(csv_headers);
        setCollectionFields(collection_fields);
        setTotalRecords(total_records);
        setFileName(file_name || csvFile.name);
        setShowMapping(true);

        // Auto-map matching headers (case-insensitive)
        const autoMapped = {};
        collection_fields.forEach(field => {
          const match = csv_headers.find(h =>
            h.toLowerCase().replace(/[_\s]/g, '') === field.toLowerCase().replace(/[_\s]/g, '')
          );
          if (match) {
            autoMapped[field] = match;
          }
        });
        setMappedColumns(autoMapped);

        // Reset file input
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ─── Step 4: Insert Products ────────────────────────────────────────
  const handleInsert = async () => {
    if (Object.keys(mappedColumns).length === 0) {
      setError('Please map at least one column');
      return;
    }

    setInserting(true);
    setError(null);
    setImportProgress(null);

    try {
      const formData = new FormData();
      formData.append('collection', collection);
      formData.append('action', 'insert');
      formData.append('transfer_id', transferId);
      formData.append('mapping', JSON.stringify(mappedColumns));

      const response = await axios.post('/api/products/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status && response.data.queued) {
        // Queue-based: poll for progress
        setImportProgress({ status: 'queued', inserted: 0, total: response.data.total_records, message: response.data.message });
        setShowMapping(false);
        setMappedColumns({});
        setCsvHeaders([]);
        setTransferId('');
        await pollImportProgress(response.data.job_id, 'products');
      } else if (response.data.status) {
        setResult({
          success: true,
          message: response.data.message,
          inserted: response.data.inserted,
          total: response.data.total
        });
        setShowMapping(false);
        setMappedColumns({});
        setCsvHeaders([]);
        setTransferId('');
      } else {
        setError(response.data.message || 'Insert failed');
      }
    } catch (err) {
      console.error('Insert error:', err);
      setError(err.response?.data?.message || err.message || 'Insert failed');
    } finally {
      setInserting(false);
    }
  };

  // ─── Poll queue import progress ──────────────────────────────────────
  const pollImportProgress = async (jobId, tab) => {
    const authAxios = getAuthAxios();
    const maxAttempts = 600; // 20 minutes max (600 × 2s)
    let attempts = 0;

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await authAxios.get('/api/products/csv-import-progress', { params: { job_id: jobId } });
          if (res.data.status && res.data.data) {
            const prog = res.data.data;
            setImportProgress({
              status: prog.status,
              inserted: prog.inserted || 0,
              skipped: prog.skipped || 0,
              total: prog.total_records || 0,
              message: prog.message
            });

            if (prog.status === 'completed' || prog.status === 'failed') {
              clearInterval(interval);
              if (prog.status === 'completed') {
                const resultData = {
                  success: true,
                  message: prog.message || `Inserted ${prog.inserted} records`,
                  inserted: prog.inserted,
                  total: prog.total_records,
                  skipped: prog.skipped || 0
                };
                if (tab === 'products') setResult(resultData);
                else setCompResult(resultData);
              } else {
                if (tab === 'products') setError(prog.message || 'Import failed');
                else setCompError(prog.message || 'Import failed');
              }
              setImportProgress(null);
              resolve();
            }
          }
        } catch (e) {
          // Ignore polling errors, retry
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setImportProgress(null);
          resolve();
        }
      }, 2000);
    });
  };

  // ─── Drag & Drop Mapping ────────────────────────────────────────────
  const handleDragStart = (e, header) => {
    e.dataTransfer.setData('text/plain', header);
  };

  const handleDrop = (e, field) => {
    e.preventDefault();
    const header = e.dataTransfer.getData('text/plain');
    setMappedColumns(prev => ({ ...prev, [field]: header }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeMapping = (field) => {
    setMappedColumns(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  // Manual dropdown mapping
  const handleManualMap = (field, csvHeader) => {
    if (csvHeader === '') {
      removeMapping(field);
    } else {
      setMappedColumns(prev => ({ ...prev, [field]: csvHeader }));
    }
  };

  const collectionLabel = COLLECTIONS.find(c => c.value === collection)?.label || collection;

  // ── Companies Tab: Debounced search for existing products ──
  useEffect(() => {
    if (!compProductType) {
      setCompExistingProducts([]);
      return;
    }
    if (compSearchTimeoutRef.current) {
      clearTimeout(compSearchTimeoutRef.current);
    }
    compSearchTimeoutRef.current = setTimeout(() => {
      fetchExistingProducts(compProductType, compProductSearch);
    }, 400);
    return () => {
      if (compSearchTimeoutRef.current) {
        clearTimeout(compSearchTimeoutRef.current);
      }
    };
  }, [compProductType, compProductSearch]);

  // ── Companies Tab: Fetch existing products (server-side search, limited page) ──
  const fetchExistingProducts = async (productType, search = '') => {
    if (!productType) {
      setCompExistingProducts([]);
      return;
    }
    setCompLoadingProducts(true);
    try {
      const authAxios = getAuthAxios();
      const apiMap = {
        products: '/api/skeleton-action/central_unique_products_t',
        apolloproduct: '/api/products/apollo',
        g2product: '/api/products/g2',
        linkedinprodcut: '/api/products/linkedin',
        MSSPsproduct: '/api/products/mssps',
        MSPsproduct: '/api/products/msps'
      };
      const apiUrl = apiMap[productType];
      const pageSize = 100;
      let products = [];

      if (apiUrl.includes('skeleton-action')) {
        const filters = {
          pagination: { page: 1, limit: pageSize }
        };
        if (search && search.trim()) {
          filters.search = search.trim();
        }
        const resp = await authAxios.post(apiUrl, {
          skeleton_filters: filters,
          skeleton_view: 'table',
          draw: 1
        });
        products = resp.data.data || [];
      } else {
        const params = { page: 1, limit: pageSize };
        if (search && search.trim()) {
          params.search = search.trim();
        }
        const resp = await authAxios.get(apiUrl, { params });
        products = resp.data.data || [];
      }
      setCompExistingProducts(products);
    } catch (err) {
      console.error('Failed to fetch existing products:', err);
      setCompError('Failed to load existing products');
    } finally {
      setCompLoadingProducts(false);
    }
  };

  // ── Companies Tab: Upload CSV ──
  const handleCompanyUpload = async () => {
    if (!compCsvFile || !compSelectedProduct) {
      setCompError('Please select a product and upload a CSV file');
      return;
    }
    setCompUploading(true);
    setCompError(null);
    setCompResult(null);

    try {
      const formData = new FormData();
      formData.append('file', compCsvFile);
      formData.append('action', 'upload');
      formData.append('product_id', compSelectedProduct);
      formData.append('product_source', compProductType);

      const selectedProd = compExistingProducts.find(p => (p.product_id || String(p.id)) === compSelectedProduct);
      formData.append('product_name', selectedProd?.product_name || '');
      formData.append('product_pp_name', selectedProd?.pp_name || '');

      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/products/upload-companies-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status) {
        setCompTransferId(response.data.transfer_id);
        setCompCsvHeaders(response.data.csv_headers);
        const fields = response.data.collection_fields || ['li_smtp', 'company_name'];
        setCompCollectionFields(fields);
        setCompTotalRecords(response.data.total_records);
        setCompFileName(response.data.file_name || compCsvFile.name);
        setCompShowMapping(true);

        // Auto-map matching headers (case-insensitive, ignore underscores/spaces)
        const autoMapped = {};
        fields.forEach(field => {
          const match = response.data.csv_headers.find(h =>
            h.toLowerCase().replace(/[_\s]/g, '') === field.toLowerCase().replace(/[_\s]/g, '')
          );
          if (match) autoMapped[field] = match;
        });
        setCompMappedColumns(autoMapped);
        setCompCsvFile(null);
        if (compFileInputRef.current) compFileInputRef.current.value = '';
      } else {
        setCompError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      setCompError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setCompUploading(false);
    }
  };

  // ── Companies Tab: Insert Companies ──
  const handleCompanyInsert = async () => {
    if (!compMappedColumns.li_smtp) {
      setCompError('Please map the li_smtp column');
      return;
    }
    setCompInserting(true);
    setCompError(null);
    setImportProgress(null);

    try {
      const selectedProd = compExistingProducts.find(p => (p.product_id || String(p.id)) === compSelectedProduct);

      const formData = new FormData();
      formData.append('action', 'insert');
      formData.append('transfer_id', compTransferId);
      formData.append('mapping', JSON.stringify(compMappedColumns));
      formData.append('product_id', compSelectedProduct);
      formData.append('product_source', compProductType);
      formData.append('product_name', selectedProd?.product_name || '');
      formData.append('product_pp_name', selectedProd?.pp_name || '');

      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/products/upload-companies-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.status && response.data.queued) {
        // Queue-based: poll for progress
        setImportProgress({ status: 'queued', inserted: 0, total: response.data.total_records, message: response.data.message });
        setCompShowMapping(false);
        setCompMappedColumns({});
        setCompCsvHeaders([]);
        setCompTransferId('');
        await pollImportProgress(response.data.job_id, 'companies');
      } else if (response.data.status) {
        setCompResult({
          success: true,
          message: response.data.message,
          inserted: response.data.inserted,
          total: response.data.total,
          skipped: response.data.skipped
        });
        setCompShowMapping(false);
        setCompMappedColumns({});
        setCompCsvHeaders([]);
        setCompTransferId('');
      } else {
        setCompError(response.data.message || 'Insert failed');
      }
    } catch (err) {
      setCompError(err.response?.data?.message || err.message || 'Insert failed');
    } finally {
      setCompInserting(false);
    }
  };

  // ── Companies Tab: Manual mapping ──
  const handleCompanyManualMap = (field, csvHeader) => {
    if (csvHeader === '') {
      setCompMappedColumns(prev => { const u = { ...prev }; delete u[field]; return u; });
    } else {
      setCompMappedColumns(prev => ({ ...prev, [field]: csvHeader }));
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <CNav variant="tabs">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'products'}
                    onClick={() => setActiveTab('products')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilCloudUpload} className="me-1" />
                    Add Products via CSV
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'companies'}
                    onClick={() => setActiveTab('companies')}
                    style={{ cursor: 'pointer' }}
                  >
                    <CIcon icon={cilCloudUpload} className="me-1" />
                    Add Companies to Product
                  </CNavLink>
                </CNavItem>
              </CNav>
            </CCardHeader>
            <CCardBody>
              <CTabContent>
                {/* ═══ TAB 1: Add Products (existing) ═══ */}
                <CTabPane visible={activeTab === 'products'}>
                  {/* Progress UI */}
                  {importProgress && (
                    <CCard className="border-info mb-4">
                      <CCardBody>
                        <div className="d-flex justify-content-between mb-2">
                          <strong><CSpinner size="sm" className="me-2" /> Importing Products in Background</strong>
                          <CBadge color="info">
                            {importProgress.status === 'queued' ? 'Queued...' : `${importProgress.inserted} / ${importProgress.total} Inserted`}
                          </CBadge>
                        </div>
                        <CProgress className="mb-2">
                          <CProgressBar 
                            color={importProgress.status === 'failed' ? 'danger' : 'info'} 
                            variant="striped" 
                            animated 
                            value={importProgress.total > 0 ? (importProgress.inserted / importProgress.total) * 100 : 100} 
                          />
                        </CProgress>
                        <div className="text-muted small">
                          {importProgress.message || 'Processing CSV... Feel free to navigate away, this runs in the background.'}
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

              {/* Error Alert */}
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  <CIcon icon={cilXCircle} className="me-2" />
                  {error}
                </CAlert>
              )}

              {/* Success Result */}
              {result?.success && (
                <CAlert color="success" dismissible onClose={() => setResult(null)}>
                  <CIcon icon={cilCheckCircle} className="me-2" />
                  <strong>{result.message}</strong>
                  <br />
                  <small>Inserted: {result.inserted} / {result.total} products</small>
                </CAlert>
              )}

              {/* ─── Step 1: Select Collection ───────────────────────────── */}
              <CRow className="mb-4">
                <CCol md={4}>
                  <label className="form-label fw-semibold">1. Select Product Collection</label>
                  <CFormSelect
                    value={collection}
                    onChange={(e) => {
                      setCollection(e.target.value);
                      setShowMapping(false);
                      setResult(null);
                    }}
                  >
                    <option value="">-- Select Collection --</option>
                    {COLLECTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </CFormSelect>
                </CCol>

                {/* ─── Step 2: Upload CSV ───────────────────────────────── */}
                <CCol md={5}>
                  <label className="form-label fw-semibold">2. Upload CSV File</label>
                  <CFormInput
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={(e) => setCsvFile(e.target.files[0])}
                    disabled={!collection}
                  />
                  <small className="text-muted">
                    Fields: Product_Name, Category, Vendor, Product_Parent, Description, Source_Description
                  </small>
                </CCol>

                <CCol md={3} className="d-flex align-items-end">
                  <CButton
                    color="primary"
                    onClick={handleUpload}
                    disabled={!csvFile || !collection || uploading}
                    className="w-100"
                  >
                    {uploading ? (
                      <><CSpinner size="sm" className="me-1" /> Uploading...</>
                    ) : (
                      <><CIcon icon={cilCloudUpload} className="me-1" /> Upload & Map</>
                    )}
                  </CButton>
                </CCol>
              </CRow>

              {/* ─── Step 3: Header Mapping ─────────────────────────────── */}
              {showMapping && (
                <CCard className="border-primary mb-4">
                  <CCardHeader className="bg-primary bg-opacity-10">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>3. Map CSV Headers → {collectionLabel} Fields</strong>
                        <CBadge color="info" className="ms-2">{totalRecords} records</CBadge>
                        <CBadge color="secondary" className="ms-1">{fileName}</CBadge>
                      </div>
                      <CBadge color="success">
                        {Object.keys(mappedColumns).length} / {collectionFields.length} mapped
                      </CBadge>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    {/* Auto-generated notice */}
                    <CAlert color="info" className="mb-3 py-2">
                      <small>
                        <strong>Auto-generated fields</strong> (not in CSV): 
                        <code className="ms-1">id</code> (auto-increment), 
                        <code className="ms-1">product_id</code> (e.g. PROD5FI5XM), 
                        <code className="ms-1">pp_id</code> (7-digit numeric)
                      </small>
                    </CAlert>

                    <CRow>
                      {/* Left: CSV Headers (draggable) */}
                      <CCol md={5}>
                        <div className="fw-semibold mb-2 text-muted">
                          CSV Headers <small>(drag to map)</small>
                        </div>
                        <div style={{
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '12px',
                          maxHeight: '400px',
                          overflowY: 'auto',
                          background: '#f8f9fa'
                        }}>
                          {csvHeaders.map((header, idx) => {
                            const isMapped = Object.values(mappedColumns).includes(header);
                            return (
                              <div
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, header)}
                                style={{
                                  padding: '8px 12px',
                                  margin: '4px 0',
                                  background: isMapped ? '#d4edda' : '#fff',
                                  border: isMapped ? '1px solid #28a745' : '1px solid #dee2e6',
                                  borderRadius: '6px',
                                  cursor: 'grab',
                                  fontSize: '14px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span>{header}</span>
                                {isMapped && <CBadge color="success" size="sm">mapped</CBadge>}
                              </div>
                            );
                          })}
                        </div>
                      </CCol>

                      {/* Arrow */}
                      <CCol md={1} className="d-flex align-items-center justify-content-center">
                        <CIcon icon={cilArrowRight} size="xl" className="text-primary" />
                      </CCol>

                      {/* Right: Collection Fields (drop targets + dropdown) */}
                      <CCol md={6}>
                        <div className="fw-semibold mb-2 text-muted">
                          {collectionLabel} Fields
                        </div>
                        <div style={{
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '12px',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          {collectionFields.map((field, idx) => {
                            const mapped = mappedColumns[field];
                            return (
                              <div
                                key={idx}
                                onDrop={(e) => handleDrop(e, field)}
                                onDragOver={handleDragOver}
                                style={{
                                  padding: '8px 12px',
                                  margin: '4px 0',
                                  background: mapped ? '#d4edda' : '#fff',
                                  border: mapped ? '1px solid #28a745' : '1px dashed #adb5bd',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <span style={{ fontSize: '14px', fontWeight: 500, minWidth: '140px' }}>
                                  {field}
                                </span>
                                <CFormSelect
                                  size="sm"
                                  value={mapped || ''}
                                  onChange={(e) => handleManualMap(field, e.target.value)}
                                  style={{ maxWidth: '200px' }}
                                >
                                  <option value="">-- Select --</option>
                                  {csvHeaders.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                  ))}
                                </CFormSelect>
                                {mapped && (
                                  <CButton
                                    color="danger"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeMapping(field)}
                                    style={{ padding: '2px 6px' }}
                                  >
                                    <CIcon icon={cilX} size="sm" />
                                  </CButton>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CCol>
                    </CRow>

                    {/* ─── Step 4: Insert Button ───────────────────────── */}
                    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                      <div>
                        <small className="text-muted">
                          {Object.keys(mappedColumns).length} field(s) mapped • 
                          {totalRecords} product(s) will be inserted into <strong>{collectionLabel}</strong>
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <CButton
                          color="secondary"
                          variant="outline"
                          onClick={() => {
                            setShowMapping(false);
                            setMappedColumns({});
                            setCsvHeaders([]);
                          }}
                        >
                          Cancel
                        </CButton>
                        <CButton
                          color="success"
                          onClick={handleInsert}
                          disabled={Object.keys(mappedColumns).length === 0 || inserting}
                        >
                          {inserting ? (
                            <><CSpinner size="sm" className="me-1" /> Inserting...</>
                          ) : (
                            <><CIcon icon={cilCheckCircle} className="me-1" /> Insert {totalRecords} Products</>
                          )}
                        </CButton>
                      </div>
                    </div>
                  </CCardBody>
                </CCard>
              )}

              {/* Info section */}
              {!showMapping && !result && (
                <CCard className="border-0 bg-light">
                  <CCardBody>
                    <h6 className="text-muted mb-3">How it works</h6>
                    <div className="d-flex gap-4">
                      <div className="text-center">
                        <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</CBadge>
                        <br /><small>Select Collection</small>
                      </div>
                      <div className="text-center">
                        <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</CBadge>
                        <br /><small>Upload CSV</small>
                      </div>
                      <div className="text-center">
                        <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</CBadge>
                        <br /><small>Map Headers</small>
                      </div>
                      <div className="text-center">
                        <CBadge color="success" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</CBadge>
                        <br /><small>Insert Products</small>
                      </div>
                    </div>
                    <hr />
                    <small className="text-muted">
                      <strong>CSV columns expected:</strong> Product_Name, Category, Vendor, Product_Parent, Description, Source_Description<br />
                      <strong>Auto-generated:</strong> id (auto-increment), product_id (e.g. PROD5FI5XM), pp_id (7-digit numeric)<br />
                      <strong>Auto-set:</strong> created_at, updated_at, created_by
                    </small>
                  </CCardBody>
                </CCard>
              )}
                </CTabPane>

                {/* ═══ TAB 2: Add Companies to Product ═══ */}
                <CTabPane visible={activeTab === 'companies'}>
                  {/* Progress UI */}
                  {importProgress && importProgress.status && (
                    <CCard className="border-info mb-4">
                      <CCardBody>
                        <div className="d-flex justify-content-between mb-2">
                          <strong><CSpinner size="sm" className="me-2" /> Linking Companies in Background</strong>
                          <CBadge color="info">
                            {importProgress.status === 'queued' ? 'Queued...' : `${importProgress.inserted} / ${importProgress.total} Inserted`}
                          </CBadge>
                        </div>
                        <CProgress className="mb-2">
                          <CProgressBar 
                            color={importProgress.status === 'failed' ? 'danger' : 'info'} 
                            variant="striped" 
                            animated 
                            value={importProgress.total > 0 ? (importProgress.inserted / importProgress.total) * 100 : 100} 
                          />
                        </CProgress>
                        <div className="text-muted small">
                          {importProgress.message || 'Processing rows... You can safely navigate away, this runs in the background.'}
                          {importProgress.skipped > 0 && ` (${importProgress.skipped} duplicates skipped)`}
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

                  {/* Error / Success */}
                  {compError && (
                    <CAlert color="danger" dismissible onClose={() => setCompError(null)}>
                      <CIcon icon={cilXCircle} className="me-2" />
                      {compError}
                    </CAlert>
                  )}
                  {compResult?.success && (
                    <CAlert color="success" dismissible onClose={() => setCompResult(null)}>
                      <CIcon icon={cilCheckCircle} className="me-2" />
                      <strong>{compResult.message}</strong>
                      <br />
                      <small>Inserted: {compResult.inserted} / {compResult.total} companies{compResult.skipped > 0 ? ` (${compResult.skipped} duplicates skipped)` : ''}</small>
                    </CAlert>
                  )}

                  {/* Step 1: Select Product Type */}
                  <CRow className="mb-4">
                    <CCol md={4}>
                      <label className="form-label fw-semibold">1. Select Product Type</label>
                      <CFormSelect
                        value={compProductType}
                        onChange={(e) => {
                          setCompProductType(e.target.value);
                          setCompSelectedProduct('');
                        setCompProductSearch('');
                          setCompShowMapping(false);
                          setCompResult(null);
                        }}
                      >
                        <option value="">-- Select Type --</option>
                        {COLLECTIONS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </CFormSelect>
                    </CCol>

                    {/* Step 2: Select Existing Product (searchable dropdown) */}
                    <CCol md={4}>
                      <label className="form-label fw-semibold">2. Select Existing Product</label>
                      {compLoadingProducts ? (
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <CSpinner size="sm" /> Loading products...
                        </div>
                      ) : (
                        <div className="position-relative">
                          <CFormInput
                            type="text"
                            className="mb-2"
                            placeholder={compProductType ? 'Type to search products...' : 'Select product type first'}
                            value={compProductSearch}
                            onChange={(e) => setCompProductSearch(e.target.value)}
                            onFocus={() => {
                              if (compProductType) setCompDropdownOpen(true);
                            }}
                            disabled={!compProductType}
                          />
                          {compDropdownOpen && compProductType && (
                            <div
                              className="border rounded bg-white shadow-sm"
                              style={{
                                position: 'absolute',
                                zIndex: 20,
                                width: '100%',
                                maxHeight: '260px',
                                overflowY: 'auto'
                              }}
                            >
                              {compExistingProducts.length === 0 ? (
                                <div className="px-3 py-2 text-muted" style={{ fontSize: '0.85rem' }}>
                                  No products found
                                </div>
                              ) : (
                                compExistingProducts.map((p) => {
                                  const id = p.product_id || String(p.id);
                                  const label =
                                    p.product_name || p.ProductName || p.Companyname || `Product ${p.id}`;
                                  return (
                                    <div
                                      key={id}
                                      className="px-3 py-2"
                                      style={{
                                        cursor: 'pointer',
                                        backgroundColor:
                                          compSelectedProduct === id ? 'rgba(59,130,246,0.08)' : 'transparent'
                                      }}
                                      onMouseDown={(e) => {
                                        // prevent input blur before click handler
                                        e.preventDefault();
                                      }}
                                      onClick={() => {
                                        setCompSelectedProduct(id);
                                        setCompProductSearch(label);
                                        setCompShowMapping(false);
                                        setCompResult(null);
                                        setCompDropdownOpen(false);
                                      }}
                                    >
                                      <div style={{ fontSize: '0.9rem' }}>{label}</div>
                                      <div
                                        className="text-muted"
                                        style={{ fontSize: '0.75rem' }}
                                      >
                                        {id}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                          {/* Helper text */}
                          <small className="text-muted">
                            Start typing to search products by name or ID.
                          </small>
                        </div>
                      )}
                    </CCol>

                    {/* Step 3: Upload CSV */}
                    <CCol md={4}>
                      <label className="form-label fw-semibold">3. Upload Companies CSV</label>
                      <div className="d-flex gap-2">
                        <CFormInput
                          type="file"
                          accept=".csv"
                          ref={compFileInputRef}
                          onChange={(e) => setCompCsvFile(e.target.files[0])}
                          disabled={!compSelectedProduct}
                        />
                        <CButton
                          color="primary"
                          onClick={handleCompanyUpload}
                          disabled={!compCsvFile || !compSelectedProduct || compUploading}
                          style={{ minWidth: '120px' }}
                        >
                          {compUploading ? (
                            <><CSpinner size="sm" className="me-1" /> Uploading...</>
                          ) : (
                            <><CIcon icon={cilCloudUpload} className="me-1" /> Upload</>
                          )}
                        </CButton>
                      </div>
                      <small className="text-muted">CSV must contain an li_smtp column</small>
                    </CCol>
                  </CRow>

                  {/* Step 4: Header Mapping for Companies */}
                  {compShowMapping && (
                    <CCard className="border-primary mb-4">
                      <CCardHeader className="bg-primary bg-opacity-10">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>4. Map CSV Headers → Company Fields</strong>
                            <CBadge color="info" className="ms-2">{compTotalRecords} records</CBadge>
                            <CBadge color="secondary" className="ms-1">{compFileName}</CBadge>
                          </div>
                          <CBadge color="success">
                            {Object.keys(compMappedColumns).length} / {compCollectionFields.length || 10} mapped
                          </CBadge>
                        </div>
                      </CCardHeader>
                      <CCardBody>
                        <CAlert color="info" className="mb-3 py-2">
                          <small>
                            <strong>Required:</strong> <code>li_smtp</code> (company domain, e.g. tcs.com)
                            <br />
                            <strong>Optional:</strong> <code>company_name</code>, <code>location</code>, <code>industry</code>, <code>employee_size</code>, <code>revenue</code>, <code>website</code>, <code>country</code>, <code>summary</code>, <code>source</code>
                            <br />
                            <strong>Note:</strong> Empty CSV values will be stored as <code>null</code>
                          </small>
                        </CAlert>
                        <CRow>
                          <CCol md={6}>
                            <div className="fw-semibold mb-2 text-muted">CSV Headers</div>
                            <div style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                              {compCsvHeaders.map((header, idx) => (
                                <div key={idx} style={{ padding: '6px 12px', margin: '3px 0', background: Object.values(compMappedColumns).includes(header) ? '#d4edda' : '#fff', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '14px' }}>
                                  {header}
                                  {Object.values(compMappedColumns).includes(header) && <CBadge color="success" size="sm" className="ms-2">mapped</CBadge>}
                                </div>
                              ))}
                            </div>
                          </CCol>
                          <CCol md={6}>
                            <div className="fw-semibold mb-2 text-muted">Company Fields</div>
                            {(compCollectionFields.length > 0 ? compCollectionFields : ['li_smtp', 'company_name']).map((field) => (
                              <div key={field} style={{ padding: '8px 12px', margin: '4px 0', background: compMappedColumns[field] ? '#d4edda' : '#fff', border: compMappedColumns[field] ? '1px solid #28a745' : '1px dashed #adb5bd', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                  {field} {field === 'li_smtp' && <CBadge color="danger" size="sm">required</CBadge>}
                                  {field !== 'li_smtp' && <CBadge color="secondary" size="sm" className="ms-1">optional</CBadge>}
                                </span>
                                <CFormSelect
                                  size="sm"
                                  value={compMappedColumns[field] || ''}
                                  onChange={(e) => handleCompanyManualMap(field, e.target.value)}
                                  style={{ maxWidth: '200px' }}
                                >
                                  <option value="">-- Select --</option>
                                  {compCsvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </CFormSelect>
                              </div>
                            ))}
                          </CCol>
                        </CRow>

                        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                          <small className="text-muted">
                            {compTotalRecords} companies will be linked to the selected product
                          </small>
                          <div className="d-flex gap-2">
                            <CButton
                              color="secondary"
                              variant="outline"
                              onClick={() => { setCompShowMapping(false); setCompMappedColumns({}); setCompCsvHeaders([]); }}
                            >
                              Cancel
                            </CButton>
                            <CButton
                              color="success"
                              onClick={handleCompanyInsert}
                              disabled={!compMappedColumns.li_smtp || compInserting}
                            >
                              {compInserting ? (
                                <><CSpinner size="sm" className="me-1" /> Inserting...</>
                              ) : (
                                <><CIcon icon={cilCheckCircle} className="me-1" /> Insert {compTotalRecords} Companies</>
                              )}
                            </CButton>
                          </div>
                        </div>
                      </CCardBody>
                    </CCard>
                  )}

                  {/* How it works — Companies tab */}
                  {!compShowMapping && !compResult && (
                    <CCard className="border-0 bg-light">
                      <CCardBody>
                        <h6 className="text-muted mb-3">How it works</h6>
                        <div className="d-flex gap-4">
                          <div className="text-center">
                            <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</CBadge>
                            <br /><small>Select Product Type</small>
                          </div>
                          <div className="text-center">
                            <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</CBadge>
                            <br /><small>Select Product</small>
                          </div>
                          <div className="text-center">
                            <CBadge color="primary" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</CBadge>
                            <br /><small>Upload Companies CSV</small>
                          </div>
                          <div className="text-center">
                            <CBadge color="success" className="rounded-circle p-2 mb-2" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>4</CBadge>
                            <br /><small>Map & Insert</small>
                          </div>
                        </div>
                        <hr />
                        <small className="text-muted">
                          <strong>CSV columns:</strong> Li_Smtp (required), Company_Name, Location, Industry, EmployeeSize, Revenue, Website, Country, Summary, Source<br />
                          <strong>Note:</strong> Only Li_Smtp is required. All other fields are optional. Empty values are stored as null.<br />
                          <strong>Auto-resolved:</strong> company_name from master_accounts if not provided in CSV<br />
                          <strong>Result:</strong> Companies linked to the selected product in companies_products collection
                        </small>
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

export default Addtoproduct;
