import React, { useState, useEffect, useMemo } from 'react';
import {
  CSpinner,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CButton,
  CRow,
  CCol
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilBarChart,
  cilPlus,
  cilReload,
  cilPeople,
  cilLayers,
  cilEnvelopeClosed
} from '@coreui/icons';
import styles from './emailscheduling.module.css';
import DynamicModal from 'src/application/Components/DynamicModal';
import ViewModal from 'src/application/Components/ViewModal';
import TemplateEditor from 'src/resources/views/components/TemplateEditor';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Emailscheduling = () => {
  const [activeKey, setActiveKey] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  // Search & Pagination State (matching mailconfig)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Table Data State
  const [audiences, setAudiences] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Stats KPI State
  const [stats, setStats] = useState({
    audiences: 0,
    templates: 0,
    campaigns: 0,
    inboxes: 20
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [modalConfig, setModalConfig] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [error, setError] = useState(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceModalTab, setAudienceModalTab] = useState('new');
  const [newAudienceName, setNewAudienceName] = useState('');
  const [existingAudienceId, setExistingAudienceId] = useState('');
  const [audienceModalError, setAudienceModalError] = useState(null);
  const [audienceModalLoading, setAudienceModalLoading] = useState(false);
  const [audienceList, setAudienceList] = useState([]);
  const [audienceListLoading, setAudienceListLoading] = useState(false);

  // Audience Hooks
  const audienceToken = 'central_emails_audience';
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(audienceToken);
  const { handleDelete } = useDelete(audienceToken, () => {
    setRefreshTrigger(prev => prev + 1);
  });

  // Templates Table Configuration
  const templateToken = 'central_emails_templates';
  const { handleDelete: handleTemplateDelete } = useDelete(templateToken, () => {
    setRefreshTrigger(prev => prev + 1);
  });

  // Template Editor State
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateEditorSaving, setTemplateEditorSaving] = useState(false);
  const [templatePrefillLoading, setTemplatePrefillLoading] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Campaigns State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [campaignTemplateId, setCampaignTemplateId] = useState('');
  const [campaignAudienceId, setCampaignAudienceId] = useState('');
  const [campaignStatus, setCampaignStatus] = useState('Draft');
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignOptionsLoading, setCampaignOptionsLoading] = useState(false);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [audienceOptions, setAudienceOptions] = useState([]);

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  // Fetch all scheduling data
  const loadSchedulingData = async () => {
    setIsLoadingData(true);
    try {
      const authAxios = getAuthAxios();
      const [audRes, tplRes, campRes] = await Promise.allSettled([
        authAxios.get('/api/audiences'),
        authAxios.get('/api/templates'),
        authAxios.get('/api/campaigns')
      ]);

      const auds = audRes.status === 'fulfilled' ? (audRes.value.data?.data || audRes.value.data || []) : [];
      const tpls = tplRes.status === 'fulfilled' ? (Array.isArray(tplRes.value.data) ? tplRes.value.data : []) : [];
      const camps = campRes.status === 'fulfilled' ? (Array.isArray(campRes.value.data) ? campRes.value.data : []) : [];

      if (Array.isArray(auds)) setAudiences(auds);
      if (Array.isArray(tpls)) setTemplates(tpls);
      if (Array.isArray(camps)) setCampaigns(camps);

      setStats({
        audiences: Array.isArray(auds) ? auds.length : 0,
        templates: Array.isArray(tpls) ? tpls.length : 0,
        campaigns: Array.isArray(camps) ? camps.length : 0,
        inboxes: 20
      });
    } catch (err) {
      console.error('Failed to load scheduling data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadSchedulingData();
  }, [refreshTrigger]);

  // Reset pagination & search when switching tabs
  useEffect(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setCurrentPage(1);
  }, [activeKey]);

  // Fetch Template details
  const fetchTemplateDetails = async (templateId) => {
    if (!templateId) {
      throw new Error('Template identifier is missing.');
    }
    const authAxios = getAuthAxios();
    const response = await authAxios.get(`/api/templates/${templateId}`);
    return response.data;
  };

  // Audience Modal Fetch Options
  const fetchAudienceOptions = async () => {
    setAudienceListLoading(true);
    setAudienceModalError(null);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/audiences');
      setAudienceList(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch audiences:', err);
      setAudienceModalError(err.response?.data?.message || 'Unable to load audiences.');
    } finally {
      setAudienceListLoading(false);
    }
  };

  useEffect(() => {
    if (showAudienceModal) {
      fetchAudienceOptions();
    }
  }, [showAudienceModal]);

  const openAudienceModal = () => {
    setAudienceModalTab('new');
    setNewAudienceName('');
    setExistingAudienceId('');
    setAudienceModalError(null);
    setShowAudienceModal(true);
  };

  const handleCreateAudience = async () => {
    if (!newAudienceName.trim()) {
      setAudienceModalError('Please enter a name for the audience.');
      return;
    }
    setAudienceModalError(null);
    setAudienceModalLoading(true);
    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/audiences', {
        name: newAudienceName.trim()
      });
      if (response.data?.status) {
        setShowAudienceModal(false);
        setNewAudienceName('');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Failed to create audience:', err);
      setAudienceModalError(err.response?.data?.message || 'Failed to create audience.');
    } finally {
      setAudienceModalLoading(false);
    }
  };

  const handleEditExistingAudience = () => {
    if (!existingAudienceId) {
      setAudienceModalError('Please choose an audience to edit.');
      return;
    }
    setShowAudienceModal(false);
    navigate(`/central/emailsystem/audiences/${existingAudienceId}`);
  };

  const handleAdd = () => {
    if (activeKey === 1) {
      openAudienceModal();
    } else if (activeKey === 2) {
      handleAddTemplate();
    } else if (activeKey === 3) {
      handleAddCampaign();
    }
  };

  const handleAddTemplate = () => {
    setSelectedTemplate(null);
    setTemplatePrefillLoading(false);
    setShowTemplateEditor(true);
  };

  const handleEditTemplate = async (template) => {
    const templateId = template?.id || template?._id;
    if (!templateId) {
      alert('Template ID is missing.');
      return;
    }

    setSelectedTemplate(null);
    setShowTemplateEditor(true);
    setTemplatePrefillLoading(true);
    try {
      const templateDetails = await fetchTemplateDetails(templateId);
      setSelectedTemplate(templateDetails);
    } catch (err) {
      console.error('Failed to load template:', err);
      alert(err.response?.data?.message || 'Failed to load template details.');
      setShowTemplateEditor(false);
    } finally {
      setTemplatePrefillLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData) => {
    setTemplateEditorSaving(true);
    try {
      const authAxios = getAuthAxios();
      const url = selectedTemplate 
        ? `/api/templates/${selectedTemplate.id || selectedTemplate._id}`
        : '/api/templates';
      const method = selectedTemplate ? 'PUT' : 'POST';

      const response = await authAxios({
        method,
        url,
        data: templateData
      });

      if (response.data?.status || response.status === 200) {
        setShowTemplateEditor(false);
        setSelectedTemplate(null);
        setRefreshTrigger(prev => prev + 1);
        alert(selectedTemplate ? 'Template updated successfully!' : 'Template created successfully!');
      } else {
        alert(response.data?.message || 'Failed to save template');
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      alert(err.response?.data?.message || 'Failed to save template');
    } finally {
      setTemplateEditorSaving(false);
    }
  };

  const handlePreviewTemplate = async (template) => {
    try {
      const templateId = template?.id || template?._id;
      const templateDetails = await fetchTemplateDetails(templateId);
      setPreviewTitle(templateDetails.title || 'Template Preview');
      setPreviewContent(templateDetails.content || '');
      setShowTemplatePreview(true);
    } catch (err) {
      console.error('Failed to load template preview:', err);
      alert(err.response?.data?.message || 'Failed to load template preview.');
    }
  };

  const resetCampaignForm = () => {
    setEditingCampaign(null);
    setCampaignName('');
    setCampaignTemplateId('');
    setCampaignAudienceId('');
    setCampaignStatus('Draft');
  };

  const fetchCampaignOptions = async () => {
    setCampaignOptionsLoading(true);
    try {
      const authAxios = getAuthAxios();
      const [templatesRes, audiencesRes] = await Promise.all([
        authAxios.get('/api/templates'),
        authAxios.get('/api/audiences')
      ]);
      setTemplateOptions(templatesRes.data || []);
      setAudienceOptions(audiencesRes.data?.data || audiencesRes.data || []);
    } catch (err) {
      console.error('Failed to load campaign options:', err);
      alert(err.response?.data?.message || 'Failed to load templates/audiences for campaign.');
    } finally {
      setCampaignOptionsLoading(false);
    }
  };

  const handleAddCampaign = async () => {
    resetCampaignForm();
    await fetchCampaignOptions();
    setShowCampaignModal(true);
  };

  const handleEditCampaign = async (row) => {
    const campaignId = row?.id || row?._id;
    if (!campaignId) {
      alert('Campaign ID is missing.');
      return;
    }
    try {
      await fetchCampaignOptions();
      const authAxios = getAuthAxios();
      const res = await authAxios.get(`/api/campaigns/${campaignId}`);
      const data = res.data;
      setEditingCampaign(data);
      setCampaignName(data.name || '');
      setCampaignTemplateId(String(data.template_id || ''));
      setCampaignAudienceId(String(data.audience_id || ''));
      setCampaignStatus(data.status || 'Draft');
      setShowCampaignModal(true);
    } catch (err) {
      console.error('Failed to load campaign:', err);
      alert(err.response?.data?.message || 'Failed to load campaign details.');
    }
  };

  const handleSaveCampaign = async () => {
    if (!campaignName.trim()) {
      alert('Campaign name is required.');
      return;
    }
    if (!campaignTemplateId) {
      alert('Please select a template.');
      return;
    }
    if (!campaignAudienceId) {
      alert('Please select an audience.');
      return;
    }

    setCampaignSaving(true);
    try {
      const authAxios = getAuthAxios();
      const payload = {
        name: campaignName.trim(),
        template_id: campaignTemplateId,
        audience_id: campaignAudienceId,
        status: campaignStatus || 'Draft'
      };
      const url = editingCampaign
        ? `/api/campaigns/${editingCampaign.id || editingCampaign._id}`
        : '/api/campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';

      const res = await authAxios({
        method,
        url,
        data: payload
      });

      if (res.data?.status || res.status === 200) {
        setShowCampaignModal(false);
        resetCampaignForm();
        setRefreshTrigger(prev => prev + 1);
        alert(editingCampaign ? 'Campaign updated successfully!' : 'Campaign created successfully!');
      } else {
        alert(res.data?.message || 'Failed to save campaign');
      }
    } catch (err) {
      console.error('Failed to save campaign:', err);
      alert(err.response?.data?.message || 'Failed to save campaign');
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (row) => {
    const campaignId = row?.id || row?._id;
    if (!campaignId) {
      alert('Campaign ID is missing.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const authAxios = getAuthAxios();
      const res = await authAxios.delete(`/api/campaigns/${campaignId}`);
      if (res.data?.status || res.status === 200) {
        setRefreshTrigger(prev => prev + 1);
        alert('Campaign deleted successfully.');
      } else {
        alert(res.data?.message || 'Failed to delete campaign');
      }
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      alert(err.response?.data?.message || 'Failed to delete campaign');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const token = modalMode === 'add' ? `${audienceToken}_as` : `${audienceToken}_es`;
      const recordId = selectedRecord?._id || selectedRecord?.id;
      const payload = recordId 
        ? { ...formData, id: recordId, save_token: token }
        : { ...formData, save_token: token };

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

  // ─── Filtered Data Lists for Table ───
  const filteredAudiences = useMemo(() => {
    if (!searchQuery.trim()) return audiences;
    const q = searchQuery.toLowerCase();
    return audiences.filter(a => (a.name || '').toLowerCase().includes(q) || String(a.id).includes(q));
  }, [audiences, searchQuery]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(t => 
      (t.title || '').toLowerCase().includes(q) || 
      (t.subject || '').toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = !searchQuery.trim() || (c.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, searchQuery, statusFilter]);

  // Current Active List & Pagination
  const currentList = activeKey === 1 ? filteredAudiences : activeKey === 2 ? filteredTemplates : filteredCampaigns;
  const totalPages = Math.max(1, Math.ceil(currentList.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentList.slice(start, start + itemsPerPage);
  }, [currentList, currentPage, itemsPerPage]);

  return (
    <div className={styles.container}>
      {/* ─── Hero Header Row ─── */}
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <div className={styles.badgePill}>
            <span className={styles.pulseDot} />
            OUTREACH AUTOMATION ENGINE
          </div>
          <h1 className={styles.mainTitle}>Email Campaigns &amp; Scheduling</h1>
          <p className={styles.subTitle}>
            Manage target audiences, design reusable outreach templates, and launch multi-touch email campaigns with high deliverability.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            title="Refresh Data"
          >
            <CIcon icon={cilReload} size="sm" />
            Refresh
          </button>

          {activeKey === 1 && (
            <button className={styles.actionBtn} onClick={handleAdd}>
              <CIcon icon={cilPlus} size="sm" />
              Add Audience
            </button>
          )}
          {activeKey === 2 && (
            <button className={styles.actionBtn} onClick={handleAddTemplate}>
              <CIcon icon={cilPlus} size="sm" />
              Add Template
            </button>
          )}
          {activeKey === 3 && (
            <button className={styles.actionBtn} onClick={handleAddCampaign}>
              <CIcon icon={cilPlus} size="sm" />
              Add Campaign
            </button>
          )}
        </div>
      </div>

      {/* ─── Stats KPI Row (Matching Mail Config) ─── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconViolet}`}>
            <CIcon icon={cilPeople} size="lg" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.audiences}</span>
            <span className={styles.statLabel}>Target Audiences</span>
            <span className={styles.statSub}>Verified prospect segments</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconIndigo}`}>
            <CIcon icon={cilLayers} size="lg" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.templates}</span>
            <span className={styles.statLabel}>Outreach Templates</span>
            <span className={styles.statSub}>Dynamic B2B copy sets</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconEmerald}`}>
            <CIcon icon={cilBarChart} size="lg" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.campaigns}</span>
            <span className={styles.statLabel}>Active Campaigns</span>
            <span className={styles.statSub}>Multi-stage sequences</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrapper} ${styles.statIconCyan}`}>
            <CIcon icon={cilEnvelopeClosed} size="lg" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats.inboxes}</span>
            <span className={styles.statLabel}>Connected Senders</span>
            <span className={styles.statSub}>High deliverability health</span>
          </div>
        </div>
      </div>

      {/* ─── Navigation Tabs Bar (Matching Mail Config) ─── */}
      <div className={styles.navRow}>
        <div className={styles.segmentedTabs} role="tablist">
          <button
            role="tab"
            aria-selected={activeKey === 1}
            className={`${styles.tabItem} ${activeKey === 1 ? styles.tabItemActive : ''}`}
            onClick={() => setActiveKey(1)}
          >
            <CIcon icon={cilPeople} size="sm" />
            Audience
            <span className={styles.tabBadge}>{stats.audiences}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeKey === 2}
            className={`${styles.tabItem} ${activeKey === 2 ? styles.tabItemActive : ''}`}
            onClick={() => setActiveKey(2)}
          >
            <CIcon icon={cilLayers} size="sm" />
            Templates
            <span className={styles.tabBadge}>{stats.templates}</span>
          </button>

          <button
            role="tab"
            aria-selected={activeKey === 3}
            className={`${styles.tabItem} ${activeKey === 3 ? styles.tabItemActive : ''}`}
            onClick={() => setActiveKey(3)}
          >
            <CIcon icon={cilBarChart} size="sm" />
            Campaigns
            <span className={styles.tabBadge}>{stats.campaigns}</span>
          </button>
        </div>
      </div>

      {/* ─── Main Inboxes & Scheduling Table (Exact Match to Mail Config) ─── */}
      <div className={styles.tableContainer}>
        {/* Table Toolbar */}
        <div className={styles.tableToolbar}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={
                activeKey === 1
                  ? 'Search audiences by segment name...'
                  : activeKey === 2
                  ? 'Search templates by title or subject...'
                  : 'Search campaigns by name...'
              }
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className={styles.filterGroup}>
            {activeKey === 3 && (
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Campaign Statuses</option>
                <option value="Sending">Sending Only</option>
                <option value="Draft">Draft Only</option>
                <option value="Completed">Completed Only</option>
              </select>
            )}
          </div>
        </div>

        {/* Table Body / Responsive Content */}
        <div className={styles.tableResponsive}>
          {isLoadingData ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: '#94a3b8' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(148, 163, 184, 0.2)',
                  borderTopColor: '#8b5cf6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: '1rem'
                }}
              />
              <div>Loading scheduling records...</div>
            </div>
          ) : paginatedList.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <CIcon
                  icon={activeKey === 1 ? cilPeople : activeKey === 2 ? cilLayers : cilBarChart}
                  size="2xl"
                />
              </div>
              <h3 className={styles.emptyTitle}>
                {activeKey === 1
                  ? 'No audiences found'
                  : activeKey === 2
                  ? 'No templates found'
                  : 'No campaigns found'}
              </h3>
              <p className={styles.emptyText}>
                {searchQuery || statusFilter !== 'all'
                  ? 'No records match your search filters. Try clearing your search parameters.'
                  : activeKey === 1
                  ? 'Get started by creating your first target audience segment.'
                  : activeKey === 2
                  ? 'Design your first reusable cold outreach template.'
                  : 'Schedule your first multi-stage cold outreach campaign.'}
              </p>
              <button className={styles.actionBtn} onClick={handleAdd} style={{ marginTop: '0.5rem' }}>
                <CIcon icon={cilPlus} size="sm" />
                {activeKey === 1 ? 'Add Audience' : activeKey === 2 ? 'Add Template' : 'Add Campaign'}
              </button>
            </div>
          ) : (
            <>
              {/* 1. Audience Table */}
              {activeKey === 1 && (
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Audience Segment</th>
                      <th>Created Date</th>
                      <th>Last Updated</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((aud, index) => {
                      const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={aud.id || aud._id}>
                          <td>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>
                              #{aud.id || displayIndex}
                            </span>
                          </td>
                          <td>
                            <div className={styles.accountCell}>
                              <div className={styles.providerAvatar} style={{ color: '#a78bfa' }}>
                                <CIcon icon={cilPeople} size="sm" />
                              </div>
                              <div className={styles.accountMeta}>
                                <div className={styles.accountEmail}>{aud.name}</div>
                                <div className={styles.accountName}>
                                  Verified prospect segment • ID: {aud.id || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                              {aud.created_at
                                ? new Date(aud.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                              {aud.updated_at
                                ? new Date(aud.updated_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '—'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                              <span className={styles.statusDotActive} />
                              Active Segment
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button
                                className={styles.iconBtn}
                                title="View Segment Details"
                                onClick={() => handleView(aud)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="3" r="3" />
                                </svg>
                              </button>
                              <button
                                className={styles.iconBtn}
                                title="Edit Audience Leads"
                                onClick={() => {
                                  const audienceId = aud.id || aud._id;
                                  if (!audienceId) {
                                    alert('Audience ID is missing.');
                                    return;
                                  }
                                  navigate(`/central/emailsystem/audiences/${audienceId}`);
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title="Delete Audience"
                                onClick={() => handleDelete(aud)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

              {/* 2. Templates Table */}
              {activeKey === 2 && (
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Template Title</th>
                      <th>Subject Line</th>
                      <th>Format</th>
                      <th>Last Modified</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((tpl, index) => {
                      const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      return (
                        <tr key={tpl.id || tpl._id}>
                          <td>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>
                              #{tpl.id || displayIndex}
                            </span>
                          </td>
                          <td>
                            <div className={styles.accountCell}>
                              <div className={styles.providerAvatar} style={{ color: '#818cf8' }}>
                                <CIcon icon={cilLayers} size="sm" />
                              </div>
                              <div className={styles.accountMeta}>
                                <div className={styles.accountEmail}>{tpl.title}</div>
                                <div className={styles.accountName}>Dynamic B2B Email Template</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 500 }}>
                              {tpl.subject || 'No Subject Line Set'}
                            </span>
                          </td>
                          <td>
                            <span className={styles.typeBadge}>HTML / Rich Text</span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                              {tpl.last_modified || tpl.updated_at
                                ? new Date(tpl.last_modified || tpl.updated_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '—'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button
                                className={styles.iconBtn}
                                title="Preview Template Content"
                                onClick={() => handlePreviewTemplate(tpl)}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                className={styles.iconBtn}
                                title="Edit Template Copy"
                                onClick={() => handleEditTemplate(tpl)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title="Delete Template"
                                onClick={() => handleTemplateDelete(tpl)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

              {/* 3. Campaigns Table */}
              {activeKey === 3 && (
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Campaign Name</th>
                      <th>Assigned Template</th>
                      <th>Target Audience</th>
                      <th>Status</th>
                      <th>Created Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((camp, index) => {
                      const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                      const tplName =
                        templates.find(t => String(t.id) === String(camp.template_id))?.title ||
                        `Template #${camp.template_id || 'N/A'}`;
                      const audName =
                        audiences.find(a => String(a.id) === String(camp.audience_id))?.name ||
                        `Audience #${camp.audience_id || 'N/A'}`;
                      const statusLower = (camp.status || 'draft').toLowerCase();
                      const isSending = statusLower === 'sending';
                      const isCompleted = statusLower === 'completed';

                      return (
                        <tr key={camp.id || camp._id}>
                          <td>
                            <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>
                              #{camp.id || displayIndex}
                            </span>
                          </td>
                          <td>
                            <div className={styles.accountCell}>
                              <div className={styles.providerAvatar} style={{ color: '#34d399' }}>
                                <CIcon icon={cilBarChart} size="sm" />
                              </div>
                              <div className={styles.accountMeta}>
                                <div className={styles.accountEmail}>{camp.name}</div>
                                <div className={styles.accountName}>Multi-Touch Outreach Sequence</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{tplName}</span>
                          </td>
                          <td>
                            <span style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{audName}</span>
                          </td>
                          <td>
                            <span
                              className={`${styles.statusBadge} ${
                                isSending
                                  ? styles.statusActive
                                  : isCompleted
                                  ? styles.typeBadge
                                  : styles.statusPending
                              }`}
                            >
                              <span
                                className={
                                  isSending
                                    ? styles.statusDotActive
                                    : isCompleted
                                    ? styles.statusDotPending
                                    : styles.statusDotPending
                                }
                              />
                              {camp.status || 'Draft'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                              {camp.created_at
                                ? new Date(camp.created_at).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '—'}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button
                                className={styles.iconBtn}
                                title="Edit / Configure Campaign"
                                onClick={() => handleEditCampaign(camp)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                                title="Delete Campaign"
                                onClick={() => handleDeleteCampaign(camp)}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
            </>
          )}
        </div>

        {/* ─── Pagination Bar (Exact Match to Mail Config) ─── */}
        {currentList.length > 0 && (
          <div className={styles.paginationBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Showing{' '}
                <strong style={{ color: '#ffffff' }}>
                  {(currentPage - 1) * itemsPerPage + 1}
                </strong>{' '}
                to{' '}
                <strong style={{ color: '#ffffff' }}>
                  {Math.min(currentPage * itemsPerPage, currentList.length)}
                </strong>{' '}
                of{' '}
                <strong style={{ color: '#ffffff' }}>{currentList.length}</strong>{' '}
                records
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
                  <option value={25}>25 per page</option>
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

      {/* ─── Audience Modal ─── */}
      <CModal
        visible={showAudienceModal}
        onClose={() => {
          if (!audienceModalLoading) {
            setShowAudienceModal(false);
          }
        }}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Add Audience</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {audienceModalError && (
            <CAlert color="danger" className="mb-3" dismissible onClose={() => setAudienceModalError(null)}>
              {audienceModalError}
            </CAlert>
          )}

          <CNav variant="tabs" role="tablist">
            <CNavItem>
              <CNavLink
                active={audienceModalTab === 'new'}
                component="button"
                onClick={() => setAudienceModalTab('new')}
              >
                New Audience
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink
                active={audienceModalTab === 'existing'}
                component="button"
                onClick={() => setAudienceModalTab('existing')}
              >
                Existing Audience
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent className="mt-4">
            <CTabPane role="tabpanel" visible={audienceModalTab === 'new'}>
              <CFormLabel className="fw-semibold">
                Audience Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                placeholder="Enter audience name"
                value={newAudienceName}
                onChange={e => setNewAudienceName(e.target.value)}
                disabled={audienceModalLoading}
              />
            </CTabPane>
            <CTabPane role="tabpanel" visible={audienceModalTab === 'existing'}>
              <CFormLabel className="fw-semibold">
                Existing Audience <span className="text-danger">*</span>
              </CFormLabel>
              <div className="d-flex align-items-center gap-2">
                <CFormSelect
                  value={existingAudienceId}
                  onChange={e => setExistingAudienceId(e.target.value)}
                  disabled={audienceListLoading}
                >
                  <option value="">Select an audience</option>
                  {audienceList.map(audience => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name}
                    </option>
                  ))}
                </CFormSelect>
                {audienceListLoading && <CSpinner size="sm" />}
              </div>
              {!audienceListLoading && audienceList.length === 0 && (
                <small className="text-muted">No audiences available yet. Create a new one first.</small>
              )}
            </CTabPane>
          </CTabContent>
        </CModalBody>
        <CModalFooter className="d-flex justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setShowAudienceModal(false)}
            disabled={audienceModalLoading}
          >
            Close
          </CButton>
          {audienceModalTab === 'new' ? (
            <CButton
              color="primary"
              onClick={handleCreateAudience}
              disabled={audienceModalLoading || !newAudienceName.trim()}
            >
              {audienceModalLoading && <CSpinner size="sm" className="me-2" />}
              Create Audience
            </CButton>
          ) : (
            <CButton color="primary" onClick={handleEditExistingAudience} disabled={!existingAudienceId}>
              Edit Audience
            </CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* ─── Dynamic Modal for Add/Edit ─── */}
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

      {/* ─── View Modal ─── */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />

      {/* ─── Template Editor Modal ─── */}
      <TemplateEditor
        show={showTemplateEditor}
        onClose={() => {
          if (!templateEditorSaving) {
            setShowTemplateEditor(false);
            setSelectedTemplate(null);
            setTemplatePrefillLoading(false);
          }
        }}
        onSave={handleSaveTemplate}
        template={selectedTemplate}
        loading={templateEditorSaving}
        prefillLoading={templatePrefillLoading}
      />

      {/* ─── Template Preview Modal ─── */}
      <CModal visible={showTemplatePreview} onClose={() => setShowTemplatePreview(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{previewTitle}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div
            style={{
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '18px',
              minHeight: '350px',
              maxHeight: '550px',
              overflow: 'auto',
              background: 'rgba(15, 23, 42, 0.6)',
              color: '#f1f5f9'
            }}
            dangerouslySetInnerHTML={{ __html: previewContent }}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowTemplatePreview(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ─── Campaign Add/Edit Modal ─── */}
      <CModal
        visible={showCampaignModal}
        onClose={() => {
          if (!campaignSaving) {
            setShowCampaignModal(false);
          }
        }}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>{editingCampaign ? 'Edit Campaign' : 'Add Campaign'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel className="fw-semibold">
                Campaign Name <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="Enter campaign name"
                maxLength={255}
                disabled={campaignSaving || campaignOptionsLoading}
              />
            </CCol>
          </CRow>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel className="fw-semibold">
                Select Template <span className="text-danger">*</span>
              </CFormLabel>
              <CFormSelect
                value={campaignTemplateId}
                onChange={e => setCampaignTemplateId(e.target.value)}
                disabled={campaignSaving || campaignOptionsLoading}
              >
                <option value="">-- Select Template --</option>
                {templateOptions.map(tpl => (
                  <option key={tpl.id || tpl._id} value={tpl.id || tpl._id}>
                    {tpl.title}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormLabel className="fw-semibold">
                Select Audience <span className="text-danger">*</span>
              </CFormLabel>
              <CFormSelect
                value={campaignAudienceId}
                onChange={e => setCampaignAudienceId(e.target.value)}
                disabled={campaignSaving || campaignOptionsLoading}
              >
                <option value="">-- Select Audience --</option>
                {audienceOptions.map(aud => (
                  <option key={aud.id || aud._id} value={aud.id || aud._id}>
                    {aud.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Status</CFormLabel>
            <CFormSelect
              value={campaignStatus}
              onChange={e => setCampaignStatus(e.target.value)}
              disabled={campaignSaving}
            >
              <option value="Draft">Draft</option>
              <option value="Sending">Sending</option>
              <option value="Completed">Completed</option>
            </CFormSelect>
          </div>
          {campaignOptionsLoading && (
            <div className="d-flex align-items-center gap-2 text-muted">
              <CSpinner size="sm" />
              <span>Loading templates and audiences...</span>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => {
              if (!campaignSaving) {
                setShowCampaignModal(false);
              }
            }}
            disabled={campaignSaving}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleSaveCampaign}
            disabled={
              campaignSaving ||
              campaignOptionsLoading ||
              !campaignName.trim() ||
              !campaignTemplateId ||
              !campaignAudienceId
            }
          >
            {campaignSaving && <CSpinner size="sm" className="me-2" />}
            {editingCampaign ? 'Update Campaign' : 'Save Campaign'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
};

export default Emailscheduling;
