import React, { useState, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilReload, cilContact } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
import DynamicModal from 'src/application/Components/DynamicModal';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import AddAudienceModal from 'src/resources/views/components/Audience/AddAudienceModal';
import AddProductModal from 'src/resources/views/components/Product/AddProductModal';

/**
 * Outsourcing DB Contacts Page
 * Token: central_filters_outsourcing
 */
const Outsourcingdb = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [modalConfig, setModalConfig] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [audiences, setAudiences] = useState([]);
  const [audienceContext, setAudienceContext] = useState(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceModalError, setAudienceModalError] = useState(null);
  const [audienceSaving, setAudienceSaving] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [productContext, setProductContext] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalError, setProductModalError] = useState(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productLoading, setProductLoading] = useState(false);

  const baseToken = 'central_filters_outsourcing';

  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  const { handleDelete } = useDelete(baseToken, () => {
    setTableRefreshKey(prev => prev + 1);
  });

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const fetchFormConfig = async (mode, recordId = null) => {
    try {
      const token = mode === 'add' ? `${baseToken}_a` : `${baseToken}_e`;
      const url = recordId
        ? `/api/skeleton-action/${token}?id=${recordId}`
        : `/api/skeleton-action/${token}`;

      const authAxios = getAuthAxios();
      const response = await authAxios.get(url);

      if (response.data.status) {
        setModalConfig(response.data.data);
        setModalMode(mode);
        setShowModal(true);
      } else {
        setError(response.data.message || 'Failed to load form');
      }
    } catch (err) {
      console.error('Error fetching form config:', err);
      setError(err.response?.data?.message || 'Failed to load form');
    }
  };

  const handleAdd = () => {
    setSelectedRecord(null);
    fetchFormConfig('add');
  };

  const handleEdit = (record) => {
    setSelectedRecord(record);
    fetchFormConfig('edit', record.id);
  };

  const handleSubmit = async (formData) => {
    try {
      const token = modalMode === 'add' ? `${baseToken}_as` : `${baseToken}_es`;
      const payload = selectedRecord?.id
        ? { ...formData, id: selectedRecord.id }
        : formData;

      const authAxios = getAuthAxios();
      const response = await authAxios.post(`/api/skeleton-action/${token}`, payload);

      if (response.data.status) {
        setShowModal(false);
        setTableRefreshKey(prev => prev + 1);
        alert(response.data.message || 'Saved successfully');
      } else {
        alert(response.data.message || 'Save failed');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  const fetchAudiences = async () => {
    try {
      setAudienceLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/audiences');
      const list = response.data?.data || response.data?.audiences || [];
      setAudiences(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch audiences:', err);
      setAudienceModalError(err.response?.data?.message || 'Unable to load audiences');
    } finally {
      setAudienceLoading(false);
    }
  };

  const handleAudienceAction = ({ ids, rows, meta, selectAll, excludedIds, filters, totalCount }) => {
    if (!selectAll && !ids?.length) return;
    setAudienceContext({ ids, rows, meta, selectAll, excludedIds, filters, totalCount });
    setAudienceModalError(null);
    fetchAudiences();
    setShowAudienceModal(true);
  };

  const handleSaveAudience = async ({ mode, audienceId, audienceName, splitFullName }) => {
    if (!audienceContext?.selectAll && !audienceContext?.rows?.length) {
      setAudienceModalError('No records selected for audience assignment.');
      return;
    }
    try {
      setAudienceSaving(true);
      const authAxios = getAuthAxios();
      const payload = {
        mode,
        audienceId,
        audienceName,
        splitFullName,
        source: {
          table: audienceContext.meta?.tableName || 'master_leads',
          system: audienceContext.meta?.system || 'sun'
        }
      };

      if (audienceContext.selectAll) {
        payload.selectAll = true;
        payload.filters = audienceContext.filters;
        payload.excludedIds = audienceContext.excludedIds || [];
        payload.totalCount = audienceContext.totalCount || 0;
        payload.records = [];
        payload.recordIds = [];
      } else {
        payload.records = audienceContext.rows;
        payload.recordIds = audienceContext.ids || [];
      }

      const response = await authAxios.post('/api/audiences/assign', payload);
      setSuccess(response.data?.message || 'Audience updated successfully.');
      setShowAudienceModal(false);
      setAudienceContext(null);
      setAudienceModalError(null);
    } catch (err) {
      console.error('Failed to save audience:', err);
      setAudienceModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to save audience');
      setError(err.response?.data?.message || 'Failed to save audience');
    } finally {
      setAudienceSaving(false);
    }
  };

  const closeAudienceModal = () => {
    if (audienceSaving) return;
    setShowAudienceModal(false);
    setAudienceModalError(null);
  };

  const fetchProducts = async () => {
    try {
      setProductLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/skeleton-action/central_unique_products_t', {
        skeleton_filters: {
          pagination: { page: 1, limit: 1000 }
        },
        skeleton_view: 'table',
        draw: 1
      });
      const list = response.data?.data || [];
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProductModalError(err.response?.data?.message || 'Unable to load products');
    } finally {
      setProductLoading(false);
    }
  };

  const handleProductAction = ({ ids, rows, meta }) => {
    if (!ids?.length) return;
    setProductContext({ ids, rows, meta });
    setProductModalError(null);
    fetchProducts();
    setShowProductModal(true);
  };

  const handleSaveProduct = async ({ mode, productId, productName, productDescription, category, vendor, sourceDescription, ppId, ppName }) => {
    if (!productContext?.rows?.length) {
      setProductModalError('No records selected for product assignment.');
      return;
    }
    try {
      setProductSaving(true);
      const authAxios = getAuthAxios();
      const payload = {
        mode,
        productId,
        productName,
        description: productDescription,
        category,
        vendor,
        source_description: sourceDescription,
        pp_id: ppId,
        pp_name: ppName,
        ids: productContext.ids.join('@'),
        type: `${productContext.meta?.system || 'sun'}.${productContext.meta?.tableName || 'master_leads'}`
      };
      const response = await authAxios.post('/api/skeleton-action/central_unique_products_as', payload);
      if (response.data.status) {
        setSuccess(response.data?.message || 'Product updated successfully.');
        setShowProductModal(false);
        setProductContext(null);
        setProductModalError(null);
        setTableRefreshKey(prev => prev + 1);
      } else {
        setProductModalError(response.data?.message || 'Failed to save product');
        setError(response.data?.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      setProductModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to save product');
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setProductSaving(false);
    }
  };

  const closeProductModal = () => {
    if (productSaving) return;
    setShowProductModal(false);
    setProductModalError(null);
  };

  const tableColumns = {
    id: ['id', true],
    li_company_name: ['li_company_name', true],
    li_full_name: ['li_full_name', true],
    li_first_name: ['li_first_name', true],
    li_middle_name: ['li_middle_name', true],
    li_last_name: ['li_last_name', true],
    li_first_name_initial: ['li_first_name_initial', true],
    li_last_name_initial: ['li_last_name_initial', true],
    li_smtp: ['li_smtp', true],
    li_job_title: ['li_job_title', true],
    dls_designation: ['dls_designation', true],
    dls_jobfunction: ['dls_jobfunction', true],
    li_duration_in_role: ['li_duration_in_role', true],
    li_title_description: ['li_title_description', true],
    gs_title: ['gs_title', true],
    email: ['email', true],
    created_at: ['created_at', true]
  };

  const tableReqSet = {
    token: `${baseToken}_t`,
    table: 'outsourcing',
    actions: 'v',
    act: 'id',
    system: 'sun'
  };

  const handleTableAction = useCallback((actionType, row) => {
    if (!row) return;
    switch (actionType) {
      case 'view':
        handleView(row);
        break;
      case 'edit':
        handleEdit(row);
        break;
      case 'delete':
        handleDelete(row);
        break;
      default:
        break;
    }
  }, [handleView, handleEdit, handleDelete]);

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <CIcon icon={cilContact} className="me-2" />
                  Outsourcing DB Contacts
                </div>
                <div>
                  <CButton color="primary" size="sm" className="me-2" onClick={handleAdd}>
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Contact
                  </CButton>
                  <CButton color="secondary" size="sm" onClick={() => setTableRefreshKey(prev => prev + 1)}>
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
              {success && (
                <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                  {success}
                </CAlert>
              )}
              <DynamicTable
                key={tableRefreshKey}
                token={`${baseToken}_t`}
                tableName="outsourcing"
                system="sun"
                columns={tableColumns}
                custom={[]}
                reqSet={tableReqSet}
                onAction={handleTableAction}
                initialFilters={{}}
                autoFetch={true}
                enableSelection={true}
                onAudienceAction={handleAudienceAction}
                onProductAction={handleProductAction}
                filterSidebarMode="collapsible"
                onNeedToAction={async ({ ids, meta }) => {
                  if (!ids || ids.length === 0) return;
                  try {
                    const authAxios = getAuthAxios();
                    const response = await authAxios.post('/api/need-to-action', {
                      system: meta?.system || 'sun',
                      collection: meta?.tableName || 'master_leads',
                      recordIds: ids
                    });
                    setSuccess(response.data?.message || 'Records moved to Need-To-Action workspace');
                  } catch (err) {
                    console.error('Need-To-Action capture failed:', err);
                    setError(err.response?.data?.message || 'Failed to move records to Need-To-Action workspace');
                  }
                }}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {showModal && modalConfig && (
        <DynamicModal
          show={showModal}
          onClose={() => setShowModal(false)}
          config={modalConfig}
          mode={modalMode}
          onSubmit={handleSubmit}
          data={selectedRecord}
        />
      )}

      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />

      <AddAudienceModal
        visible={showAudienceModal}
        onClose={closeAudienceModal}
        onSave={handleSaveAudience}
        availableAudiences={audiences}
        loadingAudiences={audienceLoading}
        saving={audienceSaving}
        error={audienceModalError}
        selectedCount={audienceContext?.ids?.length || 0}
      />

      <AddProductModal
        visible={showProductModal}
        onClose={closeProductModal}
        onSave={handleSaveProduct}
        availableProducts={products}
        loadingProducts={productLoading}
        saving={productSaving}
        error={productModalError}
        selectedCount={productContext?.ids?.length || 0}
        sourceTable="outsourcing"
      />
    </>
  );
};

export default Outsourcingdb;
