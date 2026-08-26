import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilEnvelopeOpen, 
  cilArrowLeft, 
  cilArrowRight, 
  cilMagnifyingGlass, 
  cilPlus,
  cilTrash,
  cilFullscreen,
  cilReload,
  cilInbox,
  cilWarning,
  cilChevronRight,
  cilX
} from '@coreui/icons';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import styles from './engage.module.css';

/**
 * Engage Page - Email Engagement Interface
 * Premium Dark Theme — Superhuman / Linear inspired
 * 
 * Features:
 * - Email account sidebar with categories (Inbox, Spam)
 * - Email list with pagination, search, and status filtering
 * - Email content view with thread display
 * - Keywords management modal
 * - Real-time email fetching
 */
const Engage = () => {
  // ─── State management ───
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emailContent, setEmailContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [emailsPerPage] = useState(20);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [syncButtonLoading, setSyncButtonLoading] = useState(false);
  const [syncPolling, setSyncPolling] = useState({ active: false, startedAt: null });
  const [syncFeedback, setSyncFeedback] = useState({ message: null, type: 'info' });
  
  // Keywords modal state
  const [showKeywordsModal, setShowKeywordsModal] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordType, setNewKeywordType] = useState('unsubscribe');
  const [keywordSearch, setKeywordSearch] = useState('');
  const [keywordTypeFilter, setKeywordTypeFilter] = useState('all');
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── Auth axios ───
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

  // ─── Fetch accounts ───
  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/engage/authenticated-accounts');
      
      if (response.data.status && Array.isArray(response.data.accounts)) {
        setAccounts(response.data.accounts);
        if (!activeAccount) {
          const preferred = response.data.active || response.data.accounts[0]?.email;
          if (preferred) {
            setActiveAccount(preferred);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setAccountsLoading(false);
    }
  }, [getAuthAxios, activeAccount]);

  // ─── Fetch emails ───
  const fetchEmails = useCallback(async (account = activeAccount, category = activeCategory, page = currentPage, options = {}) => {
    if (!account) return;
    const { silent = false } = options;

    if (!silent) {
      setLoading(true);
    }
    try {
      const authAxios = getAuthAxios();
      const params = {
        email: account,
        category: category.toLowerCase(),
        search: searchQuery,
        status: statusFilter,
        from_database: true,
        no_sync: false,
        pageToken: page
      };

      const response = await authAxios.get('/engage/fetch-emails', { params });
      
      if (response.data.status) {
        setEmails(response.data.emails || []);
        setTotalEmails(response.data.total_count || 0);
        setNextPageToken(response.data.nextPageToken);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      setEmails([]);
      setTotalEmails(0);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [activeAccount, activeCategory, searchQuery, statusFilter, currentPage, getAuthAxios]);

  // ─── Sync now ───
  const handleSyncNow = useCallback(async () => {
    if (!activeAccount) return;
    setSyncButtonLoading(true);
    setSyncFeedback({ message: null, type: 'info' });
    try {
      const authAxios = getAuthAxios();
      await authAxios.post('/engage/trigger-sync', {
        email: activeAccount,
        category: activeCategory.toLowerCase()
      });
      setSyncFeedback({ message: 'Sync requested. Fetching latest emails…', type: 'info' });
      setSyncPolling({ active: true, startedAt: Date.now() });
    } catch (error) {
      setSyncFeedback({
        message: error.response?.data?.message || 'Failed to start sync',
        type: 'danger'
      });
    } finally {
      setSyncButtonLoading(false);
    }
  }, [activeAccount, activeCategory, getAuthAxios]);

  useEffect(() => {
    if (!syncFeedback.message) return undefined;
    const timeout = setTimeout(() => {
      setSyncFeedback({ message: null, type: 'info' });
    }, 6000);
    return () => clearTimeout(timeout);
  }, [syncFeedback.message]);

  // ─── Switch account ───
  const switchAccount = useCallback(async (email) => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/engage/switch-account', { email });
      
      if (response.data.status) {
        setActiveAccount(email);
        setCurrentPage(1);
        setNextPageToken(null);
        await fetchEmails(email, activeCategory, 1);
      }
    } catch (error) {
      console.error('Error switching account:', error);
    }
  }, [getAuthAxios, activeCategory, fetchEmails]);

  // ─── Fetch email content ───
  const fetchEmailContent = useCallback(async (emailId) => {
    if (!emailId || !activeAccount) return;

    setLoadingContent(true);
    setSelectedEmail(emailId);
    
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/engage/fetch-email-content', {
        params: {
          email_id: emailId,
          active_email: activeAccount
        }
      });
      
      if (response.data.status) {
        setEmailContent(response.data);
      }
    } catch (error) {
      console.error('Error fetching email content:', error);
      setEmailContent(null);
    } finally {
      setLoadingContent(false);
    }
  }, [activeAccount, getAuthAxios]);

  // ─── Email action ───
  const handleEmailAction = useCallback(async (emailId, action) => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/engage/email-action', {
        email_id: emailId,
        action: action,
        active_email: activeAccount
      });
      
      if (response.data.status) {
        await fetchEmails(activeAccount, activeCategory, currentPage);
        if (action === 'move_to_spam' || action === 'delete') {
          setEmailContent(null);
          setSelectedEmail(null);
        }
      }
    } catch (error) {
      console.error('Error performing email action:', error);
    }
  }, [activeAccount, activeCategory, currentPage, fetchEmails, getAuthAxios]);

  // ─── Keywords CRUD ───
  const loadKeywords = useCallback(async () => {
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/engage/keywords');
      setKeywords(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading keywords:', error);
      setKeywords([]);
    }
  }, [getAuthAxios]);

  const addKeyword = useCallback(async () => {
    if (!newKeyword.trim()) return;
    try {
      const authAxios = getAuthAxios();
      const keywordsToAdd = newKeyword.split(',').map(k => k.trim()).filter(k => k);
      for (const keyword of keywordsToAdd) {
        await authAxios.post('/engage/keywords', { keyword, type: newKeywordType });
      }
      setNewKeyword('');
      await loadKeywords();
    } catch (error) {
      console.error('Error adding keyword:', error);
    }
  }, [newKeyword, newKeywordType, getAuthAxios, loadKeywords]);

  const deleteKeyword = useCallback(async (id) => {
    if (!window.confirm('Delete this keyword?')) return;
    try {
      const authAxios = getAuthAxios();
      await authAxios.delete(`/engage/keywords?id=${id}`);
      await loadKeywords();
    } catch (error) {
      console.error('Error deleting keyword:', error);
    }
  }, [getAuthAxios, loadKeywords]);

  // ─── Helpers ───
  const toggleAccount = (email) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(email)) { newSet.delete(email); } else { newSet.add(email); }
      return newSet;
    });
  };

  const formatEmailTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const emailDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (emailDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatStatus = (status) => {
    if (!status) return 'Other';
    return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getStatusColor = (status) => {
    const map = {
      'hard_bounce': '#ef4444', 'soft_bounce': '#f59e0b', 'ratelimit': '#8b5cf6',
      'spam_block': '#dc2626', 'auto_reply': '#06b6d4', 'automatic_reply': '#06b6d4',
      'spam_complaint': '#f43f5e', 'unsubscribe': '#e11d48',
      'human_reply': '#10b981', 'no_longer': '#e11d48', 'other': '#6b7280'
    };
    return map[status?.toLowerCase()] || '#6b7280';
  };

  const filteredKeywords = keywords.filter(k => {
    const matchesSearch = !keywordSearch || 
      k.keyword?.toLowerCase().includes(keywordSearch.toLowerCase()) ||
      k.type?.toLowerCase().includes(keywordSearch.toLowerCase());
    const matchesType = keywordTypeFilter === 'all' || k.type === keywordTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(totalEmails / emailsPerPage);
  const paginatedEmails = emails;

  // ─── Group emails by date ───
  const groupEmailsByDate = (emails) => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const today = new Date(now);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
    const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
    emails.forEach(email => {
      if (!email.received_at) { groups.older.push(email); return; }
      const emailDate = new Date(email.received_at); emailDate.setHours(0, 0, 0, 0);
      if (emailDate.getTime() === today.getTime()) groups.today.push(email);
      else if (emailDate.getTime() === yesterday.getTime()) groups.yesterday.push(email);
      else if (emailDate >= thisWeekStart) groups.thisWeek.push(email);
      else groups.older.push(email);
    });
    return groups;
  };

  const groupedEmails = groupEmailsByDate(paginatedEmails);
  const activeAccountMeta = useMemo(
    () => accounts.find(acc => acc.email === activeAccount),
    [accounts, activeAccount]
  );

  const formatSyncTimestamp = (value) => {
    if (!value) return 'Never synced';
    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // ─── Effects ───
  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const prevFiltersRef = useRef({ account: null, category: null, search: null, status: null });
  const syncPollingIntervalRef = useRef(null);

  useEffect(() => {
    if (!activeAccount || currentPage < 1) return;
    const filtersChanged = 
      prevFiltersRef.current.account !== activeAccount ||
      prevFiltersRef.current.category !== activeCategory ||
      prevFiltersRef.current.search !== searchQuery ||
      prevFiltersRef.current.status !== statusFilter;
    if (filtersChanged) {
      prevFiltersRef.current = { account: activeAccount, category: activeCategory, search: searchQuery, status: statusFilter };
      if (currentPage !== 1) { setCurrentPage(1); return; }
    }
    fetchEmails(activeAccount, activeCategory, currentPage);
  }, [activeAccount, activeCategory, searchQuery, statusFilter, currentPage, fetchEmails]);

  useEffect(() => {
    if (showKeywordsModal) loadKeywords();
  }, [showKeywordsModal, loadKeywords]);

  useEffect(() => {
    if (!syncPolling.active) {
      if (syncPollingIntervalRef.current) { clearInterval(syncPollingIntervalRef.current); syncPollingIntervalRef.current = null; }
      return;
    }
    syncPollingIntervalRef.current = setInterval(() => {
      fetchAccounts();
      fetchEmails(activeAccount, activeCategory, currentPage, { silent: true });
    }, 5000);
    return () => { if (syncPollingIntervalRef.current) { clearInterval(syncPollingIntervalRef.current); syncPollingIntervalRef.current = null; } };
  }, [syncPolling.active, fetchAccounts, fetchEmails, activeAccount, activeCategory, currentPage]);

  useEffect(() => {
    if (!syncPolling.active) return;
    const activeMeta = accounts.find(acc => acc.email === activeAccount);
    if (activeMeta && !activeMeta.syncing) {
      const lastSyncedAt = activeMeta.last_synced_at ? new Date(activeMeta.last_synced_at).getTime() : 0;
      if (!syncPolling.startedAt || lastSyncedAt >= (syncPolling.startedAt - 1000)) {
        setSyncPolling({ active: false, startedAt: null });
        setSyncFeedback({ message: 'Sync complete', type: 'success' });
        fetchEmails(activeAccount, activeCategory, 1);
      }
    }
  }, [accounts, activeAccount, activeCategory, syncPolling.active, syncPolling.startedAt, fetchEmails]);

  useEffect(() => {
    if (!activeAccount && accounts.length > 0) { setActiveAccount(accounts[0].email); return; }
    if (activeAccount && accounts.length > 0) {
      const exists = accounts.some(acc => acc.email === activeAccount);
      if (!exists) setActiveAccount(accounts[0].email);
    }
  }, [accounts, activeAccount]);

  // ─── Render email item ───
  const renderEmailItem = (email) => {
    const isSelected = selectedEmail === email.id;
    const isRead = email.read;
    return (
      <div
        key={email.id}
        className={`${styles.emailItem} ${isSelected ? styles.emailItemActive : ''} ${isRead ? styles.emailItemRead : styles.emailItemUnread}`}
        onClick={() => fetchEmailContent(email.id)}
      >
        <div className={styles.emailTopRow}>
          <span className={styles.emailFrom}>
            {email.from}
          </span>
          {email.status && email.status !== 'unknown' && (
            <span
              className={styles.statusBadge}
              style={{
                backgroundColor: `${getStatusColor(email.status)}20`,
                color: getStatusColor(email.status),
                border: `1px solid ${getStatusColor(email.status)}40`
              }}
            >
              {formatStatus(email.status)}
            </span>
          )}
          <span className={styles.emailTime}>{formatEmailTime(email.received_at)}</span>
        </div>
        <div className={styles.emailSubject}>{email.subject}</div>
        <div className={styles.emailSnippet}>{email.snippet}</div>
      </div>
    );
  };

  // ─── Render email date group ───
  const renderDateGroup = (label, emailsInGroup) => {
    if (emailsInGroup.length === 0) return null;
    return (
      <React.Fragment key={label}>
        <div className={styles.emailDateHeader}>{label}</div>
        {emailsInGroup.map(renderEmailItem)}
      </React.Fragment>
    );
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  return (
    <div className={styles.emailAppWrapper}>
      <div className={`${styles.emailContainer} ${isFullscreen ? styles.emailContainerFullscreen : ''}`}>
        
        {/* ─── SIDEBAR ─── */}
        <div className={styles.emailSidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Accounts</span>
            <button className={styles.keywordsBtn} onClick={() => setShowKeywordsModal(true)}>
              <CIcon icon={cilPlus} size="sm" />
              <span>Keywords</span>
            </button>
          </div>
          <ul className={styles.accountList}>
            {accountsLoading ? (
              <li className={styles.loadingCenter}><div className={styles.spinner} /></li>
            ) : accounts.length === 0 ? (
              <li style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '0.82rem' }}>
                No connected accounts
              </li>
            ) : (
              accounts.map((accountObj) => {
                const email = accountObj.email;
                const isExpanded = expandedAccounts.has(email);
                const isActive = activeAccount === email;
                const syncDotClass = accountObj.syncing
                  ? styles.syncDotYellow
                  : accountObj.last_synced_at
                    ? styles.syncDotGreen
                    : styles.syncDotGray;
                return (
                  <li key={email} className={styles.accountItem}>
                    <button
                      className={`${styles.accountToggle} ${isActive ? styles.accountToggleActive : ''}`}
                      onClick={() => toggleAccount(email)}
                    >
                      <div
                        className={styles.accountAvatar}
                        style={{ background: `linear-gradient(135deg, hsl(${(email.charCodeAt(0) * 37) % 360}, 55%, 55%), hsl(${(email.charCodeAt(0) * 37 + 40) % 360}, 55%, 45%))` }}
                      >
                        {email.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.accountInfo}>
                        <span className={styles.accountEmail}>{email}</span>
                        <span className={styles.accountSyncTime}>
                          {accountObj.syncing ? 'Syncing…' : formatSyncTimestamp(accountObj.last_synced_at)}
                        </span>
                      </div>
                      <div className={styles.syncDot + ' ' + syncDotClass} />
                      <CIcon 
                        icon={cilChevronRight} 
                        size="sm" 
                        className={`${styles.chevronIcon} ${isExpanded ? styles.chevronExpanded : ''}`} 
                      />
                    </button>
                    {isExpanded && (
                      <ul className={styles.categoryList}>
                        <li
                          className={`${styles.categoryItem} ${isActive && activeCategory === 'Inbox' ? styles.categoryItemActive : ''}`}
                          onClick={() => { if (!isActive) switchAccount(email); setActiveCategory('Inbox'); }}
                        >
                          <CIcon icon={cilInbox} size="sm" /> Inbox
                        </li>
                        <li
                          className={`${styles.categoryItem} ${isActive && activeCategory === 'Spam' ? styles.categoryItemActive : ''}`}
                          onClick={() => { if (!isActive) switchAccount(email); setActiveCategory('Spam'); }}
                        >
                          <CIcon icon={cilWarning} size="sm" /> Spam
                        </li>
                      </ul>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* ─── EMAIL LIST ─── */}
        <div className={styles.emailListContainer}>
          <div className={styles.emailListHeader}>
            <div className={styles.searchRow}>
              <div className={styles.searchInputWrapper}>
                <CIcon icon={cilMagnifyingGlass} size="sm" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search emails…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.emailSearchInput}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All</option>
                <option value="hard_bounce">Hard Bounce</option>
                <option value="soft_bounce">Soft Bounce</option>
                <option value="ratelimit">Ratelimit</option>
                <option value="spam_block">Spam Block</option>
                <option value="auto_reply">Auto Reply</option>
                <option value="automatic_reply">Automatic Reply</option>
                <option value="spam_complaint">Spam Complaint</option>
                <option value="unsubscribe">Unsubscribe</option>
                <option value="human_reply">Human Reply</option>
                <option value="no_longer">No Longer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className={styles.syncRow}>
              <button
                className={styles.syncBtn}
                disabled={!activeAccount || syncButtonLoading || activeAccountMeta?.syncing}
                onClick={handleSyncNow}
              >
                <CIcon 
                  icon={cilReload} 
                  size="sm" 
                  className={activeAccountMeta?.syncing ? styles.syncSpinning : ''} 
                />
                {activeAccountMeta?.syncing ? 'Syncing…' : 'Sync'}
              </button>
              <span className={styles.syncTimeText}>
                {activeAccount
                  ? formatSyncTimestamp(activeAccountMeta?.last_synced_at)
                  : 'Select an account'}
              </span>
            </div>
          </div>

          {syncFeedback.message && (
            <div className={`${styles.syncFeedback} ${
              syncFeedback.type === 'success' ? styles.syncFeedbackSuccess :
              syncFeedback.type === 'danger' ? styles.syncFeedbackDanger : styles.syncFeedbackInfo
            }`}>
              {syncFeedback.message}
            </div>
          )}

          <div className={styles.emailList}>
            {loading && emails.length === 0 ? (
              <div className={styles.loadingCenter}><div className={styles.spinner} /></div>
            ) : emails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {activeAccountMeta?.syncing
                  ? 'Sync in progress. Latest emails will appear shortly.'
                  : 'No emails found for the current filters.'}
              </div>
            ) : (
              <>
                {renderDateGroup('Today', groupedEmails.today)}
                {renderDateGroup('Yesterday', groupedEmails.yesterday)}
                {renderDateGroup('This Week', groupedEmails.thisWeek)}
                {renderDateGroup('Older', groupedEmails.older)}
              </>
            )}
          </div>

          {/* Pagination */}
          {totalEmails > 0 && (
            <div className={styles.emailPagination}>
              <span className={styles.paginationText}>
                Showing <strong>{((currentPage - 1) * emailsPerPage) + 1}–{Math.min(currentPage * emailsPerPage, totalEmails)}</strong> of <strong>{totalEmails}</strong>
              </span>
              <div className={styles.paginationControls}>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage === 1 || loading}
                  onClick={() => { if (currentPage > 1) setCurrentPage(prev => prev - 1); }}
                >
                  <CIcon icon={cilArrowLeft} size="sm" /> Prev
                </button>
                <span className={styles.pageIndicator}>
                  <span className={styles.currentPage}>{currentPage}</span> / {totalPages || 1}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); }}
                >
                  Next <CIcon icon={cilArrowRight} size="sm" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── EMAIL VIEW ─── */}
        <div className={styles.emailView}>
          <div className={styles.emailViewHeader}>
            <button
              className={styles.toggleFullscreenBtn}
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <CIcon icon={cilFullscreen} size="sm" />
            </button>
            <h2 className={styles.emailViewSubject}>
              {emailContent?.messages?.[0]?.subject || 'Select an email to view'}
            </h2>
          </div>

          <div className={styles.emailContentArea}>
            {loadingContent ? (
              <div className={styles.loadingCenter}><div className={styles.spinner} /></div>
            ) : emailContent && emailContent.messages ? (
              <>
                {emailContent.messages.map((msg, index) => (
                  <div key={msg.id || index} className={styles.messageCard}>
                    <div className={styles.messageHeader}>
                      <div
                        className={styles.avatar}
                        style={{ background: `linear-gradient(135deg, hsl(${(msg.from?.charCodeAt(0) || 65) * 37 % 360}, 55%, 55%), hsl(${((msg.from?.charCodeAt(0) || 65) * 37 + 40) % 360}, 55%, 45%))` }}
                      >
                        {msg.from?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className={styles.senderInfo}>
                        <span className={styles.senderName}>{msg.from}</span>
                        <span className={styles.senderEmail}>{msg.from}</span>
                      </div>
                      <div className={styles.messageMeta}>
                        {new Date(msg.date).toLocaleString()}
                      </div>
                    </div>
                    <div className={styles.messageBody}>
                      <div 
                        className={styles.emailBodyContainer}
                        dangerouslySetInnerHTML={{ __html: msg.body || '<p>No content available</p>' }}
                      />
                    </div>
                  </div>
                ))}
                {/* Email Actions */}
                <div className={styles.emailActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleEmailAction(selectedEmail, emailContent.messages[0]?.read ? 'unread' : 'read')}
                  >
                    <CIcon icon={cilEnvelopeOpen} size="sm" />
                    {emailContent.messages[0]?.read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  {activeCategory === 'Inbox' && (
                    <button
                      className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
                      onClick={() => handleEmailAction(selectedEmail, 'move_to_spam')}
                    >
                      <CIcon icon={cilWarning} size="sm" />
                      Spam
                    </button>
                  )}
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                    onClick={() => handleEmailAction(selectedEmail, 'delete')}
                  >
                    <CIcon icon={cilTrash} size="sm" />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                <CIcon icon={cilEnvelopeOpen} size="3xl" className={styles.emptyStateIcon} />
                <span className={styles.emptyStateText}>Select an email to view</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── KEYWORDS MODAL ─── */}
      {showKeywordsModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setShowKeywordsModal(false); }}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span className={styles.modalTitle}>Manage Keywords</span>
              <button className={styles.modalCloseBtn} onClick={() => setShowKeywordsModal(false)}>
                <CIcon icon={cilX} size="sm" />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Add keyword */}
              <div className={styles.addKeywordRow}>
                <input
                  type="text"
                  placeholder="Keywords (comma-separated)"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addKeyword(); }}
                />
                <select value={newKeywordType} onChange={(e) => setNewKeywordType(e.target.value)}>
                  <option value="unsubscribe">Unsubscribe</option>
                  <option value="automatic_reply">Automatic Reply</option>
                  <option value="no_longer">No Longer</option>
                  <option value="hard_bounce">Hard Bounce</option>
                  <option value="soft_bounce">Soft Bounce</option>
                </select>
                <button className={styles.addBtn} onClick={addKeyword}>Add</button>
              </div>

              {/* Filter */}
              <div className={styles.filterRow}>
                <input
                  type="text"
                  placeholder="Search keywords…"
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                />
                <select value={keywordTypeFilter} onChange={(e) => setKeywordTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="unsubscribe">Unsubscribe</option>
                  <option value="automatic_reply">Automatic Reply</option>
                  <option value="no_longer">No Longer</option>
                  <option value="hard_bounce">Hard Bounce</option>
                  <option value="soft_bounce">Soft Bounce</option>
                </select>
              </div>

              {/* Keywords table */}
              <table className={styles.keywordsTable}>
                <thead>
                  <tr>
                    <th>Keyword</th>
                    <th>Type</th>
                    <th style={{ width: 60 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        No keywords found
                      </td>
                    </tr>
                  ) : (
                    filteredKeywords.map((keyword) => (
                      <tr key={keyword._id}>
                        <td>{keyword.keyword}</td>
                        <td>
                          <span
                            className={styles.statusBadge}
                            style={{
                              backgroundColor: `${getStatusColor(keyword.type)}20`,
                              color: getStatusColor(keyword.type),
                              border: `1px solid ${getStatusColor(keyword.type)}40`
                            }}
                          >
                            {formatStatus(keyword.type)}
                          </span>
                        </td>
                        <td>
                          <button className={styles.deleteBtn} onClick={() => deleteKeyword(keyword._id)}>
                            <CIcon icon={cilTrash} size="sm" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Engage;
