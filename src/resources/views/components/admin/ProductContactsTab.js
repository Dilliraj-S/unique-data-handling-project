import React, { useEffect, useState, useCallback } from 'react';
import {
  CButton,
  CSpinner,
  CAlert,
  CFormInput,
  CRow,
  CCol,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload, cilFilter, cilReload } from '@coreui/icons';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import DynamicTable from 'src/application/Components/DynamicTable';

const ProductContactsTab = ({
  productId,
  onAudienceAction
}) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [approxTotal, setApproxTotal] = useState(null);
  const [processedCompanies, setProcessedCompanies] = useState(0);
  const [emailFilter, setEmailFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const resetAndLoad = useCallback(async () => {
    setLeads([]);
    setCursor(null);
    setHasMore(false);
    setProcessedCompanies(0);
    setSelectedIds(new Set());
    await loadMore(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, emailFilter, nameFilter, jobTitleFilter]);

  const loadMore = useCallback(async (isFirst = false) => {
    if (!productId) return;
    if (!isFirst && !hasMore && cursor) return;
    setLoading(true);
    setError(null);
    try {
      const authAxios = getAuthAxios();
      const params = {
        product_id: productId,
        limit: 50
      };
      if (cursor && !isFirst) {
        params.cursor = cursor;
      }
      if (emailFilter) params.email = emailFilter;
      if (nameFilter) params.li_full_name = nameFilter;
      if (jobTitleFilter) params.li_job_title = jobTitleFilter;

      const resp = await authAxios.get('/api/products/product-leads-streaming', { params });
      if (resp.data?.status === 'success') {
        const newLeads = resp.data.data || [];
        setLeads(prev => (isFirst ? newLeads : [...prev, ...newLeads]));
        setCursor(resp.data.next_cursor || null);
        setHasMore(!!resp.data.next_cursor);
        setApproxTotal(resp.data.approximate_total ?? null);
        setProcessedCompanies(resp.data.processed_companies || 0);
      } else {
        setError(resp.data?.message || 'Failed to load contacts');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [productId, cursor, hasMore, emailFilter, nameFilter, jobTitleFilter]);

  useEffect(() => {
    if (productId) {
      resetAndLoad();
    }
  }, [productId, resetAndLoad]);

  const handleClearFilters = () => {
    setEmailFilter('');
    setNameFilter('');
    setJobTitleFilter('');
  };

  return (
    <>
      <CRow className="mb-3">
        <CCol md={4}>
          <CFormInput
            type="text"
            placeholder="Filter by email"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
          />
        </CCol>
        <CCol md={4}>
          <CFormInput
            type="text"
            placeholder="Filter by name"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </CCol>
        <CCol md={3}>
          <CFormInput
            type="text"
            placeholder="Filter by job title"
            value={jobTitleFilter}
            onChange={(e) => setJobTitleFilter(e.target.value)}
          />
        </CCol>
        <CCol md={1} className="d-flex justify-content-end">
          {(emailFilter || nameFilter || jobTitleFilter) && (
            <CButton color="light" size="sm" onClick={handleClearFilters}>
              <CIcon icon={cilFilter} className="me-1" />
              Clear
            </CButton>
          )}
        </CCol>
      </CRow>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div />
        <div className="d-flex align-items-center gap-2" style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {approxTotal !== null && (
            <span>
              Approx. total: <strong>{approxTotal.toLocaleString()}</strong> (estimated)
            </span>
          )}
          <span>Companies scanned: {processedCompanies.toLocaleString()}</span>
          <CButton color="light" size="sm" onClick={resetAndLoad}>
            <CIcon icon={cilReload} />
          </CButton>
        </div>
      </div>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      {leads.length === 0 && !loading ? (
        <div className="text-center py-5">
          <CIcon icon={cilCloudDownload} size="3xl" className="text-muted mb-3" />
          <p className="text-muted mb-1">No contacts found for this product with the current filters.</p>
        </div>
      ) : (
        <>
          <DynamicTable
            data={leads}
            totalRecords={approxTotal || leads.length}
            currentPage={1}
            recordsPerPage={leads.length || 50}
            emptyMessage="No contacts found for this product with the current filters."
            excludeColumns={['created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at']}
            token="central_filters_master_leads_t"
            tableName="master_leads"
            system="sun"
            enableSelection={true}
            enableBulkActions={true}
            onAudienceAction={onAudienceAction}
          />
          <div className="d-flex justify-content-center align-items-center mt-3 gap-3">
            {loading && <CSpinner size="sm" />}
            {!loading && hasMore && (
              <CButton color="primary" size="sm" onClick={() => loadMore(false)}>
                Load More
              </CButton>
            )}
            {!loading && !hasMore && leads.length > 0 && (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No more contacts.</span>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default ProductContactsTab;

