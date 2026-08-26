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
 * Sections Page - Section Management
 * URL: /central/developer/sections
 */
const SectionsPage = () => {
  console.log('🔵 SectionsPage component rendering...');
  
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalConfig, setModalConfig] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const baseToken = 'central_skeleton_sections';
  
  // Universal view modal hook - works for all tables automatically
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  
  // Universal delete hook - works for all tables automatically
  const { handleDelete, handleBulkDelete } = useDelete(baseToken, () => {
    // Refresh table after successful deletion
    setRefreshTrigger(prev => prev + 1);
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

  const fetchTableData = async () => {
    try {
      console.log(`🟡 Fetching sections data...`);
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
        console.error(`❌ API returned status: false`);
        setError(response.data.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('❌ Error fetching table data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormConfig = async (mode, recordId = null) => {
    try {
      const timestamp = new Date().getTime();
      const token = mode === 'add' ? `${baseToken}_a` : `${baseToken}_e`;
      const url = recordId 
        ? `/api/skeleton-action/${token}?id=${recordId}&_t=${timestamp}`
        : `/api/skeleton-action/${token}?_t=${timestamp}`;

      console.log(`🟡 Fetching form config: ${url} (mode: ${mode})`);

      const authAxios = getAuthAxios();
      const response = await authAxios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

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
    // Use _id for MongoDB, fallback to id
    const recordId = record._id || record.id;
    fetchFormConfig('edit', recordId);
  };

  // View handler is now provided by useViewModal hook - no need to write it manually
  // Delete handlers are now provided by useDelete hook - no need to write them manually

  const handleSubmit = async (formData) => {
    try {
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
                <strong>Section Management</strong>
                <div>
                  <CButton color="primary" size="sm" className="me-2" onClick={handleAdd}>
                    <CIcon icon={cilPlus} className="me-1" />
                    Add Section
                  </CButton>
                  <CButton color="secondary" size="sm" onClick={() => setRefreshTrigger(prev => prev + 1)}>
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
                  <p className="mt-2">Loading sections...</p>
                </div>
              ) : (
                <DynamicTable
                  token={`${baseToken}_t`}
                  tableName="central_skeleton_sections"
                  system="central"
                  // minimal columns; server returns full columns and filters
                  columns={{ id: ['id', true], name: ['name', true] }}
                  custom={[]}
                  reqSet={{ token: `${baseToken}_t`, table: 'central_skeleton_sections', actions: 'cevd', act: 'id', system: 'central' }}
                  onAction={(actionType, row) => {
                    if (!row) return;
                    if (actionType === 'view') handleView(row);
                    if (actionType === 'edit') handleEdit(row);
                    if (actionType === 'delete') handleDelete(row);
                  }}
                  autoFetch={true}
                  emptyMessage="No sections found. Click 'Add Section' to create one."
                />
              )}
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

      {/* View Modal (Offcanvas) - Common for all sections */}
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

export default SectionsPage;

