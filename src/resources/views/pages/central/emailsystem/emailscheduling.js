import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
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
  CRow,
  CCol
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBarChart, cilPlus, cilReload } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
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
  
  // Audience Table Configuration
  const audienceToken = 'central_emails_audience';
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(audienceToken);
  const { handleDelete } = useDelete(audienceToken, () => {
    setRefreshTrigger(prev => prev + 1);
  });

  // Templates Table Configuration
  const templateToken = 'central_emails_templates';
  const { handleView: handleTemplateView, showViewModal: showTemplateViewModal, viewData: templateViewData, setShowViewModal: setShowTemplateViewModal, setViewData: setTemplateViewData } = useViewModal(templateToken);
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
  const campaignToken = 'central_emails_campaigns';
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

  const fetchTemplateDetails = async (templateId) => {
    if (!templateId) {
      throw new Error('Template identifier is missing.');
    }
    const authAxios = getAuthAxios();
    const response = await authAxios.get(`/api/templates/${templateId}`);
    return response.data;
  };

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
        setRefreshTrigger((prev) => prev + 1);
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

  const fetchFormConfig = async (mode, recordId = null) => {
    try {
      const timestamp = new Date().getTime();
      const token = mode === 'add' ? `${audienceToken}_a` : `${audienceToken}_e`;
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
    if (activeKey === 1) {
      openAudienceModal();
    } else if (activeKey === 2) {
      handleAddTemplate();
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

  return (
    <div className="container-fluid">
     <CCardHeader 
                className="d-flex align-items-center justify-content-between rounded-3"
                style={{ background: '#5856D6', color: '#fff', borderBottom: '2px solid #e0e7ef' }}
              >
                <h5 className="mb-0" style={{ fontWeight: 700, letterSpacing: '0.5px',padding: '15px' ,borderRadius: '8px' }}>
                  Email Campings Scheduling
                </h5>
              </CCardHeader>
      {/* Tabs Navigation */}
      <div className="d-flex justify-content-between align-items-center mb-3 mt-3">
        <CNav
          variant="pills"
          role="tablist"
          className="data-skl-action"
          style={{ background: '#ffffff', borderRadius: 999, padding: '4px 6px', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' }}
        >
          <CNavItem>
            <CNavLink
              active={activeKey === 1}
              component="button"
              role="tab"
              aria-controls="audience"
              aria-selected={activeKey === 1}
              onClick={() => setActiveKey(1)}
              className="px-4 py-2 fw-semibold"
              style={{
                borderRadius: 999,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: activeKey === 1 ? '#4c6fff' : 'transparent',
                color: activeKey === 1 ? '#ffffff' : '#334155'
              }}
            >
              Audience
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeKey === 2}
              component="button"
              role="tab"
              aria-controls="templates"
              aria-selected={activeKey === 2}
              onClick={() => setActiveKey(2)}
              className="px-4 py-2 fw-semibold"
              style={{
                borderRadius: 999,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: activeKey === 2 ? '#4c6fff' : 'transparent',
                color: activeKey === 2 ? '#ffffff' : '#334155'
              }}
            >
              <CIcon icon={cilPlus} size="sm" />
              Templates
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink
              active={activeKey === 3}
              component="button"
              role="tab"
              aria-controls="campaigns"
              aria-selected={activeKey === 3}
              onClick={() => setActiveKey(3)}
              className="px-4 py-2 fw-semibold"
              style={{
                borderRadius: 999,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: activeKey === 3 ? '#4c6fff' : 'transparent',
                color: activeKey === 3 ? '#ffffff' : '#334155'
              }}
            >
              <CIcon icon={cilBarChart} size="sm" />
              Campaigns
            </CNavLink>
          </CNavItem>
        </CNav>
        
        {/* Action Area */}
        <div className="action-area d-flex align-items-center gap-2">
          {activeKey === 1 && (
            <>
              <CButton color="primary" className="d-flex align-items-center" onClick={handleAdd}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Audience
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                <CIcon icon={cilReload} />
              </CButton>
            </>
          )}
          {activeKey === 2 && (
            <>
              <CButton color="primary" className="d-flex align-items-center" onClick={handleAddTemplate}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Template
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                <CIcon icon={cilReload} />
              </CButton>
            </>
          )}
          {activeKey === 3 && (
            <>
              <CButton color="primary" className="d-flex align-items-center" onClick={handleAddCampaign}>
                <CIcon icon={cilPlus} className="me-2" />
                Add Campaign
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setRefreshTrigger(prev => prev + 1)}>
                <CIcon icon={cilReload} />
              </CButton>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <CTabContent className="mb-4">
        {/* Audience Tab */}
        <CTabPane role="tabpanel" aria-labelledby="audience-tab" visible={activeKey === 1}>
          <CCard>
            <CCardHeader>Audience Management</CCardHeader>
            <CCardBody>
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}
              <DynamicTable
                key={refreshTrigger}
                token={`${audienceToken}_t`}
                tableName="audiences"
                system="central"
                columns={{ 
                  id: ['id', true], 
                  name: ['name', true], 
                  created_at: ['created_at', true],
                  updated_at: ['updated_at', true]
                }}
                custom={[]}
                reqSet={{ 
                  token: `${audienceToken}_t`, 
                  key: audienceToken,
                  table: 'audiences', 
                  actions: 'cevd', 
                  act: 'id', 
                  system: 'central' 
                }}
                onAction={(actionType, row) => {
                  if (!row) return;
                  if (actionType === 'view') handleView(row);
                  if (actionType === 'edit') {
                    const audienceId = row.id || row._id;
                    if (!audienceId) {
                      alert('Audience ID is missing.');
                      return;
                    }
                    navigate(`/central/emailsystem/audiences/${audienceId}`);
                  }
                  if (actionType === 'delete') handleDelete(row);
                }}
                autoFetch={true}
                emptyMessage="No audiences found. Click 'Add Audience' to create one."
              />
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Templates Tab */}
        <CTabPane role="tabpanel" aria-labelledby="templates-tab" visible={activeKey === 2}>
          <CCard>
            <CCardHeader>Template Management</CCardHeader>
            <CCardBody>
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}
              <DynamicTable
                key={`templates-${refreshTrigger}`}
                token={`${templateToken}_t`}
                tableName="templates"
                system="central"
                columns={{ 
                  id: ['id', true], 
                  title: ['title', true], 
                  subject: ['subject', true],
                  last_modified: ['last_modified', true],
                  created_at: ['created_at', true],
                  updated_at: ['updated_at', true]
                }}
                custom={[]}
                reqSet={{ 
                  token: `${templateToken}_t`, 
                  key: templateToken,
                  table: 'templates', 
                  actions: 'cevd', 
                  act: 'id', 
                  system: 'central' 
                }}
                onAction={(actionType, row) => {
                  if (!row) return;
                  if (actionType === 'view') handlePreviewTemplate(row);
                  if (actionType === 'edit') handleEditTemplate(row);
                  if (actionType === 'delete') handleTemplateDelete(row);
                }}
                autoFetch={true}
                emptyMessage="No templates found. Click 'Add Template' to create one."
              />
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Campaigns Tab */}
        <CTabPane role="tabpanel" aria-labelledby="campaigns-tab" visible={activeKey === 3}>
          <CCard>
            <CCardHeader>Campaigns</CCardHeader>
            <CCardBody>
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}
              <DynamicTable
                key={`campaigns-${refreshTrigger}`}
                token={`${campaignToken}_t`}
                tableName="campaigns"
                system="central"
                columns={{
                  id: ['id', true],
                  name: ['name', true],
                  template_id: ['template_id', true],
                  audience_id: ['audience_id', true],
                  status: ['status', true],
                  created_at: ['created_at', true],
                  updated_at: ['updated_at', true]
                }}
                custom={[]}
                reqSet={{
                  token: `${campaignToken}_t`,
                  key: campaignToken,
                  table: 'campaigns',
                  actions: 'cevd',
                  act: 'id',
                  system: 'central'
                }}
                onAction={(actionType, row) => {
                  if (!row) return;
                  if (actionType === 'view') {
                    // Reuse edit modal for viewing campaigns
                    handleEditCampaign(row);
                  }
                  if (actionType === 'edit') handleEditCampaign(row);
                  if (actionType === 'delete') handleDeleteCampaign(row);
                }}
                autoFetch={true}
                emptyMessage="No campaigns found. Click 'Add Campaign' to create one."
              />
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>

      {/* Audience Modal */}
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
                onChange={(e) => setNewAudienceName(e.target.value)}
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
                  onChange={(e) => setExistingAudienceId(e.target.value)}
                  disabled={audienceListLoading}
                >
                  <option value="">Select an audience</option>
                  {audienceList.map((audience) => (
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
          <CButton color="secondary" variant="outline" onClick={() => setShowAudienceModal(false)} disabled={audienceModalLoading}>
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

      {/* Dynamic Modal for Add/Edit */}
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

      {/* View Modal */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />

      {/* Template Editor Modal */}
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

      {/* Template Preview Modal */}
      <CModal
        visible={showTemplatePreview}
        onClose={() => setShowTemplatePreview(false)}
        size="lg"
      >
        <CModalHeader>
          <CModalTitle>{previewTitle}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div 
            style={{ 
              border: '1px solid #dee2e6', 
              borderRadius: '4px', 
              padding: '15px',
              minHeight: '400px',
              maxHeight: '600px',
              overflow: 'auto'
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

      {/* Campaign Add/Edit Modal */}
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
                onChange={(e) => setCampaignName(e.target.value)}
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
                onChange={(e) => setCampaignTemplateId(e.target.value)}
                disabled={campaignSaving || campaignOptionsLoading}
              >
                <option value="">-- Select Template --</option>
                {templateOptions.map((tpl) => (
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
                onChange={(e) => setCampaignAudienceId(e.target.value)}
                disabled={campaignSaving || campaignOptionsLoading}
              >
                <option value="">-- Select Audience --</option>
                {audienceOptions.map((aud) => (
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
              onChange={(e) => setCampaignStatus(e.target.value)}
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

