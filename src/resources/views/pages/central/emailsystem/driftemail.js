import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CSpinner,
  CBadge,
  CTooltip,
  CInputGroup,
  CAlert,
  CProgressBar,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CProgress // Added CProgress
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { 
  cilPlus, 
  cilTrash, 
  cilSave, 
  cilMediaPlay, 
  cilMediaPause, 
  cilClock,
  cilEnvelopeClosed,
  cilReload,
  cilChevronLeft,
  cilChevronRight,
  cilInfo,
  cilChart,
  cilX,
  cilCheck,
  cilChevronBottom,
  cilSearch
} from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';
import TemplateEditor from 'src/resources/views/components/TemplateEditor';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

// --- Custom Styles from Blade File ---
const customStyles = `
  /* ============================================
     MODERN SET TABS - Card Style Design
     ============================================ */
  .set-tabs-container {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    border: 1px solid #e2e8f0;
  }

  .set-tab {
    padding: 12px 20px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    color: #64748b;
    background: transparent;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    min-width: 100px;
  }

  .set-tab:hover:not(.active) {
    background: rgba(255, 255, 255, 0.9);
    color: #1db4cd;
    transform: translateY(-1px);
  }

  .set-tab.active {
    background: white;
    color: #1db4cd;
    border-color: #1db4cd;
    box-shadow: 0 4px 12px rgba(29, 180, 205, 0.15);
  }

  .set-tab .delete-icon {
    opacity: 0;
    transition: opacity 0.2s ease;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .set-tab:hover .delete-icon,
  .set-tab.active .delete-icon {
    opacity: 0.6;
  }

  .set-tab .delete-icon:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  /* ============================================
     MODERN SEQUENCE TABS - Segmented Control
     ============================================ */
  .sequence-tabs-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    gap: 16px;
    flex-wrap: wrap;
  }

  .sequence-tabs-container {
    display: inline-flex;
    background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
    border-radius: 14px;
    padding: 6px;
    gap: 6px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .sequence-tab {
    padding: 10px 22px;
    border-radius: 10px;
    font-weight: 500;
    font-size: 14px;
    color: #64748b;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .sequence-tab:hover:not(.active) {
    background: rgba(255, 255, 255, 0.7);
    color: #1db4cd;
  }

  .sequence-tab.active {
    background: white;
    color: #0f172a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    font-weight: 600;
  }

  /* Status Badge Dot */
  .sequence-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .sequence-status-dot.draft { background: #94a3b8; }
  .sequence-status-dot.scheduled { background: #f59e0b; }
  .sequence-status-dot.running, 
  .sequence-status-dot.sending { 
    background: #22c55e; 
    animation: statusPulse 1.5s ease-in-out infinite; 
  }
  .sequence-status-dot.completed { background: #3b82f6; }
  .sequence-status-dot.failed { background: #ef4444; }
  .sequence-status-dot.paused { background: #f97316; }

  @keyframes statusPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }

  /* Add Sequence Button */
  .add-sequence-btn {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, #1db4cd 0%, #0891b2 100%);
    color: white;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(29, 180, 205, 0.25);
  }

  .add-sequence-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(29, 180, 205, 0.35);
  }

  .add-sequence-btn:active {
    transform: translateY(0);
  }

  /* Active Set Header */
  .active-set-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .active-set-label {
    font-size: 13px;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .active-set-name {
    font-size: 18px;
    font-weight: 700;
    color: #1db4cd;
  }

  /* Legacy compatibility - keep old classes working */
  .drift-nav-pills {
    display: none; /* Hide old nav pills */
  }
  
  /* Stats Card */
  .stats-card {
      background: white;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      margin-bottom: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
  }

  .report-category {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 10px;
      border-radius: 6px;
      background: white;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  
  .report-category span {
      display: block;
      font-size: 20px;
      font-weight: 700;
  }
  
  .report-category div {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
  }

  /* Glassy Button */
  .glassy-cute-btn {
      border: none;
      background: rgba(255, 255, 255, 0.28);
      border-radius: 50%;
      padding: 0;
      width: 32px;
      height: 32px; /* Smaller than original */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px 0 rgba(30, 180, 205, 0.11);
      backdrop-filter: blur(6px);
      cursor: pointer;
  }
  
  .glassy-cute-btn-inner {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(29, 180, 205, 0.18) 0%, rgba(255, 255, 255, 0.35) 100%);
  }
  
  .cute-refresh-icon {
      color: #1db4cd;
      font-size: 1.2em;
  }
  
  /* Sharp Button Style from Blade */
  .sharp-btn {
      border-radius: 6px;
      font-weight: 600; 
      letter-spacing: 0.5px;
      box-shadow: 0 1px 4px rgba(30,64,175,0.06);
      padding: 8px 20px;
  }

  /* Add Sequence Button */
  .add-sequence-btn-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      cursor: pointer;
      color: #1db4cd;
  }
  .add-sequence-btn-wrapper:hover {
       background: rgba(0,0,0,0.05);
       border-radius: 50%;
  }
  
  /* Tab Content Area */
  .drift-tab-content {
      border: 1px solid #d1d1d1;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background: white;
      padding: 24px;
  }
  .drift-tab-content {
      border: 1px solid #d1d1d1;
      border-top: none;
      border-radius: 0 0 8px 8px;
      background: white;
      padding: 24px;
  }

  /* MultiSelect Chips Styling */
  .multiselect-container {
      position: relative;
      font-size: 14px;
  }
  .multiselect-input {
      border: 1px solid #b1b7c1;
      border-radius: 6px;
      padding: 6px 12px;
      min-height: 42px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      background: white;
      cursor: text;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  }
  .multiselect-input:focus-within {
      border-color: #8bbafe;
      box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
      outline: 0;
  }
  .chip {
      background-color: #e0e7ff;
      color: #3b82f6;
      padding: 2px 8px;
      border-radius: 16px;
      display: inline-flex;
      align-items: center;
      font-weight: 500;
      font-size: 13px;
  }
  .chip-remove {
      cursor: pointer;
      margin-left: 6px;
      display: flex;
      align-items: center;
      opacity: 0.6;
  }
  .chip-remove:hover {
      opacity: 1;
  }
  .multiselect-search {
      border: none;
      outline: none;
      flex: 1;
      min-width: 60px;
      background: transparent;
      padding: 2px 0;
      font-size: 14px;
      color: #4f5d75;
  }
  .multiselect-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #c4c9d0;
      border-radius: 6px;
      margin-top: 4px;
      max-height: 250px;
      overflow-y: auto;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 6px 0;
  }
  .multiselect-option {
      padding: 8px 16px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background 0.1s;
      color: #4b5563;
  }
  .multiselect-option:hover {
      background-color: #f3f4f6;
      color: #1f2937;
  }
  .multiselect-option.selected {
      background-color: #eef2ff;
      color: #4f46e5;
      font-weight: 500;
  }
  .multiselect-checkbox {
      margin-right: 10px;
      accent-color: #4f46e5;
      width: 16px;
      height: 16px;
  }
`;

/**
 * Custom MultiSelect Component with Chips
 */
const MultiSelectChips = ({ options, value = [], onChange, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (optionValue) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    const removeChip = (e, optionValue) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== optionValue));
    };

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="multiselect-container" ref={wrapperRef}>
            <div 
                className="multiselect-input" 
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                {value.map(val => {
                    const opt = options.find(o => o.value === val);
                    return opt ? (
                        <span key={val} className="chip">
                            {opt.label}
                            <span className="chip-remove" onClick={(e) => removeChip(e, val)}>
                                <CIcon icon={cilX} size="sm" style={{width:'12px', height:'12px'}}/>
                            </span>
                        </span>
                    ) : null;
                })}
                <input 
                    ref={inputRef}
                    className="multiselect-search"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                    }}
                    placeholder={value.length === 0 ? placeholder : ""}
                    onFocus={() => setIsOpen(true)}
                />
                 <div className="d-flex align-items-center text-muted" style={{marginLeft:'auto'}}>
                    <CIcon icon={cilChevronBottom} size="sm" />
                </div>
            </div>
            
            {isOpen && (
                <div className="multiselect-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <div 
                                key={opt.value} 
                                className={`multiselect-option ${value.includes(opt.value) ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={value.includes(opt.value)} 
                                    readOnly 
                                    className="multiselect-checkbox"
                                />
                                {opt.label}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-muted text-sm">No results found</div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Drift Email Campaign Page
 * Faithful Port of BV's drift-emails.blade.php
 */
const Driftemail = () => {
    const navigate = useNavigate();
    
    // --- State ---
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sets, setSets] = useState([]);
    const [activeSetId, setActiveSetId] = useState(null);
    const [sequences, setSequences] = useState([]);
    const [activeSequenceId, setActiveSequenceId] = useState(null);
    const [sequenceData, setSequenceData] = useState({});
    const [activeSequenceIndex, setActiveSequenceIndex] = useState(0); // 0-based
  
    // Dropdowns
    const [templates, setTemplates] = useState([]);
    const [audiences, setAudiences] = useState([]);
    const [emailAccounts, setEmailAccounts] = useState([]);
    const [regions, setRegions] = useState([]); // For grouped email display

    // Quota & Reporting
    const [quota, setQuota] = useState({ total_used: 0, total_limit: 0 });
    const [reports, setReports] = useState({});
    const [loadingReports, setLoadingReports] = useState({});
    const reportPollingIntervaRef = useRef(null);
    const abortControllerRef = useRef(null); // For cancelling pending report requests

    // ... (Modals state remains)

    // POLL EFFECT - with request cancellation on sequence switch
    useEffect(() => {
        if (activeSequenceId) {
            // Cancel any pending requests from previous sequence
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            abortControllerRef.current = new AbortController();
            
            // Initial fetch
            fetchReports(activeSequenceId, false, abortControllerRef.current.signal);
            
            // Start polling with new controller
            if (reportPollingIntervaRef.current) clearInterval(reportPollingIntervaRef.current);
            reportPollingIntervaRef.current = setInterval(() => {
                // Create new controller for each poll (don't share with initial)
                const pollController = new AbortController();
                fetchReports(activeSequenceId, true, pollController.signal);
            }, 3000);
        }
        return () => {
             if (reportPollingIntervaRef.current) clearInterval(reportPollingIntervaRef.current);
             if (abortControllerRef.current) abortControllerRef.current.abort();
        };
    }, [activeSequenceId]);

    const formatDateTime = (value) => {
        if (!value) return '—';
        return moment(value).format('YYYY-MM-DD HH:mm:ss');
    };


    // Modals
    const [modalState, setModalState] = useState({
        newSet: false,
        schedule: false,
        preview: false,
        deleteSet: false,
        deleteSequence: false,
        quota: false,
        assignment: false
    });

    // Audience Modal State
    const [showAudienceModal, setShowAudienceModal] = useState(false);
    const [audienceModalTab, setAudienceModalTab] = useState('new');
    const [newAudienceName, setNewAudienceName] = useState('');
    const [existingAudienceId, setExistingAudienceId] = useState('');
    const [audienceModalError, setAudienceModalError] = useState(null);
    const [audienceModalLoading, setAudienceModalLoading] = useState(false);

    // Template Editor State
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateEditorSaving, setTemplateEditorSaving] = useState(false);
    const [templatePrefillLoading, setTemplatePrefillLoading] = useState(false);
    
    // Modal Input States
    const [newSetForm, setNewSetForm] = useState({ name: '', count: 1 });
    const [deleteTarget, setDeleteTarget] = useState(null); 
    const [assignmentModalData, setAssignmentModalData] = useState({
        mode: 'batch_size',
        batchSize: 2,
        manualAssignments: {},
        subscriberCount: 0,
        loadingCount: false
    });
  
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const quotaInterval = useRef(null);
    
    // Schedule Modal State
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleTimezone, setScheduleTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    const [scheduleLoading, setScheduleLoading] = useState(false);
    
    // Preview Modal State
    const [previewContent, setPreviewContent] = useState({ title: '', subject: '', content: '' });
    const [previewLoading, setPreviewLoading] = useState(false);
    
    // Load timezones
    const timezones = moment.tz.names();

    // --- Constants ---
    const CATEGORY_OPTIONS = [
        { value: 'replied', label: 'Replied' },
        { value: 'unopened', label: 'Unopened' },
        { value: 'opened', label: 'Opened' },
        { value: 'unsubscribed', label: 'Unsubscribed' },
        { value: 'softbounce', label: 'Soft Bounce' },
        { value: 'hardbounce', label: 'Hard Bounce' },
        { value: 'automatic_reply', label: 'Automatic Reply' },
        { value: 'sent', label: 'Sent' }
    ];

    const WAIT_UNIT_OPTIONS = [
        { value: 'minutes', label: 'Minutes' },
        { value: 'hours', label: 'Hours' },
        { value: 'days', label: 'Days' }
    ];

    // Helper: Authenticated Axios
    const getAuthAxios = useCallback(() => {
        const token = AuthService.getToken();
        return axios.create({
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });
    }, []);

    // --- Initial Data Fetch ---
    useEffect(() => {
        fetchInitialData();
        quotaInterval.current = setInterval(fetchQuota, 30000);
        return () => clearInterval(quotaInterval.current);
    }, []);

    useEffect(() => {
        if (activeSetId) {
            fetchSequences(activeSetId);
        } else {
            setSequences([]);
            setSequenceData({});
        }
    }, [activeSetId]);

    // NOTE: Report polling with AbortController is handled in the useEffect at line ~591
    // This prevents duplicate polling and ensures proper request cancellation

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchSets(),
                fetchDropdownData(),
                fetchQuota()
            ]);
        } catch (err) {
            console.error('Error fetching initial data:', err);
            setError('Failed to load initial data.');
        } finally {
            setLoading(false);
        }
    };

    // --- API Calls ---

    const fetchSets = async () => {
        try {
            const authAxios = getAuthAxios();
            const response = await authAxios.get('/api/drift/getSets');
            if (response.data.success) {
                setSets(response.data.sets || []);
                if (response.data.sets?.length > 0 && !activeSetId) {
                    setActiveSetId(response.data.sets[0].id);
                }
            }
        } catch (err) { console.error(err); }
    };

    const fetchSequences = async (setId) => {
        try {
            const authAxios = getAuthAxios();
            const response = await authAxios.get(`/api/drift/getSequences?set_id=${setId}`);
            if (response.data.success) {
                const seqs = response.data.sequences || [];
                setSequences(seqs);
                const newMap = {};
                seqs.forEach(seq => {
                    newMap[seq.id] = {
                        ...seq,
                        manual_assignments: typeof seq.manual_assignments === 'string' ? JSON.parse(seq.manual_assignments) : (seq.manual_assignments || {}),
                        from_emails: typeof seq.from_emails === 'string' ? JSON.parse(seq.from_emails) : (seq.from_emails || []),
                        categories: typeof seq.categories === 'string' ? JSON.parse(seq.categories) : (seq.categories || []),
                    };
                });
                setSequenceData(newMap);

                if (seqs.length > 0 && !activeSequenceId) {
                    setActiveSequenceId(seqs[0].id);
                    setActiveSequenceIndex(0);
                }
            }
        } catch (err) { console.error(err); }
    };

    const fetchDropdownData = async () => {
        try {
            const authAxios = getAuthAxios();
            // Fetch Templates
            const templatesRes = await authAxios.get('/api/templates');
            setTemplates(templatesRes.data || []); // templates is array

            // Fetch Audiences
            const audiencesRes = await authAxios.get('/api/audiences');
            setAudiences(audiencesRes.data?.data || []);

            // Fetch Email Accounts
            const accountsRes = await authAxios.get('/api/email-accounts');
            if (accountsRes.data && accountsRes.data.regions) {
                setRegions(accountsRes.data.regions);
                setEmailAccounts(accountsRes.data.accounts || []);
            } else {
                 // Fallback
                 setEmailAccounts(accountsRes.data || []);
            }

        } catch (err) {
            console.error("Dropdown fetch error", err);
        }
    };

    const fetchQuota = async () => {
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.get('/api/drift/getQuotaInfo');
            if (res.data.success) {
                setQuota({
                    total_used: res.data.total_used,
                    total_limit: res.data.total_limit,
                    accounts: res.data.accounts || []
                });
            }
        } catch (err) { console.error(err); }
    };

    const fetchReports = async (sequenceId, silent = false, signal = null) => {
        if (!sequenceId) return;
        if (!silent) setLoadingReports(prev => ({ ...prev, [sequenceId]: true }));
        try {
             const authAxios = getAuthAxios();
             const config = signal ? { signal } : {};
             const res = await authAxios.get(`/api/drift/getReports?sequence_id=${sequenceId}`, config);
             if (res.data.success) {
                 setReports(prev => ({
                     ...prev,
                     [sequenceId]: res.data 
                 }));
             }
        } catch (err) {
            // Ignore cancelled requests (user switched sequence)
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                return; // Silent ignore - this is expected when switching sequences
            }
            if (!silent) console.error("Failed to fetch reports", err);
        } finally {
            if (!silent) setLoadingReports(prev => ({ ...prev, [sequenceId]: false }));
        }
    };

    const fetchSubscriberCount = async (audienceId) => {
        if (!audienceId) return 0;
        setAssignmentModalData(prev => ({ ...prev, loadingCount: true }));
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.get(`/api/audience/${audienceId}/subscriber-count`);
            return res.data.count || 0;
        } catch (err) {
            return 0;
        } finally {
            setAssignmentModalData(prev => ({ ...prev, loadingCount: false }));
        }
    };

    // --- Action Handlers ---

    const handleCreateSet = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/createSet', {
                set_name: newSetForm.name,
                sequence_count: newSetForm.count
            });
            if (res.data.success) {
                setSuccess('Set created successfully');
                setModalState(prev => ({ ...prev, newSet: false }));
                setNewSetForm({ name: '', count: 1 });
                await fetchSets();
                setActiveSetId(res.data.set_id);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create set');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSet = async () => {
         if (!deleteTarget) return;
         setSaving(true);
         try {
             const authAxios = getAuthAxios();
             const res = await authAxios.post('/api/drift/deleteSet', { set_id: deleteTarget });
             if (res.data.success) {
                 setSuccess('Set deleted');
                 setModalState(prev => ({ ...prev, deleteSet: false }));
                 await fetchSets();
                 if (activeSetId === deleteTarget) setActiveSetId(null);
             }
         } catch (err) {
             setError('Failed to delete set');
         } finally {
             setSaving(false);
         }
    };

    const handleAddSequence = async () => {
        if (!activeSetId) return;
        setSaving(true);
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/createSequence', {
                set_id: activeSetId,
                name: `Sequence ${sequences.length + 1}`
            });
            if (res.data.success) {
                await fetchSequences(activeSetId);
                const newSeq = res.data.sequence;
                setActiveSequenceId(newSeq.id);
                setActiveSequenceIndex(sequences.length);
            }
        } catch (err) {
            setError('Failed to add sequence');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSequence = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/deleteSequence', { sequence_id: deleteTarget });
            if (res.data.success) {
                setSuccess('Sequence deleted');
                setModalState(prev => ({ ...prev, deleteSequence: false }));
                await fetchSequences(activeSetId);
            }
        } catch (err) {
            setError('Failed to delete sequence');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSequence = async (seqId, navigateDirection = null) => {
        const seq = sequenceData[seqId];
        if (!seq) return;
        
        if (!seq.name || !seq.subject || !seq.template_id) {
            setError('Please fill required fields (Name, Subject, Template)');
            return;
        }
        
        const payload = {
            sequences: [{
                sequence_id: seq.id,
                set_id: activeSetId,
                name: seq.name,
                subject: seq.subject,
                template_id: seq.template_id,
                from_emails: seq.from_emails,
                wait_time: seq.wait_time,
                wait_unit: seq.wait_unit,
                sequence_number: activeSequenceIndex + 1,
                ...(activeSequenceIndex === 0 ? {
                    audience_id: seq.audience_id,
                    time_gap: seq.time_gap,
                    assignment_mode: seq.assignment_mode,
                    batch_size: seq.batch_size,
                    manual_assignments: seq.manual_assignments
                } : {
                    categories: seq.categories
                })
            }],
            set_id: activeSetId
        };

        setSaving(true);
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/saveSequences', payload);
            if (res.data.success) {
                setSuccess('Sequence saved');
                await fetchSequences(activeSetId);
                
                if (navigateDirection === 'next' && activeSequenceIndex < sequences.length - 1) {
                    const nextSeq = sequences[activeSequenceIndex + 1];
                    setActiveSequenceId(nextSeq.id);
                    setActiveSequenceIndex(activeSequenceIndex + 1);
                } else if (navigateDirection === 'prev' && activeSequenceIndex > 0) {
                    const prevSeq = sequences[activeSequenceIndex - 1];
                    setActiveSequenceId(prevSeq.id);
                    setActiveSequenceIndex(activeSequenceIndex - 1);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save sequence');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        if (!activeSetId) return;
        setSaving(true);
        const sequencesPayload = sequences.map((s, idx) => {
            const data = sequenceData[s.id];
            return {
                sequence_id: s.id,
                set_id: activeSetId,
                name: data.name,
                subject: data.subject,
                template_id: data.template_id,
                from_emails: data.from_emails,
                wait_time: data.wait_time,
                wait_unit: data.wait_unit,
                sequence_number: idx + 1,
                ...(idx === 0 ? {
                    audience_id: data.audience_id,
                    time_gap: data.time_gap,
                    assignment_mode: data.assignment_mode,
                    batch_size: data.batch_size,
                    manual_assignments: data.manual_assignments
                } : {
                    categories: data.categories
                })
            };
        });

        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/saveSequences', {
                set_id: activeSetId,
                sequences: sequencesPayload
            });
            if (res.data.success) {
                setSuccess('All sequences saved successfully');
                fetchSequences(activeSetId);
            }
        } catch (err) {
            setError('Failed to save all sequences');
        } finally {
            setSaving(false);
        }
    };
    
    const handleSendImmediately = async (seqId) => {
        // First save the sequence to ensure latest data
        await handleSaveSequence(seqId);
        
        setSaving(true);
        try {
            const seq = sequenceData[seqId];
            if (!seq) {
                setError('Sequence data not found');
                setSaving(false);
                return;
            }

            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/send', { 
                sequence_id: seqId,
                set_id: activeSetId,
                name: seq.name,
                template_id: seq.template_id,
                subject: seq.subject,
                from_emails: seq.from_emails,
                audience_id: seq.audience_id,
                time_gap: seq.time_gap,
                batch_size: seq.batch_size,
                wait_time: seq.wait_time,
                wait_unit: seq.wait_unit,
                sequence_number: activeSequenceIndex + 1, // Use index + 1 as we are on the active sequence
                categories: seq.categories,
                assignment_mode: seq.assignment_mode,
                manual_assignments: seq.manual_assignments
            });
            
            if (res.data.success) {
                if (res.data.did_backtrack) {
                    // Show a special warning/info alert if we backtracked
                    setSuccess(res.data.message); // The API sends a descriptive message
                    // Ideally, we might want to switch the active tab to the one that started?
                    // For now, just notifying is enough.
                } else {
                    setSuccess('Sending started successfully');
                }
                await fetchReports(seqId); // Refresh reports
            } else {
                 setError(res.data.message || 'Failed to start sending');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to trigger send');
        } finally {
            setSaving(false);
        }
    };


    // Handle Schedule Sequence - Always schedules the FIRST sequence (sequence 1)
    const handleScheduleSequence = async () => {
        // Find the first sequence (sequence_number = 1)
        const firstSequence = sequences.find(s => s.sequence_number === 1);
        if (!firstSequence) {
            setError('No first sequence found. Please create Sequence 1 first.');
            return;
        }
        
        const firstSequenceId = firstSequence.id;
        
        if (!scheduleTime) {
            setError('Schedule time is required');
            return;
        }
        
        // First save ALL sequences
        await handleSaveAll();
        
        setScheduleLoading(true);
        try {
            const scheduled = moment.tz(scheduleTime, scheduleTimezone);
            if (scheduled.isBefore(moment())) {
                setError('Scheduled time must be in the future');
                setScheduleLoading(false);
                return;
            }
            
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/schedule', {
                sequence_id: firstSequenceId,  // Always schedule first sequence
                scheduled_at: scheduled.toISOString(),
                timezone: scheduleTimezone
            });
            
            if (res.data.success) {
                setSuccess(`Sequence 1 scheduled for ${scheduled.format('YYYY-MM-DD HH:mm:ss')}`);
                setModalState(prev => ({...prev, schedule: false}));
                setScheduleTime('');
                await fetchSequences(activeSetId);
            } else {
                setError(res.data.error || 'Failed to schedule sequence');
            }
        } catch (err) {
            console.error('Schedule error:', err);
            setError(err.response?.data?.error || 'Failed to schedule sequence');
        } finally {
            setScheduleLoading(false);
        }
    };
    
    // Handle Preview
    const handlePreview = async () => {
        const seq = sequenceData[activeSequenceId];
        if (!seq) {
            setError('No sequence selected');
            return;
        }
        
        if (!seq.template_id) {
            setError('Please select a template first');
            return;
        }
        
        setPreviewLoading(true);
        setModalState(prev => ({...prev, preview: true}));
        
        try {
            const authAxios = getAuthAxios();
            const res = await authAxios.post('/api/drift/preview', {
                template_id: seq.template_id,
                sequence_id: activeSequenceId,
                from_email: seq.from_emails?.[0] || '',
                subject: seq.subject
            });
            
            if (res.data.success) {
                setPreviewContent({
                    title: res.data.title || 'Email Preview',
                    subject: res.data.subject || seq.subject,
                    content: res.data.content || ''
                });
            } else {
                setError(res.data.error || 'Failed to load preview');
                setModalState(prev => ({...prev, preview: false}));
            }
        } catch (err) {
            console.error('Preview error:', err);
            setError(err.response?.data?.error || 'Failed to load preview');
            setModalState(prev => ({...prev, preview: false}));
        } finally {
            setPreviewLoading(false);
        }
    };

    const openAssignmentModal = async () => {
        const seq = sequenceData[activeSequenceId];
        if (!seq) return;
        
        const count = await fetchSubscriberCount(seq.audience_id);
        
        setAssignmentModalData({
            mode: seq.assignment_mode || 'batch_size',
            batchSize: seq.batch_size || 2,
            manualAssignments: seq.manual_assignments || {},
            subscriberCount: count,
            loadingCount: false
        });
        setModalState(prev => ({ ...prev, assignment: true }));
    };

    const saveAssignmentModal = () => {
        setSequenceData(prev => ({
            ...prev,
            [activeSequenceId]: {
                ...prev[activeSequenceId],
                assignment_mode: assignmentModalData.mode,
                batch_size: assignmentModalData.mode === 'batch_size' ? assignmentModalData.batchSize : null,
                manual_assignments: assignmentModalData.mode === 'manual_assign' ? assignmentModalData.manualAssignments : {}
            }
        }));
        setModalState(prev => ({ ...prev, assignment: false }));
    };
    
    const updateSeqField = (field, value) => {
        setSequenceData(prev => ({
            ...prev,
            [activeSequenceId]: {
                ...prev[activeSequenceId],
                [field]: value
            }
        }));
    };

    const handleTemplateChange = (e) => {
        const newVal = e.target.value;
        const selectedTemplate = templates.find(t => (t.id || t._id) == newVal);
        
        setSequenceData(prev => ({
            ...prev,
            [activeSequenceId]: {
                ...prev[activeSequenceId],
                template_id: newVal,
                // Auto-populate subject from template if available, else keep existing
                subject: selectedTemplate?.subject || prev[activeSequenceId]?.subject || ''
            }
        }));
    };

    // --- Audience Modal Handlers ---
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
                fetchDropdownData(); // Refresh dropdown
                setSuccess('Audience created successfully');
            }
        } catch (err) {
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

    // --- Template Editor Handlers ---
    const handleAddTemplate = () => {
        setSelectedTemplate(null);
        setTemplatePrefillLoading(false);
        setShowTemplateEditor(true);
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
                fetchDropdownData(); // Refresh dropdowns
                setSuccess(selectedTemplate ? 'Template updated' : 'Template created');
            } else {
                setError(response.data?.message || 'Failed to save template');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save template');
        } finally {
            setTemplateEditorSaving(false);
        }
    };

    // Helper
    const getManualAssignedCount = () => {
        return Object.values(assignmentModalData.manualAssignments).reduce((a, b) => a + (parseInt(b) || 0), 0);
    };

    if (loading) return <div className="text-center p-5"><CSpinner color="primary"/></div>;
    const currentSeqData = activeSequenceId ? sequenceData[activeSequenceId] : null;

    return (
        <>
            <style>{customStyles}</style>

            <CCard className="mb-4 shadow-sm border-0">
                <CCardHeader 
                   className="d-flex align-items-center justify-content-between px-4 py-3"
                   style={{ background: '#5856D6', borderBottom: '2px solid #e0e7ef', color: '#fff' }}
                >
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                        Drift Email Campaigns
                    </span>
                    <div className="d-flex gap-2">
                         <CButton className="sharp-btn bg-white text-info border-white" onClick={() => setModalState({...modalState, quota: true})}>
                             {quota.total_used} / {quota.total_limit} Used
                         </CButton>
                         <CButton className="sharp-btn bg-white text-info border-white" onClick={handleSaveAll} disabled={saving}>
                             {saving ? <CSpinner size="sm"/> : 'Save All Sequences'}
                         </CButton>
                         <CButton className="sharp-btn bg-white text-info border-white" onClick={() => setModalState({...modalState, newSet: true})}>
                             New Set
                         </CButton>
                    </div>
                </CCardHeader>

                <CCardBody>
                     {/* Modern Set Tabs */}
                     <div className="set-tabs-container">
                         {sets.map(set => (
                             <button
                               key={set.id}
                               className={`set-tab ${activeSetId === set.id ? 'active' : ''}`}
                               onClick={() => setActiveSetId(set.id)}
                             >
                                 <span>{set.set_name}</span>
                                 <span 
                                   className="delete-icon"
                                   onClick={(e) => {
                                       e.stopPropagation();
                                       setDeleteTarget(set.id);
                                       setModalState({...modalState, deleteSet: true});
                                   }}
                                 >
                                     <CIcon icon={cilTrash} size="sm"/>
                                 </span>
                             </button>
                         ))}
                     </div>

                     {/* Active Set Content */}
                     {activeSetId && (
                         <div className="drift-tab-content">
                             {/* Active Set Header */}
                             <div className="active-set-header">
                                 <span className="active-set-label">Active Set</span>
                                 <span className="active-set-name">{sets.find(s=>s.id === activeSetId)?.set_name}</span>
                             </div>
                             
                             {/* Modern Sequence Tabs */}
                             <div className="sequence-tabs-wrapper">
                                 <div className="sequence-tabs-container">
                                     {sequences.map((seq, idx) => (
                                         <button
                                           key={seq.id}
                                           className={`sequence-tab ${activeSequenceId === seq.id ? 'active' : ''}`}
                                           onClick={() => {
                                               setActiveSequenceId(seq.id);
                                               setActiveSequenceIndex(idx);
                                           }}
                                         >
                                             {seq.name || `Sequence ${idx+1}`}
                                             <span className={`sequence-status-dot ${seq.status || 'draft'}`}></span>
                                         </button>
                                     ))}
                                     <button className="add-sequence-btn" onClick={handleAddSequence} title="Add Sequence">
                                         <CIcon icon={cilPlus} size="lg"/>
                                     </button>
                                 </div>
                                 
                                 <CButton color="primary" onClick={handleAddSequence}>New Sequence</CButton>
                             </div>

                             {/* Sequence Form */}
                             {currentSeqData && (
                                 <div className="card border p-3">
                                     <div className="d-flex justify-content-between card-header bg-transparent border-0 ps-0 pt-0">
                                         <h5 className="mb-0">{currentSeqData.name}</h5>
                                         <CButton 
                                            color="danger" 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={() => {
                                                setDeleteTarget(currentSeqData.id);
                                                setModalState({...modalState, deleteSequence: true});
                                            }}
                                         >
                                            Delete Sequence
                                         </CButton>
                                     </div>
                                     
                                     <CForm className="row g-3 mt-1">
                                         <CCol md={6}>
                                             <CFormLabel>Sequence Name</CFormLabel>
                                             <CFormInput value={currentSeqData.name || ''} onChange={(e) => updateSeqField('name', e.target.value)} />
                                         </CCol>
                                         <CCol md={6}>
                                             <CFormLabel>Subject</CFormLabel>
                                             <CFormInput value={currentSeqData.subject || ''} onChange={(e) => updateSeqField('subject', e.target.value)} />
                                         </CCol>

                                         <CCol md={6}>
                                             <CFormLabel>Select Template</CFormLabel>
                                             <CInputGroup>
                                                 <CFormSelect value={currentSeqData.template_id || ''} onChange={handleTemplateChange}>
                                                     <option value="">-- Select Template --</option>
                                                     {templates.map(t => <option key={t.id || t._id} value={t.id || t._id}>{t.title}</option>)}
                                                 </CFormSelect>
                                                 <CButton variant="outline" color="primary" onClick={handleAddTemplate}>Create Template</CButton>
                                             </CInputGroup>
                                         </CCol>

                                         {activeSequenceIndex === 0 ? (
                                             <>
                                                 <CCol md={6}>
                                                     <CFormLabel>Select Audience</CFormLabel>
                                                     <CInputGroup>
                                                         <CFormSelect value={currentSeqData.audience_id || ''} onChange={(e) => updateSeqField('audience_id', e.target.value)}>
                                                             <option value="">-- Select Audience --</option>
                                                             {audiences.map(a => <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>)}
                                                         </CFormSelect>
                                                         <CButton variant="outline" color="primary" onClick={() => setShowAudienceModal(true)}>Create Audience</CButton>
                                                     </CInputGroup>
                                                 </CCol>
                                                 
                                                 <CCol md={6}>
                                                      <CFormLabel>Time Gap Between Batches (seconds) <CTooltip content="Time gap applies only between batches"><CIcon icon={cilInfo}/></CTooltip></CFormLabel>
                                                      <CFormInput type="number" min="1" value={currentSeqData.time_gap || 5} onChange={(e) => updateSeqField('time_gap', parseInt(e.target.value))} />
                                                 </CCol>

                                                 <CCol md={6}>
                                                     <CFormLabel>Assignment Mode</CFormLabel>
                                                     <CInputGroup>
                                                         <CFormSelect value={currentSeqData.assignment_mode || 'batch_size'} onChange={(e) => updateSeqField('assignment_mode', e.target.value)}>
                                                             <option value="batch_size">Batch Size</option>
                                                             <option value="manual_assign">Manual Assign</option>
                                                         </CFormSelect>
                                                         <CButton variant="outline" color="primary" onClick={openAssignmentModal}>Configure Assignment</CButton>
                                                     </CInputGroup>
                                                 </CCol>
                                             </>
                                         ) : (
                                             <CCol md={6}>
                                                 <CFormLabel>Select Report Filters (Sequence {activeSequenceIndex})</CFormLabel>
                                                 <MultiSelectChips 
                                                    options={CATEGORY_OPTIONS}
                                                    value={currentSeqData.categories || []}
                                                    onChange={(val) => updateSeqField('categories', val)}
                                                    placeholder="Select report filters"
                                                 />
                                                 <small className="text-muted">Sequences will be sent to subscribers matching these criteria.</small>
                                             </CCol>
                                         )}

                                         {/* From Emails with Regions Support */}
                                         <CCol md={6}>
                                             <CFormLabel>From Email</CFormLabel>
                                             <CFormSelect 
                                                multiple 
                                                value={currentSeqData.from_emails || []} 
                                                onChange={(e) => updateSeqField('from_emails', Array.from(e.target.selectedOptions, o => o.value))}
                                                style={{minHeight: '80px'}}
                                             >
                                                {regions.length > 0 ? (
                                                    regions.map(region => (
                                                      <optgroup key={region.name} label={`${region.name} (${region.emails.length} accounts)`}>
                                                        {region.emails.map(email => (
                                                          <option key={email} value={email}>
                                                            {email}
                                                          </option>
                                                        ))}
                                                      </optgroup>
                                                    ))
                                                ) : (
                                                     // Fallback if no regions available
                                                     emailAccounts.map(acc => <option key={acc.id} value={acc.email}>{acc.email}</option>)
                                                )}
                                             </CFormSelect>
                                         </CCol>

                                         <CCol md={6}>
                                             <CFormLabel>Wait Time for Next Sequence</CFormLabel>
                                             <CInputGroup>
                                                 <CFormInput 
                                                    type="number" 
                                                    min="0" 
                                                    value={currentSeqData.wait_time || 0} 
                                                    onChange={(e) => updateSeqField('wait_time', parseInt(e.target.value))}
                                                    disabled={activeSequenceIndex === sequences.length - 1} 
                                                 />
                                                 <CFormSelect 
                                                    value={currentSeqData.wait_unit || 'minutes'} 
                                                    onChange={(e) => updateSeqField('wait_unit', e.target.value)}
                                                    disabled={activeSequenceIndex === sequences.length - 1}
                                                 >
                                                     {WAIT_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                 </CFormSelect>
                                             </CInputGroup>
                                         </CCol>

                                         <CCol xs={12} className="mt-4">
                                             <div className="d-flex justify-content-center gap-2">
                                                 {activeSequenceIndex === sequences.length - 1 && (
                                                    <>
                                                      <CButton color="primary" className="text-white" onClick={() => handleSendImmediately(currentSeqData.id)}>Send Immediately</CButton>
                                                      <CButton color="primary" className="text-white" onClick={() => setModalState(prev => ({...prev, schedule: true}))}>Schedule</CButton>
                                                    </>
                                                 )}
                                             </div>
                                             <div className="d-flex justify-content-center gap-2 mt-2">
                                                 <CButton variant="outline" color="secondary" disabled={activeSequenceIndex === 0} onClick={() => {
                                                     handleSaveSequence(currentSeqData.id, 'prev');
                                                 }}>Previous</CButton>
                                                 
                                                 {activeSequenceIndex < sequences.length - 1 ? (
                                                     <CButton variant="outline" color="secondary" onClick={() => {
                                                         handleSaveSequence(currentSeqData.id, 'next');
                                                     }}>Next</CButton>
                                                 ) : (
                                                     <CButton color="primary" onClick={() => handleSaveSequence(currentSeqData.id)}>Save</CButton>
                                                 )}
                                                 
                                                 <CButton color="primary" onClick={handlePreview}>Preview</CButton>
                                             </div>
                                         </CCol>
                                     </CForm>
                                 </div>
                             )}

                             {/* Reports Section - MATCHING EMAIL DELIVERY LAYOUT */}
                             {currentSeqData && (
                                 <CCard className="mt-4">
                                     <CCardHeader className="bg-primary text-white d-flex align-items-center justify-content-between">
                                         <span>Sequence {activeSequenceIndex + 1} Live Monitoring <CIcon icon={cilChart} className="ms-2"/></span>
                                         <button className="glassy-cute-btn" onClick={() => fetchReports(currentSeqData.id)}>
                                             <span className="glassy-cute-btn-inner"><CIcon icon={cilReload} className="cute-refresh-icon"/></span>
                                         </button>
                                     </CCardHeader>
                                     <CCardBody>
                                         {loadingReports[currentSeqData.id] && !reports[currentSeqData.id] ? (
                                             <div className="text-center p-4">Loading reports...</div>
                                         ) : reports[currentSeqData.id] ? (
                                            <div>
                                                {/* Modern Circular Progress Section */}
                                                <div className="p-4 mb-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                    {(() => {
                                                        const stats = reports[currentSeqData.id]?.stats || {};
                                                        const total = (stats.sent || 0) + (stats.failed || 0) + (stats.pending || 0);
                                                        const progressPct = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                                                        return (
                                                            <>
                                                                {/* Header Row with Circular Progress */}
                                                                <div className="d-flex align-items-center gap-4 mb-4">
                                                                    {/* Circular Progress */}
                                                                    <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                                                                        <CircularProgressbar
                                                                            value={progressPct}
                                                                            text={`${progressPct}%`}
                                                                            styles={buildStyles({
                                                                                textSize: '22px',
                                                                                pathColor: progressPct === 100 ? '#22c55e' : '#1db4cd',
                                                                                textColor: '#1f2937',
                                                                                trailColor: '#e5e7eb',
                                                                                pathTransitionDuration: 0.5,
                                                                            })}
                                                                        />
                                                                    </div>
                                                                    
                                                                    {/* Progress Info */}
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                                            <h5 className="mb-0 fw-bold">Sequence Progress</h5>
                                                                            {progressPct === 100 && (
                                                                                <CBadge color="success" className="px-3 py-2">
                                                                                    <CIcon icon={cilCheck} className="me-1" />
                                                                                    Completed
                                                                                </CBadge>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-muted mb-2" style={{ fontSize: '15px' }}>
                                                                            <strong>{stats.sent || 0}</strong> / {total} emails sent
                                                                        </div>
                                                                        {stats.pending > 0 && progressPct < 100 && (
                                                                            <small className="text-muted">
                                                                                ⏱️ ETA: ~{Math.max(1, Math.ceil(stats.pending / 25))} minute{Math.ceil(stats.pending / 25) > 1 ? 's' : ''} remaining
                                                                            </small>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Stats Cards */}
                                                                <CRow className="g-3">
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold" style={{ color: '#6366f1' }}>{total}</div>
                                                                            <small className="text-muted fw-medium">Total</small>
                                                                        </div>
                                                                    </CCol>
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold text-success">{stats.sent || 0}</div>
                                                                            <small className="text-muted fw-medium">Sent</small>
                                                                        </div>
                                                                    </CCol>
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold text-danger">{stats.failed || 0}</div>
                                                                            <small className="text-muted fw-medium">Failed</small>
                                                                        </div>
                                                                    </CCol>
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold text-warning">{stats.pending || 0}</div>
                                                                            <small className="text-muted fw-medium">Pending</small>
                                                                        </div>
                                                                    </CCol>
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold text-info">{stats.sending || 0}</div>
                                                                            <small className="text-muted fw-medium">Sending</small>
                                                                        </div>
                                                                    </CCol>
                                                                    <CCol xs={6} md>
                                                                        <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                                                            <div className="h4 mb-0 fw-bold text-primary">{stats.replied || 0}</div>
                                                                            <small className="text-muted fw-medium">Replied</small>
                                                                        </div>
                                                                    </CCol>
                                                                </CRow>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                
                                                {/* 2. Detailed Breakdown Grid (Bounce/Unsub) */}
                                                 <div className="stats-card mb-4">
                                                    {['softbounce', 'hardbounce', 'unsubscribed', 'unopened', 'automatic_reply'].map(key => (
                                                        <div key={key} className="report-category">
                                                            <span className={`text-${key.includes('bounce') ? 'danger' : 'secondary'}`}>
                                                                {reports[currentSeqData.id]?.stats?.[key] || 0}
                                                            </span>
                                                            <div>{key.replace('_', ' ')}</div>
                                                        </div>
                                                    ))}
                                                 </div>

                                                {/* 3. Per Account Stats Table */}
                                                {reports[currentSeqData.id]?.per_account_stats?.length > 0 && (
                                                    <div className="mt-4">
                                                        <h5>Per Account Send Status</h5>
                                                        <CTable striped responsive hover>
                                                            <CTableHead>
                                                                <CTableRow>
                                                                    <CTableHeaderCell>Account</CTableHeaderCell>
                                                                    <CTableHeaderCell>Total Assigned</CTableHeaderCell>
                                                                    <CTableHeaderCell>Sent</CTableHeaderCell>
                                                                    <CTableHeaderCell>Sending</CTableHeaderCell>
                                                                    <CTableHeaderCell>Pending</CTableHeaderCell>
                                                                    <CTableHeaderCell>Failed</CTableHeaderCell>
                                                                    <CTableHeaderCell>Last Sent</CTableHeaderCell>
                                                                    <CTableHeaderCell>Last Error</CTableHeaderCell>
                                                                </CTableRow>
                                                            </CTableHead>
                                                            <CTableBody>
                                                                {reports[currentSeqData.id].per_account_stats.map((account) => (
                                                                    <CTableRow key={account.from_email}>
                                                                        <CTableDataCell>{account.from_email}</CTableDataCell>
                                                                        <CTableDataCell>{account.total}</CTableDataCell>
                                                                        <CTableDataCell className="text-success">{account.sent}</CTableDataCell>
                                                                        <CTableDataCell className="text-info">{account.sending}</CTableDataCell>
                                                                        <CTableDataCell className="text-warning">{account.pending}</CTableDataCell>
                                                                        <CTableDataCell className="text-danger">{account.failed}</CTableDataCell>
                                                                        <CTableDataCell>{formatDateTime(account.last_sent_at)}</CTableDataCell>
                                                                        <CTableDataCell>
                                                                             {account.last_error ? (
                                                                                <span className="text-danger" title={account.last_error}>
                                                                                    {account.last_error.substring(0, 30) + (account.last_error.length > 30 ? '...' : '')}
                                                                                </span>
                                                                            ) : '—'}
                                                                        </CTableDataCell>
                                                                    </CTableRow>
                                                                ))}
                                                            </CTableBody>
                                                        </CTable>
                                                    </div>
                                                )}

                                                {/* 4. Failed Emails Table */}
                                                {reports[currentSeqData.id]?.failed_details?.length > 0 && (
                                                    <div className="mt-4">
                                                        <h5>Failed Emails</h5>
                                                        <CTable striped hover responsive>
                                                            <CTableHead>
                                                                <CTableRow>
                                                                    <CTableHeaderCell>Email</CTableHeaderCell>
                                                                    <CTableHeaderCell>Error Message</CTableHeaderCell>
                                                                </CTableRow>
                                                            </CTableHead>
                                                            <CTableBody>
                                                                {reports[currentSeqData.id].failed_details.map((detail, index) => (
                                                                    <CTableRow key={index}>
                                                                        <CTableDataCell>{detail.to_email}</CTableDataCell>
                                                                        <CTableDataCell className="text-danger">{detail.error_message}</CTableDataCell>
                                                                    </CTableRow>
                                                                ))}
                                                            </CTableBody>
                                                        </CTable>
                                                    </div>
                                                )}

                                            </div>
                                         ) : (
                                             <div className="text-muted text-center pt-5 pb-5">
                                                 <CIcon icon={cilChart} size="4xl" className="mb-3 text-light-gray"/>
                                                 <p>This sequence has not started yet.</p>
                                                 <p>Once started, live monitoring will appear here.</p>
                                             </div>
                                         )}
                                     </CCardBody>
                                 </CCard>
                             )}
                         </div>
                     )}
                </CCardBody>
            </CCard>

            {/* --- Modals --- */}
            
            {/* New Set Modal */}
            <CModal visible={modalState.newSet} onClose={() => setModalState({...modalState, newSet: false})}>
                <CModalHeader><CModalTitle>Create New Set</CModalTitle></CModalHeader>
                <CModalBody>
                    <CForm>
                        <div className="mb-3">
                            <CFormLabel>Set Name</CFormLabel>
                            <CFormInput value={newSetForm.name} onChange={(e) => setNewSetForm({...newSetForm, name: e.target.value})} placeholder="Enter set name"/>
                        </div>
                        <div className="mb-3">
                            <CFormLabel>Number of Sequences</CFormLabel>
                            <CFormInput type="number" min="1" value={newSetForm.count} onChange={(e) => setNewSetForm({...newSetForm, count: parseInt(e.target.value)})}/>
                        </div>
                    </CForm>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setModalState({...modalState, newSet: false})}>Cancel</CButton>
                    <CButton color="primary" onClick={handleCreateSet}>Create Set</CButton>
                </CModalFooter>
            </CModal>

            {/* Assignment Modal */}
            <CModal visible={modalState.assignment} onClose={() => setModalState({...modalState, assignment: false})}>
                 <CModalHeader><CModalTitle>Configure Assignment</CModalTitle></CModalHeader>
                 <CModalBody>
                     {assignmentModalData.mode === 'batch_size' ? (
                         <div>
                             <CFormLabel>Batch Size (emails per account)</CFormLabel>
                             <CFormInput type="number" min="1" value={assignmentModalData.batchSize} onChange={(e) => setAssignmentModalData({...assignmentModalData, batchSize: parseInt(e.target.value)})} />
                             {(() => {
                                 const fromCount = (currentSeqData?.from_emails || []).length;
                                 const totalAssigned = assignmentModalData.batchSize * fromCount;
                                 const skipped = assignmentModalData.subscriberCount - totalAssigned;
                                 return skipped > 0 ? <CAlert color="warning" className="mt-2">Warning: {skipped} subscribers will be skipped.</CAlert> : null;
                             })()}
                         </div>
                     ) : (
                         <div>
                             <p><strong>Total Subscribers:</strong> {assignmentModalData.loadingCount ? '...' : assignmentModalData.subscriberCount}</p>
                             <div style={{maxHeight:'300px', overflowY:'auto'}}>
                                 {(currentSeqData?.from_emails || []).map(email => (
                                     <div key={email} className="mb-2">
                                         <CFormLabel>{email}</CFormLabel>
                                         <CFormInput 
                                            type="number" 
                                            min="0" 
                                            value={assignmentModalData.manualAssignments[email] || 0}
                                            onChange={(e) => setAssignmentModalData(prev => ({
                                                ...prev,
                                                manualAssignments: {
                                                    ...prev.manualAssignments,
                                                    [email]: parseInt(e.target.value) || 0
                                                }
                                            }))}
                                         />
                                     </div>
                                 ))}
                             </div>
                             <p>Total Assigned: {getManualAssignedCount()}</p>
                             {assignmentModalData.subscriberCount - getManualAssignedCount() > 0 && 
                                <CAlert color="warning">Warning: {assignmentModalData.subscriberCount - getManualAssignedCount()} subscribers unassigned.</CAlert>
                             }
                         </div>
                     )}
                 </CModalBody>
                 <CModalFooter>
                     <CButton color="secondary" onClick={() => setModalState({...modalState, assignment: false})}>Cancel</CButton>
                     <CButton color="primary" onClick={saveAssignmentModal}>Save Assignments</CButton>
                 </CModalFooter>
            </CModal>

            {/* Audience Modal */}
            <CModal
                visible={showAudienceModal}
                onClose={() => {
                  if (!audienceModalLoading) setShowAudienceModal(false);
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
                      <CFormSelect
                        value={existingAudienceId}
                        onChange={(e) => setExistingAudienceId(e.target.value)}
                        disabled={loading} // Reuse loading state or separate
                      >
                        <option value="">Select an audience</option>
                        {audiences.map((audience) => (
                          <option key={audience.id} value={audience.id}>
                            {audience.name}
                          </option>
                        ))}
                      </CFormSelect>
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

            {/* Other Modals (Delete Set, Delete Sequence, Quota) */}
            <CModal visible={modalState.deleteSet} onClose={() => setModalState({...modalState, deleteSet: false})}>
               <CModalHeader><CModalTitle>Confirm Delete Set</CModalTitle></CModalHeader>
               <CModalBody>Are you sure you want to permanently delete this set and all its sequences?</CModalBody>
               <CModalFooter>
                   <CButton color="secondary" onClick={() => setModalState({...modalState, deleteSet: false})}>Cancel</CButton>
                   <CButton color="danger" onClick={handleDeleteSet} className="text-white">Delete</CButton>
               </CModalFooter>
            </CModal>
            
            <CModal visible={modalState.deleteSequence} onClose={() => setModalState({...modalState, deleteSequence: false})}>
               <CModalHeader><CModalTitle>Confirm Delete Sequence</CModalTitle></CModalHeader>
               <CModalBody>Are you sure you want to delete this sequence?</CModalBody>
               <CModalFooter>
                   <CButton color="secondary" onClick={() => setModalState({...modalState, deleteSequence: false})}>Cancel</CButton>
                   <CButton color="danger" onClick={handleDeleteSequence} className="text-white">Delete</CButton>
               </CModalFooter>
            </CModal>
            
         

            {/* Schedule Modal */}
            <CModal visible={modalState.schedule} onClose={() => setModalState({...modalState, schedule: false})} size="lg">
                <CModalHeader><CModalTitle>Schedule Sequence</CModalTitle></CModalHeader>
                <CModalBody>
                    <CForm>
                        <CRow className="mb-3">
                            <CCol md={6}>
                                <CFormLabel className="fw-semibold">Schedule Date & Time <span className="text-danger">*</span></CFormLabel>
                                <CFormInput
                                    type="datetime-local"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    required
                                />
                            </CCol>
                            <CCol md={6}>
                                <CFormLabel className="fw-semibold">Timezone <span className="text-danger">*</span></CFormLabel>
                                <CFormSelect
                                    value={scheduleTimezone}
                                    onChange={(e) => setScheduleTimezone(e.target.value)}
                                    required
                                >
                                    {timezones.map(tz => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </CFormSelect>
                            </CCol>
                        </CRow>
                    </CForm>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setModalState({...modalState, schedule: false})} disabled={scheduleLoading}>
                        Cancel
                    </CButton>
                    <CButton color="primary" onClick={handleScheduleSequence} disabled={scheduleLoading || !scheduleTime}>
                        {scheduleLoading && <CSpinner size="sm" className="me-2" />}
                        Schedule
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* Preview Modal */}
            <CModal visible={modalState.preview} onClose={() => setModalState({...modalState, preview: false})} size="xl">
                <CModalHeader><CModalTitle>{previewContent.title || 'Email Preview'}</CModalTitle></CModalHeader>
                <CModalBody>
                    {previewLoading ? (
                        <div className="text-center p-4">
                            <CSpinner />
                            <p className="mt-2">Loading preview...</p>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-3 p-3" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                                <strong>Subject:</strong> {previewContent.subject}
                            </div>
                            <div 
                                className="p-3" 
                                style={{ border: '1px solid #dee2e6', borderRadius: '8px', minHeight: '300px' }}
                                dangerouslySetInnerHTML={{ __html: previewContent.content }}
                            />
                        </div>
                    )}
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={() => setModalState({...modalState, preview: false})}>
                        Close
                    </CButton>
                </CModalFooter>
            </CModal>

            {/* Toast Messages */}
            {(error || success) && (
                <div style={{position: 'fixed', top: '20px', right: '20px', zIndex: 9999}}>
                    {error && <CAlert color="danger" dismissible onClose={() => setError('')}>{error}</CAlert>}
                    {success && <CAlert color="success" dismissible onClose={() => setSuccess('')}>{success}</CAlert>}
                </div>
            )}
        </>
    );
};

export default Driftemail;
