import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CAlert,
  CFormInput, CFormSelect, CFormCheck, CBadge, CSpinner,
  CPagination, CPaginationItem, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBasket, cilReload, cilSearch, cilFilter, cilCloudDownload } from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import ProductExportModal from 'src/resources/views/components/Product/ProductExportModal';
import axios from 'axios';
import ProductCard from './components/ProductCard';

const G2product = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(24);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    product_name: '',
    category: '',
    vendor: '',
    description: '',
    source_description: '',
    pp_name: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    product_name: '',
    category: '',
    vendor: '',
    description: '',
    source_description: '',
    pp_name: ''
  });
  const [adding, setAdding] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({ headers: { 'Authorization': token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } });
  };

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 400);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchTerm]);

  // Load full category/vendor options once for G2 products
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const resp = await getAuthAxios().get('/api/products/filters', { params: { source: 'g2' } });
        if (resp.data?.status) {
          if (Array.isArray(resp.data.categories) && resp.data.categories.length) {
            setCategories(resp.data.categories);
          }
          if (Array.isArray(resp.data.vendors) && resp.data.vendors.length) {
            setVendors(resp.data.vendors);
          }
        }
      } catch (e) {
        // ignore filter load errors
      }
    };
    loadFilters();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const params = new URLSearchParams();
      params.set('page', currentPage); params.set('limit', pageSize);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (vendorFilter) params.set('vendor', vendorFilter);
      const response = await getAuthAxios().get(`/api/products/g2?${params.toString()}`);
      if (response.data.status) {
        const list = response.data.data || [];
        setProducts(list);
        setRecordsTotal(response.data.recordsTotal || 0);
        setRecordsFiltered(response.data.recordsFiltered || 0);
        setTotalPages(response.data.totalPages || 1);
      } else { setError('Failed to fetch products'); }
    } catch (err) { setError(err.response?.data?.message || 'Failed to load products'); }
    finally { setLoading(false); }
  }, [currentPage, pageSize, debouncedSearch, categoryFilter, vendorFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setCurrentPage(1); }, [categoryFilter, vendorFilter]);

  // Resolve live companies counts from bridge collection after products load
  useEffect(() => {
    if (products.length === 0) return;
    const productIds = [...new Set(products.map(p => p.product_id).filter(Boolean))];
    const ppNames = [...new Set(products.map(p => p.pp_name).filter(Boolean))];
    if (productIds.length === 0 && ppNames.length === 0) return;
    const resolveCounts = async () => {
      try {
        const resp = await getAuthAxios().post('/api/products/resolve-counts', { product_ids: productIds, pp_names: ppNames });
        if (resp.data.status && resp.data.counts) {
          const counts = resp.data.counts;
          setProducts(prev => prev.map(p => {
            const c = (p.product_id && counts[p.product_id]) || (p.pp_name && counts[p.pp_name]);
            if (c) return { ...p, companies_count: c.companies, contacts_count: c.contacts };
            return { ...p, companies_count: 0, contacts_count: 0 };
          }));
        }
      } catch (e) { /* counts are optional */ }
    };
    resolveCounts();
  }, [products.length, currentPage]);

  const handleClearFilters = () => { setSearchTerm(''); setDebouncedSearch(''); setCategoryFilter(''); setVendorFilter(''); setCurrentPage(1); };

  const handleExportClick = () => {
    setShowExportModal(true);
  };

  const toggleSelect = (productId) => {
    if (selectAllMode) {
      setSelectAllMode(false);
      const allIds = new Set(products.map(p => p.product_id || p._id || p.id));
      allIds.delete(productId);
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts(prev => { const n = new Set(prev); n.has(productId) ? n.delete(productId) : n.add(productId); return n; });
    }
  };

  const toggleSelectAll = () => {
    if (selectAllMode) { setSelectAllMode(false); setSelectedProducts(new Set()); }
    else { setSelectAllMode(true); setSelectedProducts(new Set(products.map(p => p.product_id || p._id || p.id))); }
  };

  const effectiveSelectedCount = selectAllMode ? recordsFiltered : selectedProducts.size;

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      product_name: product.product_name || '',
      category: product.category || '',
      vendor: product.vendor || '',
      description: product.description || '',
      source_description: product.source_description || '',
      pp_name: product.pp_name || ''
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editingProduct) return;
    try {
      const authAxios = getAuthAxios();
      await authAxios.patch('/api/products/g2', {
        product_id: editingProduct.product_id,
        updates: editForm
      });
      setShowEditModal(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error('Edit error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update product');
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectAllMode && selectedProducts.size === 0) return;
    try {
      setDeleting(true);
      const authAxios = getAuthAxios();
      const payload = selectAllMode
        ? {
            selectAll: true,
            filters: {
              search: debouncedSearch,
              category: categoryFilter,
              vendor: vendorFilter
            }
          }
        : {
            ids: Array.from(selectedProducts)
          };
      const resp = await authAxios.delete('/api/products/g2', { data: payload });
      if (!resp.data?.status) {
        throw new Error(resp.data?.message || 'Delete failed');
      }
      setShowDeleteConfirm(false);
      setSelectAllMode(false);
      setSelectedProducts(new Set());
      setCurrentPage(1);
      await fetchProducts();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete products');
    } finally {
      setDeleting(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      if (selectedProducts.size > 0 && !selectAllMode) {
        const d = products.filter(p => selectedProducts.has(p.product_id || p._id || p.id));
        if (d.length === 0) return;
        const cols = [
          { data: 'product_name', title: 'Product Name' }, { data: 'product_id', title: 'Product ID' },
          { data: 'category', title: 'Category' }, { data: 'vendor', title: 'Vendor' },
          { data: 'pp_name', title: 'Product Parent' }, { data: 'pp_id', title: 'Parent ID' },
          { data: 'description', title: 'Description' }, { data: 'source_description', title: 'Source Description' },
          { data: 'companies_count', title: 'Companies Count' }, { data: 'contacts_count', title: 'Contacts Count' },
          { data: 'created_at', title: 'Created At' }, { data: 'created_by', title: 'Created By' }
        ];
        ExportService.exportToCSV(d, cols, `g2_products_export_${Date.now()}.csv`);
        return;
      }
      const params = new URLSearchParams();
      params.set('page', 1); params.set('limit', 999999);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (categoryFilter) params.set('category', categoryFilter);
      if (vendorFilter) params.set('vendor', vendorFilter);
      const response = await getAuthAxios().get(`/api/products/g2?${params.toString()}`);
      if (response.data.status && response.data.data) {
        const cols = [
          { data: 'product_name', title: 'Product Name' }, { data: 'product_id', title: 'Product ID' },
          { data: 'category', title: 'Category' }, { data: 'vendor', title: 'Vendor' },
          { data: 'pp_name', title: 'Product Parent' }, { data: 'pp_id', title: 'Parent ID' },
          { data: 'description', title: 'Description' }, { data: 'source_description', title: 'Source Description' },
          { data: 'companies_count', title: 'Companies Count' }, { data: 'contacts_count', title: 'Contacts Count' },
          { data: 'created_at', title: 'Created At' }, { data: 'created_by', title: 'Created By' }
        ];
        ExportService.exportToCSV(response.data.data, cols, `g2_products_export_${Date.now()}.csv`);
      } else { setError('Failed to fetch export data'); }
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.message || 'Export failed');
    } finally { setExporting(false); }
  };

  const handleAddSave = async () => {
    if (!addForm.product_name.trim()) {
      setError('Product Name is required');
      return;
    }
    try {
      setAdding(true);
      const authAxios = getAuthAxios();
      const payload = {
        product_name: addForm.product_name.trim(),
        category: addForm.category || null,
        vendor: addForm.vendor || null,
        description: addForm.description || null,
        source_description: addForm.source_description || null,
        pp_name: addForm.pp_name || null
      };
      const resp = await authAxios.post('/api/products/g2', payload);
      if (!resp.data?.status) {
        throw new Error(resp.data?.message || 'Failed to create product');
      }
      setShowAddModal(false);
      setAddForm({
        product_name: '',
        category: '',
        vendor: '',
        description: '',
        source_description: '',
        pp_name: ''
      });
      setCurrentPage(1);
      await fetchProducts();
    } catch (err) {
      console.error('Add G2 product error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create product');
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    try { return new Date(ds).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return ds; }
  };

  const generatePaginationItems = () => {
    const items = []; const max = 7;
    let s = Math.max(1, currentPage - Math.floor(max / 2));
    let e = Math.min(totalPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    for (let i = s; i <= e; i++) items.push(<CPaginationItem key={i} active={i === currentPage} onClick={() => setCurrentPage(i)} style={{ cursor: 'pointer' }}>{i}</CPaginationItem>);
    return items;
  };

  return (
    <>
    <CRow><CCol xs={12}><CCard className="mb-4">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <div><CIcon icon={cilBasket} className="me-2" /><strong>G2 Products</strong></div>
        <div className="d-flex gap-2">
          <CButton
            color="primary"
            size="sm"
            onClick={() => {
              setShowAddModal(true);
              setAddForm({
                product_name: '',
                category: '',
                vendor: '',
                description: '',
                source_description: '',
                pp_name: ''
              });
            }}
          >
            Add Product
          </CButton>
          {effectiveSelectedCount > 0 && (
            <CButton color="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              Delete {selectAllMode ? `(All ${effectiveSelectedCount.toLocaleString()})` : `(${effectiveSelectedCount.toLocaleString()})`}
            </CButton>
          )}
          <CButton color="success" size="sm" onClick={handleExportClick} disabled={effectiveSelectedCount === 0}><CIcon icon={cilCloudDownload} className="me-1" />Export CSV {effectiveSelectedCount > 0 ? `(${effectiveSelectedCount.toLocaleString()})` : `(All ${recordsFiltered.toLocaleString()})`}</CButton>
          <CButton color="secondary" size="sm" onClick={() => { setCurrentPage(1); fetchProducts(); }}><CIcon icon={cilReload} /></CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
        <CRow className="mb-3 align-items-center">
          <CCol md={4}><div className="position-relative"><CIcon icon={cilSearch} className="position-absolute" style={{ left: '12px', top: '10px', zIndex: 10 }} /><CFormInput type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '40px' }} /></div></CCol>
          <CCol md={3}><CFormSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</CFormSelect></CCol>
          <CCol md={3}><CFormSelect value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}><option value="">All Vendors</option>{vendors.map(v => <option key={v} value={v}>{v}</option>)}</CFormSelect></CCol>
          <CCol md={2}>{(searchTerm || categoryFilter || vendorFilter) && <CButton color="light" size="sm" onClick={handleClearFilters}><CIcon icon={cilFilter} className="me-1" />Clear</CButton>}</CCol>
        </CRow>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <CFormCheck id="select-all-g2" label={`Select All (${recordsFiltered.toLocaleString()})`} checked={selectAllMode} indeterminate={!selectAllMode && selectedProducts.size > 0 && selectedProducts.size < products.length} onChange={toggleSelectAll} />
            {effectiveSelectedCount > 0 && <CBadge color="primary">{effectiveSelectedCount.toLocaleString()} selected</CBadge>}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Showing {products.length} of {recordsFiltered.toLocaleString()} products{recordsFiltered !== recordsTotal && ` (${recordsTotal.toLocaleString()} total)`}</div>
        </div>
        {loading ? (
          <div className="text-center py-5"><CSpinner /><p className="mt-3 text-muted">Loading products...</p></div>
        ) : products.length === 0 ? (
          <div className="text-center py-5"><CIcon icon={cilBasket} size="3xl" className="text-muted mb-3" /><p className="text-muted">No products found</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
            {products.map((product) => {
              const pid = product.product_id || product._id || product.id;
              return (<ProductCard key={product._id || product.product_id || product.id} product={product}
                isSelected={selectAllMode || selectedProducts.has(pid)} onToggleSelect={() => toggleSelect(pid)}
                onClick={() => { navigate(`/central/filters/productlist?productId=${product.product_id}&source=g2`); }}
                onEdit={openEditModal}
                formatDate={formatDate} />);
            })}
          </div>
        )}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4">
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Page {currentPage} of {totalPages.toLocaleString()}</div>
            <CPagination aria-label="Products pagination">
              <CPaginationItem disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} style={{ cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>«</CPaginationItem>
              <CPaginationItem disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>‹</CPaginationItem>
              {generatePaginationItems()}
              <CPaginationItem disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>›</CPaginationItem>
              <CPaginationItem disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} style={{ cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>»</CPaginationItem>
            </CPagination>
          </div>
        )}
      </CCardBody>
    </CCard></CCol></CRow>

    <CModal visible={showDeleteConfirm} onClose={() => { if (!deleting) setShowDeleteConfirm(false); }} alignment="center">
      <CModalHeader>
        <CModalTitle>Confirm Permanent Delete</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <p className="mb-2">
          Are you sure you want to permanently delete{' '}
          <strong>{effectiveSelectedCount.toLocaleString()}</strong>{' '}
          {effectiveSelectedCount === 1 ? 'product' : 'products'}?
        </p>
        <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
          This action permanently removes records from the database and cannot be undone.
        </p>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={handleDeleteSelected} disabled={deleting}>
          {deleting ? (<><CSpinner size="sm" className="me-2" />Deleting...</>) : 'Delete'}
        </CButton>
      </CModalFooter>
    </CModal>
    <CModal visible={showAddModal} onClose={() => { if (!adding) setShowAddModal(false); }} alignment="center">
      <CModalHeader>
        <CModalTitle>Add Product</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <label className="form-label fw-semibold">Product Name</label>
          <CFormInput
            value={addForm.product_name}
            onChange={(e) => setAddForm(prev => ({ ...prev, product_name: e.target.value }))}
            placeholder="Product_Name"
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Category</label>
          <CFormInput
            value={addForm.category}
            onChange={(e) => setAddForm(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Category"
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Vendor</label>
          <CFormInput
            value={addForm.vendor}
            onChange={(e) => setAddForm(prev => ({ ...prev, vendor: e.target.value }))}
            placeholder="Vendor"
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Product Parent</label>
          <CFormInput
            value={addForm.pp_name}
            onChange={(e) => setAddForm(prev => ({ ...prev, pp_name: e.target.value }))}
            placeholder="Product_Parent"
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Description</label>
          <CFormInput
            value={addForm.description}
            onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Source Description / URL</label>
          <CFormInput
            value={addForm.source_description}
            onChange={(e) => setAddForm(prev => ({ ...prev, source_description: e.target.value }))}
            placeholder="Source_Description"
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={() => { if (!adding) setShowAddModal(false); }}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleAddSave} disabled={adding}>
          {adding ? (<><CSpinner size="sm" className="me-2" />Saving...</>) : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
    <CModal visible={showEditModal} onClose={() => { setShowEditModal(false); setEditingProduct(null); }} alignment="center">
      <CModalHeader>
        <CModalTitle>Edit Product</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <label className="form-label fw-semibold">Product Name</label>
          <CFormInput
            value={editForm.product_name}
            onChange={(e) => setEditForm(prev => ({ ...prev, product_name: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Category</label>
          <CFormSelect
            value={editForm.category}
            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
          >
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </CFormSelect>
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Vendor</label>
          <CFormInput
            value={editForm.vendor}
            onChange={(e) => setEditForm(prev => ({ ...prev, vendor: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Parent Product</label>
          <CFormInput
            value={editForm.pp_name}
            onChange={(e) => setEditForm(prev => ({ ...prev, pp_name: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Description</label>
          <CFormInput
            value={editForm.description}
            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">Source Description / URL</label>
          <CFormInput
            value={editForm.source_description}
            onChange={(e) => setEditForm(prev => ({ ...prev, source_description: e.target.value }))}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={() => { setShowEditModal(false); setEditingProduct(null); }}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleEditSave}>
          Save
        </CButton>
      </CModalFooter>
    </CModal>

    <ProductExportModal
      show={showExportModal}
      onClose={() => setShowExportModal(false)}
      source="g2"
      selectedIds={selectAllMode ? [] : Array.from(selectedProducts)}
      selectAllMode={selectAllMode}
      recordsFiltered={recordsFiltered}
      filters={{ search: debouncedSearch, category: categoryFilter, vendor: vendorFilter }}
    />
    </>
  );
};

export default G2product;
