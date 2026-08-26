import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CFormInput,
  CBadge,
  CSpinner,
  CAvatar
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilUser, cilReload, cilSearch, cilPlus, cilUserPlus } from '@coreui/icons';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import DynamicModal from 'src/application/Components/DynamicModal';

/**
 * Add Users Page - Display Users in Card Format
 * URL: /central/querynest/addusers
 * Token: central_users_addusers
 */
const Addusers = () => {
  console.log('🔵 AddUsersPage component rendering...');
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalConfig, setModalConfig] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const baseToken = 'central_users_addusers';

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/skeleton-action/central_users_addusers_c', {
        skeleton_filters: {
          pagination: { page: 1, limit: 1000 }
        },
        skeleton_view: 'card',
        draw: 1
      });

      if (response.data.status && response.data.data) {
        const usersList = Array.isArray(response.data.data) ? response.data.data : [];
        setUsers(usersList);
        setFilteredUsers(usersList);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, tableRefreshKey]);

  // Filter users based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
      (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
      (user.user_id && user.user_id.toLowerCase().includes(searchLower))
    );
    setFilteredUsers(filtered);
  }, [users, searchTerm]);

  const fetchFormConfig = async (mode, recordId = null) => {
    try {
      // Use correct token suffixes:
      // _a = ShowAddCtrl (form display for add)
      // _e = ShowEditCtrl (form display for edit)
      // _as = SaveAddCtrl (save action for add)
      // _es = SaveEditCtrl (save action for edit)
      const token = mode === 'add' ? `${baseToken}_a` : `${baseToken}_e`;
      const url = recordId 
        ? `/api/skeleton-action/${token}?id=${recordId}`
        : `/api/skeleton-action/${token}`;

      console.log('🔍 Fetching form config:', { mode, token, recordId, url });
      const authAxios = getAuthAxios();
      const response = await authAxios.get(url);

      console.log('📋 Form config response:', response.data);

      if (response.data.status) {
        // Extract the actual config from response.data.data (backend wraps it)
        // DynamicModal expects: { fields, labelType, modal, script, validate }
        const config = response.data.data || response.data;
        
        // Validate config structure
        if (!config || !config.fields || !Array.isArray(config.fields)) {
          console.error('❌ Invalid config structure:', config);
          alert('Invalid form configuration received from server');
          return;
        }
        
        console.log('✅ Setting modal config:', {
          fieldsCount: config.fields?.length,
          labelType: config.labelType,
          modalTitle: config.modal?.title,
          modalButton: config.modal?.button
        });
        
        setModalConfig(config);
        setModalMode(mode);
        setShowModal(true);
      } else {
        alert(response.data.message || 'Failed to load form configuration');
      }
    } catch (err) {
      console.error('Error fetching form config:', err);
      alert(err.response?.data?.message || 'Failed to load form configuration');
    }
  };

  const handleAdd = () => {
    setSelectedRecord(null);
    fetchFormConfig('add');
  };

  const handleEdit = (user) => {
    setSelectedRecord(user);
    fetchFormConfig('edit', user.user_id || user._id);
  };

  const handleSubmit = async (formData) => {
    try {
      const token = modalMode === 'add' ? `${baseToken}_as` : `${baseToken}_es`;
      const payload = selectedRecord?.user_id || selectedRecord?._id
        ? { ...formData, id: selectedRecord.user_id || selectedRecord._id }
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  const getInitials = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'success' : 'danger';
  };

  const getRoleColor = (role) => {
    return role === 'admin' ? 'primary' : 'secondary';
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <CIcon icon={cilUser} className="me-2" />
                  Users
                  {filteredUsers.length !== users.length && (
                    <CBadge color="info" className="ms-2">
                      {filteredUsers.length} of {users.length}
                    </CBadge>
                  )}
                </div>
                <div>
                  <CButton color="primary" size="sm" className="me-2" onClick={handleAdd}>
                    <CIcon icon={cilUserPlus} className="me-1" />
                    Add User
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

              {/* Search Section */}
              <CRow className="mb-4">
                <CCol md={6}>
                  <div className="position-relative">
                    <CIcon icon={cilSearch} className="position-absolute" style={{ left: '12px', top: '10px', zIndex: 10 }} />
                    <CFormInput
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                  </div>
                </CCol>
              </CRow>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-5">
                  <CSpinner />
                  <p className="mt-3 text-muted">Loading users...</p>
                </div>
              )}

              {/* Users Grid */}
              {!loading && filteredUsers.length === 0 && (
                <div className="text-center py-5">
                  <CIcon icon={cilUser} size="3xl" className="text-muted mb-3" />
                  <p className="text-muted">No users found</p>
                  {searchTerm && (
                    <CButton color="secondary" variant="outline" onClick={() => setSearchTerm('')}>
                      Clear Search
                    </CButton>
                  )}
                </div>
              )}

              {!loading && filteredUsers.length > 0 && (
                <CRow>
                  {filteredUsers.map((user) => (
                    <CCol key={user._id || user.user_id || user.id} md={4} lg={3} className="mb-4">
                      <CCard className="h-100 shadow-sm hover-shadow transition-shadow">
                        {/* Cover Image */}
                        {user.cover && (
                          <div style={{ 
                            height: '120px', 
                            overflow: 'hidden',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}>
                            <img 
                              src={user.cover} 
                              alt="Cover" 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {/* Profile Header */}
                        <CCardHeader className={`text-white text-center py-4 ${!user.cover ? 'bg-primary' : ''}`} style={user.cover ? { background: 'transparent', marginTop: user.cover ? '-60px' : '0', position: 'relative', zIndex: 1 } : {}}>
                          <CAvatar 
                            color="light" 
                            textColor="dark" 
                            size="xl" 
                            className="mb-2"
                            style={{ fontSize: '2rem', border: '3px solid white' }}
                          >
                            {user.profile ? (
                              <img 
                                src={user.profile} 
                                alt="Profile" 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                  borderRadius: '50%'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              getInitials(user)
                            )}
                          </CAvatar>
                          <h6 className="mb-0 fw-bold" style={{ color: user.cover ? '#000' : '#fff' }}>
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : user.username || 'Unnamed User'}
                          </h6>
                          {user.email && (
                            <small className={`d-block mt-1 ${user.cover ? 'text-muted' : 'opacity-75'}`}>{user.email}</small>
                          )}
                        </CCardHeader>
                        <CCardBody>
                          {/* User Details */}
                          <div className="mb-3">
                            <small className="text-muted d-block">User ID</small>
                            <div className="fw-semibold small">{user.user_id || 'N/A'}</div>
                          </div>

                          <div className="mb-3">
                            <small className="text-muted d-block">Username</small>
                            <div className="fw-semibold">{user.username || 'N/A'}</div>
                          </div>

                          <div className="row g-2 mb-3">
                            <div className="col-6">
                              <small className="text-muted d-block">Status</small>
                              <CBadge color={getStatusColor(user.account_status)}>
                                {user.account_status || 'N/A'}
                              </CBadge>
                            </div>
                            <div className="col-6">
                              <small className="text-muted d-block">Role</small>
                              <CBadge color={getRoleColor(user.role)}>
                                {user.role || 'N/A'}
                              </CBadge>
                </div>
              </div>

                          {user.access_db && (
                            <div className="mb-3">
                              <small className="text-muted d-block">Access DB</small>
                              <div className="small">
                                {typeof user.access_db === 'string' 
                                  ? user.access_db.split(',').map((db, idx) => (
                                      <CBadge key={idx} color="info" className="me-1 mb-1">
                                        {db.trim()}
                                      </CBadge>
                                    ))
                                  : Array.isArray(user.access_db)
                                  ? user.access_db.map((db, idx) => (
                                      <CBadge key={idx} color="info" className="me-1 mb-1">
                                        {db}
                                      </CBadge>
                                    ))
                                  : 'N/A'}
                              </div>
                            </div>
                          )}

                          {user.export_limit && (
                            <div className="mb-3">
                              <small className="text-muted d-block">Export Limit</small>
                              <div className="fw-semibold small">{user.export_limit}</div>
                            </div>
                          )}


                          {user.created_at && (
                            <div className="mt-3 pt-2 border-top">
                              <div className="small text-muted">
                                <small>Created: {formatDate(user.created_at)}</small>
                              </div>
                            </div>
                          )}

                          {/* Edit Button */}
                          <div className="mt-3">
                            <CButton 
                              color="primary" 
                              size="sm" 
                              className="w-100"
                              onClick={() => handleEdit(user)}
                            >
                              <CIcon icon={cilUser} className="me-1" />
                              Edit User
                            </CButton>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>
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
    </>
  );
};

export default Addusers;
