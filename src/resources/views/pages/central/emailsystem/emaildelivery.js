import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormSwitch,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
  CAlert,
  CProgress,
  CProgressBar,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilEnvelopeOpen,
  cilArrowLeft,
  cilCheck,
  cilX,
  cilReload,
  cilMagnifyingGlass,
  cilPaperPlane,
  cilCalendar,
  cilPeople
} from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import ExportService from 'src/services/ExportService';
import axios from 'axios';
import moment from 'moment-timezone';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * Email Delivery Page - Preview and Send Campaigns
 * Based on BV project's email-scheduling.blade.php Preview and Send tab
 * 
 * Features:
 * - Campaign selection
 * - Email preview with template rendering
 * - Send immediately with time gap and assignment mode
 * - Schedule email with timezone support
 * - Campaign progress tracking
 * - Assignment configuration (batch size or manual)
 */
const Emaildelivery = () => {
  const navigate = useNavigate();

  // State management
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [subject, setSubject] = useState('');
  const [timeGap, setTimeGap] = useState(1);
  const [assignmentMode, setAssignmentMode] = useState('batch_size');
  const [batchSize, setBatchSize] = useState(2);
  const [manualAssignments, setManualAssignments] = useState({});
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('preview-send');
  
  // Campaign progress state
  const [campaignProgress, setCampaignProgress] = useState(null);
  const [currentCampaignId, setCurrentCampaignId] = useState(null);

  // Adaptive polling refs (refs avoid stale closures in recursive setTimeout)
  const pollingTimeoutRef = useRef(null);
  const progressRef = useRef(null);
  const pollCountRef = useRef(0);

  // Post-campaign automation state
  const [postCampaignStatus, setPostCampaignStatus] = useState(null);
  const postCampaignPollingRef = useRef(null);

  // Tracking subscribers modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingType, setTrackingType] = useState('opened'); // 'opened' or 'unopened'
  const [trackingSubscribers, setTrackingSubscribers] = useState([]);
  const [trackingTotal, setTrackingTotal] = useState(0);
  const [trackingPage, setTrackingPage] = useState(1);
  const [trackingTotalPages, setTrackingTotalPages] = useState(1);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Get authenticated axios instance
  const getAuthAxios = useCallback(() => {
    const token = AuthService.getToken();
    return axios.create({
      baseURL: '/api',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  }, []);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/campaigns');
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setMessage({ type: 'danger', text: 'Failed to load campaigns' });
    }
  }, [getAuthAxios]);

  // Fetch email accounts by region
  const fetchEmailAccounts = useCallback(async () => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/email-accounts');
      if (response.data && response.data.regions) {
        setRegions(response.data.regions);
        setEmailAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Failed to fetch email accounts:', error);
    }
  }, [getAuthAxios]);

  // Fetch campaign details for preview
  const fetchCampaignDetails = useCallback(async (campaignId) => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/campaigns/${campaignId}`);
      setCampaignDetails(response.data);
      
      // Auto-populate subject from template
      if (response.data.template_content) {
        // Extract subject from template or use campaign name
        setSubject(response.data.template_title || response.data.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      setMessage({ type: 'danger', text: 'Failed to load campaign details' });
    } finally {
      setLoading(false);
    }
  }, [getAuthAxios]);

  // Stop progress polling
  const stopProgressPolling = useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollCountRef.current = 0;
    setCurrentCampaignId(null);
    setCampaignProgress(null);
    progressRef.current = null;
  }, []);

  // Fetch campaign progress (robust to token expiry)
  // Supports "light" mode which skips heavy per-account aggregation on the backend.
  const fetchCampaignProgress = useCallback(
    async (campaignId, options = {}) => {
      const { light = false } = options;
      if (!campaignId) return;

      try {
        const authAxios = getAuthAxios();
        const response = await authAxios.get(`/campaigns/${campaignId}/progress`, {
          params: light ? { light: 'true' } : {}
        });
        
        // Debug: Log batch_size to identify the issue
        console.log('🔍 Campaign Progress Debug:', {
          campaignId: campaignId,
          batch_size_from_api: response.data.batch_size,
          batch_size_type: typeof response.data.batch_size,
          per_account_stats: response.data.per_account_stats?.map(acc => ({
            email: acc.from_email,
            total: acc.total,
            expected: response.data.batch_size ? Number(response.data.batch_size) : null
          }))
        });
        
        setCampaignProgress(response.data);
      } catch (error) {
        console.error('Failed to fetch campaign progress:', error);

        const status = error?.response?.status;
        if (status === 401) {
          console.error('Auth error in campaign progress (possible token expiry). Attempting refresh...');
          try {
            const refreshed = await AuthService.refreshToken();

            if (refreshed) {
              const retryAxios = getAuthAxios();
              try {
                const retryRes = await retryAxios.get(`/campaigns/${campaignId}/progress`, {
                  params: { light: 'true' }
                });
                setCampaignProgress(retryRes.data);
                return;
              } catch (retryError) {
                console.error('Retry after token refresh failed for campaign progress:', retryError);
                setMessage({
                  type: 'danger',
                  text: 'Unable to refresh session while loading campaign progress. Please reload the page and sign in again.'
                });
                stopProgressPolling();
                return;
              }
            } else {
              setMessage({
                type: 'danger',
                text: 'Your session has expired. Please sign in again to continue tracking this campaign.'
              });
              stopProgressPolling();
              return;
            }
          } catch (refreshError) {
            console.error('Error while refreshing token for campaign progress:', refreshError);
            setMessage({
              type: 'danger',
              text: 'Your session has expired. Please sign in again to continue tracking this campaign.'
            });
            stopProgressPolling();
            return;
          }
        }
      }
    },
    [getAuthAxios, stopProgressPolling]
  );

  // Keep progressRef in sync with state (for adaptive interval decisions)
  useEffect(() => {
    progressRef.current = campaignProgress;
  }, [campaignProgress]);

  // Get adaptive polling interval based on current campaign state
  //   Active sending → 2s (near-real-time feel)
  //   Idle/Scheduled  → 10s (reduce DB load)
  //   Completed       → stop (post-campaign polling handles the rest)
  const getAdaptiveInterval = useCallback(() => {
    const progress = progressRef.current;
    if (!progress) return 3000; // 3s default for first few polls before data arrives

    const isActiveSending = (progress.sending || 0) > 0 || (progress.pending || 0) > 0;
    if (isActiveSending) return 2000;  // ⚡ 2s — fast during active send
    return 10000;                       // 💤 10s — idle/pre-send
  }, []);

  // Start progress polling with adaptive intervals
  const startProgressPolling = useCallback((campaignId) => {
    // Clear existing timer
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollCountRef.current = 0;

    setCurrentCampaignId(campaignId);

    // Initial full fetch (includes per-account stats / failed details)
    fetchCampaignProgress(campaignId, { light: false });

    // Recursive setTimeout — interval adapts each tick based on campaign state
    const scheduleNextPoll = () => {
      const progress = progressRef.current;
      const isCompleted = progress?.status === 'Completed' || progress?.status === 'Completed (With Errors)';

      // Stop polling once campaign completes (post-campaign polling takes over)
      if (isCompleted) {
        console.log('🏁 Campaign completed — stopping adaptive polling');
        pollingTimeoutRef.current = null;
        return;
      }

      const interval = getAdaptiveInterval();

      pollingTimeoutRef.current = setTimeout(async () => {
        pollCountRef.current++;
        // Full fetch every 10th poll for per-account stats + failed details
        const isFullFetch = pollCountRef.current % 10 === 0;
        await fetchCampaignProgress(campaignId, { light: !isFullFetch });
        scheduleNextPoll(); // Schedule next tick with potentially different interval
      }, interval);
    };

    scheduleNextPoll();
  }, [fetchCampaignProgress, getAdaptiveInterval]);

  // Handle campaign selection
  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaign(campaignId);
    fetchCampaignDetails(campaignId);
    if (campaignId) {
      startProgressPolling(campaignId);
    } else {
      stopProgressPolling();
    }
  };

  // Calculate total subscribers
  const getTotalSubscribers = () => {
    if (!campaignDetails) return 0;
    // Use subscriber_count if available (optimized response), otherwise count subscribers array
    if (campaignDetails.subscriber_count !== undefined) {
      return campaignDetails.subscriber_count;
    }
    return (campaignDetails.subscribers || []).filter(s => s.status === 'subscribed').length;
  };

  // Calculate assigned subscribers
  const getAssignedSubscribers = () => {
    if (assignmentMode === 'batch_size') {
      return batchSize * selectedEmails.length;
    } else {
      return Object.values(manualAssignments).reduce((sum, count) => sum + (Number(count) || 0), 0);
    }
  };

  // Update assignment warning
  const updateAssignmentWarning = () => {
    const total = getTotalSubscribers();
    const assigned = getAssignedSubscribers();
    return Math.max(0, total - assigned);
  };

  // Handle send immediately
  const handleSendImmediately = async (e) => {
    e.preventDefault();
    
    if (!selectedCampaign) {
      setMessage({ type: 'danger', text: 'Please select a campaign' });
      return;
    }
    
    if (!subject || !subject.trim()) {
      setMessage({ type: 'danger', text: 'Subject is required' });
      return;
    }
    
    if (selectedEmails.length === 0) {
      setMessage({ type: 'danger', text: 'Please select at least one email account' });
      return;
    }
    
    if (timeGap < 0) {
      setMessage({ type: 'danger', text: 'Time gap must be non-negative' });
      return;
    }

    try {
      setSending(true);
      setMessage(null);
      
      // Debug: Log batch_size being sent
      console.log('🔍 Sending Campaign with batch_size:', {
        batchSize: batchSize,
        batchSizeType: typeof batchSize,
        assignmentMode: assignmentMode
      });
      
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/send-email', {
        campaign_id: selectedCampaign,
        from_emails: selectedEmails,
        subject: subject.trim(),
        time_gap: timeGap,
        assignment_mode: assignmentMode,
        batch_size: batchSize,
        manual_assignments: manualAssignments
      });
      
      // Debug: Log batch_size from send-email API response
      console.log('🔍 Send Email API Response Debug:', {
        campaign_id: response.data.campaign_id,
        batch_size_from_api: response.data.batch_size,
        batch_size_type: typeof response.data.batch_size,
        account_capacity: response.data.account_capacity
      });

      // Show detailed success message with capacity info
      const assignedSubscribers = response.data.assigned_subscribers || response.data.subscribers_to_dispatch || 0;
      const subscribersSentToday = response.data.subscribers_sent_today || response.data.subscribers_to_dispatch || 0;
      
      let successMessage = `Campaign started! ${assignedSubscribers} subscribers assigned.`;
      
      // Show warning if accounts can't send full batch_size
      if (response.data.warning_message) {
        successMessage += `\n\n⚠️ ${response.data.warning_message}`;
      }
      
      if (response.data.sending_strategy === 'limited' || response.data.dispatch_mode === 'high-performance') {
        successMessage += `\n\n📊 Capacity Info:\n`;
        successMessage += `- Subscribers sent today: ${subscribersSentToday}\n`;
        successMessage += `- Remaining subscribers: ${response.data.remaining_subscribers || 0}\n`;
        successMessage += `- Estimated days to complete: ${response.data.estimated_days || 'N/A'}\n`;
        successMessage += `- Total available capacity today: ${response.data.total_available_capacity || 'N/A'}`;
        
        if (response.data.account_capacity && response.data.account_capacity.length > 0) {
          successMessage += `\n\n📧 Account Capacity:\n`;
          response.data.account_capacity.forEach(acc => {
            const batchInfo = acc.expected_total ? ` (Expected: ${acc.expected_total}, Actual: ${acc.available})` : '';
            const warning = acc.can_send_full_batch === false ? ' ⚠️ Will send less!' : '';
            successMessage += `- ${acc.email}: ${acc.available}/${acc.daily_limit} available (${acc.sent_today} sent today)${batchInfo}${warning}\n`;
          });
        }
      }
      
      setMessage({ 
        type: response.data.warning_message ? 'warning' : 'success', 
        text: successMessage
      });
      
      // Start progress polling
      if (response.data.progress_id) {
        startProgressPolling(selectedCampaign);
      }
      
      // Reset form
      setSelectedEmails([]);
      setSubject('');
      setTimeGap(1);
      
    } catch (error) {
      console.error('Failed to send campaign:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);

      // Handle authentication errors explicitly
      if (error.response?.status === 401) {
        setMessage({
          type: 'danger',
          text: 'Your session has expired. Please log in again and then try sending the campaign.'
        });
      } else if (error.response?.status === 400) {
        // Show detailed error message for 400 errors
        const errorMessage = error.response?.data?.message || 'Failed to start campaign';
        const debugInfo = error.response?.data?.debug;
        let fullMessage = errorMessage;
        
        if (debugInfo) {
          console.error('Debug info from server:', debugInfo);
          if (debugInfo.found_accounts && debugInfo.found_accounts.length > 0) {
            fullMessage += `\n\nFound accounts: ${JSON.stringify(debugInfo.found_accounts, null, 2)}`;
          }
        }
        
        setMessage({ 
          type: 'danger', 
          text: fullMessage
        });
      } else {
        setMessage({ 
          type: 'danger', 
          text: error.response?.data?.message || 'Failed to start campaign' 
        });
      }
    } finally {
      setSending(false);
    }
  };

  // Handle schedule email
  const handleScheduleEmail = async (e) => {
    e.preventDefault();
    
    if (!selectedCampaign) {
      setMessage({ type: 'danger', text: 'Please select a campaign' });
      return;
    }
    
    if (!subject || !subject.trim()) {
      setMessage({ type: 'danger', text: 'Subject is required' });
      return;
    }
    
    if (!scheduleTime) {
      setMessage({ type: 'danger', text: 'Schedule time is required' });
      return;
    }
    
    if (!scheduleTimezone) {
      setMessage({ type: 'danger', text: 'Timezone is required' });
      return;
    }
    
    if (selectedEmails.length === 0) {
      setMessage({ type: 'danger', text: 'Please select at least one email account' });
      return;
    }

    // Validate scheduled time is in the future
    const scheduled = moment.tz(scheduleTime, scheduleTimezone);
    if (scheduled.isBefore(moment())) {
      setMessage({ type: 'danger', text: 'Scheduled time must be in the future' });
      return;
    }

    try {
      setScheduling(true);
      setMessage(null);
      
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/schedule-email', {
        campaign_id: selectedCampaign,
        from_emails: selectedEmails,
        subject: subject.trim(),
        scheduled_at: scheduled.toISOString(),
        timezone: scheduleTimezone,
        time_gap: timeGap,
        assignment_mode: assignmentMode,
        batch_size: batchSize,
        manual_assignments: manualAssignments
      });

      setMessage({ 
        type: 'success', 
        text: `Campaign scheduled successfully for ${scheduled.format('YYYY-MM-DD HH:mm:ss')}` 
      });
      
      // Start progress polling
      if (response.data.progress_id) {
        startProgressPolling(selectedCampaign);
      }
      
      // Close modal and reset
      setShowScheduleModal(false);
      setScheduleTime('');
      setScheduleTimezone('');
      
    } catch (error) {
      console.error('Failed to schedule campaign:', error);

      // Handle authentication errors explicitly
      if (error.response?.status === 401) {
        setMessage({
          type: 'danger',
          text: 'Your session has expired. Please log in again and then schedule the campaign.'
        });
      } else {
        setMessage({ 
          type: 'danger', 
          text: error.response?.data?.message || 'Failed to schedule campaign' 
        });
      }
    } finally {
      setScheduling(false);
    }
  };

  // Handle preview
  const handlePreview = () => {
    if (!selectedCampaign) {
      setMessage({ type: 'danger', text: 'Please select a campaign first' });
      return;
    }
    setShowPreviewModal(true);
  };

  // Load timezones
  const timezones = moment.tz.names();

  // Fetch tracking subscribers (on-demand when user clicks Opened/Unopened card)
  const fetchTrackingSubscribers = useCallback(async (type, page = 1) => {
    const campId = currentCampaignId || selectedCampaign;
    if (!campId) return;

    setTrackingLoading(true);
    setTrackingType(type);
    setTrackingPage(page);
    setShowTrackingModal(true);

    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/campaigns/${campId}/tracking-subscribers`, {
        params: { type, page, limit: 50 }
      });
      setTrackingSubscribers(response.data.subscribers || []);
      setTrackingTotal(response.data.total || 0);
      setTrackingTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tracking subscribers:', error);
      setTrackingSubscribers([]);
      setTrackingTotal(0);
    } finally {
      setTrackingLoading(false);
    }
  }, [currentCampaignId, selectedCampaign, getAuthAxios]);

  // ─── Post-Campaign Automation Polling ───
  const fetchPostCampaignStatus = useCallback(async (campId) => {
    if (!campId) return;
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/campaigns/${campId}/post-campaign-status`);
      if (response.data.status && response.data.hasJobs) {
        setPostCampaignStatus(response.data);
        // Stop polling if all jobs are done
        if (response.data.postCampaignStatus === 'completed' || response.data.postCampaignStatus === 'partial') {
          if (postCampaignPollingRef.current) {
            clearInterval(postCampaignPollingRef.current);
            postCampaignPollingRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch post-campaign status:', error);
    }
  }, [getAuthAxios]);

  // Start post-campaign polling when campaign completes
  useEffect(() => {
    const campId = currentCampaignId || selectedCampaign;
    if (campaignProgress?.completed_at && campId) {
      // Initial fetch
      fetchPostCampaignStatus(campId);
      // Poll every 5 seconds
      if (!postCampaignPollingRef.current) {
        postCampaignPollingRef.current = setInterval(() => {
          fetchPostCampaignStatus(campId);
        }, 5000);
      }
    }
    return () => {
      if (postCampaignPollingRef.current) {
        clearInterval(postCampaignPollingRef.current);
        postCampaignPollingRef.current = null;
      }
    };
  }, [campaignProgress?.completed_at, currentCampaignId, selectedCampaign, fetchPostCampaignStatus]);

  // Initialize
  useEffect(() => {
    fetchCampaigns();
    fetchEmailAccounts();
    
    return () => {
      stopProgressPolling();
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      if (postCampaignPollingRef.current) {
        clearInterval(postCampaignPollingRef.current);
        postCampaignPollingRef.current = null;
      }
    };
  }, [fetchCampaigns, fetchEmailAccounts, stopProgressPolling]);

  // Calculate progress percentage (ensure it's a number between 0-100)
  // Use cumulative_sent for multi-day campaigns (includes previous dispatch sends)
  // For single-dispatch campaigns, cumulative_sent === sent → no change
  const effectiveSent = campaignProgress?.cumulative_sent || campaignProgress?.sent || 0;
  const progressPercentage = campaignProgress && campaignProgress.total > 0
    ? Math.min(100, Math.max(0, Math.round((effectiveSent / campaignProgress.total) * 100)))
    : 0;

  const formatDateTime = useCallback((value) => {
    if (!value) return '—';
    return moment(value).format('YYYY-MM-DD HH:mm:ss');
  }, []);

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between"  style={{ background: '#5856D6', color: '#fff', borderBottom: '2px solid #e0e7ef' }}>
              <div className="d-flex align-items-center ">
                <CIcon icon={cilEnvelopeOpen} className="me-2" />
                <h5 className="mb-0">Email Campaign Delivery</h5>
              </div>
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
              >
                <CIcon icon={cilArrowLeft} className="me-2" />
                Back
              </CButton>
            </CCardHeader>
            <CCardBody>
      

              <CTabContent>
                <CTabPane visible={activeTab === 'preview-send'}>
                  {/* Message Alert */}
                  {message && (
                    <CAlert
                      color={message.type === 'success' ? 'success' : 'danger'}
                      dismissible
                      onClose={() => setMessage(null)}
                      className="mb-3"
                    >
                      {message.text}
                    </CAlert>
                  )}

                  {/* Send Form */}
                  <CForm onSubmit={handleSendImmediately}>
                    <CRow className="mb-3">
                      <CCol md={6}>
                        <CFormLabel className="fw-semibold">Select Campaign <span className="text-danger">*</span></CFormLabel>
                        <CFormSelect
                          value={selectedCampaign || ''}
                          onChange={(e) => handleCampaignSelect(e.target.value)}
                          required
                        >
                          <option value="">-- Select Campaign --</option>
                          {campaigns.map(campaign => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </option>
                          ))}
                        </CFormSelect>
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel className="fw-semibold">Subject <span className="text-danger">*</span></CFormLabel>
                        <CFormInput
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Email subject"
                          maxLength={255}
                          required
                          readOnly={!!selectedCampaign && !!campaignDetails}
                        />
                      </CCol>
                    </CRow>

                    <CRow className="mb-3">
                      <CCol md={6}>
                        <CFormLabel className="fw-semibold">Time Gap Between Emails (seconds)</CFormLabel>
                        <CFormInput
                          type="number"
                          value={timeGap}
                          onChange={(e) => setTimeGap(Number(e.target.value))}
                          min="0"
                          required
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel className="fw-semibold">Assignment Mode</CFormLabel>
                        <div className="d-flex align-items-center gap-2">
                          <CFormSelect
                            value={assignmentMode}
                            onChange={(e) => setAssignmentMode(e.target.value)}
                            style={{ flex: 1 }}
                          >
                            <option value="batch_size">Batch Size</option>
                            <option value="manual_assign">Manual Assign</option>
                          </CFormSelect>
                          <CButton
                            type="button"
                            color="primary"
                            variant="outline"
                            onClick={() => setShowAssignmentModal(true)}
                          >
                            Configure Assignment
                          </CButton>
                        </div>
                      </CCol>
                    </CRow>
                
                    {/* Assignment Display */}
                    {assignmentMode === 'batch_size' && (
                      <CAlert color="info" className="mb-3">
                        <strong>Batch Size Mode:</strong> {batchSize} emails per account<br />
                        <strong>Total Accounts:</strong> {selectedEmails.length}<br />
                        <strong>Total Assigned:</strong> {getAssignedSubscribers()} subscribers
                      </CAlert>
                    )}

                    {assignmentMode === 'manual_assign' && Object.keys(manualAssignments).length > 0 && (
                      <CAlert color="info" className="mb-3">
                        <strong>Manual Assignment Mode:</strong><br />
                        {Object.entries(manualAssignments).map(([email, count]) => (
                          <div key={email}>
                            <strong>{email}:</strong> {count} subscribers
                          </div>
                        ))}
                        <div className="mt-2">
                          <strong>Total Assigned:</strong> {getAssignedSubscribers()} subscribers
                        </div>
                      </CAlert>
                    )}

                    {/* Assignment Warning */}
                    {updateAssignmentWarning() > 0 && (
                      <CAlert color="warning" className="mb-3">
                        <strong>Warning:</strong> {updateAssignmentWarning()} subscribers are unassigned.
                      </CAlert>
                    )}

                    {/* Total Subscribers Info */}
                    {selectedCampaign && campaignDetails && (
                      <CAlert color="info" className="mb-3">
                        <strong>Total Subscribers:</strong> {getTotalSubscribers()}
                        {selectedEmails.length > 0 && (
                          <>
                            <br />
                            <strong>Selected Accounts:</strong> {selectedEmails.length}
                            <br />
                            <small className="text-muted">
                              Note: System will respect daily send limits per account. 
                              If subscribers exceed daily capacity, remaining will be queued for next day.
                            </small>
                          </>
                        )}
                      </CAlert>
                    )}

                    {/* From Email Selection */}
                    <div className="mb-3">
                      <CFormLabel className="fw-semibold">From Email (by Region) <span className="text-danger">*</span></CFormLabel>
                      <CFormSelect
                        multiple
                        value={selectedEmails}
                        onChange={(e) => {
                          const values = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedEmails(values);
                        }}
                        size="5"
                        required
                      >
                        {regions.map(region => (
                          <optgroup key={region.name} label={`${region.name} (${region.emails.length} accounts)`}>
                            {region.emails.map(email => (
                              <option key={email} value={email}>
                                {email}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </CFormSelect>
                      <small className="text-muted">Hold Ctrl/Cmd to select multiple emails</small>
                    </div>
                
                {/* Action Buttons */}
                    <div className="d-flex gap-2">
                  <CButton 
                        type="button"
                        color="info"
                        onClick={handlePreview}
                        disabled={!selectedCampaign}
                  >
                        <CIcon icon={cilMagnifyingGlass} className="me-2" />
                        Preview
                  </CButton>
                  <CButton 
                        type="submit"
                    color="primary"
                        disabled={sending || !selectedCampaign}
                      >
                        {sending && <CSpinner size="sm" className="me-2" />}
                        <CIcon icon={cilPaperPlane} className="me-2" />
                        Send Now
                      </CButton>
                      <CButton
                        type="button"
                        color="secondary"
                        onClick={() => setShowScheduleModal(true)}
                        disabled={!selectedCampaign}
                  >
                        <CIcon icon={cilCalendar} className="me-2" />
                        Schedule
                  </CButton>
                </div>
                  </CForm>

                  {/* Campaign Progress */}
                  {campaignProgress && campaignProgress.total > 0 && (
                    <div className="mt-4 p-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      {/* Resume Mode Banner */}
                      {campaignProgress.is_resume && campaignProgress.already_sent_previously > 0 && (
                        <CAlert color="info" className="mb-3" style={{ borderRadius: '10px' }}>
                          <strong>📢 Resume Mode:</strong> {campaignProgress.already_sent_previously.toLocaleString()} emails already sent in previous dispatches. 
                          This dispatch covers the remaining subscribers.
                          {campaignProgress.cumulative_sent > 0 && (
                            <span className="ms-2">
                              <strong>Overall Progress:</strong> {campaignProgress.cumulative_sent.toLocaleString()} / {campaignProgress.total.toLocaleString()} ({progressPercentage}%)
                            </span>
                          )}
                        </CAlert>
                      )}
                      {/* Header Row with Circular Progress */}
                      <div className="d-flex align-items-center gap-4 mb-4">
                        {/* Circular Progress */}
                        <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                          <CircularProgressbar
                            value={progressPercentage}
                            text={`${progressPercentage}%`}
                            styles={buildStyles({
                              textSize: '22px',
                              pathColor: progressPercentage === 100 ? '#22c55e' : '#5856D6',
                              textColor: '#1f2937',
                              trailColor: '#e5e7eb',
                              pathTransitionDuration: 0.5,
                            })}
                          />
                        </div>
                        
                        {/* Progress Info */}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <h5 className="mb-0 fw-bold">Campaign Progress</h5>
                            {campaignProgress.completed_at && (
                              <CBadge color="success" className="px-3 py-2">
                                <CIcon icon={cilCheck} className="me-1" />
                                Completed
                              </CBadge>
                            )}
                          </div>
                          <div className="text-muted mb-2" style={{ fontSize: '15px' }}>
                            <strong>{campaignProgress.sent || 0}</strong> / {campaignProgress.total} emails sent
                          </div>
                          {campaignProgress.pending > 0 && !campaignProgress.completed_at && (
                            <small className="text-muted">
                              ⏱️ ETA: ~{Math.max(1, Math.ceil(campaignProgress.pending / 25))} minute{Math.ceil(campaignProgress.pending / 25) > 1 ? 's' : ''} remaining
                            </small>
                          )}
                          {campaignProgress.completed_at && (
                            <small className="text-muted">
                              Completed: {formatDateTime(campaignProgress.completed_at)}
                            </small>
                          )}
                        </div>
                      </div>
                      
                      {/* Stats Cards */}
                      <CRow className="g-3">
                        <CCol xs={6} md>
                          <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div className="h4 mb-0 fw-bold" style={{ color: '#6366f1' }}>{campaignProgress.total || 0}</div>
                            <small className="text-muted fw-medium">Total</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div className="h4 mb-0 fw-bold text-success">{campaignProgress.sent || 0}</div>
                            <small className="text-muted fw-medium">Sent</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div
                            className="text-center p-3"
                            style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #dcfce7', cursor: 'pointer', transition: 'transform 0.15s' }}
                            onClick={() => fetchTrackingSubscribers('opened', 1)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Click to view opened emails"
                          >
                            <div className="h4 mb-0 fw-bold" style={{ color: '#16a34a' }}>{campaignProgress.opened || 0}</div>
                            <small className="text-muted fw-medium">Opened</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div
                            className="text-center p-3"
                            style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #fef3c7', cursor: 'pointer', transition: 'transform 0.15s' }}
                            onClick={() => fetchTrackingSubscribers('unopened', 1)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Click to view unopened emails"
                          >
                            <div className="h4 mb-0 fw-bold" style={{ color: '#d97706' }}>{campaignProgress.unopened || 0}</div>
                            <small className="text-muted fw-medium">Unopened</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div className="h4 mb-0 fw-bold text-danger">{campaignProgress.failed || 0}</div>
                            <small className="text-muted fw-medium">Failed</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div className="h4 mb-0 fw-bold text-warning">{campaignProgress.pending || 0}</div>
                            <small className="text-muted fw-medium">Pending</small>
                          </div>
                        </CCol>
                        <CCol xs={6} md>
                          <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <div className="h4 mb-0 fw-bold text-info">{campaignProgress.sending || 0}</div>
                            <small className="text-muted fw-medium">Sending</small>
                          </div>
                        </CCol>
                      </CRow>

                      {/* Failed Emails Table */}
                      {campaignProgress.failed_details && campaignProgress.failed_details.length > 0 && (
                        <div className="mt-4">
                          <h5>Failed Emails</h5>
                          <CTable striped hover>
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>Email</CTableHeaderCell>
                                <CTableHeaderCell>Error Message</CTableHeaderCell>
                                <CTableHeaderCell>Retry Attempts</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {campaignProgress.failed_details.map((detail, index) => (
                                <CTableRow key={index}>
                                  <CTableDataCell>{detail.to_email || 'N/A'}</CTableDataCell>
                                  <CTableDataCell>{detail.error_message || 'N/A'}</CTableDataCell>
                                  <CTableDataCell>{detail.retry_attempts || 0}</CTableDataCell>
                                </CTableRow>
                              ))}
                            </CTableBody>
                          </CTable>
                        </div>
                      )}
                      
                      {campaignProgress?.per_account_stats?.length > 0 && (
                        <div className="mt-4">
                          <h5>Per Account Send Status</h5>
                          {campaignProgress.batch_size && (
                            <CAlert color="info" className="mb-3">
                              <strong>Batch Size:</strong> {campaignProgress.batch_size} per account (expected). 
                              Actual totals may differ if accounts have insufficient daily capacity.
                            </CAlert>
                          )}
                          <CTable striped responsive>
                            <CTableHead>
                              <CTableRow>
                                <CTableHeaderCell>Account</CTableHeaderCell>
                                <CTableHeaderCell>Expected</CTableHeaderCell>
                                <CTableHeaderCell>Total</CTableHeaderCell>
                                <CTableHeaderCell>Sent</CTableHeaderCell>
                                <CTableHeaderCell>Sent Today</CTableHeaderCell>
                                <CTableHeaderCell>Sending</CTableHeaderCell>
                                <CTableHeaderCell>Pending</CTableHeaderCell>
                                <CTableHeaderCell>Failed</CTableHeaderCell>
                                <CTableHeaderCell>Last Sent</CTableHeaderCell>
                                <CTableHeaderCell>Last Error</CTableHeaderCell>
                              </CTableRow>
                            </CTableHead>
                            <CTableBody>
                              {campaignProgress.per_account_stats.map((account) => {
                                // CRITICAL FIX: Expected is always batch_size (if set)
                                const expectedTotal = campaignProgress.batch_size ? Number(campaignProgress.batch_size) : account.total;
                                
                                // CRITICAL FIX: Cap Total at batch_size to prevent showing values > batch_size
                                // This ensures Total never exceeds Expected when batch_size is set
                                // The backend should already filter by progress_id, but this is a safeguard
                                const displayTotal = campaignProgress.batch_size 
                                  ? Math.min(account.total, expectedTotal) 
                                  : account.total;
                                
                                // Remove "less than expected" warnings as per user requirement
                                // Total should match Expected when batch_size is correctly enforced
                                return (
                                  <CTableRow key={account.from_email}>
                                    <CTableDataCell>{account.from_email}</CTableDataCell>
                                    <CTableDataCell>
                                      {campaignProgress.batch_size ? (
                                        <span>
                                          {expectedTotal}
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <span>
                                        {displayTotal}
                                      </span>
                                    </CTableDataCell>
                                    <CTableDataCell className="text-success">{account.sent}</CTableDataCell>
                                    <CTableDataCell>{account.daily_sent}</CTableDataCell>
                                    <CTableDataCell className="text-info">{account.sending}</CTableDataCell>
                                    <CTableDataCell className="text-warning">{account.pending}</CTableDataCell>
                                    <CTableDataCell className="text-danger">{account.failed}</CTableDataCell>
                                    <CTableDataCell>{formatDateTime(account.last_sent_at)}</CTableDataCell>
                                    <CTableDataCell>
                                      {account.last_error ? (
                                        <span className="text-danger" title={account.last_error}>
                                          {account.last_error.length > 50 
                                            ? account.last_error.substring(0, 50) + '...' 
                                            : account.last_error}
                                        </span>
                                      ) : (
                                        '—'
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                );
                              })}
                            </CTableBody>
                          </CTable>
                        </div>
                      )}

                      {/* ─── Post-Campaign Automation Updates ─── */}
                      {campaignProgress?.completed_at && postCampaignStatus && postCampaignStatus.hasJobs && (
                        <div className="mt-4">
                          <div className="p-3" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <span style={{ fontSize: '1.3rem' }}>🤖</span>
                                <h6 className="mb-0 fw-bold">Automated Post-Campaign Updates</h6>
                              </div>
                              <CBadge 
                                color={postCampaignStatus.postCampaignStatus === 'completed' ? 'success' : postCampaignStatus.postCampaignStatus === 'partial' ? 'warning' : 'info'}
                                className="px-3 py-2"
                              >
                                {postCampaignStatus.postCampaignStatus === 'completed' ? '✅ All Done' : 
                                 postCampaignStatus.postCampaignStatus === 'partial' ? '⚠️ Partial' : '🔄 In Progress'}
                              </CBadge>
                            </div>

                            {/* Summary Stats */}
                            <CRow className="g-2 mb-3">
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold" style={{ color: '#22c55e' }}>{postCampaignStatus.completedJobs || 0}</div>
                                  <small className="text-muted">Completed</small>
                                </div>
                              </CCol>
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold" style={{ color: '#3b82f6' }}>{postCampaignStatus.activeJobs || 0}</div>
                                  <small className="text-muted">Active</small>
                                </div>
                              </CCol>
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold" style={{ color: '#f59e0b' }}>{postCampaignStatus.delayedJobs || 0}</div>
                                  <small className="text-muted">Scheduled</small>
                                </div>
                              </CCol>
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold" style={{ color: '#6366f1' }}>{postCampaignStatus.waitingJobs || 0}</div>
                                  <small className="text-muted">Waiting</small>
                                </div>
                              </CCol>
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold" style={{ color: '#ef4444' }}>{postCampaignStatus.failedJobs || 0}</div>
                                  <small className="text-muted">Failed</small>
                                </div>
                              </CCol>
                              <CCol xs={4} md={2}>
                                <div className="text-center p-2" style={{ background: 'white', borderRadius: '8px' }}>
                                  <div className="fw-bold">{postCampaignStatus.totalJobs || 0}</div>
                                  <small className="text-muted">Total</small>
                                </div>
                              </CCol>
                            </CRow>

                            {/* Individual Job Details */}
                            <CTable small striped responsive className="mb-0" style={{ fontSize: '0.85rem' }}>
                              <CTableHead>
                                <CTableRow>
                                  <CTableHeaderCell>Type</CTableHeaderCell>
                                  <CTableHeaderCell>Target</CTableHeaderCell>
                                  <CTableHeaderCell>Schedule</CTableHeaderCell>
                                  <CTableHeaderCell>State</CTableHeaderCell>
                                  <CTableHeaderCell>Progress</CTableHeaderCell>
                                  <CTableHeaderCell>Result</CTableHeaderCell>
                                </CTableRow>
                              </CTableHead>
                              <CTableBody>
                                {postCampaignStatus.jobs?.map((job, idx) => (
                                  <CTableRow key={idx}>
                                    <CTableDataCell>
                                      <CBadge color={job.type === 'sent-status' ? 'primary' : 'danger'} shape="rounded-pill">
                                        {job.type === 'sent-status' ? '📧 Sent Status' : '🔴 Bounce + Open'}
                                      </CBadge>
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <code>{job.database}.{job.collection}</code>
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {job.delayLabel ? (
                                        <CBadge color="warning" shape="rounded-pill">⏱️ {job.delayLabel}</CBadge>
                                      ) : (
                                        <CBadge color="success" shape="rounded-pill">Immediate</CBadge>
                                      )}
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      <CBadge color={
                                        job.state === 'completed' ? 'success' : 
                                        job.state === 'active' ? 'primary' : 
                                        job.state === 'delayed' ? 'warning' :
                                        job.state === 'waiting' ? 'info' :
                                        job.state === 'failed' ? 'danger' : 'secondary'
                                      }>
                                        {job.state === 'completed' ? '✅' : job.state === 'active' ? '🔄' : job.state === 'delayed' ? '⏳' : job.state === 'waiting' ? '⏹️' : job.state === 'failed' ? '❌' : '❓'}
                                        {' '}{job.state?.toUpperCase() || 'UNKNOWN'}
                                      </CBadge>
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {job.state === 'active' ? (
                                        <CProgress style={{ height: '6px' }}>
                                          <CProgressBar value={job.progress || 0} color="primary" animated />
                                        </CProgress>
                                      ) : job.state === 'completed' ? (
                                        <span className="text-success">100%</span>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </CTableDataCell>
                                    <CTableDataCell>
                                      {job.result ? (
                                        <small>
                                          {job.result.totalUpdated !== undefined && <span>Updated: <strong>{job.result.totalUpdated}</strong></span>}
                                          {job.result.totalOpenUpdated > 0 && <span className="ms-2">Opens: <strong style={{ color: '#16a34a' }}>{job.result.totalOpenUpdated}</strong></span>}
                                        </small>
                                      ) : job.failedReason ? (
                                        <small className="text-danger" title={job.failedReason}>
                                          {job.failedReason.length > 30 ? job.failedReason.substring(0, 30) + '...' : job.failedReason}
                                        </small>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </CTableDataCell>
                                  </CTableRow>
                                ))}
                              </CTableBody>
                            </CTable>

                            <small className="text-muted d-block mt-2">
                              💡 These updates run automatically after campaign completion. Bounce checks are scheduled at 5min, 30min, and 4hr intervals to catch all bounce types and update <code>dls_bounce_status</code>, <code>dls_mail_send_status</code>, and <code>dls_mailer_status</code> in source collections.
                            </small>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Preview Modal */}
      <CModal visible={showPreviewModal} onClose={() => setShowPreviewModal(false)} size="xl">
        <CModalHeader>
          <CModalTitle>Campaign Preview</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {campaignDetails ? (
            <>
              <CListGroup className="mb-3">
                <CListGroupItem>
                  <strong>Campaign:</strong> {campaignDetails.name}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Template:</strong> {campaignDetails.template_title || 'N/A'}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Audience:</strong> {campaignDetails.audience_name || 'N/A'}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Subscribers:</strong> {getTotalSubscribers()}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Status:</strong> {campaignDetails.status || 'Draft'}
                </CListGroupItem>
                <CListGroupItem>
                  <strong>Subject:</strong> {subject || 'N/A'}
                </CListGroupItem>
              </CListGroup>
              <div className="border p-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: campaignDetails.template_content || 'No content available' }} />
              </div>
            </>
          ) : (
            <CSpinner />
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowPreviewModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Schedule Modal */}
      <CModal visible={showScheduleModal} onClose={() => setShowScheduleModal(false)}>
        <CModalHeader>
          <CModalTitle>Schedule Campaign</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm onSubmit={handleScheduleEmail}>
            <div className="mb-3">
              <CFormLabel>Schedule Time <span className="text-danger">*</span></CFormLabel>
              <CFormInput
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Timezone <span className="text-danger">*</span></CFormLabel>
              <CFormSelect
                value={scheduleTimezone}
                onChange={(e) => {
                  setScheduleTimezone(e.target.value);
                  if (e.target.value && !scheduleTime) {
                    const now = moment.tz(e.target.value);
                    setScheduleTime(now.format('YYYY-MM-DDTHH:mm'));
                  }
                }}
                required
              >
                <option value="">Select Timezone</option>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </CFormSelect>
            </div>
            <div className="d-flex gap-2">
              <CButton type="submit" color="primary" disabled={scheduling}>
                {scheduling && <CSpinner size="sm" className="me-2" />}
                Schedule
              </CButton>
              <CButton
                type="button"
                color="secondary"
                onClick={() => setShowScheduleModal(false)}
                disabled={scheduling}
              >
                Cancel
              </CButton>
            </div>
          </CForm>
        </CModalBody>
      </CModal>

      {/* Assignment Configuration Modal */}
      <CModal visible={showAssignmentModal} onClose={() => setShowAssignmentModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Configure Assignment</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {assignmentMode === 'batch_size' ? (
            <div>
              <CFormLabel>Batch Size (emails per account)</CFormLabel>
              <CFormInput
                type="number"
                value={batchSize}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setBatchSize('');
                  } else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num)) {
                      setBatchSize(num);
                    }
                  }
                }}
                min="1"
              />
              {updateAssignmentWarning() > 0 && (
                <CAlert color="warning" className="mt-2">
                  Warning: {updateAssignmentWarning()} subscribers will be skipped due to batch size configuration.
                </CAlert>
              )}
            </div>
          ) : (
            <div>
              <CFormLabel className="mb-3">Manual Assignment</CFormLabel>
              {selectedEmails.map(email => {
                const account = emailAccounts.find(acc => acc.email === email);
                return (
                  <div key={email} className="mb-3">
                    <CFormLabel>
                      {email} {account?.daily_send_limit ? `(Daily Limit: ${account.daily_send_limit})` : ''}
                    </CFormLabel>
                    <CFormInput
                      type="number"
                      value={manualAssignments[email] || 0}
                      onChange={(e) => {
                        setManualAssignments({
                          ...manualAssignments,
                          [email]: Number(e.target.value) || 0
                        });
                      }}
                      min="0"
                    />
                  </div>
                );
              })}
              <CAlert color="info" className="mt-3">
                <strong>Total Assigned:</strong> {getAssignedSubscribers()} subscribers
              </CAlert>
              {updateAssignmentWarning() > 0 && (
                <CAlert color="warning" className="mt-2">
                  Warning: {updateAssignmentWarning()} subscribers are unassigned.
                </CAlert>
              )}
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            onClick={() => setShowAssignmentModal(false)}
          >
            Save
          </CButton>
          <CButton
            color="secondary"
            onClick={() => setShowAssignmentModal(false)}
          >
            Cancel
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Tracking Subscribers Modal — Opened/Unopened Email List */}
      <CModal visible={showTrackingModal} onClose={() => setShowTrackingModal(false)} size="lg">
        <CModalHeader closeButton>
          <CModalTitle>
            {trackingType === 'opened' ? '✅ Opened Emails' : '📭 Unopened Emails'}
            <CBadge color={trackingType === 'opened' ? 'success' : 'warning'} className="ms-2">
              {trackingTotal}
            </CBadge>
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {trackingLoading ? (
            <div className="text-center py-4">
              <CSpinner color="primary" />
              <div className="mt-2 text-muted">Loading subscribers...</div>
            </div>
          ) : trackingSubscribers.length === 0 ? (
            <CAlert color="info">No {trackingType} emails found.</CAlert>
          ) : (
            <>
              <CTable striped hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell style={{ width: '40px' }}>#</CTableHeaderCell>
                    <CTableHeaderCell>Subscriber Email</CTableHeaderCell>
                    <CTableHeaderCell>From Account</CTableHeaderCell>
                    <CTableHeaderCell>Sent At</CTableHeaderCell>
                    {trackingType === 'opened' && (
                      <CTableHeaderCell>Opened At</CTableHeaderCell>
                    )}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {trackingSubscribers.map((sub, idx) => (
                    <CTableRow key={idx}>
                      <CTableDataCell className="text-muted">{(trackingPage - 1) * 50 + idx + 1}</CTableDataCell>
                      <CTableDataCell>{sub.to_email || '—'}</CTableDataCell>
                      <CTableDataCell><small className="text-muted">{sub.from_email || '—'}</small></CTableDataCell>
                      <CTableDataCell><small>{sub.sent_at ? moment(sub.sent_at).format('DD MMM YYYY, HH:mm') : '—'}</small></CTableDataCell>
                      {trackingType === 'opened' && (
                        <CTableDataCell>
                          <small className="text-success">
                            {sub.tracking_opened_at ? moment(sub.tracking_opened_at).format('DD MMM YYYY, HH:mm') : '—'}
                          </small>
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              {/* Pagination */}
              {trackingTotalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <small className="text-muted">
                    Showing {(trackingPage - 1) * 50 + 1}–{Math.min(trackingPage * 50, trackingTotal)} of {trackingTotal}
                  </small>
                  <div className="d-flex gap-2">
                    <CButton
                      size="sm"
                      color="primary"
                      variant="outline"
                      disabled={trackingPage <= 1}
                      onClick={() => fetchTrackingSubscribers(trackingType, trackingPage - 1)}
                    >
                      ← Prev
                    </CButton>
                    <span className="align-self-center text-muted" style={{ fontSize: '13px' }}>
                      Page {trackingPage} / {trackingTotalPages}
                    </span>
                    <CButton
                      size="sm"
                      color="primary"
                      variant="outline"
                      disabled={trackingPage >= trackingTotalPages}
                      onClick={() => fetchTrackingSubscribers(trackingType, trackingPage + 1)}
                    >
                      Next →
                    </CButton>
                  </div>
                </div>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="success"
            onClick={async () => {
              const campId = currentCampaignId || selectedCampaign;
              if (!campId) return;
              try {
                const authAxios = getAuthAxios();
                const response = await authAxios.get(`/campaigns/${campId}/tracking-subscribers`, {
                  params: { type: trackingType, export: 'true' }
                });
                const allSubscribers = response.data.subscribers || [];
                if (allSubscribers.length === 0) {
                  setMessage({ type: 'warning', text: 'No records to export' });
                  return;
                }
                const columns = [
                  { data: 'to_email', title: 'Subscriber Email' },
                  { data: 'from_email', title: 'From Account' },
                  { data: 'sent_at', title: 'Sent At' },
                  ...(trackingType === 'opened' ? [{ data: 'tracking_opened_at', title: 'Opened At' }] : [])
                ];
                // Format dates for CSV
                const formattedData = allSubscribers.map(sub => ({
                  ...sub,
                  sent_at: sub.sent_at ? moment(sub.sent_at).format('YYYY-MM-DD HH:mm:ss') : '',
                  tracking_opened_at: sub.tracking_opened_at ? moment(sub.tracking_opened_at).format('YYYY-MM-DD HH:mm:ss') : ''
                }));
                ExportService.exportToCSV(formattedData, columns, `${trackingType}_subscribers_campaign_${campId}.csv`);
              } catch (error) {
                console.error('Export failed:', error);
                setMessage({ type: 'danger', text: 'Failed to export CSV' });
              }
            }}
            disabled={trackingSubscribers.length === 0}
          >
            📥 Export CSV
          </CButton>
          <CButton color="secondary" onClick={() => setShowTrackingModal(false)}>Close</CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Emaildelivery;
