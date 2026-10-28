import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  cilSearch,
  cilLayers,
  cilSpeedometer
} from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';
import TemplateEditor from 'src/resources/views/components/TemplateEditor';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import styles from './driftemail.module.css';

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
        <div className={styles.multiselectContainer} ref={wrapperRef}>
            <div 
                className={styles.multiselectInput} 
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                {value.map(val => {
                    const opt = options.find(o => o.value === val);
                    return opt ? (
                        <span key={val} className={styles.chip}>
                            {opt.label}
                            <span className={styles.chipRemove} onClick={(e) => removeChip(e, val)}>
                                <CIcon icon={cilX} size="sm" style={{width:'12px', height:'12px'}}/>
                            </span>
                        </span>
                    ) : null;
                })}
                <input 
                    ref={inputRef}
                    className={styles.multiselectSearch}
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
                <div className={styles.multiselectDropdown}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(opt => (
                            <div 
                                key={opt.value} 
                                className={`${styles.multiselectOption} ${value.includes(opt.value) ? styles.multiselectOptionSelected : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={value.includes(opt.value)} 
                                    readOnly 
                                    style={{ marginRight: '10px', accentColor: '#6366f1' }}
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
 * Modern Grouped Multi-Select Dropdown for Email Senders
 */
const EmailSenderDropdown = ({ regions = [], emailAccounts = [], value = [], onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get all unique emails
    const allEmails = useMemo(() => {
        if (regions && regions.length > 0) {
            const list = [];
            regions.forEach(r => {
                (r.emails || []).forEach(em => {
                    if (!list.includes(em)) list.push(em);
                });
            });
            return list;
        }
        return (emailAccounts || []).map(acc => acc.email || acc).filter(Boolean);
    }, [regions, emailAccounts]);

    // Filter regions & emails based on search query
    const filteredRegions = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return regions;
        return regions.map(r => ({
            ...r,
            emails: (r.emails || []).filter(em => 
                em.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
            )
        })).filter(r => r.emails.length > 0);
    }, [regions, searchQuery]);

    const filteredAccounts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return emailAccounts;
        return emailAccounts.filter(acc => {
            const em = acc.email || acc;
            return em.toLowerCase().includes(q);
        });
    }, [emailAccounts, searchQuery]);

    const handleToggleEmail = (email) => {
        if (value.includes(email)) {
            onChange(value.filter(v => v !== email));
        } else {
            onChange([...value, email]);
        }
    };

    const handleSelectAll = () => {
        onChange([...allEmails]);
    };

    const handleDeselectAll = () => {
        onChange([]);
    };

    const handleToggleRegion = (regionEmails) => {
        const allRegionSelected = regionEmails.every(em => value.includes(em));
        if (allRegionSelected) {
            onChange(value.filter(v => !regionEmails.includes(v)));
        } else {
            const toAdd = regionEmails.filter(em => !value.includes(em));
            onChange([...value, ...toAdd]);
        }
    };

    const handleRemovePill = (e, email) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== email));
    };

    const handleClearAll = (e) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className={styles.senderDropdownContainer} ref={containerRef}>
            {/* Trigger Button */}
            <div 
                className={`${styles.senderDropdownTrigger} ${isOpen ? styles.senderDropdownTriggerOpen : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                role="button"
                tabIndex={0}
            >
                <div className={styles.senderDropdownValueArea}>
                    {value.length === 0 ? (
                        <span className={styles.senderDropdownPlaceholder}>
                            -- Select Email Senders --
                        </span>
                    ) : (
                        <>
                            {value.slice(0, 2).map(email => (
                                <span key={email} className={styles.senderPill}>
                                    <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
                                        {email}
                                    </span>
                                    <span 
                                        className={styles.senderPillRemove}
                                        onClick={(e) => handleRemovePill(e, email)}
                                        title="Remove"
                                    >
                                        <CIcon icon={cilX} size="sm" style={{ width: 10, height: 10 }} />
                                    </span>
                                </span>
                            ))}
                            {value.length > 2 && (
                                <span className={styles.senderMoreBadge}>
                                    +{value.length - 2} more ({value.length} total)
                                </span>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.senderDropdownControls}>
                    {value.length > 0 && (
                        <button 
                            type="button" 
                            className={styles.senderClearAllBtn}
                            onClick={handleClearAll}
                            title="Clear all selected"
                        >
                            <CIcon icon={cilX} size="sm" style={{ width: 13, height: 13 }} />
                        </button>
                    )}
                    <span className={`${styles.senderChevron} ${isOpen ? styles.senderChevronRotated : ''}`}>
                        <CIcon icon={cilChevronBottom} size="sm" style={{ width: 14, height: 14 }} />
                    </span>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={styles.senderDropdownMenu}>
                    {/* Search Bar */}
                    <div className={styles.senderDropdownSearchBox}>
                        <input 
                            type="text"
                            className={styles.senderSearchInput}
                            placeholder="Search sender email or region..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>

                    {/* Quick Actions Row */}
                    <div className={styles.senderDropdownActionsRow}>
                        <div className="d-flex align-items-center gap-2">
                            <button 
                                type="button" 
                                className={styles.senderActionBtn}
                                onClick={handleSelectAll}
                            >
                                Select All ({allEmails.length})
                            </button>
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                            <button 
                                type="button" 
                                className={styles.senderActionBtn}
                                onClick={handleDeselectAll}
                            >
                                Clear
                            </button>
                        </div>
                        <span className={styles.senderStatusCount}>
                            {value.length} of {allEmails.length} selected
                        </span>
                    </div>

                    {/* Scrollable List */}
                    <div className={styles.senderOptionsScroll}>
                        {regions && regions.length > 0 ? (
                            filteredRegions.length > 0 ? (
                                filteredRegions.map(region => {
                                    const regionEmails = region.emails || [];
                                    const selectedInRegion = regionEmails.filter(em => value.includes(em)).length;
                                    const isAllRegionSelected = regionEmails.length > 0 && selectedInRegion === regionEmails.length;

                                    return (
                                        <div key={region.name}>
                                            <div className={styles.senderGroupHeader}>
                                                <div className={styles.senderGroupTitle}>
                                                    <span>{region.name}</span>
                                                    <span className={styles.senderGroupBadge}>
                                                        {selectedInRegion}/{regionEmails.length}
                                                    </span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className={styles.senderGroupToggleBtn}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleRegion(regionEmails);
                                                    }}
                                                >
                                                    {isAllRegionSelected ? 'Deselect Region' : 'Select Region'}
                                                </button>
                                            </div>

                                            {regionEmails.map(email => {
                                                const isSelected = value.includes(email);
                                                return (
                                                    <div 
                                                        key={email}
                                                        className={`${styles.senderOptionItem} ${isSelected ? styles.senderOptionItemSelected : ''}`}
                                                        onClick={() => handleToggleEmail(email)}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {}}
                                                            className={styles.senderOptionCheckbox}
                                                        />
                                                        <span className={styles.senderOptionEmail}>{email}</span>
                                                        <span className={styles.senderOptionDot} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.senderEmptyNotice}>No senders match "{searchQuery}"</div>
                            )
                        ) : (
                            filteredAccounts.length > 0 ? (
                                filteredAccounts.map(acc => {
                                    const email = acc.email || acc;
                                    const isSelected = value.includes(email);
                                    return (
                                        <div 
                                            key={email}
                                            className={`${styles.senderOptionItem} ${isSelected ? styles.senderOptionItemSelected : ''}`}
                                            onClick={() => handleToggleEmail(email)}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className={styles.senderOptionCheckbox}
                                            />
                                            <span className={styles.senderOptionEmail}>{email}</span>
                                            <span className={styles.senderOptionDot} />
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.senderEmptyNotice}>No senders available</div>
                            )
                        )}
                    </div>
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
    };    if (loading) return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <CSpinner color="primary" style={{ width: '3rem', height: '3rem', marginBottom: '1rem' }} />
          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading Campaign Sequences & Quotas...</div>
        </div>
      </div>
    );
    const currentSeqData = activeSequenceId ? sequenceData[activeSequenceId] : null;

    return (
        <div className={styles.container}>
            {/* Header Row */}
            <div className={styles.headerRow}>
                <div className={styles.headerLeft}>
                    <div className={styles.badgePill}>
                        <span className={styles.pulseDot} />
                        MULTI-STAGE CAMPAIGN ENGINE
                    </div>
                    <h1 className={styles.mainTitle}>Drift Email Campaigns</h1>
                    <p className={styles.subTitle}>
                        Automate progressive multi-touch sequences, configure custom batch assignments, and monitor real-time sender deliverability.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.quotaPillBtn} onClick={() => setModalState({...modalState, quota: true})}>
                        <CIcon icon={cilChart} className="me-1" />
                        <span className={styles.quotaLabel}>Daily Quota:</span>
                        <span className={styles.quotaValue}>{quota.total_used} / {quota.total_limit || '∞'} Sent</span>
                    </button>
                    <button className={styles.refreshBtn} onClick={() => { fetchSets(); fetchQuotaInfo(); if (activeSequenceId) fetchReports(activeSequenceId); }}>
                        <CIcon icon={cilReload} />
                        Refresh
                    </button>
                    <button className={styles.saveAllBtn} onClick={handleSaveAll} disabled={saving}>
                        {saving ? <CSpinner size="sm" className="me-1"/> : <CIcon icon={cilSave} className="me-1"/>}
                        Save All Sequences
                    </button>
                    <button className={styles.actionBtn} onClick={() => setModalState({...modalState, newSet: true})}>
                        <CIcon icon={cilPlus} />
                        New Set
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconIndigo}`}>
                        <CIcon icon={cilLayers} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{sets.length}</div>
                        <div className={styles.statLabel}>Campaign Sets</div>
                        <div className={styles.statSub}>Configured drip sequence sets</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconViolet}`}>
                        <CIcon icon={cilClock} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{sequences.length}</div>
                        <div className={styles.statLabel}>Active Sequences</div>
                        <div className={styles.statSub}>Progressive touchpoint stages</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconEmerald}`}>
                        <CIcon icon={cilEnvelopeClosed} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>{emailAccounts.length || 20}</div>
                        <div className={styles.statLabel}>Connected Inboxes</div>
                        <div className={styles.statSub}>High-deliverability sender pool</div>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconCyan}`}>
                        <CIcon icon={cilChart} />
                    </div>
                    <div className={styles.statInfo}>
                        <div className={styles.statValue}>
                            {quota.total_limit > 0 ? `${Math.round(((quota.total_limit - quota.total_used) / quota.total_limit) * 100)}%` : '100%'}
                        </div>
                        <div className={styles.statLabel}>Daily Capacity</div>
                        <div className={styles.statSub}>{quota.total_used} dispatched today</div>
                    </div>
                </div>
            </div>

            {/* Sets Navigation Bar */}
            <div className={styles.setsBarWrapper}>
                <div className={styles.setsBarLeft}>
                    <span className={styles.setsBarLabel}>Drip Set Group:</span>
                    {sets.map(set => (
                        <button
                            key={set.id}
                            className={`${styles.setTab} ${activeSetId === set.id ? styles.setTabActive : ''}`}
                            onClick={() => setActiveSetId(set.id)}
                        >
                            <span>{set.set_name}</span>
                            <span 
                                className={styles.setDeleteIcon}
                                title="Delete Set"
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
                    <button className={styles.newSetInlineBtn} onClick={() => setModalState({...modalState, newSet: true})}>
                        <CIcon icon={cilPlus} size="sm" />
                        New Set
                    </button>
                </div>
            </div>

            {/* Active Set Content */}
            {activeSetId && (
                <div className={styles.activeSetContainer}>
                    <div className={styles.activeSetHeader}>
                        <div className={styles.activeSetTitleInfo}>
                            <span className={styles.activeSetBadge}>Active Pipeline</span>
                            <h3 className={styles.activeSetName}>
                                {sets.find(s => s.id === activeSetId)?.set_name || 'Campaign Pipeline'}
                            </h3>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                            {sequences.length} sequence {sequences.length === 1 ? 'stage' : 'stages'} configured
                        </div>
                    </div>

                    {/* Sequence Tabs Stepper */}
                    <div className={styles.sequenceTabsWrapper}>
                        <div className={styles.sequenceTabsGroup}>
                            {sequences.map((seq, idx) => {
                                const statusClassKey = seq.status ? 'status' + seq.status.charAt(0).toUpperCase() + seq.status.slice(1) : 'statusDraft';
                                const statusClass = styles[statusClassKey] || styles.statusDraft;
                                return (
                                    <button
                                        key={seq.id}
                                        className={`${styles.sequenceTab} ${activeSequenceId === seq.id ? styles.sequenceTabActive : ''}`}
                                        onClick={() => {
                                            setActiveSequenceId(seq.id);
                                            setActiveSequenceIndex(idx);
                                        }}
                                    >
                                        <span>{seq.name || `Sequence ${idx + 1}`}</span>
                                        <span className={`${styles.statusDot} ${statusClass}`} />
                                    </button>
                                );
                            })}
                            <button className={styles.addSequenceIconBtn} onClick={handleAddSequence} title="Add Sequence Stage">
                                <CIcon icon={cilPlus} size="lg"/>
                            </button>
                        </div>
                        <button className={styles.newSeqPrimaryBtn} onClick={handleAddSequence}>
                            <CIcon icon={cilPlus} size="sm"/>
                            New Sequence
                        </button>
                    </div>

                    {/* Sequence Form */}
                    {currentSeqData && (
                        <div className={styles.formCard}>
                            <div className={styles.formCardHeader}>
                                <div className={styles.formCardTitle}>
                                    <span>{currentSeqData.name || `Sequence ${activeSequenceIndex + 1}`}</span>
                                    <span className={styles.formCardBadge}>
                                        Stage {activeSequenceIndex + 1} of {sequences.length}
                                    </span>
                                </div>
                                <button 
                                    className={styles.deleteSeqBtn}
                                    onClick={() => {
                                        setDeleteTarget(currentSeqData.id);
                                        setModalState({...modalState, deleteSequence: true});
                                    }}
                                >
                                    <CIcon icon={cilTrash} size="sm"/>
                                    Delete Stage
                                </button>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className={styles.fieldLabel}>Sequence Name</label>
                                    <input 
                                        type="text"
                                        className={styles.darkInput}
                                        value={currentSeqData.name || ''} 
                                        onChange={(e) => updateSeqField('name', e.target.value)} 
                                        placeholder="e.g. Initial Executive Outreach"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className={styles.fieldLabel}>Subject Line</label>
                                    <input 
                                        type="text"
                                        className={styles.darkInput}
                                        value={currentSeqData.subject || ''} 
                                        onChange={(e) => updateSeqField('subject', e.target.value)} 
                                        placeholder="e.g. Quick question regarding {{company}}..."
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className={styles.fieldLabel}>Select Template</label>
                                    <div className="d-flex">
                                        <select 
                                            className={`${styles.darkSelect} ${styles.selectWithAddon}`}
                                            value={currentSeqData.template_id || ''} 
                                            onChange={handleTemplateChange}
                                        >
                                            <option value="">-- Select Template --</option>
                                            {templates.map(t => (
                                                <option key={t.id || t._id} value={t.id || t._id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <button 
                                            type="button" 
                                            className={styles.inputGroupAddonBtn}
                                            onClick={handleAddTemplate}
                                        >
                                            <CIcon icon={cilPlus} size="sm" />
                                            New
                                        </button>
                                    </div>
                                </div>

                                {activeSequenceIndex === 0 ? (
                                    <>
                                        <div className="col-md-6">
                                            <label className={styles.fieldLabel}>Select Audience Segment</label>
                                            <div className="d-flex">
                                                <select 
                                                    className={`${styles.darkSelect} ${styles.selectWithAddon}`}
                                                    value={currentSeqData.audience_id || ''} 
                                                    onChange={(e) => updateSeqField('audience_id', e.target.value)}
                                                >
                                                    <option value="">-- Select Audience --</option>
                                                    {audiences.map(a => (
                                                        <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                                                    ))}
                                                </select>
                                                <button 
                                                    type="button" 
                                                    className={styles.inputGroupAddonBtn}
                                                    onClick={() => setShowAudienceModal(true)}
                                                >
                                                    <CIcon icon={cilPlus} size="sm" />
                                                    New
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-md-6">
                                            <label className={styles.fieldLabel}>
                                                Time Gap Between Batches (seconds)
                                                <CTooltip content="Time gap applies only between dispatched batches">
                                                    <CIcon icon={cilInfo} className="ms-1 text-muted" size="sm"/>
                                                </CTooltip>
                                            </label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                className={styles.darkInput}
                                                value={currentSeqData.time_gap || 5} 
                                                onChange={(e) => updateSeqField('time_gap', parseInt(e.target.value) || 5)} 
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label className={styles.fieldLabel}>Assignment Mode</label>
                                            <div className="d-flex">
                                                <select 
                                                    className={`${styles.darkSelect} ${styles.selectWithAddon}`}
                                                    value={currentSeqData.assignment_mode || 'batch_size'} 
                                                    onChange={(e) => updateSeqField('assignment_mode', e.target.value)}
                                                >
                                                    <option value="batch_size">Batch Size (Even Distribution)</option>
                                                    <option value="manual_assign">Manual Assign (Account Specific)</option>
                                                </select>
                                                <button 
                                                    type="button" 
                                                    className={styles.inputGroupAddonBtn}
                                                    onClick={openAssignmentModal}
                                                >
                                                    Configure
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-md-6">
                                        <label className={styles.fieldLabel}>
                                            Select Report Filters (Sequence {activeSequenceIndex})
                                        </label>
                                        <MultiSelectChips 
                                            options={CATEGORY_OPTIONS}
                                            value={currentSeqData.categories || []}
                                            onChange={(val) => updateSeqField('categories', val)}
                                            placeholder="Select report filters (e.g. Unopened, Replied)..."
                                        />
                                        <div className={styles.fieldHelper}>
                                            Subscribers matching these engagement criteria from the prior sequence will receive this stage.
                                        </div>
                                    </div>
                                )}

                                {/* From Emails with Regions Support */}
                                <div className="col-md-6">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>From Email Senders</label>
                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {(currentSeqData.from_emails || []).length} Selected
                                        </span>
                                    </div>
                                    <EmailSenderDropdown 
                                        regions={regions}
                                        emailAccounts={emailAccounts}
                                        value={currentSeqData.from_emails || []}
                                        onChange={(newEmails) => updateSeqField('from_emails', newEmails)}
                                    />
                                    <div className={styles.fieldHelper}>
                                        Select sender inboxes to rotate and distribute sequence emails across connected domains.
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className={styles.fieldLabel}>Wait Time for Next Sequence</label>
                                    <div className="d-flex">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            className={`${styles.darkInput} ${styles.selectWithAddon}`}
                                            value={currentSeqData.wait_time || 0} 
                                            onChange={(e) => updateSeqField('wait_time', parseInt(e.target.value) || 0)}
                                            disabled={activeSequenceIndex === sequences.length - 1} 
                                        />
                                        <select 
                                            className={styles.darkSelect}
                                            style={{ width: '130px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 'none' }}
                                            value={currentSeqData.wait_unit || 'minutes'} 
                                            onChange={(e) => updateSeqField('wait_unit', e.target.value)}
                                            disabled={activeSequenceIndex === sequences.length - 1}
                                        >
                                            {WAIT_UNIT_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className={styles.fieldHelper}>
                                        {activeSequenceIndex === sequences.length - 1 
                                            ? 'Final stage in this drip sequence.' 
                                            : 'Delay before dispatching subsequent touchpoint stage.'}
                                    </div>
                                </div>
                            </div>

                            {/* Form Action Buttons Bar */}
                            <div className={styles.formActionsRow}>
                                {activeSequenceIndex === sequences.length - 1 && (
                                    <div className={styles.executionActions}>
                                        <button 
                                            type="button" 
                                            className={styles.sendNowBtn} 
                                            onClick={() => handleSendImmediately(currentSeqData.id)}
                                        >
                                            <CIcon icon={cilMediaPlay} />
                                            Send Immediately
                                        </button>
                                        <button 
                                            type="button" 
                                            className={styles.scheduleBtn} 
                                            onClick={() => setModalState(prev => ({...prev, schedule: true}))}
                                        >
                                            <CIcon icon={cilClock} />
                                            Schedule Sequence
                                        </button>
                                    </div>
                                )}

                                <div className={styles.workflowActions}>
                                    <button 
                                        type="button" 
                                        className={styles.outlineBtn} 
                                        disabled={activeSequenceIndex === 0} 
                                        onClick={() => handleSaveSequence(currentSeqData.id, 'prev')}
                                    >
                                        <CIcon icon={cilChevronLeft} />
                                        Previous
                                    </button>
                                    
                                    {activeSequenceIndex < sequences.length - 1 ? (
                                        <button 
                                            type="button" 
                                            className={styles.outlineBtn} 
                                            onClick={() => handleSaveSequence(currentSeqData.id, 'next')}
                                        >
                                            Next
                                            <CIcon icon={cilChevronRight} />
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            className={styles.saveSeqBtn} 
                                            onClick={() => handleSaveSequence(currentSeqData.id)}
                                        >
                                            <CIcon icon={cilSave} />
                                            Save Stage
                                        </button>
                                    )}
                                    
                                    <button 
                                        type="button" 
                                        className={styles.outlineBtn} 
                                        onClick={handlePreview}
                                    >
                                        <CIcon icon={cilSearch} />
                                        Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reports & Live Telemetry Section */}
                    {currentSeqData && (
                        <div className={styles.monitoringCard}>
                            <div className={styles.monitoringHeader}>
                                <div className={styles.monitoringTitle}>
                                    <span className={styles.monitoringLiveDot} />
                                    <span>Sequence {activeSequenceIndex + 1} Live Telemetry & Monitoring</span>
                                </div>
                                <button className={styles.refreshBtn} onClick={() => fetchReports(currentSeqData.id)}>
                                    <CIcon icon={cilReload} />
                                    Refresh Telemetry
                                </button>
                            </div>
                            <div className={styles.monitoringBody}>
                                {loadingReports[currentSeqData.id] && !reports[currentSeqData.id] ? (
                                    <div className="text-center p-5 text-muted">
                                        <CSpinner size="sm" className="me-2" />
                                        Loading real-time sequence reports...
                                    </div>
                                ) : reports[currentSeqData.id] ? (
                                    <div>
                                        {/* Circular Progress & High Level Stats */}
                                        <div className={styles.progressHeroCard}>
                                            {(() => {
                                                const stats = reports[currentSeqData.id]?.stats || {};
                                                const total = (stats.sent || 0) + (stats.failed || 0) + (stats.pending || 0);
                                                const progressPct = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
                                                return (
                                                    <>
                                                        <div className={styles.progressHeroTop}>
                                                            <div className={styles.circularWrapper}>
                                                                <CircularProgressbar
                                                                    value={progressPct}
                                                                    text={`${progressPct}%`}
                                                                    styles={buildStyles({
                                                                        textSize: '22px',
                                                                        pathColor: progressPct === 100 ? '#10b981' : '#6366f1',
                                                                        textColor: '#ffffff',
                                                                        trailColor: 'rgba(255, 255, 255, 0.08)',
                                                                        pathTransitionDuration: 0.5,
                                                                    })}
                                                                />
                                                            </div>
                                                            <div className={styles.progressInfo}>
                                                                <div className={styles.progressTitleRow}>
                                                                    <h5 className={styles.progressTitle}>Sequence Dispatch Progress</h5>
                                                                    {progressPct === 100 ? (
                                                                        <CBadge color="success" className="px-3 py-2">
                                                                            <CIcon icon={cilCheck} className="me-1" />
                                                                            Completed
                                                                        </CBadge>
                                                                    ) : (
                                                                        <CBadge color="info" className="px-3 py-2">
                                                                            In Progress
                                                                        </CBadge>
                                                                    )}
                                                                </div>
                                                                <div className={styles.progressSentText}>
                                                                    <strong style={{ color: '#ffffff' }}>{stats.sent || 0}</strong> of {total} emails dispatched
                                                                </div>
                                                                {stats.pending > 0 && progressPct < 100 && (
                                                                    <div className={styles.progressEtaText}>
                                                                        ⏱️ Estimated completion: ~{Math.max(1, Math.ceil(stats.pending / 25))} minute{Math.ceil(stats.pending / 25) > 1 ? 's' : ''} remaining
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Primary Metrics Grid */}
                                                        <div className={styles.monitorStatsGrid}>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#818cf8' }}>{total}</div>
                                                                <div className={styles.monitorStatLabel}>Total</div>
                                                            </div>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#34d399' }}>{stats.sent || 0}</div>
                                                                <div className={styles.monitorStatLabel}>Sent</div>
                                                            </div>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#f87171' }}>{stats.failed || 0}</div>
                                                                <div className={styles.monitorStatLabel}>Failed</div>
                                                            </div>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#fbbf24' }}>{stats.pending || 0}</div>
                                                                <div className={styles.monitorStatLabel}>Pending</div>
                                                            </div>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#38bdf8' }}>{stats.sending || 0}</div>
                                                                <div className={styles.monitorStatLabel}>Sending</div>
                                                            </div>
                                                            <div className={styles.monitorStatItem}>
                                                                <div className={styles.monitorStatValue} style={{ color: '#c084fc' }}>{stats.replied || 0}</div>
                                                                <div className={styles.monitorStatLabel}>Replied</div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>

                                        {/* Deliverability & Bounce Breakdown */}
                                        <div className={styles.breakdownGrid}>
                                            {['softbounce', 'hardbounce', 'unsubscribed', 'unopened', 'automatic_reply'].map(key => {
                                                const val = reports[currentSeqData.id]?.stats?.[key] || 0;
                                                const isBounce = key.includes('bounce');
                                                return (
                                                    <div key={key} className={styles.breakdownItem}>
                                                        <div className={styles.breakdownValue} style={{ color: isBounce ? '#f87171' : '#94a3b8' }}>
                                                            {val}
                                                        </div>
                                                        <div className={styles.breakdownLabel}>
                                                            {key.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Per Account Send Status Table */}
                                        {reports[currentSeqData.id]?.per_account_stats?.length > 0 && (
                                            <div className={styles.tableCard}>
                                                <div className={styles.tableHeaderBar}>
                                                    Per Account Send Status & Telemetry
                                                </div>
                                                <div className={styles.tableResponsive}>
                                                    <table className={styles.customTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Sender Inbox</th>
                                                                <th>Assigned</th>
                                                                <th>Sent</th>
                                                                <th>Sending</th>
                                                                <th>Pending</th>
                                                                <th>Failed</th>
                                                                <th>Last Sent At</th>
                                                                <th>Last Error</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reports[currentSeqData.id].per_account_stats.map((account) => (
                                                                <tr key={account.from_email}>
                                                                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{account.from_email}</td>
                                                                    <td>{account.total}</td>
                                                                    <td style={{ color: '#34d399', fontWeight: 600 }}>{account.sent}</td>
                                                                    <td style={{ color: '#38bdf8', fontWeight: 600 }}>{account.sending}</td>
                                                                    <td style={{ color: '#fbbf24', fontWeight: 600 }}>{account.pending}</td>
                                                                    <td style={{ color: '#f87171', fontWeight: 600 }}>{account.failed}</td>
                                                                    <td>{formatDateTime(account.last_sent_at)}</td>
                                                                    <td>
                                                                        {account.last_error ? (
                                                                            <span style={{ color: '#f87171', fontSize: '0.8rem' }} title={account.last_error}>
                                                                                {account.last_error.substring(0, 30) + (account.last_error.length > 30 ? '...' : '')}
                                                                            </span>
                                                                        ) : '—'}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Failed Emails Table */}
                                        {reports[currentSeqData.id]?.failed_details?.length > 0 && (
                                            <div className={styles.tableCard}>
                                                <div className={styles.tableHeaderBar} style={{ color: '#f87171' }}>
                                                    Failed Recipients Log
                                                </div>
                                                <div className={styles.tableResponsive}>
                                                    <table className={styles.customTable}>
                                                        <thead>
                                                            <tr>
                                                                <th>Recipient Address</th>
                                                                <th>Dispatch Error Detail</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reports[currentSeqData.id].failed_details.map((detail, index) => (
                                                                <tr key={index}>
                                                                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{detail.to_email}</td>
                                                                    <td style={{ color: '#f87171' }}>{detail.error_message}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className={styles.emptyMonitoring}>
                                        <div className={styles.emptyIconWrapper}>
                                            <CIcon icon={cilChart} size="2xl" />
                                        </div>
                                        <h4 className={styles.emptyTitle}>Sequence Telemetry Pending Dispatch</h4>
                                        <p className={styles.emptySubtitle}>
                                            This sequence has not started sending yet. Once dispatched or scheduled, real-time batch metrics, deliverability health, and account throughput will stream here live.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                            <div className="mb-3 p-3" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}>
                                <strong style={{ color: '#818cf8' }}>Subject:</strong> <span style={{ color: '#ffffff' }}>{previewContent.subject}</span>
                            </div>
                            <div 
                                className="p-4" 
                                style={{ background: '#ffffff', color: '#1e293b', borderRadius: '8px', minHeight: '300px' }}
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
        </div>
    );
};

export default Driftemail;
