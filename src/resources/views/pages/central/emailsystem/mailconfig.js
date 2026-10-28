import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import styles from './mailconfig.module.css';

/**
 * Mail Config Page - Enterprise Multi-Inbox Infrastructure
 * Modern React 19 UI with Linear/Resend Aesthetics
 */
const Mailconfig = () => {
  // Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Provider, 2: Sender Profile, 3: Connect & Authenticate
  const [selectedProvider, setSelectedProvider] = useState('google'); // 'google', 'outlook', 'manual'

  // Form State
  const [accountDetails, setAccountDetails] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    extension: '91',
    designation: '',
    postal_code: '',
    address: '',
    unsubscribe: '',
    region: 'North America',
    daily_send_limit: 100
  });

  const [manualSetup, setManualSetup] = useState({
    email: '',
    password: '',
    incoming_host: '',
    incoming_port: 993,
    incoming_encryption: 'ssl',
    outgoing_host: '',
    outgoing_port: 465,
    outgoing_encryption: 'ssl'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showAdvancedCompliance, setShowAdvancedCompliance] = useState(false);

  // Loading & Testing States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testingRowId, setTestingRowId] = useState(null);

  // Table & Data State
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const baseToken = 'central_email_config';

  // View & Delete hooks
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  const { handleDelete } = useDelete(baseToken, () => {
    setTableRefreshKey(prev => prev + 1);
    showToast('Email account deleted successfully.', 'info');
  });

  // Auth Axios helper
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  // Port settings
  const portSettings = {
    imap: { ssl: 993, tls: 143, starttls: 143, none: 143 },
    smtp: { ssl: 465, tls: 587, starttls: 587, none: 25 }
  };

  // Check URL parameters for OAuth callbacks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const successMsg = urlParams.get('success');
    const errorMsg = urlParams.get('error');

    if (successMsg) {
      showToast(decodeURIComponent(successMsg), 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      setTableRefreshKey(prev => prev + 1);
    }

    if (errorMsg) {
      showToast(decodeURIComponent(errorMsg), 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Accounts directly for rich rendering & instant reactivity
  useEffect(() => {
    let isMounted = true;
    const fetchAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const authAxios = getAuthAxios();
        const response = await authAxios.post(`/api/skeleton-action/${baseToken}_t`, {
          draw: 1,
          filters: { pagination: { page: 1, limit: 100 } }
        });

        if (isMounted && response.data && response.data.data) {
          setAccounts(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load email accounts:', err);
        if (isMounted) {
          showToast('Failed to load accounts list', 'error');
        }
      } finally {
        if (isMounted) setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
    return () => { isMounted = false; };
  }, [tableRefreshKey]);

  // KPI Computations
  const stats = useMemo(() => {
    const total = accounts.length;
    const active = accounts.filter(a => a.status === 'active').length;
    const pending = accounts.filter(a => a.status === 'pending').length;
    const capacity = accounts.reduce((acc, a) => acc + (parseInt(a.daily_send_limit) || 100), 0);
    const used = accounts.reduce((acc, a) => acc + (parseInt(a.used_quota) || 0), 0);
    const percent = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0;

    return { total, active, pending, capacity, used, percent };
  }, [accounts]);

  // Filtered Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.first_name && item.first_name.toLowerCase().includes(q)) ||
        (item.last_name && item.last_name.toLowerCase().includes(q)) ||
        (item.region && item.region.toLowerCase().includes(q)) ||
        (item.designation && item.designation.toLowerCase().includes(q));

      const matchProvider =
        providerFilter === 'all' ||
        (providerFilter === 'google' && item.type === 'google') ||
        (providerFilter === 'manual' && item.type !== 'google');

      const matchStatus =
        statusFilter === 'all' || item.status === statusFilter;

      return matchSearch && matchProvider && matchStatus;
    });
  }, [accounts, searchQuery, providerFilter, statusFilter]);

  // Paginated Accounts
  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(start, start + itemsPerPage);
  }, [filteredAccounts, currentPage]);

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;

  // Open Wizard
  const handleOpenWizard = () => {
    setCurrentStep(1);
    setSelectedProvider('google');
    setIsWizardOpen(true);
  };

  // Close Wizard
  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setCurrentStep(1);
    setAccountDetails({
      first_name: '',
      last_name: '',
      phone_number: '',
      extension: '91',
      designation: '',
      postal_code: '',
      address: '',
      unsubscribe: '',
      region: 'North America',
      daily_send_limit: 100
    });
  };

  // Handle Step 2 -> Step 3
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!accountDetails.first_name || !accountDetails.last_name || !accountDetails.designation) {
      showToast('Please fill in First Name, Last Name, and Designation.', 'error');
      return;
    }
    setCurrentStep(3);
  };

  // Handle Google OAuth Connect
  const handleGoogleConnect = async () => {
    setIsSubmitting(true);
    try {
      const authAxios = getAuthAxios();

      const payload = {
        ...accountDetails,
        type: 'google'
      };

      // Step 1: Pre-save account details
      const preSaveResponse = await authAxios.post('/api/pre-save-google-account', payload);
      if (!preSaveResponse.data.status) {
        showToast(preSaveResponse.data.message || 'Failed to pre-save account details.', 'error');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Request Google Redirect URL
      const redirectResponse = await authAxios.get('/api/auth/google/redirect');
      if (redirectResponse.data.status && redirectResponse.data.redirectUrl) {
        window.location.href = redirectResponse.data.redirectUrl;
        return;
      }

      if (preSaveResponse.data.redirect) {
        window.location.href = preSaveResponse.data.redirect;
        return;
      }

      showToast('Failed to obtain Google authorization link.', 'error');
    } catch (err) {
      console.error('Google OAuth initialization error:', err);
      showToast(err.response?.data?.message || 'Failed to initiate Google OAuth. Check your credentials.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Auto-Detect
  const handleAutoDetect = async () => {
    if (!manualSetup.email || !manualSetup.email.includes('@')) {
      showToast('Enter a valid email address to auto-detect settings.', 'error');
      return;
    }

    setIsAutoDetecting(true);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/email-autodetect', { email: manualSetup.email.trim() });

      if (response.data && response.data.settings) {
        const s = response.data.settings;
        setManualSetup(prev => ({
          ...prev,
          incoming_host: s.imap_host || prev.incoming_host,
          incoming_port: s.imap_port || prev.incoming_port,
          incoming_encryption: s.imap_encryption || prev.incoming_encryption,
          outgoing_host: s.smtp_host || prev.outgoing_host,
          outgoing_port: s.smtp_port || prev.outgoing_port,
          outgoing_encryption: s.smtp_encryption || prev.outgoing_encryption
        }));
        showToast(`Auto-detected settings for ${manualSetup.email.split('@')[1]}!`, 'success');
      } else {
        showToast('Could not auto-detect settings. Please enter server details manually.', 'info');
      }
    } catch (err) {
      console.error('Auto detect error:', err);
      showToast('Auto-detection failed. Please specify settings manually.', 'error');
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Handle Test Connection (From Wizard)
  const handleTestManualConnection = async () => {
    if (!manualSetup.email || !manualSetup.password || !manualSetup.outgoing_host) {
      showToast('Fill in Email, Password, and SMTP Host before testing.', 'error');
      return;
    }

    setIsTestingConnection(true);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/email-test-connection', manualSetup);

      if (response.data && response.data.status) {
        showToast(response.data.message || 'SMTP & IMAP verified successfully!', 'success');
      } else {
        showToast(response.data.message || 'Connection test failed. Verify host and port.', 'error');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      showToast(err.response?.data?.message || 'Connection test failed. Check credentials.', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle Inline Test from Table Row
  const handleInlineTest = async (account) => {
    setTestingRowId(account.id || account._id);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/email-test-connection', {
        email: account.email,
        type: account.type || 'google'
      });

      if (response.data && response.data.status) {
        showToast(`✅ ${account.email || 'Account'} connection is healthy!`, 'success');
      } else {
        showToast(`⚠️ ${account.email || 'Account'}: ${response.data?.message || 'Health check error'}`, 'error');
      }
    } catch (err) {
      showToast(`Health check failed for ${account.email || 'account'}`, 'error');
    } finally {
      setTestingRowId(null);
    }
  };

  // Handle Save Manual Account
  const handleManualSave = async (e) => {
    e.preventDefault();
    if (!manualSetup.email || !manualSetup.password || !manualSetup.outgoing_host) {
      showToast('Please provide email, password, and SMTP host.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = {
        ...accountDetails,
        ...manualSetup,
        type: 'manual',
        status: 'active'
      };

      const authAxios = getAuthAxios();
      const response = await authAxios.post(`/api/skeleton-action/${baseToken}_as`, formData);

      if (response.data.status) {
        showToast('Email account configured and added successfully!', 'success');
        handleCloseWizard();
        setTableRefreshKey(prev => prev + 1);
      } else {
        showToast(response.data.message || 'Failed to save account.', 'error');
      }
    } catch (err) {
      console.error('Save manual account error:', err);
      showToast(err.response?.data?.message || 'Failed to save email account.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* ─── Floating Toast Notifications ─── */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`${styles.toast} ${
              toast.type === 'error'
                ? styles.toastError
                : toast.type === 'info'
                ? styles.toastInfo
                : styles.toastSuccess
            }`}
          >
            <span>
              {toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}
            </span>
            <span>{toast.message}</span>
            <button className={styles.toastClose} onClick={() => removeToast(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {/* ─── Hero Header Row ─── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.badgePill}>
            <span className={styles.pulseDot} />
            Outreach Infrastructure
          </div>
          <h1 className={styles.mainTitle}>Sender Inboxes & Deliverability</h1>
          <p className={styles.subTitle}>
            Manage authenticated Google Workspace and private SMTP/IMAP accounts with distributed rate-limits and warm-up tracking.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={() => {
              setTableRefreshKey(prev => prev + 1);
              showToast('Refreshed inboxes status', 'info');
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
            </svg>
            Refresh
          </button>

          <button className={styles.connectBtn} onClick={handleOpenWizard}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Connect New Inbox
          </button>
        </div>
      </div>

      {/* ─── KPI Metric Cards ─── */}
      <div className={styles.kpiGrid}>
        {/* Total Inboxes */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Connected Inboxes</span>
            <div className={styles.kpiIconWrapper}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.total}</div>
          <div className={styles.kpiSubtext}>
            <span style={{ color: '#34d399' }}>● {stats.active} Active</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#fbbf24' }}>● {stats.pending} Pending</span>
          </div>
        </div>

        {/* Daily Capacity */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Daily Quota Capacity</span>
            <div className={styles.kpiIconWrapper}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.capacity.toLocaleString()} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/day</span></div>
          <div className={styles.kpiSubtext}>Max 24h sending bandwidth</div>
        </div>

        {/* Quota Consumed */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Today's Utilization</span>
            <div className={styles.kpiIconWrapper}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue}>{stats.percent}%</div>
          <div className={styles.miniProgressBar}>
            <div className={styles.miniProgressFill} style={{ width: `${Math.max(stats.percent, 3)}%` }} />
          </div>
          <div className={styles.kpiSubtext} style={{ marginTop: '0.4rem' }}>
            {stats.used} of {stats.capacity} emails dispatched
          </div>
        </div>

        {/* Deliverability Status */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Deliverability Grade</span>
            <div className={styles.kpiIconWrapper}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className={styles.kpiValue} style={{ color: '#34d399' }}>99.2%</div>
          <div className={styles.kpiSubtext}>
            <span>SPF • DKIM • DMARC Guarded</span>
          </div>
        </div>
      </div>

      {/* ─── Main Inboxes Table Container ─── */}
      <div className={styles.tableContainer}>
        {/* Toolbar */}
        <div className={styles.tableToolbar}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by email, name, or region..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={providerFilter}
              onChange={e => {
                setProviderFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Providers</option>
              <option value="google">Google Workspace</option>
              <option value="manual">Custom SMTP/IMAP</option>
            </select>

            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="pending">Pending Auth</option>
            </select>
          </div>
        </div>

        {/* Table Body */}
        <div className={styles.tableResponsive}>
          {isLoadingAccounts ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(148, 163, 184, 0.2)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
              <div>Fetching connected inboxes...</div>
            </div>
          ) : paginatedAccounts.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3 className={styles.emptyTitle}>No matching inboxes found</h3>
              <p className={styles.emptyText}>
                {searchQuery || providerFilter !== 'all' || statusFilter !== 'all'
                  ? 'No accounts match your current filters. Try resetting search parameters.'
                  : 'Get started by connecting your first cold outreach inbox.'}
              </p>
              <button className={styles.connectBtn} onClick={handleOpenWizard} style={{ marginTop: '0.5rem' }}>
                + Connect Inbox
              </button>
            </div>
          ) : (
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>Sender Identity</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Daily Quota</th>
                  <th>Region</th>
                  <th>Configured</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.map(account => {
                  const isGoogle = account.type === 'google';
                  const isActive = account.status === 'active';
                  const isTestingThis = testingRowId === (account.id || account._id);
                  const fullName = `${account.first_name || ''} ${account.last_name || ''}`.trim() || 'No Name Set';
                  const roleTag = account.designation ? ` • ${account.designation}` : '';
                  const usedQuota = account.used_quota || 0;
                  const limit = account.daily_send_limit || 100;
                  const progressPct = Math.min(100, Math.round((usedQuota / limit) * 100));

                  return (
                    <tr key={account.id || account._id}>
                      {/* Sender Identity */}
                      <td>
                        <div className={styles.accountCell}>
                          <div className={styles.providerAvatar}>
                            {isGoogle ? (
                              <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.35 7.33 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.06-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                              </svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                              </svg>
                            )}
                          </div>
                          <div className={styles.accountMeta}>
                            <div className={styles.accountEmail}>
                              {account.email || (
                                <span style={{ color: '#fbbf24', fontStyle: 'italic', fontWeight: 500 }}>
                                  Pending Authorization
                                </span>
                              )}
                            </div>
                            <div className={styles.accountName}>
                              {fullName}{roleTag}
                              {account.phone_number && (
                                <span style={{ color: '#94a3b8', marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                                  • +{account.extension || '91'} {account.phone_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            isActive
                              ? styles.statusActive
                              : account.status === 'error'
                              ? styles.statusError
                              : styles.statusPending
                          }`}
                        >
                          <span
                            className={
                              isActive
                                ? styles.statusDotActive
                                : account.status === 'error'
                                ? styles.statusDotError
                                : styles.statusDotPending
                            }
                          />
                          {isActive ? 'Active' : account.status === 'error' ? 'Disconnected' : 'Pending Auth'}
                        </span>
                      </td>

                      {/* Provider */}
                      <td>
                        <span className={styles.typeBadge}>
                          {isGoogle ? 'Google OAuth' : 'IMAP / SMTP'}
                        </span>
                      </td>

                      {/* Quota Progress */}
                      <td>
                        <div className={styles.quotaBox}>
                          <div className={styles.quotaText}>
                            <span>{usedQuota} / {limit}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className={styles.quotaBar}>
                            <div className={styles.quotaFill} style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </td>

                      {/* Region */}
                      <td>
                        <span style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
                          {account.region || 'Global'}
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {account.created_at ? account.created_at.split(',')[0] : 'Recent'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                          {/* Test Connection Button */}
                          <button
                            className={styles.testBtn}
                            onClick={() => handleInlineTest(account)}
                            disabled={isTestingThis}
                            title="Verify SMTP and IMAP connection"
                          >
                            {isTestingThis ? (
                              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            )}
                            Test
                          </button>

                          {/* View Modal */}
                          <button
                            className={styles.iconBtn}
                            onClick={() => handleView(account)}
                            title="View Account Details"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                            onClick={() => handleDelete(account)}
                            title="Remove Account"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Toolbar */}
        {!isLoadingAccounts && (
          <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(148, 163, 184, 0.08)', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAccounts.length)} of {filteredAccounts.length} inboxes
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Show:</span>
                <select
                  className={styles.filterSelect}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page (All)</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                className={styles.refreshBtn}
                style={{ padding: '0.4rem 0.8rem' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '0 0.4rem' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className={styles.refreshBtn}
                style={{ padding: '0.4rem 0.8rem' }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Multi-Step "Connect Inbox" Wizard Modal ─── */}
      {isWizardOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalCard}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Connect Sender Inbox</h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Step {currentStep} of 3: {currentStep === 1 ? 'Choose Provider' : currentStep === 2 ? 'Sender Identity' : 'Authenticate & Test'}
                </span>
              </div>
              <button className={styles.closeBtn} onClick={handleCloseWizard}>
                ✕
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className={styles.stepperWrapper}>
              <div className={styles.stepperLine} />
              <div
                className={styles.stepperLineActive}
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '35%' : '70%' }}
              />

              {/* Step 1 */}
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${
                    currentStep === 1
                      ? styles.stepCircleActive
                      : currentStep > 1
                      ? styles.stepCircleCompleted
                      : ''
                  }`}
                >
                  {currentStep > 1 ? '✓' : '1'}
                </div>
                <span className={`${styles.stepLabel} ${currentStep === 1 ? styles.stepLabelActive : ''}`}>
                  Provider
                </span>
              </div>

              {/* Step 2 */}
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${
                    currentStep === 2
                      ? styles.stepCircleActive
                      : currentStep > 2
                      ? styles.stepCircleCompleted
                      : ''
                  }`}
                >
                  {currentStep > 2 ? '✓' : '2'}
                </div>
                <span className={`${styles.stepLabel} ${currentStep === 2 ? styles.stepLabelActive : ''}`}>
                  Sender Profile
                </span>
              </div>

              {/* Step 3 */}
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepCircle} ${
                    currentStep === 3 ? styles.stepCircleActive : ''
                  }`}
                >
                  3
                </div>
                <span className={`${styles.stepLabel} ${currentStep === 3 ? styles.stepLabelActive : ''}`}>
                  Authentication
                </span>
              </div>
            </div>

            {/* Modal Step Content */}
            <div className={styles.modalBody}>
              {/* ── STEP 1: Choose Provider ── */}
              {currentStep === 1 && (
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 0.5rem 0' }}>
                    Select Your Email Provider
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
                    Choose how you want to connect your inbox. Google Workspace OAuth is recommended for highest deliverability.
                  </p>

                  <div className={styles.providerGrid}>
                    {/* Google Tile */}
                    <div
                      className={`${styles.providerCard} ${selectedProvider === 'google' ? styles.providerCardSelected : ''}`}
                      onClick={() => setSelectedProvider('google')}
                    >
                      <div className={styles.providerIcon}>
                        <svg width="26" height="26" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.35 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.06-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className={styles.providerTitle}>Google Workspace</h5>
                        <p className={styles.providerDesc}>One-click OAuth authorization for Gmail and Workspace inboxes.</p>
                      </div>
                      <span className={styles.badgePill} style={{ margin: 0 }}>Recommended</span>
                    </div>

                    {/* Microsoft 365 Tile */}
                    <div
                      className={`${styles.providerCard} ${selectedProvider === 'outlook' ? styles.providerCardSelected : ''}`}
                      onClick={() => setSelectedProvider('manual')}
                    >
                      <div className={styles.providerIcon}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                          <rect width="24" height="24" rx="4" fill="#0078D4"/>
                          <path d="M14 6H10V18H14V6Z" fill="#fff" opacity="0.8"/>
                          <path d="M6 10H18V14H6V10Z" fill="#fff"/>
                        </svg>
                      </div>
                      <div>
                        <h5 className={styles.providerTitle}>Microsoft 365</h5>
                        <p className={styles.providerDesc}>Outlook & Exchange via SMTP/IMAP protocol.</p>
                      </div>
                    </div>

                    {/* Custom SMTP/IMAP Tile */}
                    <div
                      className={`${styles.providerCard} ${selectedProvider === 'manual' ? styles.providerCardSelected : ''}`}
                      onClick={() => setSelectedProvider('manual')}
                    >
                      <div className={styles.providerIcon}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                          <rect x="2" y="2" width="20" height="8" rx="2" />
                          <rect x="2" y="14" width="20" height="8" rx="2" />
                          <line x1="6" y1="6" x2="6.01" y2="6" />
                          <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                      </div>
                      <div>
                        <h5 className={styles.providerTitle}>Custom SMTP / IMAP</h5>
                        <p className={styles.providerDesc}>Mailcow, Zoho, Private VPS, or any mail server.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Sender Profile ── */}
              {currentStep === 2 && (
                <form id="sender-profile-form" onSubmit={handleProfileSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className={styles.formLabel}>
                        First Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.formInput}
                        required
                        placeholder="e.g. Alex"
                        value={accountDetails.first_name}
                        onChange={e => setAccountDetails({ ...accountDetails, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={styles.formLabel}>
                        Last Name <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.formInput}
                        required
                        placeholder="e.g. Mercer"
                        value={accountDetails.last_name}
                        onChange={e => setAccountDetails({ ...accountDetails, last_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <label className={styles.formLabel}>
                        Sender Designation <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.formInput}
                        required
                        placeholder="e.g. VP of Growth"
                        value={accountDetails.designation}
                        onChange={e => setAccountDetails({ ...accountDetails, designation: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className={styles.formLabel}>
                        Geographic Region <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        className={styles.formInput}
                        value={accountDetails.region}
                        onChange={e => setAccountDetails({ ...accountDetails, region: e.target.value })}
                      >
                        <option value="North America">North America (US & CA)</option>
                        <option value="EMEA">EMEA (Europe & Middle East)</option>
                        <option value="APJ & APAC">APJ & APAC (Asia Pacific)</option>
                        <option value="DACH">DACH (Germany, Austria, Switzerland)</option>
                        <option value="NORDICS">NORDICS</option>
                        <option value="South America">South America</option>
                        <option value="Global">Global Rotation</option>
                      </select>
                    </div>
                  </div>

                  {/* Daily Send Limit Slider & Input */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.15)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div>
                        <label className={styles.formLabel} style={{ margin: 0 }}>Daily Send Quota</label>
                        <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>Rolling 24-hour dispatch ceiling per inbox</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          min={10}
                          max={1000}
                          className={styles.formInput}
                          style={{ width: '90px', padding: '0.35rem 0.6rem', textAlign: 'center', fontWeight: 600 }}
                          value={accountDetails.daily_send_limit}
                          onChange={e => setAccountDetails({ ...accountDetails, daily_send_limit: parseInt(e.target.value) || 100 })}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>emails</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={10}
                      max={500}
                      step={10}
                      value={accountDetails.daily_send_limit}
                      onChange={e => setAccountDetails({ ...accountDetails, daily_send_limit: parseInt(e.target.value) })}
                      style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
                      <span>Warmup Safe (50)</span>
                      <span>Standard (100)</span>
                      <span>Aggressive (300)</span>
                      <span>High Volume (500)</span>
                    </div>
                  </div>

                  {/* Accordion: Compliance & Physical Address */}
                  <div>
                    <button
                      type="button"
                      className={styles.accordionToggle}
                      onClick={() => setShowAdvancedCompliance(!showAdvancedCompliance)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAdvancedCompliance ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      {showAdvancedCompliance ? 'Hide' : 'Show'} CAN-SPAM Physical Address & Footer (Optional)
                    </button>

                    {showAdvancedCompliance && (
                      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.1)', marginTop: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                          <div>
                            <label className={styles.formLabel}>Phone Number</label>
                            <input
                              type="tel"
                              className={styles.formInput}
                              placeholder="+1 (555) 000-0000"
                              value={accountDetails.phone_number}
                              onChange={e => setAccountDetails({ ...accountDetails, phone_number: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={styles.formLabel}>Custom Unsubscribe Link</label>
                            <input
                              type="url"
                              className={styles.formInput}
                              placeholder="Leave blank for system default"
                              value={accountDetails.unsubscribe}
                              onChange={e => setAccountDetails({ ...accountDetails, unsubscribe: e.target.value })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={styles.formLabel}>Physical Mailing Address</label>
                          <textarea
                            className={styles.formTextarea}
                            placeholder="Suite, Street, City, State, Country"
                            value={accountDetails.address}
                            onChange={e => setAccountDetails({ ...accountDetails, address: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* ── STEP 3: Connect & Authenticate ── */}
              {currentStep === 3 && (
                <div>
                  {selectedProvider === 'google' ? (
                    <div className={styles.googleOAuthBox}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(66, 133, 244, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.35 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.06-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                        </svg>
                      </div>

                      <div style={{ maxWidth: '460px' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                          Authorize with Google Workspace
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                          You will be redirected to Google to authorize cold outreach permissions. Offline access tokens are automatically refreshed in the background.
                        </p>
                      </div>

                      <button
                        className={styles.googleSignBtn}
                        onClick={handleGoogleConnect}
                        disabled={isSubmitting}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.15C3.25 21.35 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.06-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.65 1.26 6.58l4.06 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                        </svg>
                        {isSubmitting ? 'Redirecting to Google...' : 'Continue with Google Workspace'}
                      </button>
                    </div>
                  ) : (
                    /* Manual SMTP / IMAP */
                    <form onSubmit={handleManualSave}>
                      {/* Credentials Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                          <label className={styles.formLabel}>
                            Email Address <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input
                            type="email"
                            className={styles.formInput}
                            required
                            placeholder="alex@acme.com"
                            value={manualSetup.email}
                            onChange={e => setManualSetup({ ...manualSetup, email: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className={styles.formLabel}>
                            App Password <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className={styles.formInput}
                              required
                              placeholder="••••••••••••"
                              value={manualSetup.password}
                              onChange={e => setManualSetup({ ...manualSetup, password: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              {showPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Auto Detect Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        <button
                          type="button"
                          className={styles.refreshBtn}
                          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                          onClick={handleAutoDetect}
                          disabled={isAutoDetecting}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          {isAutoDetecting ? 'Auto-Detecting...' : 'Auto-Detect Server Settings'}
                        </button>
                      </div>

                      {/* IMAP & SMTP Split Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                        {/* IMAP Incoming */}
                        <div className={styles.serverCard}>
                          <div className={styles.serverHeader}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Incoming (IMAP)
                          </div>

                          <div style={{ marginBottom: '0.75rem' }}>
                            <label className={styles.formLabel}>IMAP Host</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              placeholder="imap.mail.com"
                              value={manualSetup.incoming_host}
                              onChange={e => setManualSetup({ ...manualSetup, incoming_host: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label className={styles.formLabel}>Port</label>
                              <input
                                type="number"
                                className={styles.formInput}
                                value={manualSetup.incoming_port}
                                onChange={e => setManualSetup({ ...manualSetup, incoming_port: parseInt(e.target.value) || 993 })}
                              />
                            </div>
                            <div>
                              <label className={styles.formLabel}>Security</label>
                              <select
                                className={styles.formInput}
                                value={manualSetup.incoming_encryption}
                                onChange={e => {
                                  const enc = e.target.value;
                                  setManualSetup({
                                    ...manualSetup,
                                    incoming_encryption: enc,
                                    incoming_port: portSettings.imap[enc] || 993
                                  });
                                }}
                              >
                                <option value="ssl">SSL / TLS</option>
                                <option value="starttls">STARTTLS</option>
                                <option value="none">None</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* SMTP Outgoing */}
                        <div className={styles.serverCard}>
                          <div className={styles.serverHeader}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                              <polyline points="17 14 12 9 7 14" />
                              <line x1="12" y1="9" x2="12" y2="21" />
                            </svg>
                            Outgoing (SMTP)
                          </div>

                          <div style={{ marginBottom: '0.75rem' }}>
                            <label className={styles.formLabel}>SMTP Host</label>
                            <input
                              type="text"
                              className={styles.formInput}
                              placeholder="smtp.mail.com"
                              value={manualSetup.outgoing_host}
                              onChange={e => setManualSetup({ ...manualSetup, outgoing_host: e.target.value })}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                              <label className={styles.formLabel}>Port</label>
                              <input
                                type="number"
                                className={styles.formInput}
                                value={manualSetup.outgoing_port}
                                onChange={e => setManualSetup({ ...manualSetup, outgoing_port: parseInt(e.target.value) || 465 })}
                              />
                            </div>
                            <div>
                              <label className={styles.formLabel}>Security</label>
                              <select
                                className={styles.formInput}
                                value={manualSetup.outgoing_encryption}
                                onChange={e => {
                                  const enc = e.target.value;
                                  setManualSetup({
                                    ...manualSetup,
                                    outgoing_encryption: enc,
                                    outgoing_port: portSettings.smtp[enc] || 465
                                  });
                                }}
                              >
                                <option value="ssl">SSL / TLS</option>
                                <option value="starttls">STARTTLS</option>
                                <option value="none">None</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Test Connection Button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button
                          type="button"
                          className={styles.refreshBtn}
                          onClick={handleTestManualConnection}
                          disabled={isTestingConnection}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          {isTestingConnection ? 'Testing Handshake...' : 'Test Connection'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className={styles.modalFooter}>
              {currentStep > 1 ? (
                <button
                  className={styles.btnSecondary}
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isSubmitting}
                >
                  ← Back
                </button>
              ) : (
                <button className={styles.btnSecondary} onClick={handleCloseWizard}>
                  Cancel
                </button>
              )}

              {currentStep === 1 && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => setCurrentStep(2)}
                >
                  Continue →
                </button>
              )}

              {currentStep === 2 && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    const form = document.getElementById('sender-profile-form');
                    if (form) form.requestSubmit();
                  }}
                >
                  Next: Connect →
                </button>
              )}

              {currentStep === 3 && selectedProvider !== 'google' && (
                <button
                  className={styles.btnPrimary}
                  onClick={handleManualSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Inbox...' : 'Save & Activate Inbox'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Universal Offcanvas / Modal for Details ─── */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />
    </div>
  );
};

export default Mailconfig;
