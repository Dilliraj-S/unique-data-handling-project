import React, { useEffect, useMemo, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormSelect,
  CFormInput,
  CFormTextarea,
  CRow,
  CCol,
  CButton,
  CAlert,
  CSpinner,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBasket, cilSave, cilX } from '@coreui/icons';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

const AddProductModal = ({
  visible,
  onClose,
  onSave,
  availableProducts = [],
  loadingProducts = false,
  saving = false,
  error = null,
  selectedCount = 0,
  sourceTable = 'master_accounts', // 'master_accounts' or 'master_leads'
  onProductTypeChange = null // Callback to fetch products when type changes
}) => {
  const [productType, setProductType] = useState('zoom'); // 'zoom', 'apollo', 'g2', 'linkedin'
  const [mode, setMode] = useState('existing');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [category, setCategory] = useState('');
  const [vendor, setVendor] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [ppId, setPpId] = useState('');
  const [ppName, setPpName] = useState('');
  const [productParents, setProductParents] = useState([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [formError, setFormError] = useState('');

  const hasExistingProducts = useMemo(() => availableProducts.length > 0, [availableProducts]);

  useEffect(() => {
    if (visible) {
      // Initialize state ONLY when modal opens.
      // Do not depend on hasExistingProducts here, otherwise changing productType
      // (which triggers a products fetch and updates availableProducts) would
      // reset productType back to 'zoom' and always route to Zoom Products.
      setProductType('zoom'); // Default to Zoom Products on open
      setMode(hasExistingProducts ? 'existing' : 'new');
      setProductId('');
      setProductName('');
      setProductDescription('');
      setCategory('');
      setVendor('');
      setSourceDescription('');
      setPpId('');
      setPpName('');
      setFormError('');
      fetchProductParents();
    }
  }, [visible]);

  const fetchProductParents = async () => {
    try {
      setLoadingParents(true);
      const token = AuthService.getToken();
      const response = await axios.post('/api/skeleton-action/central_filters_master_accounts_t', {
        skeleton_filters: {
          pagination: { page: 1, limit: 1000 }
        },
        skeleton_view: 'table',
        draw: 1
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status && response.data.data) {
        const parents = response.data.data
          .filter(item => item.li_smtp && item.id)
          .map(item => ({
            id: item.id,
            name: item.li_smtp || item.li_company_name || ''
          }))
          .filter(item => item.name);
        setProductParents(parents);
      }
    } catch (err) {
      console.error('Failed to fetch product parents:', err);
    } finally {
      setLoadingParents(false);
    }
  };

  const normalizedProducts = useMemo(
    () =>
      availableProducts.map((product) => ({
        id: typeof product.product_id === 'string' ? product.product_id : String(product.product_id || product.id || ''),
        label: product.product_name || 'Unnamed Product',
      })),
    [availableProducts]
  );

  const handlePpChange = (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    setPpId(e.target.value);
    setPpName(selectedOption ? selectedOption.text : '');
  };

  const handleProductTypeChange = (e) => {
    const newType = e.target.value;
    setProductType(newType);
    // Reset product selection when type changes
    setProductId('');
    // Notify parent to fetch products for the new type
    if (onProductTypeChange) {
      onProductTypeChange(newType);
    }
  };

  const handleSave = () => {
    // Validation
    if (!ppId) {
      setFormError('Please select a Product Parent (Company).');
      return;
    }
    if (mode === 'existing' && !productId) {
      setFormError('Please choose an existing product.');
      return;
    }
    if (mode === 'new' && !productName.trim()) {
      setFormError('Please provide a name for the new product.');
      return;
    }
    if (!sourceDescription.trim()) {
      setFormError('Please provide a source description.');
      return;
    }

    setFormError('');
    onSave({
      productType, // Include product type in save payload
      mode,
      productId,
      productName: productName.trim(),
      productDescription: productDescription.trim(),
      category: category.trim(),
      vendor: vendor.trim(),
      sourceDescription: sourceDescription.trim(),
      ppId,
      ppName
    });
  };

  const showNewProductFields = mode === 'new';
  const disableSave =
    saving ||
    !ppId ||
    (mode === 'existing' && !productId) ||
    (mode === 'new' && !productName.trim()) ||
    !sourceDescription.trim();

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} size="lg" alignment="center">
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center">
          <CIcon icon={cilBasket} className="me-2" />
          Add Products
          {selectedCount > 0 && (
            <CBadge color="info" className="ms-3">
              {selectedCount} selected
            </CBadge>
          )}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        {formError && (
          <CAlert color="warning" className="mb-3" onClose={() => setFormError('')} dismissible>
            {formError}
          </CAlert>
        )}

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel className="fw-semibold">
              Select Product Type <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              value={productType}
              onChange={handleProductTypeChange}
              disabled={saving}
            >
              <option value="zoom">Zoom Products</option>
              <option value="apollo">Apollo Products</option>
              <option value="g2">G2 Products</option>
              <option value="linkedin">LinkedIn Products</option>
            </CFormSelect>
            <small className="text-muted d-block mt-1">
              Choose the product collection where records will be saved
            </small>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel className="fw-semibold">
              Mode <span className="text-danger">*</span>
            </CFormLabel>
            <CFormSelect
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={!hasExistingProducts && loadingProducts}
            >
              {hasExistingProducts && <option value="existing">Existing</option>}
              <option value="new">New</option>
            </CFormSelect>
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel className="fw-semibold">
              Product Parent (li_smtp) <span className="text-danger">*</span>
            </CFormLabel>
            <div className="d-flex align-items-center gap-2">
              <CFormSelect
                value={ppId}
                onChange={handlePpChange}
                disabled={loadingParents}
                required
              >
                <option value="">Select an option</option>
                {productParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </CFormSelect>
              {loadingParents && <CSpinner size="sm" />}
            </div>
          </CCol>
        </CRow>

        {showNewProductFields && (
          <>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold">New Product Name</CFormLabel>
                <CFormInput
                  placeholder="New Product Name Boss!"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={saving}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel className="fw-semibold">Product Description</CFormLabel>
                <CFormTextarea
                  placeholder="Enter the Product Description!!!"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  rows={3}
                  disabled={saving}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Category</CFormLabel>
                <CFormInput
                  placeholder="Enter Product Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Vendor</CFormLabel>
                <CFormInput
                  placeholder="Enter Product Vendor"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  disabled={saving}
                />
              </CCol>
            </CRow>
          </>
        )}

        {mode === 'existing' && (
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel className="fw-semibold">
                Existing Product <span className="text-danger">*</span>
              </CFormLabel>
              <div className="d-flex align-items-center gap-2">
                <CFormSelect
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  disabled={loadingProducts}
                >
                  <option value="">Select an option</option>
                  {normalizedProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </CFormSelect>
                {loadingProducts && <CSpinner size="sm" />}
              </div>
              {!hasExistingProducts && !loadingProducts && (
                <small className="text-muted">
                  No products found. Please create a new product.
                </small>
              )}
            </CCol>
          </CRow>
        )}

        <CRow className="mb-3">
          <CCol md={12}>
            <CFormLabel className="fw-semibold">
              Source Description <span className="text-danger">*</span>
            </CFormLabel>
            <CFormTextarea
              placeholder="Enter the Source Description..."
              value={sourceDescription}
              onChange={(e) => setSourceDescription(e.target.value)}
              rows={3}
              required
              disabled={saving}
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter className="d-flex justify-content-between">
        <CButton color="secondary" variant="outline" onClick={onClose} disabled={saving}>
          <CIcon icon={cilX} className="me-2" />
          Close
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={disableSave}>
          {saving && <CSpinner size="sm" className="me-2" />}
          <CIcon icon={cilSave} className="me-2" />
          Save Entity
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default AddProductModal;

