import React, { useState, useEffect, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CBadge,
  CSpinner,
  CPagination,
  CPaginationItem
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBasket, cilReload, cilSearch, cilFilter, cilArrowLeft, cilCloudDownload } from '@coreui/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import ExportService from 'src/services/ExportService';
import axios from 'axios';
import ProductCard from './components/ProductCard';

/**
 * Related Products Page
 * URL: /central/filters/relatedproducts?pp_id=123&source=products
 *
 * Mirrors PHP related_products.blade.php:
 * 1. Resolve pp_id → master_accounts → li_smtp
 * 2. Query all products where pp_name = li_smtp
 * 3. Display as ProductCard grid
 */
const RelatedProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ppId = searchParams.get('pp_id');
  const productId = searchParams.get('productId');
  const source = searchParams.get('source') || 'products';

  const backPath = {
    g2: '/central/filters/g2product',
    apollo: '/central/filters/apolloproduct',
    linkedin: '/central/filters/linkedinprodcut',
  }[source] || '/central/filters/products';

  const sourceLabel = {
    g2: 'G2 Products',
    apollo: 'Apollo Products',
    linkedin: 'LinkedIn Products',
  }[source] || 'Products';

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedProducts, setSelectedProducts] = useState(new Set());

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const fetchRelatedProducts = useCallback(async () => {
    if (!ppId && !productId) {
      setError('pp_id or productId is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const authAxios = getAuthAxios();

      const params = { source };
      if (ppId) params.pp_id = ppId;
      if (productId) params.product_id = productId;

      const response = await authAxios.get('/api/products/related', { params });

      if (response.data.status) {
        const productsList = Array.isArray(response.data.data) ? response.data.data : [];
        setProducts(productsList);
        setFilteredProducts(productsList);

        if (response.data.company) {
          setCompany(response.data.company);
        }

        const uniqueCategories = [...new Set(productsList
          .map(p => p.category)
          .filter(c => c && c.trim()))].sort();
        const uniqueVendors = [...new Set(productsList
          .map(p => p.vendor)
          .filter(v => v && v.trim()))].sort();

        setCategories(uniqueCategories);
        setVendors(uniqueVendors);
      } else {
        setError('Failed to fetch related products');
      }
    } catch (err) {
      console.error('Failed to fetch related products:', err);
      setError(err.response?.data?.message || 'Failed to load related products');
    } finally {
      setLoading(false);
    }
  }, [ppId, productId, source]);

  useEffect(() => {
    fetchRelatedProducts();
  }, [fetchRelatedProducts]);

  useEffect(() => {
    let filtered = [...products];
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        (product.product_name && product.product_name.toLowerCase().includes(searchLower)) ||
        (product.product_id && product.product_id.toLowerCase().includes(searchLower)) ||
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.category && product.category.toLowerCase().includes(searchLower)) ||
        (product.vendor && product.vendor.toLowerCase().includes(searchLower))
      );
    }
    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }
    if (vendorFilter) {
      filtered = filtered.filter(product => product.vendor === vendorFilter);
    }
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, searchTerm, categoryFilter, vendorFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setVendorFilter('');
  };

  const toggleSelect = (pid) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.product_id || p._id || p.id)));
    }
  };

  const handleExportCSV = () => {
    const dataToExport = selectedProducts.size > 0
      ? filteredProducts.filter(p => selectedProducts.has(p.product_id || p._id || p.id))
      : filteredProducts;
    if (dataToExport.length === 0) return;
    const columns = [
      { data: 'product_name', title: 'Product Name' },
      { data: 'product_id', title: 'Product ID' },
      { data: 'category', title: 'Category' },
      { data: 'vendor', title: 'Vendor' },
      { data: 'pp_name', title: 'Product Parent' },
      { data: 'pp_id', title: 'Parent ID' },
      { data: 'description', title: 'Description' },
      { data: 'companies_count', title: 'Companies Count' },
      { data: 'contacts_count', title: 'Contacts Count' },
      { data: 'created_at', title: 'Created At' },
    ];
    const companyName = company?.li_company_name || 'related';
    ExportService.exportToCSV(dataToExport, columns, `related_products_${companyName}_${Date.now()}.csv`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateString; }
  };

  const companyName = company?.li_company_name || 'Company';

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <CIcon icon={cilBasket} className="me-2" />
                  Related Products — {companyName}
                  <CBadge color="info" className="ms-2">
                    {filteredProducts.length} {filteredProducts.length !== products.length ? `of ${products.length}` : ''}
                  </CBadge>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <CButton color="success" size="sm" onClick={handleExportCSV} disabled={filteredProducts.length === 0}>
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    Export CSV {selectedProducts.size > 0 ? `(${selectedProducts.size})` : `(All ${filteredProducts.length})`}
                  </CButton>
                  <CButton color="secondary" size="sm" onClick={() => navigate(backPath)}>
                    <CIcon icon={cilArrowLeft} className="me-1" />
                    Back to {sourceLabel}
                  </CButton>
                  <CButton color="secondary" size="sm" onClick={fetchRelatedProducts}>
                    <CIcon icon={cilReload} />
                  </CButton>
                </div>
              </div>
            </CCardHeader>
            <CCardBody>
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}

              {/* Company Info Banner */}
              {company && (
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  border: '1px solid #bae6fd',
                }}>
                  <div className="d-flex align-items-center gap-3">
                    {company.li_logo && (
                      <img
                        src={company.li_logo}
                        alt={company.li_company_name}
                        style={{ width: 48, height: 48, borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0c4a6e' }}>
                        {company.li_company_name || 'Company'}
                      </div>
                      {company.li_tag_line && (
                        <div style={{ fontSize: '0.82rem', color: '#0369a1' }}>{company.li_tag_line}</div>
                      )}
                      <div className="d-flex gap-3 mt-1" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {company.li_smtp && <span>🌐 {company.li_smtp}</span>}
                        {company.li_company_industry && <span>🏢 {company.li_company_industry}</span>}
                        {company.li_company_headquarters && <span>📍 {company.li_company_headquarters}</span>}
                        {company.employees_on_linked_in && <span>👥 {company.employees_on_linked_in} employees</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <CRow className="mb-4">
                <CCol md={4}>
                  <div className="position-relative">
                    <CIcon icon={cilSearch} className="position-absolute" style={{ left: '12px', top: '10px', zIndex: 10 }} />
                    <CFormInput
                      type="text"
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                    <option value="">All Vendors</option>
                    {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CButton color="secondary" variant="outline" size="sm" onClick={handleClearFilters} className="w-100">
                    <CIcon icon={cilFilter} className="me-1" />
                    Clear
                  </CButton>
                </CCol>
              </CRow>

              {loading && (
                <div className="text-center py-5">
                  <CSpinner />
                  <p className="mt-3 text-muted">Loading related products...</p>
                </div>
              )}

              {!loading && filteredProducts.length === 0 && (
                <div className="text-center py-5">
                  <CIcon icon={cilBasket} size="3xl" className="text-muted mb-3" />
                  <p className="text-muted">No related products found</p>
                  {(searchTerm || categoryFilter || vendorFilter) && (
                    <CButton color="secondary" variant="outline" onClick={handleClearFilters}>Clear Filters</CButton>
                  )}
                </div>
              )}

              {!loading && filteredProducts.length > 0 && (
                <>
                  <div className="d-flex align-items-center mb-3 gap-2">
                    <CFormCheck
                      id="select-all-related"
                      label={`Select All (${filteredProducts.length})`}
                      checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                      indeterminate={selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length}
                      onChange={toggleSelectAll}
                    />
                    {selectedProducts.size > 0 && (
                      <CBadge color="primary">{selectedProducts.size} selected</CBadge>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                    {paginatedProducts.map((product) => (
                      <ProductCard
                        key={product._id || product.id}
                        product={product}
                        isSelected={selectedProducts.has(product.product_id || product._id || product.id)}
                        onToggleSelect={() => toggleSelect(product.product_id || product._id || product.id)}
                        onClick={() => {
                          if ((product.companies_count || 0) > 0) {
                            navigate(`/central/filters/productlist?productId=${product.product_id}&source=${source}`);
                          }
                        }}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted small">
                        Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredProducts.length)} of {filteredProducts.length}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <CFormSelect
                          size="sm"
                          value={pageSize}
                          style={{ width: 'auto' }}
                          onChange={(e) => {
                            setPageSize(parseInt(e.target.value, 10) || 24);
                            setCurrentPage(1);
                          }}
                        >
                          <option value={12}>12 / page</option>
                          <option value={24}>24 / page</option>
                          <option value={48}>48 / page</option>
                        </CFormSelect>
                        <CPagination size="sm" className="mb-0">
                          <CPaginationItem disabled={safeCurrentPage === 1} onClick={() => safeCurrentPage > 1 && setCurrentPage(safeCurrentPage - 1)}>Prev</CPaginationItem>
                          <CPaginationItem active>{safeCurrentPage}</CPaginationItem>
                          <CPaginationItem disabled={safeCurrentPage === totalPages} onClick={() => safeCurrentPage < totalPages && setCurrentPage(safeCurrentPage + 1)}>Next</CPaginationItem>
                        </CPagination>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default RelatedProducts;
