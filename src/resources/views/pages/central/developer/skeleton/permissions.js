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
 * Permissions Page - Permission Management
 * URL: /central/developer/permissions
 */
const PermissionsPage = () => {
  console.log('🔵 PermissionsPage component rendering...');
  
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalConfig, setModalConfig] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const baseToken = 'central_skeleton_permissions';
  
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
      console.log(`🟡 Fetching permissions data...`);
      setLoading(true);
      setError(null);

      const apiUrl = `/api/skeleton-action/${baseToken}_t`;
      console.log(`📡 API Call: POST ${apiUrl}`);

      const authAxios = getAuthAxios();
      const response = await authAxios.post(apiUrl, {
        draw: 1,
        skeleton_filters: {
          pagination: { page: 1, limit: 50 },
          search: { value: '' }
        }
      });

      console.log(`✅ API Response:`, response.data);

      if (response.data.status && response.data.data) {
        setTableData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch permissions');
      }
    } catch (err) {
      console.error('❌ Error fetching permissions:', err);
      setError(err.response?.data?.message || 'Failed to fetch permissions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch form configuration
  const fetchFormConfig = async (mode = 'add', recordId = null) => {
    try {
      const authAxios = getAuthAxios();
      const timestamp = Date.now();
      const token = mode === 'add' ? `${baseToken}_a` : `${baseToken}_e`;
      const url = recordId 
        ? `/api/skeleton-action/${token}?id=${recordId}&_t=${timestamp}`
        : `/api/skeleton-action/${token}?_t=${timestamp}`;

      console.log(`🟡 Fetching form config: ${url} (mode: ${mode})`);
      const response = await authAxios.get(url);
      console.log('✅ Form config response:', response.data);

      if (response.data.status && response.data.data) {
        setModalConfig(response.data.data);
        setModalMode(mode);
        setShowModal(true);
      } else {
        alert(response.data.message || 'Failed to load form');
      }
    } catch (err) {
      console.error('❌ Error fetching form config:', err);
      alert(err.response?.data?.message || 'Failed to load form');
    }
  };

  // Handle add button
  const handleAdd = () => {
    setSelectedRecord(null);
    fetchFormConfig('add');
  };

  // Handle edit button
  const handleEdit = (record) => {
    // Use _id for MongoDB, fallback to id
    const recordId = record._id || record.id;
    setSelectedRecord(record);
    fetchFormConfig('edit', recordId);
  };

  // Handle form submit
  const handleSubmit = async (formData) => {
    try {
      // Use correct token format: _as for add, _es for edit (matching tokens.js pattern)
      const token = modalMode === 'add' ? `${baseToken}_as` : `${baseToken}_es`;
      // Use _id for MongoDB, fallback to id
      const recordId = selectedRecord?._id || selectedRecord?.id;
      const payload = recordId 
        ? { ...formData, id: recordId, save_token: token }
        : { ...formData, save_token: token };

      console.log('📤 Submitting form:', { token, recordId, payload });

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
                <strong>Permission Management</strong>
                <div>
                  <CButton
                    color="primary"
                    size="sm"
                    className="me-2"
                    onClick={handleAdd}
                  >
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Permission
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
                  <p className="mt-2">Loading permissions...</p>
                </div>
              ) : (
                <DynamicTable
                  token={`${baseToken}_t`}
                  tableName="central_skeleton_permissions"
                  system="central"
                  // minimal columns; server returns full columns and filters
                  columns={{ id: ['id', true], name: ['name', true] }}
                  custom={[]}
                  reqSet={{ token: `${baseToken}_t`, table: 'central_skeleton_permissions', actions: 'cevd', act: 'id', system: 'central' }}
                  onAction={(actionType, row) => {
                    if (!row) return;
                    if (actionType === 'view') handleView(row);
                    if (actionType === 'edit') handleEdit(row);
                    if (actionType === 'delete') handleDelete(row);
                  }}
                  autoFetch={true}
                  emptyMessage="No permissions found. Click 'Add Permission' to create one."
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

export default PermissionsPage;
