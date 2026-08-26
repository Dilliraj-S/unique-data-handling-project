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
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import UserPermissionsModal from './skeleton/components/UserPermissionsModal';

/**
 * Users Page - User Management
 * URL: /central/developer/users
 */
const UsersPage = () => {
  console.log('🔵 UsersPage component rendering...');
  
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const baseToken = 'central_skeleton_user_permissions';
  
  // Universal view modal hook
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  
  // Universal delete hook
  const { handleDelete, handleBulkDelete } = useDelete(baseToken, () => {
    setRefreshTrigger(prev => prev + 1);
  });

  // Helper to get axios with auth headers
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    const authAxios = axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    authAxios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          AuthService.clearAuth();
          alert('Your session has expired. Please login again.');
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
      console.log(`🟡 Fetching users data...`);
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
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit button - show permissions modal instead of regular edit
  const handleEdit = (record) => {
    console.log('🟡 Opening permissions modal for user:', record);
    setSelectedRecord(record);
    setShowPermissionsModal(true);
  };

  // Handle permissions modal close
  const handlePermissionsModalClose = () => {
    setShowPermissionsModal(false);
    setSelectedRecord(null);
  };

  // Handle permissions save
  const handlePermissionsSave = async (permissionIds) => {
    try {
      const authAxios = getAuthAxios();
      
      // Get user_id - check multiple possible fields
      const userId = selectedRecord?.user_id || selectedRecord?.id || selectedRecord?._id;
      
      if (!userId) {
        alert('Error: User ID not found. Cannot save permissions.');
        return;
      }
      
      console.log('💾 Saving permissions:', {
        userId,
        permissionCount: permissionIds?.length || 0,
        selectedRecord: selectedRecord
      });
      
      const response = await authAxios.post(`/api/skeleton-action/central_skeleton_user_permissions_es`, {
        user_id: userId,
        permission_ids: permissionIds,
        save_token: 'central_skeleton_user_permissions_es'
      });

      if (response.data.status) {
        alert(response.data.message || 'Permissions saved successfully');
        setShowPermissionsModal(false);
        setSelectedRecord(null);
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert(response.data.message || 'Failed to save permissions');
      }
    } catch (err) {
      console.error('❌ Error saving permissions:', err);
      alert(err.response?.data?.message || 'Failed to save permissions');
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
                <strong>User Management</strong>
                <div>
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
                  <p className="mt-2">Loading users...</p>
                </div>
              ) : (
                <DynamicTable
                  data={tableData}
                  baseToken={baseToken}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                  onBulkDelete={handleBulkDelete}
                  emptyMessage="No users found."
                />
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* User Permissions Modal */}
      {showPermissionsModal && selectedRecord && (
        <UserPermissionsModal
          show={showPermissionsModal}
          onClose={handlePermissionsModalClose}
          onSave={handlePermissionsSave}
          user={selectedRecord}
        />
      )}

      {/* View Modal */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />
    </>
  );
};

export default UsersPage;
