import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CFormInput,
  CFormCheck,
  CFormLabel,
  CFormSelect,
  CBadge,
  CSpinner,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilBuilding, cilArrowLeft, cilSearch, cilReload, cilX, cilCloudDownload, cilPeople, cilGlobeAlt, cilLocationPin, cilIndustry, cilUser, cilLink, cilBasket } from '@coreui/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthService from 'src/application/Services/AuthService';
import DynamicTable from 'src/application/Components/DynamicTable';
import axios from 'axios';
import CompanyCard from './components/CompanyCard';
import AddAudienceModal from 'src/resources/views/components/Audience/AddAudienceModal';
import ProductCompaniesExportModal from 'src/resources/views/components/Product/ProductCompaniesExportModal';

/**
 * Product Detail Page — Mirrors PHP product_tables.blade.php
 *
 * Two entry modes (dual-purpose):
 *   ?productId=PRODXXX  → Product-centric view (label: "Contacts")
 *   ?li_company_id=456  → Company-centric view (label: "Leads")
 *
 * Sections:
 *   1. Company Header Card (logo, name, tagline, stats, industry, HQ, specialties, about)
 *   2. Tabs: Companies | Contacts
 *   → Companies: card grid from products.companies CSV → master_accounts IN query
 *   → Contacts: DynamicTable filtered by li_smtp
 */
const ProductList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId');
  const liCompanyId = searchParams.get('li_company_id');
  const source = searchParams.get('source');

  // Dual-purpose flag (mirrors PHP is_product_view)
  const isProductView = !!productId;
  const contactsLabel = isProductView ? 'Contacts' : 'Leads';

  const backPath = {
    g2: '/central/filters/g2product',
    apollo: '/central/filters/apolloproduct',
    linkedin: '/central/filters/linkedinprodcut',
  }[source] || '/central/filters/products';

  const sourceLabel = {
    g2: 'G2 Products',
    apollo: 'Apollo Products',
    linkedin: 'LinkedIn Products',
  }[source] || 'Products';

  // State
  const [product, setProduct] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [relatedProductsCount, setRelatedProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCompanies, setSelectedCompanies] = useState(new Set());
  const [activeTab, setActiveTab] = useState('technology'); // Default: Technology Used Companies
  const [showAbout, setShowAbout] = useState(false);
  const [showTables, setShowTables] = useState(true);
  const [dynamicContactsCount, setDynamicContactsCount] = useState(null);
  const [dynamicCompaniesCount, setDynamicCompaniesCount] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [companyPage, setCompanyPage] = useState(1);
  const [showCompanyEditModal, setShowCompanyEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyEditForm, setCompanyEditForm] = useState({
    company_name: '',
    company_li_smtp: '',
    location: '',
    industry: '',
    employee_size: '',
    revenue: '',
    website: '',
    country: '',
    summary: '',
    source: ''
  });

  const contactsRef = useRef(null);

  // Audience (Move to Audience) state
  const [audiences, setAudiences] = useState([]);
  const [audienceContext, setAudienceContext] = useState(null);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [audienceModalError, setAudienceModalError] = useState(null);
  const [audienceSaving, setAudienceSaving] = useState(false);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Tab-level company counts (accurate even when only a page of companies is loaded)
  const [techCompaniesTotal, setTechCompaniesTotal] = useState(null);
  const [withLeadsTotal, setWithLeadsTotal] = useState(null);
  const [noLeadsTotal, setNoLeadsTotal] = useState(null);
  const [noInfoTotal, setNoInfoTotal] = useState(null);

  // All company SMTPs for this product (for Contacts tab DynamicTable filter)
  const [allProductSmtps, setAllProductSmtps] = useState([]);
  const [contactsTableKey, setContactsTableKey] = useState(0);

  // Export state for companies tabs (queue-based)
  const [showCompanyExportModal, setShowCompanyExportModal] = useState(false);
  const [exportCompanyIds, setExportCompanyIds] = useState([]);
  const [exportCompanyCount, setExportCompanyCount] = useState(0);

  // Contacts tab table configuration (mirrors contacts.js page)
  const contactsTableColumns = {
    id: ['id', true],
    li_company_name: ['li_company_name', true],
    li_full_name: ['li_full_name', true],
    li_first_name: ['li_first_name', true],
    li_last_name: ['li_last_name', true],
    li_smtp: ['li_smtp', true],
    li_job_title: ['li_job_title', true],
    email: ['email', true],
    created_at: ['created_at', true]
  };

  const contactsReqSet = {
    token: 'central_filters_master_leads_t',
    table: 'master_leads',
    actions: 'v',
    act: 'id',
    system: 'sun'
  };

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  // ── Audience helpers (Move to Audience) ─────────────────────────────
  const fetchAudiences = async () => {
    try {
      setAudienceLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/audiences');
      const list = response.data?.data || response.data?.audiences || [];
      setAudiences(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to fetch audiences:', err);
      setAudienceModalError(err.response?.data?.message || 'Unable to load audiences');
    } finally {
      setAudienceLoading(false);
    }
  };

  const handleAudienceAction = ({ ids, rows, meta, selectAll, excludedIds, filters, totalCount }) => {
    if (!selectAll && (!ids || !ids.length)) return;
    setAudienceContext({ ids, rows, meta, selectAll, excludedIds, filters, totalCount });
    setAudienceModalError(null);
    fetchAudiences();
    setShowAudienceModal(true);
  };

  const handleSaveAudience = async ({ mode, audienceId, audienceName, splitFullName }) => {
    if (!audienceContext?.selectAll && !audienceContext?.rows?.length) {
      setAudienceModalError('No records selected for audience assignment.');
      return;
    }
    try {
      setAudienceSaving(true);
      const authAxios = getAuthAxios();
      const payload = {
        mode,
        audienceId,
        audienceName,
        splitFullName,
        source: {
          table: audienceContext.meta?.tableName || 'master_leads',
          system: audienceContext.meta?.system || 'sun'
        }
      };

      if (audienceContext.selectAll) {
        payload.selectAll = true;
        payload.filters = audienceContext.filters;
        payload.excludedIds = audienceContext.excludedIds || [];
        payload.totalCount = audienceContext.totalCount || 0;
        payload.records = [];
        payload.recordIds = [];
      } else {
        payload.records = audienceContext.rows;
        payload.recordIds = audienceContext.ids || [];
      }

      const response = await authAxios.post('/api/audiences/assign', payload);
      setSuccess(response.data?.message || 'Audience updated successfully.');
      setShowAudienceModal(false);
      setAudienceContext(null);
      setAudienceModalError(null);
    } catch (err) {
      console.error('Failed to save audience:', err);
      setAudienceModalError(err.response?.data?.message || err.response?.data?.error || 'Failed to save audience');
      setError(err.response?.data?.message || 'Failed to save audience');
    } finally {
      setAudienceSaving(false);
    }
  };

  const closeAudienceModal = () => {
    if (audienceSaving) return;
    setShowAudienceModal(false);
    setAudienceModalError(null);
  };

  // ── Fetch product + company data ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const authAxios = getAuthAxios();
      let productData = null;
      let companyData = null;

      if (isProductView) {
        // ── Path A: via ?productId=XXX ──
        // 1. Fetch the product using exact_id for precise match
        if (source && ['g2', 'apollo', 'linkedin', 'mssps', 'msps'].includes(source)) {
          const sourceResponse = await authAxios.get(`/api/products/${source}`, {
            params: { exact_id: productId, page: 1, limit: 1 }
          });
          if (sourceResponse.data.status && sourceResponse.data.data) {
            productData = sourceResponse.data.data.find(
              (p) => p.product_id === productId || String(p.id) === productId
            );
          }
        } else {
          const productResponse = await authAxios.post('/api/skeleton-action/central_unique_products_t', {
            skeleton_filters: {
              columns: { product_id: { value: productId, filterType: 'equals' } },
              pagination: { page: 1, limit: 1 }
            },
            skeleton_view: 'table',
            draw: 1
          });
          if (productResponse.data.status && productResponse.data.data?.length > 0) {
            productData = productResponse.data.data[0];
          }
        }

        if (!productData) {
          setError('Product not found');
          setLoading(false);
          return;
        }
        setProduct(productData);

        // 2. Resolve company via pp_name = li_smtp (PHP NavCtrl pattern)
        if (productData.pp_name) {
          try {
            const relatedResponse = await authAxios.get('/api/products/related', {
              params: { product_id: productId, source: source || 'products' }
            });
            if (relatedResponse.data.company) {
              companyData = relatedResponse.data.company;
              setRelatedProductsCount(relatedResponse.data.data?.length || 0);
            }
          } catch (e) {
            console.warn('Could not fetch company data:', e);
          }
        }

        // 3. Fetch companies from bridge collection (companies_products)
        //    Falls back to pp_name auto-resolve if no bridge data exists
        let companiesLoaded = false;

        try {
          const bridgeResponse = await authAxios.get('/api/products/companies-products', {
            params: { product_id: productId, tab: 'technology', page: 1, limit: 30 }
          });
          if (bridgeResponse.data.status && bridgeResponse.data.data && bridgeResponse.data.data.length > 0) {
            // Bridge data exists — each doc has company_info (from master_accounts) and contacts_count
            const bridgeCompanies = bridgeResponse.data.data.map(doc => ({
              ...(doc.company_info || {}),
              // Spread bridge doc fields so new CSV fields (location, industry, etc.)
              // are available to CompanyCard for cascade display
              company_li_smtp: doc.company_li_smtp,
              company_name: doc.company_name,
              location: doc.location || null,
              industry: doc.industry || null,
              employee_size: doc.employee_size || null,
              revenue: doc.revenue || null,
              website: doc.website || null,
              country: doc.country || null,
              summary: doc.summary || null,
              source: doc.source || null,
              li_smtp: doc.company_li_smtp,
              li_company_name: doc.company_info?.li_company_name || doc.company_name,
              contacts_count: doc.contacts_count || 0,
              _bridge_id: doc.id,
              _hasCompanyInfo: doc.company_info !== null && doc.company_info !== undefined
            }));
            setCompanies(bridgeCompanies);
            setFilteredCompanies(bridgeCompanies);
            setDynamicCompaniesCount(bridgeResponse.data.total);
            const summary = bridgeResponse.data.summary || null;
            if (summary) {
              setTechCompaniesTotal(summary.totalCompanies ?? bridgeResponse.data.total);
              setWithLeadsTotal(summary.withInfoAndLeads ?? null);
              setNoLeadsTotal(summary.withInfoNoLeads ?? null);
              setNoInfoTotal(summary.noInfoNoLeads ?? null);
            } else {
              setTechCompaniesTotal(bridgeResponse.data.total);
              setWithLeadsTotal(null);
              setNoLeadsTotal(null);
              setNoInfoTotal(null);
            }
            // Sum all contacts counts from bridge companies
            const totalContacts = bridgeCompanies.reduce((sum, c) => sum + (c.contacts_count || 0), 0);
            setDynamicContactsCount(totalContacts);
            companiesLoaded = true;
          }
        } catch (e) {
          console.warn('Could not fetch from bridge collection:', e);
        }

        // 4. Fetch ALL company SMTPs for Contacts tab DynamicTable filter
        try {
          const smtpsResp = await authAxios.get('/api/products/companies-products', {
            params: { product_id: productId, smtps_only: 'true' }
          });
          if (smtpsResp.data.status && smtpsResp.data.smtps) {
            setAllProductSmtps(smtpsResp.data.smtps);
          }
        } catch (e) {
          console.warn('Could not fetch product SMTPs:', e);
        }

        // No fallback — companies come ONLY from bridge collection
        // If empty, user adds companies manually via CSV upload
        if (!companiesLoaded) {
          setCompanies([]);
          setFilteredCompanies([]);
          setDynamicCompaniesCount(0);
          setDynamicContactsCount(0);
          setTechCompaniesTotal(0);
          setWithLeadsTotal(0);
          setNoLeadsTotal(0);
          setNoInfoTotal(0);
        }

      } else if (liCompanyId) {
        // ── Path B: via ?li_company_id=456 ──
        // Fetch company directly
        try {
          const relatedResponse = await authAxios.get('/api/products/related', {
            params: { li_company_id: liCompanyId, source: source || 'products' }
          });
          if (relatedResponse.data.company) {
            companyData = relatedResponse.data.company;
            setRelatedProductsCount(relatedResponse.data.data?.length || 0);
          }
        } catch (e) {
          console.warn('Could not fetch company data:', e);
        }

        // Fetch leads count will be shown via DynamicTable
      }

      if (companyData) {
        setCompany(companyData);
      }

    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [productId, liCompanyId, source, isProductView]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Fetch companies for a specific tab from server ──
  const fetchCompaniesForTab = useCallback(async (tab) => {
    if (!productId || !isProductView) return;
    try {
      const authAxios = getAuthAxios();
      const bridgeResponse = await authAxios.get('/api/products/companies-products', {
        params: { product_id: productId, tab, page: 1, limit: 30 }
      });
      if (bridgeResponse.data.status && bridgeResponse.data.data) {
        const bridgeCompanies = bridgeResponse.data.data.map(doc => ({
          ...(doc.company_info || {}),
          company_li_smtp: doc.company_li_smtp,
          company_name: doc.company_name,
          location: doc.location || null,
          industry: doc.industry || null,
          employee_size: doc.employee_size || null,
          revenue: doc.revenue || null,
          website: doc.website || null,
          country: doc.country || null,
          summary: doc.summary || null,
          source: doc.source || null,
          li_smtp: doc.company_li_smtp,
          li_company_name: doc.company_info?.li_company_name || doc.company_name,
          contacts_count: doc.contacts_count || 0,
          _bridge_id: doc.id,
          _hasCompanyInfo: doc.company_info !== null && doc.company_info !== undefined
        }));
        setCompanies(bridgeCompanies);
        setFilteredCompanies(bridgeCompanies);
        // Update summary counts if available
        const summary = bridgeResponse.data.summary || null;
        if (summary) {
          setTechCompaniesTotal(summary.totalCompanies ?? bridgeResponse.data.total);
          setWithLeadsTotal(summary.withInfoAndLeads ?? null);
          setNoLeadsTotal(summary.withInfoNoLeads ?? null);
          setNoInfoTotal(summary.noInfoNoLeads ?? null);
        }
      } else {
        setCompanies([]);
        setFilteredCompanies([]);
      }
    } catch (e) {
      console.warn('Could not fetch companies for tab:', e);
      setCompanies([]);
      setFilteredCompanies([]);
    }
  }, [productId, isProductView]);

  // Re-fetch companies when tab changes (skip 'contacts' tab — it uses ProductContactsTab)
  useEffect(() => {
    if (activeTab !== 'contacts' && activeTab !== 'technology') {
      fetchCompaniesForTab(activeTab);
    }
    setCompanyPage(1);
  }, [activeTab, fetchCompaniesForTab]);

  // Filter companies by search term (client-side within loaded tab companies)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCompanies(companies);
      return;
    }
    const searchLower = searchTerm.toLowerCase();
    setFilteredCompanies(companies.filter(c =>
      (c.li_company_name && c.li_company_name.toLowerCase().includes(searchLower)) ||
      (c.company && c.company.toLowerCase().includes(searchLower)) ||
      (c.li_smtp && c.li_smtp.toLowerCase().includes(searchLower)) ||
      (c.li_company_industry && c.li_company_industry.toLowerCase().includes(searchLower))
    ));
  }, [companies, searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return dateString; }
  };

  const industryOptions = useMemo(() => {
    const set = new Set();
    filteredCompanies.forEach(c => {
      const v = c.industry || c.li_company_industry;
      if (v && typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed) set.add(trimmed);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filteredCompanies]);

  // Server-filtered companies — no client-side categorization needed
  const activeCompanyList = filteredCompanies;

  // Map tab to its server-side total (for Select All label)
  const getTabTotal = useCallback(() => {
    if (activeTab === 'technology') return techCompaniesTotal ?? activeCompanyList.length;
    if (activeTab === 'companies') return withLeadsTotal ?? activeCompanyList.length;
    if (activeTab === 'noLeads') return noLeadsTotal ?? activeCompanyList.length;
    if (activeTab === 'noInfo') return noInfoTotal ?? activeCompanyList.length;
    return activeCompanyList.length;
  }, [activeTab, techCompaniesTotal, withLeadsTotal, noLeadsTotal, noInfoTotal, activeCompanyList.length]);

  const COMPANY_PAGE_SIZE = 9;
  const totalCompanyPages = Math.max(1, Math.ceil(activeCompanyList.length / COMPANY_PAGE_SIZE));
  const safeCompanyPage = Math.min(companyPage, totalCompanyPages);
  const companyStartIndex = (safeCompanyPage - 1) * COMPANY_PAGE_SIZE;
  const pagedCompanyList = activeCompanyList.slice(companyStartIndex, companyStartIndex + COMPANY_PAGE_SIZE);

  const toggleSelect = (companyId) => {
    setSelectedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCompanies.size === activeCompanyList.length) {
      setSelectedCompanies(new Set());
    } else {
      setSelectedCompanies(new Set(activeCompanyList.map(c => c._id || c.id || c._bridge_id)));
    }
  };

  const generateCompanyPaginationItems = () => {
    const items = [];
    const max = 7;
    let s = Math.max(1, safeCompanyPage - Math.floor(max / 2));
    let e = Math.min(totalCompanyPages, s + max - 1);
    if (e - s < max - 1) s = Math.max(1, e - max + 1);
    for (let i = s; i <= e; i++) {
      items.push(
        <CPaginationItem
          key={i}
          active={i === safeCompanyPage}
          onClick={() => setCompanyPage(i)}
          style={{ cursor: 'pointer' }}
        >
          {i}
        </CPaginationItem>
      );
    }
    return items;
  };

  // ── Bulk Delete ──
  const handleDeleteSelected = async () => {
    if (selectedCompanies.size === 0) return;
    try {
      setDeleting(true);
      const authAxios = getAuthAxios();
      // Find bridge IDs for selected companies
      const toDelete = filteredCompanies.filter(c =>
        selectedCompanies.has(c._id || c.id || c._bridge_id)
      );
      // Delete each selected company from bridge collection
      await Promise.all(
        toDelete.map(c =>
          authAxios.delete('/api/products/companies-products', {
            params: { id: c._bridge_id }
          }).catch(err => console.error('Delete error for', c._bridge_id, err))
        )
      );
      setSelectedCompanies(new Set());
      setShowDeleteConfirm(false);
      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Bulk delete error:', err);
      setError('Failed to delete selected companies: ' + (err.message || ''));
    } finally {
      setDeleting(false);
    }
  };

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedCompanies(new Set());
  }, [activeTab]);

  const openCompanyEditModal = (company) => {
    setEditingCompany(company);
    setCompanyEditForm({
      company_name: company.company_name || company.li_company_name || '',
      company_li_smtp: company.company_li_smtp || company.li_smtp || '',
      location: company.location || '',
      industry: company.industry || company.li_company_industry || '',
      employee_size: company.employee_size || company.li_company_employee_size || '',
      revenue: company.revenue || '',
      website: company.website || '',
      country: company.country || company.li_company_headquarters_country || '',
      summary: company.summary || '',
      source: company.source || ''
    });
    setShowCompanyEditModal(true);
  };

  const handleCompanyEditSave = async () => {
    if (!editingCompany || !editingCompany._bridge_id) {
      setShowCompanyEditModal(false);
      setEditingCompany(null);
      return;
    }
    try {
      const authAxios = getAuthAxios();
      await authAxios.patch('/api/products/companies-products', {
        id: editingCompany._bridge_id,
        ...companyEditForm
      });
      setShowCompanyEditModal(false);
      setEditingCompany(null);
      await fetchData();
    } catch (err) {
      console.error('Company edit error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update company');
    }
  };

  // FIX: queue-based export for companies tabs (supports true Select All)
  const handleExportCompanies = async () => {
    try {
      if (!activeCompanyList || activeCompanyList.length === 0) return;

      const totalForTab = getTabTotal();
      const allOnPageSelected =
        selectedCompanies.size === activeCompanyList.length &&
        totalForTab > activeCompanyList.length;

      let ids = [];
      let count = 0;

      if (allOnPageSelected && isProductView && productId) {
        // Select All (N) → fetch ALL bridge rows for current tab
        const authAxios = getAuthAxios();
        const resp = await authAxios.get('/api/products/companies-products', {
          params: {
            product_id: productId,
            tab: activeTab,
            page: 1,
            limit: 999999,
            export_all: 'true'
          }
        });

        if (!resp.data?.status || !Array.isArray(resp.data.data)) return;

        const allCompanies = resp.data.data;
        ids = allCompanies
          .map(c => c.id)
          .filter(Boolean);
        count = allCompanies.length;
      } else {
        // Export only explicitly selected or currently loaded records
        const dataToExport = selectedCompanies.size > 0
          ? activeCompanyList.filter(c => selectedCompanies.has(c._id || c.id || c._bridge_id))
          : activeCompanyList;

        if (!dataToExport || dataToExport.length === 0) return;

        ids = dataToExport
          .map(c => c.id || c._bridge_id || c._id)
          .filter(Boolean);
        count = dataToExport.length;
      }

      if (ids.length === 0) return;

      setExportCompanyIds(ids);
      setExportCompanyCount(count);
      setShowCompanyExportModal(true);
    } catch (e) {
      console.error('Export companies prepare error:', e);
      setError(e.message || 'Failed to prepare export');
    }
  };

  const scrollToContacts = () => {
    setActiveTab('contacts');
    setShowTables(true);
    setTimeout(() => {
      contactsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ── No productId and no li_company_id ──
  if (!productId && !liCompanyId) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CAlert color="warning">Product ID or Company ID is required</CAlert>
              <CButton color="secondary" onClick={() => navigate(backPath)}>
                <CIcon icon={cilArrowLeft} className="me-2" />
                Back to {sourceLabel}
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center py-5">
              <CSpinner />
              <p className="mt-3 text-muted">Loading product details...</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  const contactsCount = dynamicContactsCount !== null ? dynamicContactsCount : (product?.contacts_count || 0);
  const companiesCount = dynamicCompaniesCount !== null ? dynamicCompaniesCount : (product?.companies_count || companies.length);
  const companyName = company?.li_company_name || product?.pp_name || product?.vendor || 'Company';

  // FIX: export button should reflect full selection, not just current page size
  const exportButtonCount = (() => {
    const totalForTab = getTabTotal();
    if (selectedCompanies.size > 0 && selectedCompanies.size < activeCompanyList.length) {
      return selectedCompanies.size;
    }
    if (selectedCompanies.size === activeCompanyList.length && totalForTab > activeCompanyList.length) {
      return totalForTab;
    }
    return activeCompanyList.length;
  })();

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: Company Header Card
          Mirrors PHP product_tables.blade.php — Company Header
          ═══════════════════════════════════════════════════════════════ */}
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4" style={{ overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{
              height: '120px',
              background: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                opacity: 0.3,
              }} />
            </div>

            <CCardBody style={{ position: 'relative', paddingTop: '0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginTop: '-50px' }}>
                {/* Company Logo */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '16px',
                  border: '4px solid #fff',
                  backgroundColor: '#f8fafc',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  {company?.li_logo ? (
                    <img
                      src={company.li_logo}
                      alt={companyName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = `<div style="font-size:2rem;color:#94a3b8">🏢</div>`;
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '2rem', color: '#94a3b8' }}>🏢</div>
                  )}
                </div>

                {/* Company Info */}
                <div style={{ flex: 1, paddingTop: '55px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                        {isProductView ? (product?.product_name || companyName) : companyName}
                      </h4>
                      {company?.li_tag_line && (
                        <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '10px' }}>
                          {company.li_tag_line}
                        </p>
                      )}
                    </div>
                    <div className="d-flex gap-2">
                      <CButton color="primary" variant="outline" size="sm" onClick={() => setShowTables(!showTables)}>
                        {showTables ? 'Hide Tables' : 'Show Tables'}
                      </CButton>
                      <CButton
                        color="info"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (product?.product_id) params.set('productId', product.product_id);
                          else if (company?.id) params.set('pp_id', company.id);
                          if (source) params.set('source', source);
                          navigate(`/central/filters/relatedproducts?${params.toString()}`);
                        }}
                      >
                        <CIcon icon={cilBasket} className="me-1" />
                        Related Products
                      </CButton>
                      <CButton color="secondary" size="sm" onClick={() => navigate(backPath)}>
                        <CIcon icon={cilArrowLeft} className="me-1" />
                        Back
                      </CButton>
                    </div>
                  </div>

                  {/* Stats Row — clickable like PHP */}
                  <div className="d-flex gap-4 mb-3" style={{ flexWrap: 'wrap' }}>
                    <div
                      style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: '#eff6ff', borderRadius: '10px', textAlign: 'center', minWidth: '100px' }}
                      onClick={scrollToContacts}
                    >
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#1d4ed8' }}>{contactsCount}</div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>{contactsLabel}</div>
                    </div>
                    <div style={{ padding: '8px 16px', backgroundColor: '#f0fdf4', borderRadius: '10px', textAlign: 'center', minWidth: '100px' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#15803d' }}>{companiesCount}</div>
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>Companies</div>
                    </div>
                    <div
                      style={{ cursor: 'pointer', padding: '8px 16px', backgroundColor: '#fef3c7', borderRadius: '10px', textAlign: 'center', minWidth: '100px' }}
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (product?.product_id) params.set('productId', product.product_id);
                        else if (company?.id) params.set('pp_id', company.id);
                        if (source) params.set('source', source);
                        navigate(`/central/filters/relatedproducts?${params.toString()}`);
                      }}
                    >
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#b45309' }}>{relatedProductsCount}</div>
                      <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Technologies</div>
                    </div>
                  </div>

                  {/* Company Details Row */}
                  <div style={{
                    display: 'flex',
                    gap: '24px',
                    flexWrap: 'wrap',
                    fontSize: '0.82rem',
                    color: '#475569',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '12px',
                    marginBottom: '8px',
                  }}>
                    {company?.li_company_industry && (
                      <span><CIcon icon={cilIndustry} size="sm" className="me-1 text-muted" />{company.li_company_industry}</span>
                    )}
                    {company?.li_company_headquarters && (
                      <span><CIcon icon={cilLocationPin} size="sm" className="me-1 text-muted" />{company.li_company_headquarters}</span>
                    )}
                    {company?.employees_on_linked_in && (
                      <span><CIcon icon={cilPeople} size="sm" className="me-1 text-muted" />{company.employees_on_linked_in} employees</span>
                    )}
                    {company?.li_website && (
                      <a href={company.li_website.startsWith('http') ? company.li_website : `https://${company.li_website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>
                        <CIcon icon={cilGlobeAlt} size="sm" className="me-1" />{company.li_website}
                      </a>
                    )}
                    {company?.li_smtp && (
                      <span><CIcon icon={cilLink} size="sm" className="me-1 text-muted" />{company.li_smtp}</span>
                    )}
                  </div>

                  {/* Specialties */}
                  {company?.li_company_specialties && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Specialties: </span>
                      <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {company.li_company_specialties.split(',').slice(0, 6).map(s => s.trim()).join(', ')}
                        {company.li_company_specialties.split(',').length > 6 && '...'}
                      </span>
                    </div>
                  )}

                  {/* About Section — Read more/less toggle (PHP pattern) */}
                  {company?.li_company_description && (
                    <div>
                      <span
                        style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                        onClick={() => setShowAbout(!showAbout)}
                      >
                        About {showAbout ? '▲' : '▼'}
                      </span>
                      {showAbout && (
                        <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginTop: '6px', marginBottom: 0 }}>
                          {company.li_company_description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: Tables Card with Tabs (Companies / Contacts)
          Mirrors PHP product_tables.blade.php — Tables Card
          ═══════════════════════════════════════════════════════════════ */}
      {showTables && (
        <CRow>
          <CCol xs={12}>
            <CCard className="mb-4">
              <CCardHeader>
                <CNav variant="tabs">
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'technology'}
                      onClick={() => setActiveTab('technology')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilBuilding} className="me-1" />
                      Tech Companies
                      <CBadge color="info" className="ms-2">
                        {techCompaniesTotal !== null ? techCompaniesTotal : companiesCount}
                      </CBadge>
                    </CNavLink>
                  </CNavItem>
                  {/* FIX: move \"Have Companies and Leads\" before Contacts */}
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'companies'}
                      onClick={() => setActiveTab('companies')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilBuilding} className="me-1" />
                      Have Companies and Leads
                      <CBadge color="success" className="ms-2">
                        {withLeadsTotal ?? 0}
                      </CBadge>
                    </CNavLink>
                  </CNavItem>
                  {/* FIX: Contacts tab without count badge */}
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'contacts'}
                      onClick={() => setActiveTab('contacts')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilPeople} className="me-1" />
                      {contactsLabel}
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'noLeads'}
                      onClick={() => setActiveTab('noLeads')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilBuilding} className="me-1" />
                      Have Companies but No Leads
                      <CBadge color="warning" className="ms-2">
                        {noLeadsTotal ?? 0}
                      </CBadge>
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      active={activeTab === 'noInfo'}
                      onClick={() => setActiveTab('noInfo')}
                      style={{ cursor: 'pointer' }}
                    >
                      <CIcon icon={cilBuilding} className="me-1" />
                      No Companies and No Leads
                      <CBadge color="danger" className="ms-2">
                        {noInfoTotal ?? 0}
                      </CBadge>
                    </CNavLink>
                  </CNavItem>
                </CNav>
              </CCardHeader>
              <CCardBody>
                {error && (
                  <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>
                )}
                {success && (
                  <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>
                )}

                <CTabContent>
                  {/* ── Company Tabs (Technology / Have Companies Contacts / Have Companies No Contacts / No Companies No Leads) ── */}
                  {['technology', 'companies', 'noLeads', 'noInfo'].map(tabKey => (
                    <CTabPane key={tabKey} visible={activeTab === tabKey}>
                      {/* Search + Actions */}
                      <CRow className="mb-3">
                        <CCol md={6}>
                          <div className="position-relative">
                            <CIcon icon={cilSearch} className="position-absolute" style={{ left: '12px', top: '10px', zIndex: 10 }} />
                            <CFormInput
                              type="text"
                              placeholder="Search companies..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              style={{ paddingLeft: '40px' }}
                            />
                          </div>
                        </CCol>
                        <CCol md={6}>
                          <div className="d-flex justify-content-end gap-2">
                            {selectedCompanies.size > 0 && (
                              <CButton color="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                                🗑️ Delete ({selectedCompanies.size})
                              </CButton>
                            )}
                            <CButton color="success" size="sm" onClick={handleExportCompanies} disabled={activeCompanyList.length === 0}>
                              <CIcon icon={cilCloudDownload} className="me-1" />
                              Export ({exportButtonCount})
                            </CButton>
                            <CButton color="secondary" size="sm" onClick={fetchData}>
                              <CIcon icon={cilReload} />
                            </CButton>
                          </div>
                        </CCol>
                      </CRow>

                      {activeCompanyList.length === 0 ? (
                        <div className="text-center py-5">
                          <CIcon icon={cilBuilding} size="3xl" className="text-muted mb-3" />
                          <p className="text-muted">
                            {tabKey === 'technology' && 'No companies found for this product'}
                            {tabKey === 'companies' && 'No companies with contacts found'}
                            {tabKey === 'noLeads' && 'No companies without contacts found'}
                            {tabKey === 'noInfo' && 'No companies without company info found'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex align-items-center mb-3 gap-2">
                            <CFormCheck
                              id={`select-all-${tabKey}`}
                              label={`Select All (${getTabTotal()})`}
                              checked={activeCompanyList.length > 0 && selectedCompanies.size === activeCompanyList.length}
                              indeterminate={selectedCompanies.size > 0 && selectedCompanies.size < activeCompanyList.length}
                              onChange={toggleSelectAll}
                            />
                            {selectedCompanies.size > 0 && (
                              <CBadge color="primary">{selectedCompanies.size} selected</CBadge>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                            {pagedCompanyList.map((comp) => (
                              <CompanyCard
                                key={comp._id || comp.id || comp._bridge_id}
                                company={comp}
                                isSelected={selectedCompanies.has(comp._id || comp.id || comp._bridge_id)}
                                onToggleSelect={() => toggleSelect(comp._id || comp.id || comp._bridge_id)}
                                contactsCount={comp.contacts_count || 0}
                                onEdit={openCompanyEditModal}
                                onClick={() => {
                                  if (comp.li_smtp) {
                                    setSelectedCompany(comp);
                                    setShowContactsModal(true);
                                  }
                                }}
                              />
                            ))}
                          </div>
                          {totalCompanyPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                Page {safeCompanyPage} of {totalCompanyPages.toLocaleString()} · Showing{' '}
                                {pagedCompanyList.length} of {activeCompanyList.length.toLocaleString()} companies
                              </div>
                              <CPagination aria-label="Companies pagination">
                                <CPaginationItem
                                  disabled={safeCompanyPage <= 1}
                                  onClick={() => setCompanyPage(1)}
                                  style={{ cursor: safeCompanyPage <= 1 ? 'not-allowed' : 'pointer' }}
                                >
                                  «
                                </CPaginationItem>
                                <CPaginationItem
                                  disabled={safeCompanyPage <= 1}
                                  onClick={() => setCompanyPage(p => Math.max(1, p - 1))}
                                  style={{ cursor: safeCompanyPage <= 1 ? 'not-allowed' : 'pointer' }}
                                >
                                  ‹
                                </CPaginationItem>
                                {generateCompanyPaginationItems()}
                                <CPaginationItem
                                  disabled={safeCompanyPage >= totalCompanyPages}
                                  onClick={() => setCompanyPage(p => Math.min(totalCompanyPages, p + 1))}
                                  style={{ cursor: safeCompanyPage >= totalCompanyPages ? 'not-allowed' : 'pointer' }}
                                >
                                  ›
                                </CPaginationItem>
                                <CPaginationItem
                                  disabled={safeCompanyPage >= totalCompanyPages}
                                  onClick={() => setCompanyPage(totalCompanyPages)}
                                  style={{ cursor: safeCompanyPage >= totalCompanyPages ? 'not-allowed' : 'pointer' }}
                                >
                                  »
                                </CPaginationItem>
                              </CPagination>
                            </div>
                          )}
                        </>
                      )}
                    </CTabPane>
                  ))}

                  {/* ── Contacts Tab — Only mount DynamicTable when tab active (lazy load) ── */}
                  <CTabPane visible={activeTab === 'contacts'}>
                    <div ref={contactsRef}>
                      {activeTab === 'contacts' && (allProductSmtps.length > 0 || productId || (liCompanyId && company?.li_smtp)) ? (
                        <DynamicTable
                          key={`contacts-${contactsTableKey}-${productId || liCompanyId}`}
                          token="central_filters_master_leads_t"
                          tableName="master_leads"
                          system="sun"
                          columns={contactsTableColumns}
                          custom={[]}
                          reqSet={contactsReqSet}
                          initialFilters={
                            liCompanyId && company?.li_smtp
                              ? {
                                  columns: {
                                    li_smtp: { search: { value: [company.li_smtp] } }
                                  },
                                  filterType: { li_smtp: 'strict' }
                                }
                              : productId
                                ? {
                                    // Option B: Send just product_id — server resolves SMTPs
                                    columns: {
                                      product_id_filter: { search: { value: productId } }
                                    }
                                  }
                                : {
                                    columns: {
                                      li_smtp: { search: { value: allProductSmtps } }
                                    },
                                    filterType: { li_smtp: 'strict' }
                                  }
                          }
                          autoFetch={true}
                          enableSelection={true}
                          onAudienceAction={handleAudienceAction}
                          filterSidebarMode="collapsible"
                          // FIX: keep summary Contacts card in sync with Contacts tab
                          onStatsChange={({ recordsFiltered }) => {
                            if (typeof recordsFiltered === 'number') {
                              setDynamicContactsCount(recordsFiltered);
                            }
                          }}
                        />
                      ) : (
                        <div className="text-center py-5">
                          <CIcon icon={cilPeople} size="3xl" className="text-muted mb-3" />
                          <p className="text-muted mb-1">
                            {isProductView
                              ? 'No companies added yet. Add companies via the "Add Products" page → "Add Companies to Product" tab.'
                              : 'No contacts available for this view.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </CTabPane>
                </CTabContent>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Contacts Modal — Shows detailed leads for a specific company
          ═══════════════════════════════════════════════════════════════ */}
      <CModal
        visible={showContactsModal}
        onClose={() => { setShowContactsModal(false); setSelectedCompany(null); }}
        size="xl"
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilBuilding} className="me-2" />
            Contacts for: {selectedCompany?.li_company_name || selectedCompany?.company || 'Company'}
            {selectedCompany?.li_smtp && (
              <small className="text-muted ms-2">({selectedCompany.li_smtp})</small>
            )}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedCompany?.li_smtp ? (
            <DynamicTable
              token="central_filters_master_leads_t"
              tableName="master_leads"
              system="sun"
              columns={{ id: ['id', true], email: ['email', true], company: ['company', true] }}
              custom={[]}
              reqSet={{
                token: 'central_filters_master_leads_t',
                table: 'master_leads',
                actions: 'cvd',
                act: 'id',
                system: 'sun'
              }}
              initialFilters={{
                columns: {
                  li_smtp: { value: selectedCompany.li_smtp, match_mode: 'exact' }
                },
                filterType: { li_smtp: 'strict' },
                pagination: { page: 1, limit: 25 }
              }}
              autoFetch={true}
              enableSelection={false}
            />
          ) : (
            <CAlert color="warning">
              No li_smtp found for this company. Cannot fetch related contacts.
            </CAlert>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setShowContactsModal(false); setSelectedCompany(null); }}>
            <CIcon icon={cilX} className="me-1" />
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Audience Modal (Move to Audience) for Contacts tab selections */}
      <AddAudienceModal
        visible={showAudienceModal}
        onClose={closeAudienceModal}
        onSave={handleSaveAudience}
        availableAudiences={audiences}
        loadingAudiences={audienceLoading}
        saving={audienceSaving}
        error={audienceModalError}
        selectedCount={audienceContext?.ids?.length || 0}
      />

      {/* ═══════════════════════════════════════════════════════════════
          Delete Confirmation Modal
          ═══════════════════════════════════════════════════════════════ */}
      <CModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>⚠️ Delete Companies</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>Are you sure you want to remove <strong>{selectedCompanies.size}</strong> selected companies from this product?</p>
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>This will remove the company-product link. The company data in master_accounts will not be affected.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDeleteSelected} disabled={deleting}>
            {deleting ? (<><CSpinner size="sm" className="me-1" /> Deleting...</>) : `🗑️ Delete (${selectedCompanies.size})`}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Company Edit Modal */}
      <CModal
        visible={showCompanyEditModal}
        onClose={() => { setShowCompanyEditModal(false); setEditingCompany(null); }}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>Edit Company</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Company Name</CFormLabel>
            <CFormInput
              value={companyEditForm.company_name}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Domain (li_smtp)</CFormLabel>
            <CFormInput
              value={companyEditForm.company_li_smtp}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, company_li_smtp: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Location</CFormLabel>
            <CFormInput
              value={companyEditForm.location}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Industry</CFormLabel>
            <CFormSelect
              value={companyEditForm.industry}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, industry: e.target.value }))}
            >
              <option value="">Select Industry</option>
              {industryOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Employee Size</CFormLabel>
            <CFormInput
              value={companyEditForm.employee_size}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, employee_size: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Revenue</CFormLabel>
            <CFormInput
              value={companyEditForm.revenue}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, revenue: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Website</CFormLabel>
            <CFormInput
              value={companyEditForm.website}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, website: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Country</CFormLabel>
            <CFormInput
              value={companyEditForm.country}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, country: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Summary</CFormLabel>
            <CFormInput
              value={companyEditForm.summary}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, summary: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <CFormLabel className="fw-semibold">Source</CFormLabel>
            <CFormInput
              value={companyEditForm.source}
              onChange={(e) => setCompanyEditForm(prev => ({ ...prev, source: e.target.value }))}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => { setShowCompanyEditModal(false); setEditingCompany(null); }}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleCompanyEditSave}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>

      <ProductCompaniesExportModal
        show={showCompanyExportModal}
        onClose={() => setShowCompanyExportModal(false)}
        selectedIds={exportCompanyIds}
        totalCount={exportCompanyCount}
        productName={product?.product_name || productId || 'company'}
      />
    </>
  );
};

export default ProductList;
