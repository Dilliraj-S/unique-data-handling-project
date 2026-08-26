import React, { useEffect, useState, useCallback } from 'react';
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CAvatar,
  CBadge,
  CSpinner,
  CButton,
  CCardHeader
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilUser,
  cilEnvelopeClosed,
  cilPhone,
  cilBriefcase,
  cilCalendar,
  cilClock,
  cilSettings,
  cilCheckCircle
} from '@coreui/icons';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import DynamicModal from 'src/application/Components/DynamicModal';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadUser = useCallback(async () => {
    const userData = await AuthService.getCurrentUser();
    if (userData && userData.user) {
      setUser(userData.user);
      setProfileImageError(false); // Reset error state when user changes
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const fetchFormConfig = async () => {
    if (!user) return;
    try {
      const baseToken = 'central_users_addusers';
      const token = `${baseToken}_e`; // ShowEditCtrl
      const recordId = user.user_id || user._id || user.username;
      const url = recordId
        ? `/api/skeleton-action/${token}?id=${recordId}`
        : `/api/skeleton-action/${token}`;

      const authAxios = getAuthAxios();
      const response = await authAxios.get(url);
      if (response.data.status) {
        const config = response.data.data || response.data;
        if (!config || !config.fields || !Array.isArray(config.fields)) {
          alert('Invalid form configuration received from server');
          return;
        }
        setModalConfig(config);
        setShowModal(true);
      } else {
        alert(response.data.message || 'Failed to load form configuration');
      }
    } catch (err) {
      console.error('Error fetching form config:', err);
      alert(err.response?.data?.message || 'Failed to load form configuration');
    }
  };

  const handleSubmit = async (formData) => {
    if (!user) return;
    try {
      setSubmitting(true);
      const baseToken = 'central_users_addusers';
      const token = `${baseToken}_es`; // SaveEditCtrl
      const recordId = user.user_id || user._id || user.username;
      const payload = recordId ? { ...formData, id: recordId } : formData;
      const authAxios = getAuthAxios();
      const response = await authAxios.post(`/api/skeleton-action/${token}`, payload);
      if (response.data.status) {
        setShowModal(false);
        await loadUser(); // refresh profile
        alert(response.data.message || 'Profile updated successfully');
      } else {
        alert(response.data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error submitting profile update:', err);
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center pt-5">
        <CSpinner color="primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center pt-5">
        <h4>User not found. Please log in.</h4>
      </div>
    );
  }

  // --- Styles & Assets ---
  // Using inline styles for specific "Modern SaaS" tweaks not covered by standard utilities
  const styles = {
    coverImage: {
      height: '200px',
      background: user.cover ? `url(${user.cover}) center/cover no-repeat` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px 12px 0 0',
      position: 'relative',
      overflow: 'hidden'
    },
    profileContainer: {
      marginTop: '-60px',
      marginLeft: '30px',
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '20px',
      zIndex: 2,
      paddingBottom: '20px'
    },
    avatarWrapper: {
      flexShrink: 0,
      position: 'relative'
    },
    avatar: {
      width: '120px',
      height: '120px',
      minWidth: '120px',
      minHeight: '120px',
      border: '4px solid white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      backgroundColor: '#f3f4f6',
      borderRadius: '50%',
      objectFit: 'cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
      paddingTop: '60px',
      paddingBottom: '10px'
    },
    card: {
      border: 'none',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', // Soft diffuse shadow
      borderRadius: '12px',
      marginBottom: '24px'
    },
    infoCard: {
      border: '1px solid #f1f1f4',
      borderRadius: '12px',
      padding: '20px',
      height: '100%',
      transition: 'all 0.3s ease',
      cursor: 'default',
      backgroundColor: '#fff'
    },
    iconBox: {
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '15px'
    },
    timelineItem: {
      position: 'relative',
      paddingLeft: '30px',
      marginBottom: '25px',
      borderLeft: '2px solid #e9ecef'
    },
    timelineDot: {
      position: 'absolute',
      left: '-6px',
      top: '0',
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      backgroundColor: '#764ba2',
      border: '2px solid white',
      boxShadow: '0 0 0 2px #764ba2'
    }
  };

  // Mock Activity Data (since we don't have an activity log API yet)
  const recentActivity = [
    { text: "Logged in successfully", time: "Just now", color: "success" },
    { text: "Updated profile preferences", time: "2 hours ago", color: "info" },
    { text: "Downloaded 'Weekly Report.pdf'", time: "Yesterday, 4:30 PM", color: "primary" },
    { text: "Changed password", time: "3 days ago", color: "warning" }
  ];

  return (
    <div className="container-fluid p-0">
      
      {/* 1. Main Profile Card */}
      <CCard style={styles.card}>
        <div style={styles.coverImage}></div>
        <CCardBody className="pt-0 pb-4">
          <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ paddingTop: '20px' }}>
            
            {/* Profile Pic & Name */}
            <div style={styles.profileContainer}>
              <div style={styles.avatarWrapper}>
                {user.profile && !profileImageError ? (
                  <div style={styles.avatar}>
                    <img 
                      src={user.profile} 
                      alt="Profile" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        display: 'block'
                      }}
                      onError={() => setProfileImageError(true)}
                    />
                  </div>
                ) : (
                  <CAvatar 
                    className="rounded-circle" 
                    style={styles.avatar} 
                    color="primary"
                    textColor="white"
                  >
                   {(user.first_name ? user.first_name[0] : user.username[0]).toUpperCase()}
                  </CAvatar>
                )}
              </div>
              <div style={styles.userInfo}>
                <h2 className="fw-bold mb-2 text-dark" style={{ letterSpacing: '-0.5px', lineHeight: '1.2' }}>
                  {user.first_name} {user.last_name || ''}
                </h2>
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <span className="text-secondary fs-6">{user.role ? user.role.toUpperCase() : 'USER'}</span>
                  <CBadge color="success" shape="rounded-pill" className="px-3">
                    {user.account_status ? user.account_status.toUpperCase() : 'ACTIVE'}
                  </CBadge>
                  {user.role === 'admin' && (
                     <CBadge color="info" shape="rounded-pill" className="px-3">
                       ADMIN ROLE
                     </CBadge>
                  )}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div style={{ marginTop: '60px', marginRight: '20px' }}>
               <CButton
                 color="light"
                 className="fw-semibold text-secondary shadow-sm"
                 onClick={fetchFormConfig}
               >
                 <CIcon icon={cilSettings} className="me-2"/> Edit Profile
               </CButton>
            </div>
          </div>
        </CCardBody>
      </CCard>

      {/* 2. Info Grid */}
      <CRow className="g-4 mb-4">
        
        {/* Username */}
        <CCol md={3} sm={6}>
          <div style={styles.infoCard}>
             <div style={{...styles.iconBox, backgroundColor: '#e0e7ff', color: '#4f46e5'}}>
                <CIcon icon={cilUser} size="lg"/>
             </div>
             <p className="text-secondary small mb-1 fw-bold text-uppercase">Username</p>
             <h6 className="fw-bold text-dark mb-0">@{user.username}</h6>
          </div>
        </CCol>

        {/* Email */}
        <CCol md={3} sm={6}>
          <div style={styles.infoCard}>
             <div style={{...styles.iconBox, backgroundColor: '#dcfce7', color: '#16a34a'}}>
                <CIcon icon={cilEnvelopeClosed} size="lg"/>
             </div>
             <p className="text-secondary small mb-1 fw-bold text-uppercase">Email Address</p>
             <h6 className="fw-bold text-dark mb-0 text-truncate" title={user.email}>{user.email}</h6>
          </div>
        </CCol>

         {/* Phone (Fallback) */}
         <CCol md={3} sm={6}>
          <div style={styles.infoCard}>
             <div style={{...styles.iconBox, backgroundColor: '#ffedd5', color: '#ea580c'}}>
                <CIcon icon={cilPhone} size="lg"/>
             </div>
             <p className="text-secondary small mb-1 fw-bold text-uppercase">Phone</p>
             <h6 className="fw-bold text-dark mb-0">{user.phone || 'Not provided'}</h6>
          </div>
        </CCol>

        {/* Created At */}
        <CCol md={3} sm={6}>
          <div style={styles.infoCard}>
             <div style={{...styles.iconBox, backgroundColor: '#f3e8ff', color: '#9333ea'}}>
                <CIcon icon={cilCalendar} size="lg"/>
             </div>
             <p className="text-secondary small mb-1 fw-bold text-uppercase">Member Since</p>
             <h6 className="fw-bold text-dark mb-0">
               {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
             </h6>
          </div>
        </CCol>
      </CRow>

      <CRow>
         {/* 3. Recent Activity Section */}
         <CCol md={8}>
            <CCard style={styles.card}>
               <CCardHeader className="bg-white border-bottom-0 pt-4 px-4">
                 <h5 className="fw-bold m-0"><CIcon icon={cilClock} className="me-2 text-primary"/> Recent Activity</h5>
               </CCardHeader>
               <CCardBody className="p-4">
                 <div className="ps-2">
                    {recentActivity.map((activity, index) => (
                      <div key={index} style={styles.timelineItem}>
                        <div style={{...styles.timelineDot, backgroundColor: `var(--cui-${activity.color})`, borderColor: `var(--cui-${activity.color})`}}></div>
                         <div className="d-flex justify-content-between align-items-center bg-light p-3 rounded-3 mb-1">
                            <span className="fw-medium text-dark">{activity.text}</span>
                            <span className="small text-secondary">{activity.time}</span>
                         </div>
                      </div>
                    ))}
                 </div>
               </CCardBody>
            </CCard>
         </CCol>
         
         {/* 4. Account Status Sidebar */}
         <CCol md={4}>
            <CCard style={styles.card}>
              <CCardHeader className="bg-white border-bottom-0 pt-4 px-4">
                 <h5 className="fw-bold m-0">Account Summary</h5>
              </CCardHeader>
              <CCardBody className="p-4 pt-2">
                 <div className="d-flex justify-content-between py-3 border-bottom">
                    <span className="text-secondary">Role</span>
                    <span className="fw-bold text-dark">{user.role}</span>
                 </div>
                 <div className="d-flex justify-content-between py-3 border-bottom">
                    <span className="text-secondary">Status</span>
                    <span className="text-success fw-bold"><CIcon icon={cilCheckCircle} size="sm"/> Active</span>
                 </div>
                 <div className="d-flex justify-content-between py-3 border-bottom">
                    <span className="text-secondary">Last Login</span>
                    <span className="fw-bold text-dark">
                       {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Just now'}
                    </span>
                 </div>
              </CCardBody>
            </CCard>
         </CCol>
      </CRow>

      {showModal && modalConfig && (
        <DynamicModal
          show={showModal}
          onClose={() => setShowModal(false)}
          config={modalConfig}
          mode="edit"
          onSubmit={handleSubmit}
          data={user}
          submitting={submitting}
        />
      )}

    </div>
  );
};

export default Profile;
