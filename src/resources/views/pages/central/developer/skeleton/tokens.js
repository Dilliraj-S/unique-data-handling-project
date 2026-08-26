import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilReload } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
import DynamicModal from 'src/application/Components/DynamicModal';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

/**
 * Tokens Page - Token Management
 * URL: /central/developer/tokens
 */
const TokensPage = () => {
  console.log('🔵 TokensPage component rendering...');
  
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalConfig, setModalConfig] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const baseToken = 'central_skeleton_tokens';
  
  // Universal view modal hook - works for all tables automatically
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  
  // Universal delete hook - works for all tables automatically
  const { handleDelete, handleBulkDelete } = useDelete(baseToken, () => {
    // Refresh table after successful deletion
    setRefreshTrigger(prev => prev + 1);
  });

  // Helper to get axios with auth headers for Next.js API routes
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    const authAxios = axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor to handle 401 errors
    authAxios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const errorMessage = error.response?.data?.message || 'Authentication required';
          console.error('🔴 401 Unauthorized:', errorMessage);
          
          // Clear expired token immediately (don't wait for async logout)
          AuthService.clearAuth();
          
          // Show user-friendly message
          alert('Your session has expired. Please login again.');
          
          // Redirect to login page
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return authAxios;
  };

  // Fetch table data
  const fetchTableData = async () => {
    try {
      console.log(`🟡 Fetching tokens data...`);
      setLoading(true);
      setError(null);

      const apiUrl = `/api/skeleton-action/${baseToken}_t`;
      console.log(`📡 API Call: POST ${apiUrl}`);

      const authAxios = getAuthAxios();
      const response = await authAxios.post(apiUrl, {
        skeleton_filters: {
          pagination: { page: 1, limit: 50 }
        }
      });

      console.log(`✅ API Response:`, response.data);

      if (response.data.status) {
        console.log(`📊 Data loaded: ${response.data.data?.length || 0} records`);
        setTableData(response.data.data || []);
      } else {
        console.error(`❌ API returned status: false, message: ${response.data.message}`);
        setError(response.data.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('❌ Error fetching table data:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      console.log(`🏁 Loading complete`);
    }
  };

  // Fetch form configuration
  const fetchFormConfig = async (mode, recordId = null) => {
    try {
      const token = mode === 'add' ? `${baseToken}_a` : `${baseToken}_e`;
      const url = recordId 
        ? `/api/skeleton-action/${token}?id=${recordId}`
        : `/api/skeleton-action/${token}`;

      console.log(`🟡 Fetching form config: ${url} (mode: ${mode})`);
      const authAxios = getAuthAxios();
      // Add cache busting for GET requests to prevent 304 responses
      const urlWithCacheBust = recordId 
        ? `${url}&_t=${Date.now()}`
        : `${url}?_t=${Date.now()}`;
      const response = await authAxios.get(urlWithCacheBust);

      console.log(`✅ Form config response:`, response.data);

      if (response.data.status) {
        const config = response.data.data;
        console.log(`📋 Setting modal config:`, config);
        console.log(`📋 Config has fields:`, config?.fields?.length || 0);
        console.log(`📋 Config modal:`, config?.modal);
        
        setModalConfig(config);
        setModalMode(mode);
        setShowModal(true);
        console.log(`✅ Modal state updated - showModal: true, hasConfig: ${!!config}`);
      } else {
        console.error(`❌ API returned status: false`, response.data.message);
        setError(response.data.message || 'Failed to load form');
      }
    } catch (err) {
      console.error('❌ Error fetching form config:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to load form');
    }
  };

  // Handle add button
  const handleAdd = () => {
    setSelectedRecord(null);
    fetchFormConfig('add');
  };

  // Handle edit button
  const handleEdit = (record) => {
    setSelectedRecord(record);
    // Use _id for MongoDB, fallback to id
    const recordId = record._id || record.id;
    fetchFormConfig('edit', recordId);
  };

  // View handler is now provided by useViewModal hook - no need to write it manually
  // Delete handlers are now provided by useDelete hook - no need to write them manually

  // Handle form submit
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
        setRefreshTrigger(prev => prev + 1);
        alert(response.data.message || 'Saved successfully');
      } else {
        alert(response.data.message || 'Save failed');
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      alert(err.response?.data?.message || 'Failed to save');
    }
  };

  // Refresh data when triggered
  useEffect(() => {
    fetchTableData();
  }, [refreshTrigger]);

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <strong>Token Management</strong>
                <div>
                  <CButton
                    color="primary"
                    size="sm"
                    className="me-2"
                    onClick={handleAdd}
                  >
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Token
                  </CButton>
                  <CButton
                    color="secondary"
                    size="sm"
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                  >
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

              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                  <p className="mt-2">Loading tokens...</p>
                </div>
              ) : (
                <DynamicTable
                  token={`${baseToken}_t`}
                  tableName="central_skeleton_tokens"
                  system="central"
                  // minimal columns; server returns full columns and filters
                  columns={{ id: ['id', true], key: ['key', true] }}
                  custom={[]}
                  reqSet={{ token: `${baseToken}_t`, table: 'central_skeleton_tokens', actions: 'cevd', act: 'id', system: 'central' }}
                  onAction={(actionType, row) => {
                    if (!row) return;
                    if (actionType === 'view') handleView(row);
                    if (actionType === 'edit') handleEdit(row);
                    if (actionType === 'delete') handleDelete(row);
                  }}
                  autoFetch={true}
                  emptyMessage="No tokens found. Click 'Add Token' to create one."
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Dynamic Modal */}
      {(() => {
        console.log(`🔵 Modal render check:`, { 
          showModal, 
          hasModalConfig: !!modalConfig, 
          modalConfigKeys: modalConfig ? Object.keys(modalConfig) : null
        });
        return showModal && modalConfig && (
          <DynamicModal
            show={showModal}
            onClose={() => {
              console.log('🟡 Closing modal');
              setShowModal(false);
            }}
            config={modalConfig}
            mode={modalMode}
            onSubmit={handleSubmit}
            data={selectedRecord}
          />
        );
      })()}

      {/* View Modal (Offcanvas) - Common for all sections */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          console.log('🟡 Closing view modal');
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />
    </>
  );
};

export default TokensPage;

