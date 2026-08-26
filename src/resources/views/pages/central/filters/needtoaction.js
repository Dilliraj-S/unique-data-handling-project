import React, { useState, useCallback } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CBreadcrumb,
  CBreadcrumbItem,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CAlert,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilReload, cilPencil, cilTrash, cilCheck, cilX } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
import DynamicModal from 'src/application/Components/DynamicModal';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

/**
 * Need To Action Page
 * Dynamic workspace for editing records from any collection
 * Supports bulk operations, find-replace, regex, and push-back functionality
 */
const NeedToAction = () => {
  const [activeTab, setActiveTab] = useState('workspace');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  
  // Bulk Operations State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkOperation, setBulkOperation] = useState('');
  const [bulkFormData, setBulkFormData] = useState({});
  const [selectedRecords, setSelectedRecords] = useState([]);

  const baseToken = 'central_filters_need_to_action';
  
  // Universal view modal hook
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  
  // Universal delete hook
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

  // Table columns for Need-To-Action workspace
  const workspaceColumns = {
    id: ['id', true],
    original_collection: ['original_collection', true],
    original_system: ['original_system', true], 
    status: ['status', true],
    data_preview: ['data_preview', true],
    modified_fields: ['modified_fields', true],
    created_at: ['created_at', true],
    updated_at: ['updated_at', true]
  };

  const workspaceReqSet = {
    token: `${baseToken}_t`,
    table: 'need_to_action',
    actions: 'cevd',
    act: 'id',
    system: 'central'
  };

  // Handle table actions
  const handleTableAction = useCallback((actionType, row) => {
    if (!row) return;

    switch (actionType) {
      case 'view':
        handleView(row);
        break;
      case 'edit':
        handleEditRecord(row);
        break;
      case 'delete':
        handleDeleteFromWorkspace([row.id]);
        break;
      case 'push_back':
        handlePushBack([row.id]);
        break;
      default:
        break;
    }
  }, [handleView]);

  // Handle edit record
  const handleEditRecord = (record) => {
    console.log('📝 Edit record clicked:', record);
    
    // Try multiple possible locations for the data object
    let dataToEdit = null;
    
    if (record._data && typeof record._data === 'object') {
      dataToEdit = record._data;
    } else if (record.data && typeof record.data === 'object') {
      dataToEdit = record.data;
    } else if (record.data_preview) {
      // If only preview is available, try to parse it
      try {
        const preview = record.data_preview;
        if (preview.endsWith('…')) {
          console.warn('⚠️ Only truncated preview available, cannot edit full record');
          setError('Cannot edit: only preview data available. Please refresh the table.');
          return;
        }
        dataToEdit = JSON.parse(preview);
      } catch (e) {
        console.error('Failed to parse data_preview:', e);
        setError('Failed to load record data for editing.');
        return;
      }
    }
    
    if (!dataToEdit || typeof dataToEdit !== 'object') {
      console.error('❌ No valid data found in record:', record);
      setError('No editable data found in this record.');
      return;
    }
    
    // Create a deep copy to avoid mutating the original
    const editableData = JSON.parse(JSON.stringify(dataToEdit));
    
    // Remove metadata fields that shouldn't be edited
    delete editableData._id;
    delete editableData.id;
    
    console.log('✅ Setting edit form data:', editableData);
    setEditingRecord(record);
    setEditFormData(editableData);
    setShowEditModal(true);
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    try {
      const authAxios = getAuthAxios();
      
      await authAxios.put(`/api/need-to-action/${editingRecord.id}`, {
        data: editFormData,
        operation: 'update'
      });

      setSuccess('Record updated successfully');
      setShowEditModal(false);
      setEditingRecord(null);
      setEditFormData({});
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update record');
    }
  };

  // Handle bulk operations
  const handleBulkOperation = async () => {
    try {
      // Validate form data based on operation type
      if (bulkOperation === 'find_replace') {
        if (!bulkFormData.targetField || !bulkFormData.targetField.trim()) {
          setError('Target Field is required for Find & Replace');
          return;
        }
        if (bulkFormData.searchValue === undefined || bulkFormData.searchValue === null || String(bulkFormData.searchValue).trim() === '') {
          setError('Find value is required for Find & Replace');
          return;
        }
      } else if (bulkOperation === 'update_field') {
        if (!bulkFormData.fieldName || !bulkFormData.fieldName.trim()) {
          setError('Field Name is required for Update Field');
          return;
        }
      }

      const authAxios = getAuthAxios();
      
      console.log('🔄 Sending bulk operation request:', {
        recordIds: selectedRecords.length,
        operation: bulkOperation,
        payload: bulkFormData
      });
      
      const response = await authAxios.post('/api/need-to-action/bulk-update', {
        recordIds: selectedRecords,
        operation: bulkOperation,
        updateData: bulkFormData
      });

      if (response.data && response.data.data) {
        const changedCount = response.data.data.filter(r => r.changed_fields && r.changed_fields.length > 0).length;
        const message = changedCount > 0 
          ? `Bulk ${bulkOperation} completed: ${changedCount} record(s) updated successfully`
          : `Bulk ${bulkOperation} completed, but no changes were detected. Please check field names and values.`;
        setSuccess(message);
      } else {
      setSuccess(`Bulk ${bulkOperation} completed successfully`);
      }
      
      setShowBulkModal(false);
      setBulkOperation('');
      setBulkFormData({});
      // Don't clear selectedRecords - let user see the results
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Bulk operation error:', error);
      setError(error.response?.data?.message || 'Failed to perform bulk operation');
    }
  };

  // Handle push back to original collections
  const handlePushBack = async (recordIds) => {
    try {
      const authAxios = getAuthAxios();
      
      const response = await authAxios.post('/api/need-to-action/push-back', {
        recordIds: recordIds
      });

      setSuccess(response.data.message);
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to push back records');
    }
  };

  // Handle delete from workspace
  const handleDeleteFromWorkspace = async (recordIds) => {
    try {
      const authAxios = getAuthAxios();
      
      await authAxios.delete('/api/need-to-action/workspace', {
        data: { recordIds: recordIds }
      });

      setSuccess('Records deleted from workspace');
      setTableRefreshKey(prev => prev + 1);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete records');
    }
  };

  // Render edit form fields dynamically
  const renderEditFields = () => {
    if (!editFormData || typeof editFormData !== 'object' || Object.keys(editFormData).length === 0) {
      return (
        <CAlert color="warning">
          No editable fields found in this record. The data may be empty or in an unexpected format.
        </CAlert>
      );
    }

    const renderField = (key, value, prefix = '') => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      // Skip metadata fields
      if (key === '_id' || key === 'id') return null;
      
      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        return (
          <div key={fullKey} className="mb-4">
            <h6 className="text-muted mb-2">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h6>
            <div className="ms-3 border-start ps-3">
              {Object.keys(value).map(nestedKey => 
                renderField(nestedKey, value[nestedKey], fullKey)
              )}
            </div>
          </div>
        );
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        return (
          <div key={fullKey} className="mb-3">
            <CFormLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CFormLabel>
            <CFormTextarea
              value={JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (prefix) {
                    const keys = prefix.split('.');
                    const lastKey = keys.pop();
                    const newData = JSON.parse(JSON.stringify(editFormData));
                    const parent = keys.reduce((obj, k) => obj[k], newData);
                    parent[lastKey] = { ...parent[lastKey], [key]: parsed };
                    setEditFormData(newData);
                  } else {
                    setEditFormData(prev => ({ ...prev, [key]: parsed }));
                  }
                } catch (err) {
                  // Invalid JSON, keep as string for now
                  if (prefix) {
                    const keys = prefix.split('.');
                    const lastKey = keys.pop();
                    const newData = JSON.parse(JSON.stringify(editFormData));
                    const parent = keys.reduce((obj, k) => obj[k], newData);
                    parent[lastKey] = { ...parent[lastKey], [key]: e.target.value };
                    setEditFormData(newData);
                  } else {
                    setEditFormData(prev => ({ ...prev, [key]: e.target.value }));
                  }
                }
              }}
              rows={Math.min(value.length + 2, 10)}
            />
            <small className="text-muted">Array (JSON format)</small>
          </div>
        );
      }
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      const isLongText = typeof value === 'string' && value.length > 100;
      const displayValue = value === null || value === undefined ? '' : String(value);

      return (
        <div key={fullKey} className="mb-3">
          <CFormLabel>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CFormLabel>
          {isLongText ? (
            <CFormTextarea
              value={displayValue}
              onChange={(e) => {
                if (prefix) {
                  const keys = prefix.split('.');
                  const lastKey = keys.pop();
                  const newData = JSON.parse(JSON.stringify(editFormData));
                  const parent = keys.reduce((obj, k) => obj[k], newData);
                  parent[lastKey] = { ...parent[lastKey], [key]: e.target.value };
                  setEditFormData(newData);
                } else {
                  setEditFormData(prev => ({ ...prev, [key]: e.target.value }));
                }
              }}
              rows={4}
            />
          ) : (
            <CFormInput
              type={typeof value === 'number' ? 'number' : (key.toLowerCase().includes('date') || key.toLowerCase().includes('time') ? 'datetime-local' : 'text')}
              value={displayValue}
              onChange={(e) => {
                const newValue = typeof value === 'number' ? Number(e.target.value) : e.target.value;
                if (prefix) {
                  const keys = prefix.split('.');
                  const lastKey = keys.pop();
                  const newData = JSON.parse(JSON.stringify(editFormData));
                  const parent = keys.reduce((obj, k) => obj[k], newData);
                  parent[lastKey] = { ...parent[lastKey], [key]: newValue };
                  setEditFormData(newData);
                } else {
                  setEditFormData(prev => ({ ...prev, [key]: newValue }));
                }
              }}
            />
          )}
        </div>
      );
    };

    return Object.keys(editFormData).map(key => renderField(key, editFormData[key])).filter(Boolean);
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          {/* Breadcrumb */}
          <div className="container-fluid px-0 d-flex justify-content-between align-items-center mb-3">
            <CBreadcrumb>
              <CBreadcrumbItem>
                <a href="javascript:void(0);">Filters</a>
              </CBreadcrumbItem>
              <CBreadcrumbItem>
                <a href="javascript:void(0);">Workspace</a>
              </CBreadcrumbItem>
              <CBreadcrumbItem active className="fw-bold">
                Need To Action
              </CBreadcrumbItem>
            </CBreadcrumb>
          </div>

          {/* Alerts */}
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

          <CCard className="mb-4">
            <CCardHeader className="p-3 border-bottom-0 d-flex justify-content-between">
              <div className="nav-align-top">
                <CNav variant="pills" role="tablist">
                  <CNavItem role="presentation">
                    <CNavLink
                      active={activeTab === 'workspace'}
                      onClick={() => setActiveTab('workspace')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilPencil} className="me-1" />
                      Workspace ({selectedRecords.length} selected)
                    </CNavLink>
                  </CNavItem>
                  <CNavItem role="presentation">
                    <CNavLink
                      active={activeTab === 'bulk'}
                      onClick={() => setActiveTab('bulk')}
                      style={{ cursor: 'pointer' }}
                      disabled={selectedRecords.length === 0}
                    >
                      Bulk Operations
                    </CNavLink>
                  </CNavItem>
                </CNav>
              </div>
              <div>
                {selectedRecords.length > 0 && (
                  <>
                    <CButton 
                      color="success" 
                      size="sm" 
                      className="me-2"
                      onClick={() => handlePushBack(selectedRecords)}
                    >
                      <CIcon icon={cilCheck} className="me-1" />
                      Push Back ({selectedRecords.length})
                    </CButton>
                    <CButton 
                      color="danger" 
                      size="sm" 
                      className="me-2"
                      onClick={() => handleDeleteFromWorkspace(selectedRecords)}
                    >
                      <CIcon icon={cilTrash} className="me-1" />
                      Delete ({selectedRecords.length})
                    </CButton>
                  </>
                )}
                <CButton 
                  color="primary" 
                  size="sm"
                  onClick={() => setTableRefreshKey(prev => prev + 1)}
                >
                  <CIcon icon={cilReload} className="me-1" />
                  Refresh
                </CButton>
              </div>
            </CCardHeader>

            <CCardBody>
              <CTabContent>
                {/* Workspace Tab */}
                <CTabPane 
                  role="tabpanel" 
                  aria-labelledby="workspace-tab" 
                  visible={activeTab === 'workspace'}
                >
                  <DynamicTable
                    key={tableRefreshKey}
                    token={`${baseToken}_t`}
                    tableName="need_to_action"
                    system="central"
                    columns={workspaceColumns}
                    custom={[]}
                    reqSet={workspaceReqSet}
                    onAction={handleTableAction}
                    initialFilters={{}}
                    autoFetch={true}
                    emptyMessage="No records in workspace. Use the 'Need To Action' button on other pages to move records here."
                    enableSelection={true}
                    enableBulkActions={true}
                    onSelectionChange={(ids) => {
                      setSelectedRecords(ids);
                    }}
                  />
                </CTabPane>

                {/* Bulk Operations Tab */}
                <CTabPane 
                  role="tabpanel" 
                  aria-labelledby="bulk-tab" 
                  visible={activeTab === 'bulk'}
                >
                  <div className="p-4 text-center">
                    <h5>Bulk Operations</h5>
                    <p className="text-muted mb-4">
                      Select records in the Workspace tab to perform bulk operations
                    </p>
                    
                    {selectedRecords.length > 0 ? (
                      <div className="row">
                        <div className="col-md-6 offset-md-3">
                          <div className="d-grid gap-2">
                            <CButton 
                              color="primary" 
                              onClick={() => {
                                setBulkOperation('find_replace');
                                setShowBulkModal(true);
                              }}
                            >
                              Find & Replace
                            </CButton>
                            <CButton 
                              color="info"
                              onClick={() => {
                                setBulkOperation('update_field');
                                setShowBulkModal(true);
                              }}
                            >
                              Update Field
                            </CButton>
                            <CButton 
                              color="success"
                              onClick={() => handlePushBack(selectedRecords)}
                            >
                              Push Back All Selected
                            </CButton>
                            <CButton 
                              color="danger"
                              onClick={() => handleDeleteFromWorkspace(selectedRecords)}
                            >
                              Delete All Selected
                            </CButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <CBadge color="warning">No records selected</CBadge>
                    )}
                  </div>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Record Modal */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Edit Record</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {editingRecord && (
            <div>
              <div className="mb-3">
                <strong>Source:</strong> {editingRecord.original_collection} 
                <CBadge color="info" className="ms-2">{editingRecord.status}</CBadge>
              </div>
              <CForm>
                {renderEditFields()}
              </CForm>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveEdit}>
            Save Changes
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Bulk Operations Modal */}
      <CModal visible={showBulkModal} onClose={() => setShowBulkModal(false)}>
        <CModalHeader>
          <CModalTitle>Bulk {bulkOperation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {bulkOperation === 'find_replace' && (
            <CForm>
              <div className="mb-3">
                <CFormLabel>Target Field</CFormLabel>
                <CFormInput
                  value={bulkFormData.targetField || ''}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, targetField: e.target.value }))}
                  placeholder="e.g., email, phone, address"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Find</CFormLabel>
                <CFormInput
                  value={bulkFormData.searchValue || ''}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, searchValue: e.target.value }))}
                  placeholder="Text to find"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Replace With</CFormLabel>
                <CFormInput
                  value={bulkFormData.replaceValue || ''}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, replaceValue: e.target.value }))}
                  placeholder="Replacement text"
                />
              </div>
            </CForm>
          )}
          
          {bulkOperation === 'update_field' && (
            <CForm>
              <div className="mb-3">
                <CFormLabel>Field Name</CFormLabel>
                <CFormInput
                  value={bulkFormData.fieldName || ''}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, fieldName: e.target.value }))}
                  placeholder="e.g., status, category"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>New Value</CFormLabel>
                <CFormInput
                  value={bulkFormData.fieldValue || ''}
                  onChange={(e) => setBulkFormData(prev => ({ ...prev, fieldValue: e.target.value }))}
                  placeholder="New value for the field"
                />
              </div>
            </CForm>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowBulkModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleBulkOperation}>
            Apply to {selectedRecords.length} Records
          </CButton>
        </CModalFooter>
      </CModal>

      {/* View Modal */}
      {showViewModal && (
        <ViewModal
          show={showViewModal}
          onClose={() => setShowViewModal(false)}
          data={viewData}
        />
      )}
    </>
  );
};

export default NeedToAction;