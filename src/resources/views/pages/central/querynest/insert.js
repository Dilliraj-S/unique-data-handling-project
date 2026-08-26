import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CButton,
  CForm,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CProgress,
  CProgressBar,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CBadge,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CSpinner,
  CCardHeader,
  CFormCheck,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilMediaStop, cilDownload, cilX, cilCheckCircle, cilXCircle, cilCloudDownload, cilWarning } from '@coreui/icons';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

/**
 * Insert Page - CSV Import Module
 * Equivalent to bv project insert.blade.php + insert.js
 * 
 * System: central
 * Module: querynest
 * Section: insert
 */
const Insert = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadDisabled, setUploadDisabled] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [database, setDatabase] = useState('');
  const [table, setTable] = useState('');
  const [type, setType] = useState('normal');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [mappingContainer, setMappingContainer] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [fileName, setFileName] = useState('');
  const [mappedColumns, setMappedColumns] = useState({});
  const [unmappedHeaders, setUnmappedHeaders] = useState([]);
  const [chunkSize, setChunkSize] = useState(5000); // Default to 5000 for faster imports
  const [activeImports, setActiveImports] = useState({});
  const [showImportDropdown, setShowImportDropdown] = useState(false);
  const [importProgress, setImportProgress] = useState({});
  const [showImportProgress, setShowImportProgress] = useState(false);
  
  // Insert Method Selection (CSV or Database)
  const [insertMethod, setInsertMethod] = useState('csv'); // 'csv' | 'database'
  
  // Database-to-Database transfer state
  const [targetDatabase, setTargetDatabase] = useState('');
  const [targetCollection, setTargetCollection] = useState('');
  const [targetCollections, setTargetCollections] = useState([]);
  const [targetCollectionFields, setTargetCollectionFields] = useState([]);
  const [loadingTargetCollections, setLoadingTargetCollections] = useState(false);
  
  // Source fields for mapping (CSV headers or target collection fields)
  const [sourceFields, setSourceFields] = useState([]);
  
  // Visual mapping connections for arrows
  const [mappingConnections, setMappingConnections] = useState([]);
  
  // Dynamic database/collection state
  const [databases, setDatabases] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(false);
  
  // Chunked upload state for large files (300MB - 2GB)
  const [uploadPhase, setUploadPhase] = useState('idle'); // idle, uploading, processing, finalizing
  const [uploadId, setUploadId] = useState('');
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  
  // Validate tab state (Duplicate Removal)
  const [mainDatabase, setMainDatabase] = useState('');
  const [mainCollection, setMainCollection] = useState('');
  const [validateTargetDatabase, setValidateTargetDatabase] = useState('');
  const [validateTargetCollection, setValidateTargetCollection] = useState('');
  const [duplicateRules, setDuplicateRules] = useState([]); // Selected rule IDs for checkboxes
  const [availableDuplicateRules, setAvailableDuplicateRules] = useState([]); // Fetched rules from database
  const [loadingDuplicateRules, setLoadingDuplicateRules] = useState(false);
  const [mainCollections, setMainCollections] = useState([]);
  const [validateTargetCollections, setValidateTargetCollections] = useState([]);
  const [loadingMainCollections, setLoadingMainCollections] = useState(false);
  const [loadingValidateTargetCollections, setLoadingValidateTargetCollections] = useState(false);
  const [validateProgress, setValidateProgress] = useState({});
  const [showValidateProgress, setShowValidateProgress] = useState(false);
  const [validateProcessId, setValidateProcessId] = useState('');
  
  // Add Rule Modal state
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleColumns, setNewRuleColumns] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  
  // History tab state
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  
  // History pagination state
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyItemsPerPage, setHistoryItemsPerPage] = useState(10);
  
  // Cleanup tab state
  const [cleanupDatabase, setCleanupDatabase] = useState('');
  const [cleanupCollection, setCleanupCollection] = useState('');
  const [cleanupCollections, setCleanupCollections] = useState([]);
  const [loadingCleanupCollections, setLoadingCleanupCollections] = useState(false);
  const [cleanupJobId, setCleanupJobId] = useState('');
  const [cleanupProgress, setCleanupProgress] = useState({});
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupError, setCleanupError] = useState('');
  const cleanupIntervalRef = useRef(null);
  
  // Deduplicate tab state
  const [dedupDatabase, setDedupDatabase] = useState('');
  const [dedupCollection, setDedupCollection] = useState('');
  const [dedupCollections, setDedupCollections] = useState([]);
  const [loadingDedupCollections, setLoadingDedupCollections] = useState(false);
  const [dedupJobId, setDedupJobId] = useState('');
  const [dedupProgress, setDedupProgress] = useState({});
  const [dedupRunning, setDedupRunning] = useState(false);
  const [dedupError, setDedupError] = useState('');
  const [dedupCriteria, setDedupCriteria] = useState(['email', 'name_company']); // Selected dedup criteria
  const dedupIntervalRef = useRef(null);
  
  const fileInputRef = useRef(null);
  
  // Track all active progress monitoring intervals to prevent memory leaks and conflicts
  const progressIntervalsRef = useRef({}); // { transferId: intervalId }
  
  // Token for API calls - following the pattern from tokens.js
  const baseToken = 'central_querynest_insert';

  // Helper to get axios with auth headers - following tokens.js pattern
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    const authAxios = axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor to handle 401 errors
    authAxios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const errorMessage = error.response?.data?.message || 'Authentication required';
          console.error('Authentication error:', errorMessage);
          // Could redirect to login here if needed
        }
        return Promise.reject(error);
      }
    );

    return authAxios;
  };

  // Load databases on component mount
  useEffect(() => {
    fetchDatabases();
    
    const stored = localStorage.getItem('activeTransfers');
    if (stored) {
      setActiveImports(JSON.parse(stored));
    }
    checkOngoingImports();
    
    // Cleanup: Clear all intervals on unmount to prevent memory leaks
    return () => {
      Object.values(progressIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      progressIntervalsRef.current = {};
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
      }
      if (dedupIntervalRef.current) {
        clearInterval(dedupIntervalRef.current);
        dedupIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch databases from API
  const fetchDatabases = async () => {
    try {
      setLoadingDatabases(true);
      const response = await axios.get('/api/import/databases');
      
      if (response.data.success) {
        setDatabases(response.data.databases);
      } else {
        console.error('Failed to fetch databases:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching databases:', error);
    } finally {
      setLoadingDatabases(false);
    }
  };

  // Fetch import history from process_logs
  const fetchHistory = async (statusFilter = 'all') => {
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      setHistoryCurrentPage(1); // Reset to first page on filter change
      
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await axios.get(`/api/import/history?${params.toString()}`);
      
      if (response.data.success) {
        setImportHistory(response.data.history);
      } else {
        setHistoryError('Failed to fetch history');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryError(error.message || 'Failed to fetch history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load history when History tab is activated
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory(historyFilter);
    }
  }, [activeTab, historyFilter]);

  // Fetch duplicate rules when Validate tab is activated
  useEffect(() => {
    if (activeTab === 'validate') {
      fetchDuplicateRules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Pagination calculations for history table
  const historyTotalPages = useMemo(() => {
    return Math.ceil(importHistory.length / historyItemsPerPage);
  }, [importHistory.length, historyItemsPerPage]);

  const paginatedHistory = useMemo(() => {
    const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    return importHistory.slice(startIndex, endIndex);
  }, [importHistory, historyCurrentPage, historyItemsPerPage]);

  // Fetch collections for selected database
  const fetchCollections = async (databaseName) => {
    if (!databaseName) {
      setCollections([]);
      return;
    }

    try {
      setLoadingCollections(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      
      if (response.data.success) {
        setCollections(response.data.collections);
      } else {
        console.error('Failed to fetch collections:', response.data.error);
        setCollections([]);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      setCollections([]);
    } finally {
      setLoadingCollections(false);
    }
  };

  // Handle database selection change
  const handleDatabaseChange = (selectedDatabase) => {
    setDatabase(selectedDatabase);
    setTable(''); // Reset table selection
    setTableColumns([]); // Reset table columns
    
    if (selectedDatabase) {
      fetchCollections(selectedDatabase);
    } else {
      setCollections([]);
    }
  };

  // Handle table selection change
  const handleTableChange = (selectedTable) => {
    setTable(selectedTable);
    
    // Find selected collection and set its fields as table columns
    const selectedCollection = collections.find(col => col.name === selectedTable);
    if (selectedCollection) {
      setTableColumns(selectedCollection.fields || []);
    } else {
      setTableColumns([]);
    }
  };

  // Handle target database selection change (for Database method)
  const handleTargetDatabaseChange = async (selectedDatabase) => {
    setTargetDatabase(selectedDatabase);
    setTargetCollection('');
    setTargetCollectionFields([]);
    setSourceFields([]);
    
    if (selectedDatabase) {
      await fetchTargetCollections(selectedDatabase);
    } else {
      setTargetCollections([]);
    }
  };

  // Fetch collections for target database
  const fetchTargetCollections = async (databaseName) => {
    try {
      setLoadingTargetCollections(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      
      if (response.data.success) {
        setTargetCollections(response.data.collections);
      } else {
        console.error('Failed to fetch target collections:', response.data.error);
        setTargetCollections([]);
      }
    } catch (error) {
      console.error('Error fetching target collections:', error);
      setTargetCollections([]);
    } finally {
      setLoadingTargetCollections(false);
    }
  };

  // Handle target collection selection change
  const handleTargetCollectionChange = (selectedCollection) => {
    setTargetCollection(selectedCollection);
    
    // Find selected collection and set its fields as source fields
    const collection = targetCollections.find(col => col.name === selectedCollection);
    if (collection) {
      setTargetCollectionFields(collection.fields || []);
      setSourceFields(collection.fields || []);
      setUnmappedHeaders(collection.fields || []);
    } else {
      setTargetCollectionFields([]);
      setSourceFields([]);
      setUnmappedHeaders([]);
    }
  };

  // Validate tab handlers
  const handleMainDatabaseChange = async (selectedDatabase) => {
    setMainDatabase(selectedDatabase);
    setMainCollection('');
    
    if (selectedDatabase) {
      await fetchMainCollections(selectedDatabase);
    } else {
      setMainCollections([]);
    }
  };

  const fetchMainCollections = async (databaseName) => {
    try {
      setLoadingMainCollections(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      
      if (response.data.success) {
        setMainCollections(response.data.collections);
      } else {
        console.error('Failed to fetch main collections:', response.data.error);
        setMainCollections([]);
      }
    } catch (error) {
      console.error('Error fetching main collections:', error);
      setMainCollections([]);
    } finally {
      setLoadingMainCollections(false);
    }
  };

  const handleValidateTargetDatabaseChange = async (selectedDatabase) => {
    setValidateTargetDatabase(selectedDatabase);
    setValidateTargetCollection('');
    
    if (selectedDatabase) {
      await fetchValidateTargetCollections(selectedDatabase);
    } else {
      setValidateTargetCollections([]);
    }
  };

  const fetchValidateTargetCollections = async (databaseName) => {
    try {
      setLoadingValidateTargetCollections(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      
      if (response.data.success) {
        setValidateTargetCollections(response.data.collections);
      } else {
        console.error('Failed to fetch target collections:', response.data.error);
        setValidateTargetCollections([]);
      }
    } catch (error) {
      console.error('Error fetching target collections:', error);
      setValidateTargetCollections([]);
    } finally {
      setLoadingValidateTargetCollections(false);
    }
  };

  // Fetch duplicate rules from database
  const fetchDuplicateRules = async () => {
    try {
      setLoadingDuplicateRules(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/duplicate-rules?active_only=true');
      
      if (response.data.success) {
        setAvailableDuplicateRules(response.data.rules);
      } else {
        console.error('Failed to fetch duplicate rules:', response.data.message);
        alert('Failed to fetch duplicate rules: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching duplicate rules:', error);
      alert('Error fetching duplicate rules: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingDuplicateRules(false);
    }
  };

  // Fetch collection columns for Add Rule modal
  const fetchCollectionColumns = async (database, collection) => {
    if (!database || !collection) {
      setAvailableColumns([]);
      return;
    }

    try {
      setLoadingColumns(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/api/duplicate-rules/columns?database=${database}&collection=${collection}`);
      
      if (response.data.success) {
        setAvailableColumns(response.data.columns);
      } else {
        console.error('Failed to fetch columns:', response.data.message);
        setAvailableColumns([]);
      }
    } catch (error) {
      console.error('Error fetching columns:', error);
      setAvailableColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  // Handle opening Add Rule modal
  const handleOpenAddRuleModal = () => {
    setShowAddRuleModal(true);
    setNewRuleName('');
    setNewRuleColumns([]);
    // Fetch columns from main collection if available
    if (mainDatabase && mainCollection) {
      fetchCollectionColumns(mainDatabase, mainCollection);
    } else {
      setAvailableColumns([]);
    }
  };

  // Handle closing Add Rule modal
  const handleCloseAddRuleModal = () => {
    setShowAddRuleModal(false);
    setNewRuleName('');
    setNewRuleColumns([]);
    setAvailableColumns([]);
  };

  // Handle column selection in Add Rule modal
  const handleColumnToggle = (columnName) => {
    setNewRuleColumns(prev => {
      const updatedColumns = prev.includes(columnName)
        ? prev.filter(col => col !== columnName)
        : [...prev, columnName];
      
      // Auto-generate rule name if not manually set or if user hasn't typed anything
      if (!newRuleName || newRuleName.trim() === '') {
        if (updatedColumns.length > 0) {
          // Sort columns for consistent naming
          const sortedColumns = [...updatedColumns].sort();
          setNewRuleName(sortedColumns.join(' + '));
        } else {
          setNewRuleName('');
        }
      }
      
      return updatedColumns;
    });
  };

  // Create new duplicate rule
  const handleCreateRule = async () => {
    if (newRuleColumns.length === 0) {
      alert('Please select at least one column for the rule');
      return;
    }

    if (!newRuleName || newRuleName.trim() === '') {
      alert('Please enter a rule name');
      return;
    }

    try {
      setCreatingRule(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/duplicate-rules', {
        rule_name: newRuleName.trim(),
        columns: newRuleColumns
      });

      if (response.data.success) {
        alert('Duplicate rule created successfully!');
        handleCloseAddRuleModal();
        // Refresh rules list
        await fetchDuplicateRules();
      } else {
        alert('Failed to create rule: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating duplicate rule:', error);
      alert('Error creating rule: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreatingRule(false);
    }
  };

  // Handle duplicate rule checkbox change
  const handleDuplicateRuleChange = (ruleId) => {
    setDuplicateRules(prev => {
      if (prev.includes(ruleId)) {
        return prev.filter(r => r !== ruleId);
      } else {
        return [...prev, ruleId];
      }
    });
  };

  // Start duplicate removal
  const startDuplicateRemoval = async () => {
    if (!mainDatabase || !mainCollection || !validateTargetDatabase || !validateTargetCollection || duplicateRules.length === 0) {
      alert('Please select all required fields: Main Database, Main Collection, Target Database, Target Collection, and at least one Duplicate Rule');
      return;
    }

    // Get the selected rule object from availableDuplicateRules
    const selectedRuleId = duplicateRules[0];
    const selectedRule = availableDuplicateRules.find(r => r.rule_id === selectedRuleId);
    
    if (!selectedRule) {
      alert('Selected duplicate rule not found. Please refresh and try again.');
      return;
    }

    try {
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/import/validate-duplicates', {
        mainDatabase,
        mainCollection,
        targetDatabase: validateTargetDatabase,
        targetCollection: validateTargetCollection,
        duplicateRule: selectedRule // Send rule object instead of string
      });

      if (response.data.status) {
        const processId = response.data.process_id;
        setValidateProcessId(processId);

        // Initialize progress tracking
        const ruleDisplayName = selectedRule.rule_name || selectedRule.rule_id || 'Unknown Rule';
        setValidateProgress(prev => ({
          ...prev,
          [processId]: {
            fileName: `Duplicate Removal: ${validateTargetDatabase}.${validateTargetCollection}`,
            percentage: 0,
            processed: 0,
            total: 0,
            removed: 0,
            status: 'processing',
            rule: ruleDisplayName
          }
        }));
        setShowValidateProgress(true);

        // Start progress monitoring
        startValidateProgressMonitoring(processId, ruleDisplayName);

        alert('Duplicate removal started successfully. Processing in background...');
      } else {
        alert(response.data.message || 'Failed to start duplicate removal');
      }

    } catch (error) {
      console.error('Start duplicate removal error:', error);
      alert('Failed to start duplicate removal: ' + (error.response?.data?.message || error.message));
    }
  };

  // Monitor validate progress
  const startValidateProgressMonitoring = (processId, rule) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/import/progress?process_id=${processId}`);
        const data = response.data.progress || response.data;

        let percentage = 0;
        if (data.percentage !== undefined && data.percentage !== null && !isNaN(data.percentage)) {
          percentage = Math.min(100, Math.max(0, parseFloat(data.percentage)));
        } else if (data.total > 0 && data.processed >= 0) {
          percentage = Math.min(100, (data.processed / data.total) * 100);
        }

        setValidateProgress(prev => ({
          ...prev,
          [processId]: {
            fileName: `Duplicate Removal: ${validateTargetDatabase}.${validateTargetCollection}`,
            percentage: parseFloat(percentage.toFixed(1)),
            processed: data.processed || 0,
            total: data.total || 0,
            removed: data.removed_count || 0,
            status: data.status || 'processing',
            rule: rule
          }
        }));

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
          clearInterval(interval);

          // Show completion message
          if (data.status === 'completed') {
            const removedCount = data.removed_count || 0;
            alert(`✅ Duplicate removal completed!\n\nRule: ${rule}\nDuplicates Removed: ${removedCount}\nTotal Processed: ${data.total || 0}`);
          } else {
            alert(`Duplicate removal ${data.status}: ${data.removed_count || 0} duplicates removed`);
          }

          // Remove from progress after delay
          setTimeout(() => {
            setValidateProgress(prev => {
              const updated = { ...prev };
              delete updated[processId];
              return updated;
            });

            if (Object.keys(validateProgress).length === 1) {
              setShowValidateProgress(false);
            }
          }, 10000); // Show final status for 10 seconds
        }
      } catch (error) {
        clearInterval(interval);
        setValidateProgress(prev => {
          const updated = { ...prev };
          delete updated[processId];
          return updated;
        });
      }
    }, 2000);
  };

  // Handle insert method change
  const handleMethodChange = (method) => {
    setInsertMethod(method);
    // Reset mapping state when switching methods
    setMappingContainer(false);
    setMappedColumns({});
    setUnmappedHeaders([]);
    setSourceFields([]);
    setMappingConnections([]);
    
    // Reset file for CSV method
    if (method === 'csv') {
      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    
    // Reset target selections for Database method
    if (method === 'database') {
      setTargetDatabase('');
      setTargetCollection('');
      setTargetCollections([]);
      setTargetCollectionFields([]);
    }
  };

  // Start Database-to-Database transfer
  const startDatabaseTransfer = async () => {
    if (!database || !table || !targetDatabase || !targetCollection) {
      alert('Please select both base and target database/collection');
      return;
    }
    
    if (Object.keys(mappedColumns).length === 0) {
      alert('Please map at least one column');
      return;
    }

    try {
      const authAxios = getAuthAxios();
      const transferId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      
      const response = await authAxios.post('/api/import/db-transfer', {
        baseDatabase: database,
        baseCollection: table,
        targetDatabase: targetDatabase,
        targetCollection: targetCollection,
        mappedColumns: mappedColumns,
        type: type,
        transferId: transferId
      });

      if (response.data.status) {
        // Add to active imports
        const newImports = {
          ...activeImports,
          [transferId]: { fileName: `${targetDatabase}.${targetCollection} → ${database}.${table}` }
        };
        saveActiveImports(newImports);

        // Initialize progress tracking
        setImportProgress(prev => ({
          ...prev,
          [transferId]: {
            fileName: `${targetDatabase}.${targetCollection} → ${database}.${table}`,
            percentage: 0,
            processed: 0,
            total: 0,
            inserted: 0,
            rejected: 0,
            status: 'processing'
          }
        }));
        setShowImportProgress(true);

        // Start progress monitoring
        startProgressMonitoring(transferId, `${targetDatabase}.${targetCollection} → ${database}.${table}`);

        // Reset mapping UI
        setMappingContainer(false);
        setMappedColumns({});
        setUnmappedHeaders([]);

        alert(response.data.message || 'Database transfer started successfully');
      } else {
        alert(response.data.message || 'Failed to start database transfer');
      }

    } catch (error) {
      console.error('Start database transfer error:', error);
      alert('Failed to start database transfer: ' + (error.response?.data?.message || error.message));
    }
  };

  // Match headers for Database method
  const matchDatabaseHeaders = () => {
    if (!database || !table || !targetDatabase || !targetCollection) {
      alert('Please select base and target database/collection first');
      return;
    }
    
    if (tableColumns.length === 0) {
      alert('Base collection has no fields');
      return;
    }
    
    if (targetCollectionFields.length === 0) {
      alert('Target collection has no fields');
      return;
    }

    // Check if source collection is empty
    const selectedSourceCol = targetCollections.find(c => c.name === targetCollection);
    const sourceCount = selectedSourceCol ? (selectedSourceCol.documentCount || selectedSourceCol.count || 0) : 0;
    
    if (sourceCount === 0) {
      if (!window.confirm(`⚠️ Warning: Source collection '${targetCollection}' appears to be empty (0 records).\n\nIf you proceed, 0 records will be transferred.\n\nDid you mean to swap Source and Destination?\n\nClick OK to proceed anyway, or Cancel to change selection.`)) {
        return;
      }
    }
    
    // Set source fields from target collection
    setSourceFields(targetCollectionFields);
    
    // Show mapping container
    setMappingContainer(true);
    
    // Auto-map matching headers
    displayMapping(targetCollectionFields, tableColumns, '', `${targetDatabase}.${targetCollection}`);
  };

  const saveActiveImports = (importsOrUpdater) => {
    // Support both direct object and functional update
    const imports = typeof importsOrUpdater === 'function' 
      ? importsOrUpdater(activeImports)
      : importsOrUpdater;
    
    localStorage.setItem('activeTransfers', JSON.stringify(imports));
    setActiveImports(imports);
  };

  const checkOngoingImports = async () => {
    const stored = localStorage.getItem('activeTransfers');
    const storedImports = stored ? JSON.parse(stored) : {};
    const updatedImports = { ...storedImports };
    const progressUpdates = {};

    // Check all stored imports
    for (const [id, importData] of Object.entries(storedImports)) {
      try {
        // Use process_id instead of transfer_id (they're the same for imports)
        const response = await axios.get(`/api/import/progress?process_id=${id}`);
        const data = response.data.progress || response.data;
        
        // Calculate percentage using same pattern as emaildelivery.js
        const percentage = data.total > 0 && data.processed >= 0
          ? Math.min(100, Math.max(0, Math.round((data.processed / data.total) * 100)))
          : (data.percentage !== undefined && data.percentage !== null && !isNaN(data.percentage))
            ? Math.min(100, Math.max(0, Math.round(parseFloat(data.percentage))))
            : 0;
        
        progressUpdates[id] = {
          fileName: importData.fileName || `Import ${id}`,
          percentage: percentage,
          processed: data.processed || 0,
          total: data.total || 0,
          inserted: data.inserted_rows || 0,
          rejected: data.rejected_rows || 0,
          status: data.status || 'processing',
          rejectedFilePath: data.rejected_file_path || null
        };

        if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
          // Don't delete immediately - keep showing final status
          // Mark as completed but keep in progress display
          
          // Clear interval if exists since it's done
          if (progressIntervalsRef.current[id]) {
            clearInterval(progressIntervalsRef.current[id]);
            delete progressIntervalsRef.current[id];
          }
        } else if (data.status === 'processing' || data.status === 'pending') {
          // Continue monitoring this import (will create interval if not exists)
          startProgressMonitoring(id, importData.fileName || `Import ${id}`);
        } else if (data.status === 'unknown' || data.message === 'Import not found or completed') {
          // Fix for stuck "unknown" imports
          // If backend says unknown/not found, remove it from local storage
          console.log(`🧹 Removing unknown/stuck import: ${id}`);
          delete updatedImports[id];
          
          if (progressIntervalsRef.current[id]) {
            clearInterval(progressIntervalsRef.current[id]);
            delete progressIntervalsRef.current[id];
          }
          
          // Also remove from display state immediately
          setImportProgress(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
          
          // Continue loop loop to avoid adding deleted item back
          continue; 
        }
      } catch (error) {
        console.error(`Error checking import ${id}:`, error);
        // Don't remove immediately - might be temporary error
        // Only remove if it's a 404 (not found)
        if (error.response?.status === 404) {
        delete updatedImports[id];
          // Clear interval if exists
          if (progressIntervalsRef.current[id]) {
            clearInterval(progressIntervalsRef.current[id]);
            delete progressIntervalsRef.current[id];
          }
        }
      }
    }

    // Update progress state
    if (Object.keys(progressUpdates).length > 0) {
      setImportProgress(prev => ({
        ...prev,
        ...progressUpdates
      }));
      setShowImportProgress(true);
    }

    saveActiveImports(updatedImports);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!csvFile || !database || !table) {
      alert('Please select a file, database, and table');
      return;
    }

    // Constants for chunked upload
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB - use chunked for files larger than this

    setShowUploadProgress(true);
    setUploadDisabled(true);
    setUploadProgress(0);
    setTotalBytes(csvFile.size);
    setUploadedBytes(0);

    try {
      // Decide upload strategy based on file size
      if (csvFile.size > LARGE_FILE_THRESHOLD) {
        console.log(`📦 Large file detected (${(csvFile.size / (1024 * 1024)).toFixed(2)} MB) - using chunked upload`);
        await handleChunkedUpload(csvFile, CHUNK_SIZE);
      } else {
        console.log(`📄 Small file detected (${(csvFile.size / (1024 * 1024)).toFixed(2)} MB) - using single upload`);
        await handleSingleUpload(csvFile);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setShowUploadProgress(false);
      setUploadDisabled(false);
      setUploadPhase('idle');
      setCurrentChunk(0);
      setTotalChunks(0);
    }
  };

  // Handle small files with single request (< 50MB)
  const handleSingleUpload = async (file) => {
    setUploadPhase('uploading');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('database', database);
    formData.append('table', table);

    const response = await axios.post('/api/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percent);
        setUploadedBytes(progressEvent.loaded);
      }
    });

    processUploadResponse(response.data, file.name);
  };

  // Handle large files with chunked upload (> 50MB)
  const handleChunkedUpload = async (file, chunkSize) => {
    // Generate unique upload ID for this session
    const newUploadId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    setUploadId(newUploadId);
    setUploadPhase('uploading');

    const chunks = Math.ceil(file.size / chunkSize);
    setTotalChunks(chunks);
    console.log(`📦 Splitting ${file.name} into ${chunks} chunks of ${(chunkSize / (1024 * 1024)).toFixed(1)} MB`);

    let uploadedSize = 0;

    // Upload chunks sequentially
    for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
      setCurrentChunk(chunkIndex + 1);
      
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', chunks.toString());
      formData.append('uploadId', newUploadId);
      formData.append('fileName', file.name);
      formData.append('fileSize', file.size.toString());
      formData.append('database', database);
      formData.append('table', table);

      try {
        const response = await axios.post('/api/import/upload-chunked', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const chunkProgress = progressEvent.loaded;
            const totalProgress = uploadedSize + chunkProgress;
            const percent = Math.round((totalProgress * 100) / file.size);
            setUploadProgress(Math.min(percent, 99)); // Cap at 99% until finalized
            setUploadedBytes(totalProgress);
          }
        });

        // Check if this was the final chunk
        if (response.data.complete) {
          console.log(`✅ All chunks uploaded, processing...`);
          setUploadPhase('finalizing');
          setUploadProgress(100);
          processUploadResponse(response.data, file.name);
          return;
        }

        uploadedSize += (end - start);
        console.log(`✅ Chunk ${chunkIndex + 1}/${chunks} uploaded (${(uploadedSize / (1024 * 1024)).toFixed(2)} MB)`);

      } catch (chunkError) {
        console.error(`❌ Failed to upload chunk ${chunkIndex + 1}:`, chunkError);
        // Store failed chunk index for resume capability
        localStorage.setItem(`upload_${newUploadId}_lastChunk`, chunkIndex.toString());
        throw new Error(`Chunk ${chunkIndex + 1} failed: ${chunkError.message}. You can retry the upload.`);
      }
    }
  };

  // Process upload response and display mapping
  const processUploadResponse = (data, originalFileName) => {
    const { transfer_id, csv_headers, table_columns, total_records, file_name, estimated_records } = data;
    
    setTransferId(transfer_id);
    setFileName(file_name || originalFileName);
    setCsvHeaders(csv_headers);
    setTableColumns(table_columns);
    setUnmappedHeaders([...csv_headers]);
    
    displayMapping(csv_headers, table_columns, transfer_id, file_name || originalFileName);
    recommendChunkSize(total_records || estimated_records || 10000);
    
    // Reset form
    setCsvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    console.log(`✅ Upload complete. Transfer ID: ${transfer_id}, Estimated records: ${total_records || estimated_records}`);
  };

  const displayMapping = (csvHeaders, tableColumns, transferId, fileName) => {
    setMappingContainer(true);
    
    // Auto-map matching headers (case-insensitive)
    const mapped = {};
    
    tableColumns.forEach(col => {
      const matchIndex = csvHeaders.findIndex(h => 
        h.toLowerCase().trim() === col.toLowerCase().trim()
      );
      if (matchIndex !== -1) {
        // Map the CSV header to the collection field
        // { collectionField: csvHeader }
        mapped[col] = csvHeaders[matchIndex];
      }
    });
    
    setMappedColumns(mapped);
    // Store ALL CSV headers (not just unmapped) - they all remain visible
    setUnmappedHeaders([...csvHeaders]);
  };

  const recommendChunkSize = (total) => {
    let size = 500;
    if (total <= 10) size = total;
    else if (total <= 100) size = Math.ceil(total / 5);
    else if (total <= 1000) size = 100;
    
    setChunkSize(size);
  };

  const handleDragStart = (e, header) => {
    e.dataTransfer.setData('text/plain', header);
  };

  const handleDrop = (e, column) => {
    e.preventDefault();
    const header = e.dataTransfer.getData('text/plain');
    
    // Simply map the source field to the destination field
    // Don't modify unmappedHeaders - all source fields stay visible
    setMappedColumns(prev => ({ ...prev, [column]: header }));
  };

  const removeMappedColumn = (column) => {
    // Simply remove the mapping - don't add back to unmappedHeaders
    // because all source fields are always visible
    setMappedColumns(prev => {
      const updated = { ...prev };
      delete updated[column];
      return updated;
    });
  };

  const startImport = async () => {
    if (Object.keys(mappedColumns).length === 0) {
      alert('Please map at least one column');
      return;
    }

    if (!chunkSize || chunkSize <= 0) {
      alert('Please enter a valid chunk size');
      return;
    }

    try {
      // Use token-based API call like the bv project
      const authAxios = getAuthAxios();
      const response = await authAxios.post('/api/System/Central/querynest/FormCtrl', {
        save_token: baseToken, // This is the key - using the token system
        file: transferId + '.csv', // File identifier
        table: `${database}.${table}`, // Database.collection format
        mapping: JSON.stringify(mappedColumns), // Column mapping
        process_id: transferId, // Process tracking ID
        type: type, // Import type (normal/bulk)
        original_file_name: fileName // Original CSV file name for history display
      });

      if (response.data.status) {
        // Add to active imports
        const newImports = {
          ...activeImports,
          [transferId]: { fileName }
        };
        saveActiveImports(newImports);

        // Initialize progress tracking
        setImportProgress(prev => ({
          ...prev,
          [transferId]: {
            fileName,
            percentage: 0,
            processed: 0,
            total: 0,
            inserted: 0,
            rejected: 0,
            status: 'processing'
          }
        }));
        setShowImportProgress(true);

        // Start progress monitoring
        startProgressMonitoring(transferId, fileName);

        // Reset mapping UI to allow starting another import
        setMappingContainer(false);
        setMappedColumns({});
        setUnmappedHeaders([]);
        setChunkSize(5000); // Reset to optimized default
        setCsvFile(null); // Clear file input to allow new file selection
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Show success message with info about concurrent imports
        const activeCount = Object.keys(importProgress).length + 1;
        alert(`${response.data.message || 'Import started successfully'}\n\n📊 Active imports: ${activeCount}\n💡 You can start additional imports while this one is processing!`);
      } else {
        alert(response.data.message || 'Failed to start import');
      }

    } catch (error) {
      console.error('Start import error:', error);
      alert('Failed to start import: ' + (error.response?.data?.message || error.message));
    }
  };

  const startProgressMonitoring = (transferId, fileName) => {
    // Clear any existing monitoring for this transferId
    if (progressIntervalsRef.current[transferId]) {
      // If it's an EventSource, close it
      if (progressIntervalsRef.current[transferId].close) {
        progressIntervalsRef.current[transferId].close();
      } else {
        clearInterval(progressIntervalsRef.current[transferId]);
      }
      delete progressIntervalsRef.current[transferId];
    }

    // Try to use Server-Sent Events for real-time updates
    const useSSE = typeof EventSource !== 'undefined';
    
    if (useSSE) {
      // Use SSE for instant updates
      const eventSource = new EventSource(`/api/import/progress-stream?process_id=${transferId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          updateProgressState(transferId, fileName, data);
          
          // Handle completion
          if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
            eventSource.close();
            delete progressIntervalsRef.current[transferId];
            handleImportComplete(transferId, fileName, data);
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };
      
      eventSource.addEventListener('done', (event) => {
        eventSource.close();
        delete progressIntervalsRef.current[transferId];
      });
      
      eventSource.onerror = (error) => {
        console.warn(`SSE error for ${transferId}, falling back to polling:`, error);
        eventSource.close();
        delete progressIntervalsRef.current[transferId];
        // Fallback to polling
        startPollingProgress(transferId, fileName);
      };
      
      progressIntervalsRef.current[transferId] = eventSource;
    } else {
      // Fallback to polling
      startPollingProgress(transferId, fileName);
    }
  };
  
  // Helper: Update progress state
  const updateProgressState = (transferId, fileName, data) => {
    const percentage = data.total > 0 && data.processed >= 0
      ? Math.min(100, Math.max(0, Math.round((data.processed / data.total) * 100)))
      : (data.percentage || 0);
    
    setImportProgress(prev => ({
      ...prev,
      [transferId]: {
        fileName: prev[transferId]?.fileName || fileName,
        percentage,
        processed: data.processed || 0,
        total: data.total || 0,
        inserted: data.inserted_rows || 0,
        rejected: data.rejected_rows || 0,
        status: data.status || 'processing',
        rejectedFilePath: data.rejected_file_path || null
      }
    }));
  };
  
  // Helper: Handle import completion
  const handleImportComplete = (transferId, fileName, data) => {
    const message = data.status === 'completed' 
      ? `✅ Import "${fileName}" completed: ${data.inserted_rows || 0} rows inserted`
      : `⚠️ Import "${fileName}" ${data.status}`;
    console.log(message);
    
    // Clean up after delay
    setTimeout(() => {
      saveActiveImports(prev => {
        const updated = { ...prev };
        delete updated[transferId];
        return updated;
      });
      
      setImportProgress(prev => {
        const updated = { ...prev };
        delete updated[transferId];
        if (Object.keys(updated).length === 0) {
          setShowImportProgress(false);
        }
        return updated;
      });
    }, 10000);
    
    if (data.rejected_file) {
      setTimeout(() => downloadRejectedFile(transferId), 1000);
    }
  };
  
  // Fallback polling implementation
  const startPollingProgress = (transferId, fileName) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/import/progress?process_id=${transferId}`);
        const data = response.data.progress || response.data;
        
        updateProgressState(transferId, fileName, data);
        
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'stopped') {
          clearInterval(interval);
          delete progressIntervalsRef.current[transferId];
          handleImportComplete(transferId, fileName, data);
        }
      } catch (error) {
        console.error(`Polling error for ${transferId}:`, error);
        if (error.response?.status === 404) {
          clearInterval(interval);
          delete progressIntervalsRef.current[transferId];
        }
      }
    }, 1000); // Poll every 1 second (faster than before)
    
    progressIntervalsRef.current[transferId] = interval;
  };

  const stopImport = async (transferId) => {
    try {
      await axios.post('/api/import/stop', { transfer_id: transferId });
      
      // Update progress to show stopped status
      setImportProgress(prev => ({
        ...prev,
        [transferId]: {
          ...prev[transferId],
          status: 'stopped'
        }
      }));
      
    } catch (error) {
      console.error('Failed to stop import:', error);
      alert('Failed to stop import: ' + (error.response?.data?.message || error.message));
    }
  };

  const downloadRejectedFile = async (transferId, rejectedFilePath) => {
    try {
      // Download rejected file
      const response = await axios.get(`/api/import/download-rejected?process_id=${transferId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `rejected_${transferId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`📥 Downloaded rejected file for: ${transferId}`);
    } catch (error) {
      console.error('Failed to download rejected file:', error);
      alert('Failed to download rejected file: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
         
          <div className="d-flex justify-content-between align-items-center mb-3 p-3 rounded" style={{ background: '#5856D6', color: '#fff', borderBottom: '2px solid #e0e7ef' }}>
                <CCardHeader 
                      className="d-flex align-items-center justify-content-between"
                     
                    >
                      <h5 className="mb-0" style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                        Insert
                      </h5>
                    </CCardHeader>
            
            {/* Active Imports Dropdown */}
            {Object.keys(importProgress).length > 0 && (
              <CDropdown>
                <CDropdownToggle color="info" size="sm">
                  <CIcon icon={cilCloudUpload} className="me-1" />
                  Active Imports ({Object.keys(importProgress).length})
                </CDropdownToggle>
                <CDropdownMenu style={{ minWidth: '300px' }}>
                  {Object.entries(importProgress).map(([id, progress]) => (
                    <CDropdownItem key={id} className="p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-truncate" style={{ maxWidth: '180px' }}>
                          {progress.fileName}
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <CBadge color={progress.status === 'completed' ? 'success' : progress.status === 'failed' ? 'danger' : 'info'}>
                            {progress.percentage.toFixed(0)}%
                          </CBadge>
                          <CButton
                            color="danger"
                            size="sm"
                            variant="ghost"
                            onClick={() => stopImport(id)}
                            disabled={progress.status !== 'processing'}
                          >
                            <CIcon icon={cilMediaStop} />
                          </CButton>
                        </div>
                      </div>
                      <CProgress className="mb-1" height={6}>
                        <CProgressBar 
                          value={progress.percentage} 
                          color={progress.status === 'completed' ? 'success' : progress.status === 'failed' ? 'danger' : 'info'}
                        />
                      </CProgress>
                      <div className="d-flex justify-content-between">
                        <small className="text-muted">
                          {progress.processed}/{progress.total}
                        </small>
                        <small className="text-muted">
                          ✓{progress.inserted} ✗{progress.rejected}
                        </small>
                      </div>
                    </CDropdownItem>
                  ))}
                </CDropdownMenu>
              </CDropdown>
            )}
          </div>
        </CCol>
      </CRow>

      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              <CNav variant="pills" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'import'}
                    onClick={() => setActiveTab('import')}
                    style={{ cursor: 'pointer' }}
                  >
                    Import
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'validate'}
                    onClick={() => setActiveTab('validate')}
                    style={{ cursor: 'pointer' }}
                  >
                    Validate
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                    style={{ cursor: 'pointer' }}
                  >
                    History
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'cleanup'}
                    onClick={() => setActiveTab('cleanup')}
                    style={{ cursor: 'pointer' }}
                  >
                    🧹 Cleanup
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'deduplicate'}
                    onClick={() => setActiveTab('deduplicate')}
                    style={{ cursor: 'pointer' }}
                  >
                    🔍 Deduplicate
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent>
                <CTabPane visible={activeTab === 'import'}>
                  {/* Method Selection */}
                  <CRow className="mb-4">
                    <CCol sm={4}>
                      <CFormLabel className="fw-bold">Insert Method</CFormLabel>
                      <CFormSelect
                        value={insertMethod}
                        onChange={(e) => handleMethodChange(e.target.value)}
                        style={{ 
                          borderColor: insertMethod === 'csv' ? '#5856D6' : '#28a745',
                          borderWidth: '2px'
                        }}
                      >
                        <option value="csv">📄 CSV Import</option>
                        <option value="database">🗄️ Database to Database</option>
                      </CFormSelect>
                      <small className="text-muted">
                        {insertMethod === 'csv' 
                          ? 'Import data from a CSV file' 
                          : 'Copy data from one collection to another'}
                      </small>
                    </CCol>
                  </CRow>

                  <hr className="mb-4" />

                  {/* CSV Method Form */}
                  {insertMethod === 'csv' && (
                    <CForm onSubmit={handleFileUpload}>
                      <CRow className="g-3">
                        <CCol sm={6}>
                          <CFormLabel>Base Database</CFormLabel>
                          <CFormSelect
                            value={database}
                            onChange={(e) => handleDatabaseChange(e.target.value)}
                            required
                            disabled={loadingDatabases}
                          >
                            <option value="">
                              {loadingDatabases ? 'Loading databases...' : 'Select Database'}
                            </option>
                            {databases.map(db => (
                              <option key={db.name} value={db.name}>
                                {db.label} {db.error ? '(Connection Error)' : ''}
                              </option>
                            ))}
                          </CFormSelect>
                          {loadingDatabases && (
                            <div className="mt-1">
                              <CSpinner size="sm" className="me-2" />
                              <small className="text-muted">Loading databases...</small>
                            </div>
                          )}
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Base Collection</CFormLabel>
                          <CFormSelect
                            value={table}
                            onChange={(e) => handleTableChange(e.target.value)}
                            required
                            disabled={!database || loadingCollections}
                          >
                            <option value="">
                              {loadingCollections ? 'Loading collections...' : 'Select Collection'}
                            </option>
                            {collections.map(col => (
                              <option key={col.name} value={col.name}>
                                {col.label} ({col.documentCount} docs)
                              </option>
                            ))}
                          </CFormSelect>
                          {loadingCollections && (
                            <div className="mt-1">
                              <CSpinner size="sm" className="me-2" />
                              <small className="text-muted">Loading collections...</small>
                            </div>
                          )}
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Type</CFormLabel>
                          <CFormSelect
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="bulk">Bulk</option>
                          </CFormSelect>
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>CSV File</CFormLabel>
                          <CFormInput
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => setCsvFile(e.target.files[0])}
                            ref={fileInputRef}
                            required
                          />
                        </CCol>

                        <CCol xs={12} className="text-end">
                          <div className="d-flex align-items-center justify-content-end gap-2">
                            {Object.keys(importProgress).length > 0 && (
                              <small className="text-muted">
                                {Object.keys(importProgress).length} import{Object.keys(importProgress).length !== 1 ? 's' : ''} running
                              </small>
                            )}
                          <CButton
                            type="submit"
                            color="primary"
                            disabled={uploadDisabled}
                          >
                            <CIcon icon={cilCloudUpload} className="me-2" />
                            {uploadDisabled ? 'Uploading...' : 'Match Headers'}
                          </CButton>
                          </div>
                        </CCol>
                      </CRow>

                      {showUploadProgress && (
                        <CRow className="mt-3">
                          <CCol xs={12}>
                            <CProgress className="mb-2">
                              <CProgressBar value={uploadProgress}>{uploadProgress}%</CProgressBar>
                            </CProgress>
                            <small className="text-muted">Please wait, do not refresh the page.</small>
                          </CCol>
                        </CRow>
                      )}
                    </CForm>
                  )}

                  {/* Database Method Form */}
                  {insertMethod === 'database' && (
                    <div>
                      <CAlert color="info" className="mb-3">
                        <strong>Database to Database Transfer</strong>
                        <br />
                        <small>Copy records from Target Collection to Base Collection with field mapping.</small>
                      </CAlert>
                      
                      <CRow className="g-3">
                        {/* Base (Destination) Section */}
                        <CCol xs={12}>
                          <h6 className="text-primary mb-2">📥 Base (Destination)</h6>
                        </CCol>
                        
                        <CCol sm={6}>
                          <CFormLabel>Base Database</CFormLabel>
                          <CFormSelect
                            value={database}
                            onChange={(e) => handleDatabaseChange(e.target.value)}
                            disabled={loadingDatabases}
                          >
                            <option value="">
                              {loadingDatabases ? 'Loading databases...' : 'Select Database'}
                            </option>
                            {databases.map(db => (
                              <option key={db.name} value={db.name}>
                                {db.label} {db.error ? '(Connection Error)' : ''}
                              </option>
                            ))}
                          </CFormSelect>
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Base Collection</CFormLabel>
                          <CFormSelect
                            value={table}
                            onChange={(e) => handleTableChange(e.target.value)}
                            disabled={!database || loadingCollections}
                          >
                            <option value="">
                              {loadingCollections ? 'Loading collections...' : 'Select Collection'}
                            </option>
                            {collections.map(col => (
                              <option key={col.name} value={col.name}>
                                {col.label} ({col.documentCount} docs)
                              </option>
                            ))}
                          </CFormSelect>
                        </CCol>

                        {/* Target (Source) Section */}
                        <CCol xs={12} className="mt-4">
                          <h6 className="text-success mb-2">📤 Target (Source)</h6>
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Target Database</CFormLabel>
                          <CFormSelect
                            value={targetDatabase}
                            onChange={(e) => handleTargetDatabaseChange(e.target.value)}
                            disabled={loadingDatabases}
                          >
                            <option value="">
                              {loadingDatabases ? 'Loading databases...' : 'Select Target Database'}
                            </option>
                            {databases.map(db => (
                              <option key={db.name} value={db.name}>
                                {db.label} {db.error ? '(Connection Error)' : ''}
                              </option>
                            ))}
                          </CFormSelect>
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Target Collection</CFormLabel>
                          <CFormSelect
                            value={targetCollection}
                            onChange={(e) => handleTargetCollectionChange(e.target.value)}
                            disabled={!targetDatabase || loadingTargetCollections}
                          >
                            <option value="">
                              {loadingTargetCollections ? 'Loading collections...' : 'Select Target Collection'}
                            </option>
                            {targetCollections.map(col => (
                              <option key={col.name} value={col.name}>
                                {col.label} ({col.documentCount} docs)
                              </option>
                            ))}
                          </CFormSelect>
                          {loadingTargetCollections && (
                            <div className="mt-1">
                              <CSpinner size="sm" className="me-2" />
                              <small className="text-muted">Loading target collections...</small>
                            </div>
                          )}
                        </CCol>

                        <CCol sm={6}>
                          <CFormLabel>Transfer Type</CFormLabel>
                          <CFormSelect
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                          >
                            <option value="normal">Normal</option>
                            <option value="bulk">Bulk</option>
                          </CFormSelect>
                        </CCol>

                        <CCol xs={12} className="text-end mt-3">
                          <CButton
                            color="primary"
                            onClick={matchDatabaseHeaders}
                            disabled={!database || !table || !targetDatabase || !targetCollection}
                          >
                            <CIcon icon={cilCloudUpload} className="me-2" />
                            Match Headers
                          </CButton>
                        </CCol>
                      </CRow>
                    </div>
                  )}

                  {/* Column Mapping Interface - Redesigned Layout */}
                  {/* Left: Source Fields (CSV headers or Target Collection) */}
                  {/* Right: Destination Fields (Base Collection) */}
                  {mappingContainer && (
                    <div className="mt-4 p-4" style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                      position: 'relative'
                    }}>
                      <h5 className="mb-4 text-center">
                        {insertMethod === 'csv' 
                          ? '📄 Map CSV Headers to Collection Fields' 
                          : '🗄️ Map Source Fields to Destination Fields'}
                      </h5>
                      
                      <div className="d-flex gap-4" style={{ minHeight: '400px' }}>
                        {/* LEFT PANEL: Source Fields (Unmapped) */}
                        <div className="flex-fill" style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '15px',
                          boxShadow: '0 1px 5px rgba(0, 0, 0, 0.05)',
                          maxHeight: '450px',
                          overflowY: 'auto',
                          border: '2px solid #28a745'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '15px',
                            color: '#28a745',
                            borderBottom: '2px solid #28a745',
                            paddingBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            📤 Source Fields
                            <span className="badge bg-success ms-auto">
                              {insertMethod === 'csv' ? 'CSV Headers' : 'Target Collection'}
                            </span>
                          </div>
                          <div className="source-fields-container">
                            {unmappedHeaders.length > 0 ? unmappedHeaders.map(header => {
                              // Check if this source field is mapped to any destination field
                              const mappedToColumn = Object.entries(mappedColumns).find(([col, h]) => h === header);
                              const isMapped = !!mappedToColumn;
                              
                              return (
                                <div
                                  key={header}
                                  className="source-field-item"
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, header)}
                                  style={{
                                    padding: '12px 15px',
                                    margin: '8px 0',
                                    backgroundColor: isMapped ? '#e3f2fd' : '#e8f5e9',
                                    border: isMapped ? '2px solid #5856D6' : '1px solid #4caf50',
                                    borderRadius: '6px',
                                    cursor: 'grab',
                                    transition: 'all 0.2s',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = isMapped ? '#bbdefb' : '#c8e6c9';
                                    e.currentTarget.style.transform = 'translateX(5px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = isMapped ? '#e3f2fd' : '#e8f5e9';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: isMapped ? '#5856D6' : '#4caf50' }}>
                                      {isMapped ? '✓' : '⬤'}
                                    </span>
                                    {header}
                                  </div>
                                  {isMapped && (
                                    <span style={{ 
                                      fontSize: '11px', 
                                      color: '#5856D6', 
                                      backgroundColor: '#fff',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      border: '1px solid #5856D6'
                                    }}>
                                      → {mappedToColumn[0]}
                                    </span>
                                  )}
                                </div>
                              );
                            }) : (
                              <div className="text-muted text-center py-4">
                                <div style={{ fontSize: '48px', opacity: 0.3 }}>📭</div>
                                No source fields available
                              </div>
                            )}
                          </div>
                        </div>

                        {/* CENTER: Visual Arrow Connection Indicator */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minWidth: '60px',
                          color: '#6c757d'
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '10px' }}>→</div>
                          <div style={{ 
                            writingMode: 'vertical-rl', 
                            textOrientation: 'mixed',
                            fontSize: '12px',
                            color: '#adb5bd'
                          }}>
                            Drag & Drop
                          </div>
                          <div style={{ fontSize: '24px', marginTop: '10px' }}>→</div>
                        </div>

                        {/* RIGHT PANEL: Destination Fields (Base Collection) */}
                        <div className="flex-fill" style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '15px',
                          boxShadow: '0 1px 5px rgba(0, 0, 0, 0.05)',
                          maxHeight: '450px',
                          overflowY: 'auto',
                          border: '2px solid #5856D6'
                        }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            marginBottom: '15px',
                            color: '#5856D6',
                            borderBottom: '2px solid #5856D6',
                            paddingBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            📥 Destination Fields
                            <span className="badge bg-primary ms-auto">Base Collection</span>
                          </div>
                          <div className="destination-fields-container">
                            {tableColumns.map(column => (
                              <div key={column} className="d-flex align-items-center mb-3" style={{
                                padding: '8px',
                                backgroundColor: mappedColumns[column] ? '#e8eaf6' : '#fff',
                                borderRadius: '8px',
                                border: mappedColumns[column] ? '2px solid #5856D6' : '1px solid #e0e0e0'
                              }}>
                                {/* Mapped Source Field (if any) */}
                                <div
                                  className="drop-zone"
                                  style={{
                                    minHeight: '50px',
                                    padding: '12px',
                                    border: mappedColumns[column] ? '2px solid #4caf50' : '2px dashed #ccc',
                                    borderRadius: '6px',
                                    backgroundColor: mappedColumns[column] ? '#e8f5e9' : '#fafafa',
                                    textAlign: 'center',
                                    color: mappedColumns[column] ? '#2e7d32' : '#888',
                                    fontSize: '14px',
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                    marginRight: '10px'
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.borderColor = '#5856D6';
                                    e.currentTarget.style.backgroundColor = '#e8eaf6';
                                  }}
                                  onDragLeave={(e) => {
                                    e.currentTarget.style.borderColor = mappedColumns[column] ? '#4caf50' : '#ccc';
                                    e.currentTarget.style.backgroundColor = mappedColumns[column] ? '#e8f5e9' : '#fafafa';
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.style.borderColor = '#4caf50';
                                    e.currentTarget.style.backgroundColor = '#e8f5e9';
                                    handleDrop(e, column);
                                  }}
                                >
                                  {mappedColumns[column] ? (
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      width: '100%'
                                    }}>
                                      <span style={{ fontWeight: '500' }}>
                                        <span style={{ color: '#4caf50', marginRight: '8px' }}>⬤</span>
                                        {mappedColumns[column]}
                                      </span>
                                      <button
                                        onClick={() => removeMappedColumn(column)}
                                        style={{
                                          background: '#ffebee',
                                          border: '1px solid #ef5350',
                                          color: '#c62828',
                                          borderRadius: '4px',
                                          padding: '2px 8px',
                                          cursor: 'pointer',
                                          fontSize: '12px'
                                        }}
                                      >
                                        ✕ Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <small className="text-muted">
                                      <span style={{ fontSize: '18px', marginRight: '5px' }}>↓</span>
                                      Drop source field here
                                    </small>
                                  )}
                                </div>

                                {/* Arrow Indicator */}
                                <div style={{
                                  fontSize: '20px',
                                  color: mappedColumns[column] ? '#5856D6' : '#ccc',
                                  margin: '0 10px',
                                  fontWeight: 'bold'
                                }}>
                                  →
                                </div>

                                {/* Destination Field Name */}
                                <div style={{
                                  padding: '12px 15px',
                                  backgroundColor: '#5856D6',
                                  color: 'white',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  minWidth: '140px',
                                  textAlign: 'center'
                                }}>
                                  {column}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mapping Summary */}
                      <div className="mt-3 p-3" style={{
                        backgroundColor: '#e3f2fd',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div>
                          <strong>Mapping Summary:</strong>{' '}
                          <span className="badge bg-success me-2">
                            {Object.keys(mappedColumns).length} Mapped
                          </span>
                          <span className="badge bg-warning text-dark">
                            {unmappedHeaders.length - Object.keys(mappedColumns).length} Unmapped
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <small className="text-muted">
                            Source fields: {unmappedHeaders.length}
                          </small>
                          <small className="text-muted">
                            Destination fields: {tableColumns.length}
                          </small>
                        </div>
                      </div>

                      <CRow className="mt-4">
                        <CCol md={6}>
                          <CFormLabel>Chunk Size (records per batch)</CFormLabel>
                          <CFormInput
                            type="number"
                            value={chunkSize}
                            onChange={(e) => setChunkSize(parseInt(e.target.value))}
                            min="100"
                            max="50000"
                          />
                          <small className="text-muted d-block mt-1">
                            Recommended: 5000-10000 for faster imports. Larger chunks = faster processing but more memory usage.
                          </small>
                        </CCol>
                      </CRow>

                      <div className="text-end mt-4">
                        {Object.keys(importProgress).length > 0 && (
                          <div className="mb-2">
                            <small className="text-info">
                              💡 {Object.keys(importProgress).length} import{Object.keys(importProgress).length !== 1 ? 's' : ''} already running - you can start this one too!
                            </small>
                          </div>
                        )}
                        <div className="d-flex gap-2">
                        <CButton
                          color="secondary"
                          onClick={() => {
                            setMappingContainer(false);
                            setMappedColumns({});
                            setUnmappedHeaders([]);
                          }}
                        >
                          Cancel
                        </CButton>
                        <CButton
                          color="primary"
                          onClick={insertMethod === 'csv' ? startImport : startDatabaseTransfer}
                          disabled={Object.keys(mappedColumns).length === 0}
                          style={{ minWidth: '150px' }}
                        >
                          {insertMethod === 'csv' ? '🚀 Start Import' : '🚀 Start Transfer'}
                        </CButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Import Progress Display - Using same pattern as emaildelivery.js */}
                  {showImportProgress && Object.keys(importProgress).length > 0 && (
                    <div className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 fw-bold">📊 Import Progress</h5>
                        <CBadge color="info" style={{ fontSize: '14px', padding: '6px 12px' }}>
                          {Object.keys(importProgress).length} Active Import{Object.keys(importProgress).length !== 1 ? 's' : ''}
                        </CBadge>
                      </div>
                      <CAlert color="info" className="mb-3" style={{ fontSize: '13px' }}>
                        <strong>💡 Concurrent Imports Supported!</strong> You can start multiple imports simultaneously. 
                        The system can process up to <strong>3 imports concurrently</strong>. 
                        Each import runs independently in the background.
                      </CAlert>
                      {Object.entries(importProgress).map(([transferId, progress]) => {
                        // Calculate progress percentage (ensure it's a number between 0-100) - same as emaildelivery.js
                        const progressPercentage = progress.total > 0
                          ? Math.min(100, Math.max(0, Math.round((progress.processed / progress.total) * 100)))
                          : (progress.percentage || 0);
                        
                        return (
                          <div key={transferId} className="mb-4 p-4" style={{ 
                            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                            borderRadius: '16px', 
                            border: '1px solid #e2e8f0' 
                          }}>
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
                                  <h5 className="mb-0 fw-bold">{progress.fileName}</h5>
                                  <div className="d-flex align-items-center gap-2">
                                    {progress.status === 'completed' && (
                                      <CBadge color="success" className="px-3 py-2">
                                        <CIcon icon={cilCheckCircle} className="me-1" />
                                        Completed
                                      </CBadge>
                                    )}
                                    {progress.status === 'processing' && (
                                      <CButton
                                        color="danger"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => stopImport(transferId)}
                                        title="Stop Import"
                                      >
                                        <CIcon icon={cilMediaStop} />
                                      </CButton>
                                    )}
                                  </div>
                                </div>
                                <div className="text-muted mb-2" style={{ fontSize: '15px' }}>
                                  <strong>{progress.processed || 0}</strong> / {progress.total || 0} records processed
                                </div>
                                {progress.status === 'processing' && progress.total > 0 && progress.processed < progress.total && (
                                  <small className="text-muted">
                                    ⏱️ ETA: ~{Math.max(1, Math.ceil((progress.total - progress.processed) / 5000))} minute{Math.ceil((progress.total - progress.processed) / 5000) > 1 ? 's' : ''} remaining
                                  </small>
                                )}
                                {progress.status === 'completed' && (
                                  <small className="text-success">
                                    ✅ Completed successfully
                                  </small>
                                )}
                                {progress.status === 'failed' && (
                                  <small className="text-danger">
                                    ❌ Import failed
                                  </small>
                                )}
                              </div>
                            </div>
                            
                            {/* Stats Cards */}
                            <CRow className="g-3">
                              <CCol xs={6} md>
                                <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                  <div className="h4 mb-0 fw-bold" style={{ color: '#6366f1' }}>{progress.total || 0}</div>
                                  <small className="text-muted fw-medium">Total Records</small>
                                </div>
                              </CCol>
                              <CCol xs={6} md>
                                <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                  <div className="h4 mb-0 fw-bold text-success">{progress.inserted || 0}</div>
                                  <small className="text-muted fw-medium">Inserted</small>
                                </div>
                              </CCol>
                              <CCol xs={6} md>
                                <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                  <div className="h4 mb-0 fw-bold text-danger">{progress.rejected || 0}</div>
                                  <small className="text-muted fw-medium">Rejected</small>
                                </div>
                              </CCol>
                              <CCol xs={6} md>
                                <div className="text-center p-3" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                  <div className="h4 mb-0 fw-bold text-warning">{Math.max(0, (progress.total || 0) - (progress.processed || 0))}</div>
                                  <small className="text-muted fw-medium">Pending</small>
                                </div>
                              </CCol>
                            </CRow>

                            {/* Download Rejected File Button */}
                            {progress.rejected > 0 && progress.rejectedFilePath && (
                              <div className="mt-3 text-end">
                                <CButton
                                  color="warning"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadRejectedFile(transferId, progress.rejectedFilePath)}
                                  title="Download Rejected Records"
                                >
                                  <CIcon icon={cilCloudDownload} className="me-1" />
                                  Download Rejected ({progress.rejected})
                                </CButton>
                              </div>
                            )}
                            {progress.rejected > 0 && !progress.rejectedFilePath && progress.status === 'completed' && (
                              <div className="mt-3">
                                <CAlert color="warning" className="mb-0">
                                  <CIcon icon={cilWarning} className="me-1" />
                                  Rejected file will be available shortly
                                </CAlert>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CTabPane>

                <CTabPane visible={activeTab === 'validate'}>
                  <CAlert color="info" className="mb-4">
                    <strong>🔍 Duplicate Removal System</strong>
                    <br />
                    <small>Remove duplicate records from Target Collection based on valid data in Main Collection. Processing runs in the background for large datasets.</small>
                  </CAlert>

                  <CRow className="g-3">
                    {/* Main (Valid Data) Section */}
                    <CCol xs={12}>
                      <h6 className="text-primary mb-3">📥 Main Collection (Valid Data)</h6>
                    </CCol>
                    
                    <CCol sm={6}>
                      <CFormLabel>Main Database</CFormLabel>
                      <CFormSelect
                        value={mainDatabase}
                        onChange={(e) => handleMainDatabaseChange(e.target.value)}
                        disabled={loadingDatabases}
                      >
                        <option value="">
                          {loadingDatabases ? 'Loading databases...' : 'Select Main Database'}
                        </option>
                        {databases.map(db => (
                          <option key={db.name} value={db.name}>
                            {db.label} {db.error ? '(Connection Error)' : ''}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>

                    <CCol sm={6}>
                      <CFormLabel>Main Collection</CFormLabel>
                      <CFormSelect
                        value={mainCollection}
                        onChange={(e) => setMainCollection(e.target.value)}
                        disabled={!mainDatabase || loadingMainCollections}
                      >
                        <option value="">
                          {loadingMainCollections ? 'Loading collections...' : 'Select Main Collection'}
                        </option>
                        {mainCollections.map(col => (
                          <option key={col.name} value={col.name}>
                            {col.label} ({col.documentCount} docs)
                          </option>
                        ))}
                      </CFormSelect>
                      {loadingMainCollections && (
                        <div className="mt-1">
                          <CSpinner size="sm" className="me-2" />
                          <small className="text-muted">Loading collections...</small>
                        </div>
                      )}
                    </CCol>

                    {/* Target (To Clean) Section */}
                    <CCol xs={12} className="mt-4">
                      <h6 className="text-success mb-3">🎯 Target Collection (To Clean)</h6>
                    </CCol>

                    <CCol sm={6}>
                      <CFormLabel>Target Database</CFormLabel>
                      <CFormSelect
                        value={validateTargetDatabase}
                        onChange={(e) => handleValidateTargetDatabaseChange(e.target.value)}
                        disabled={loadingDatabases}
                      >
                        <option value="">
                          {loadingDatabases ? 'Loading databases...' : 'Select Target Database'}
                        </option>
                        {databases.map(db => (
                          <option key={db.name} value={db.name}>
                            {db.label} {db.error ? '(Connection Error)' : ''}
                          </option>
                        ))}
                      </CFormSelect>
                    </CCol>

                    <CCol sm={6}>
                      <CFormLabel>Target Collection</CFormLabel>
                      <CFormSelect
                        value={validateTargetCollection}
                        onChange={(e) => setValidateTargetCollection(e.target.value)}
                        disabled={!validateTargetDatabase || loadingValidateTargetCollections}
                      >
                        <option value="">
                          {loadingValidateTargetCollections ? 'Loading collections...' : 'Select Target Collection'}
                        </option>
                        {validateTargetCollections.map(col => (
                          <option key={col.name} value={col.name}>
                            {col.label} ({col.documentCount} docs)
                          </option>
                        ))}
                      </CFormSelect>
                      {loadingValidateTargetCollections && (
                        <div className="mt-1">
                          <CSpinner size="sm" className="me-2" />
                          <small className="text-muted">Loading collections...</small>
                        </div>
                      )}
                    </CCol>

                    {/* Duplicate Rule Selection - Dynamic Checkboxes */}
                    <CCol xs={12} className="mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="text-warning mb-0">🔑 Duplicate Matching Rule</h6>
                        <CButton
                          color="success"
                          size="sm"
                          onClick={handleOpenAddRuleModal}
                          disabled={!mainDatabase || !mainCollection}
                        >
                          + Add Rule
                        </CButton>
                      </div>
                    </CCol>

                    <CCol sm={12}>
                      <CFormLabel>Select Duplicate Rule(s)</CFormLabel>
                      {loadingDuplicateRules ? (
                        <div className="mt-2 text-center">
                          <CSpinner size="sm" className="me-2" />
                          <small className="text-muted">Loading duplicate rules...</small>
                        </div>
                      ) : availableDuplicateRules.length === 0 ? (
                        <div className="mt-2 alert alert-info">
                          <small>No duplicate rules found. Click "Add Rule" to create one.</small>
                        </div>
                      ) : (
                        <div className="mt-2" style={{
                          backgroundColor: '#f8f9fa',
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6'
                        }}>
                          {availableDuplicateRules.map((rule) => (
                            <CFormCheck
                              key={rule.rule_id}
                              type="checkbox"
                              id={`rule-${rule.rule_id}`}
                              label={rule.rule_name}
                              checked={duplicateRules.includes(rule.rule_id)}
                              onChange={() => handleDuplicateRuleChange(rule.rule_id)}
                              style={{ marginBottom: '10px', fontSize: '14px' }}
                            />
                          ))}
                        </div>
                      )}
                      <small className="text-muted d-block mt-2">
                        Records matching the selected rule(s) in both collections will be removed from Target Collection
                      </small>
                    </CCol>

                    <CCol xs={12} className="text-end mt-4">
                      <CButton
                        color="primary"
                        onClick={startDuplicateRemoval}
                        disabled={!mainDatabase || !mainCollection || !validateTargetDatabase || !validateTargetCollection || duplicateRules.length === 0}
                        style={{ minWidth: '200px' }}
                      >
                        <CIcon icon={cilCheckCircle} className="me-2" />
                        Start Duplicate Removal
                      </CButton>
                    </CCol>
                  </CRow>

                  {/* Validate Progress Display */}
                  {showValidateProgress && Object.keys(validateProgress).length > 0 && (
                    <div className="mt-4 p-4" style={{
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                    }}>
                      <h5 className="mb-3">🔍 Duplicate Removal Progress</h5>
                      {Object.entries(validateProgress).map(([processId, progress]) => (
                        <div key={processId} className="mb-3 p-3" style={{
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                            <span className="fw-bold">{progress.fileName}</span>
                              <br />
                              <small className="text-muted">Rule: {progress.rule}</small>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-info">{progress.percentage.toFixed(2)}%</span>
                            </div>
                          </div>
                          <CProgress className="mb-2" height={12}>
                            <CProgressBar 
                              value={progress.percentage} 
                              color={progress.status === 'completed' ? 'success' : progress.status === 'failed' ? 'danger' : 'info'}
                            >
                              {progress.percentage.toFixed(1)}%
                            </CProgressBar>
                          </CProgress>
                          <div className="d-flex justify-content-between">
                            <small className="text-muted">
                              {progress.processed} / {progress.total} records processed
                            </small>
                            <small className="text-muted">
                              <strong className="text-danger">Removed: {progress.removed}</strong>
                            </small>
                          </div>
                          {progress.status && progress.status !== 'processing' && (
                            <div className="mt-2">
                              <CBadge color={progress.status === 'completed' ? 'success' : 'warning'}>
                                {progress.status.toUpperCase()}
                              </CBadge>
                              {progress.status === 'completed' && (
                                <div className="mt-2 p-2" style={{
                                  backgroundColor: '#d4edda',
                                  borderRadius: '4px',
                                  border: '1px solid #c3e6cb'
                                }}>
                                  <strong className="text-success">✅ Duplicate Removal Completed!</strong>
                                  <br />
                                  <small>
                                    Rule: <strong>{progress.rule}</strong>
                                    <br />
                                    Total Duplicates Removed: <strong className="text-danger">{progress.removed}</strong>
                                    <br />
                                    Total Records Processed: {progress.total}
                                  </small>
                            </div>
                          )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CTabPane>

                <CTabPane visible={activeTab === 'history'}>
                  <div className="p-3">
                    {/* History Header with Filter */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Import History</h5>
                      <div className="d-flex align-items-center gap-2">
                        <CFormSelect
                          size="sm"
                          value={historyFilter}
                          onChange={(e) => setHistoryFilter(e.target.value)}
                          style={{ width: '150px' }}
                        >
                          <option value="all">All Status</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                          <option value="processing">In Progress</option>
                          <option value="cancelled">Cancelled</option>
                        </CFormSelect>
                        <CButton 
                          size="sm" 
                          color="secondary"
                          onClick={() => fetchHistory(historyFilter)}
                          disabled={loadingHistory}
                        >
                          {loadingHistory ? <CSpinner size="sm" /> : 'Refresh'}
                        </CButton>
                      </div>
                    </div>

                    {/* Error Alert */}
                    {historyError && (
                      <CAlert color="danger" className="mb-3">
                        {historyError}
                      </CAlert>
                    )}

                    {/* Loading State */}
                    {loadingHistory ? (
                      <div className="text-center py-5">
                        <CSpinner />
                        <p className="text-muted mt-2">Loading history...</p>
                      </div>
                    ) : importHistory.length === 0 ? (
                      <div className="text-center py-5">
                        <p className="text-muted">No import history found</p>
                      </div>
                    ) : (
                      /* History Table */
                      <>
                        <div className="table-responsive">
                          <table className="table table-hover table-striped align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>File Name</th>
                                <th>Database/Collection</th>
                                <th className="text-center">Total</th>
                                <th className="text-center">Inserted</th>
                                <th className="text-center">Rejected</th>
                                <th className="text-center">Status</th>
                                <th>Error</th>
                                <th>Date/Time</th>
                                <th>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedHistory.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    <strong>{item.fileName || 'Unknown'}</strong>
                                  </td>
                                  <td>
                                    <small className="text-muted">
                                      {item.database}.{item.collection}
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-secondary">
                                      {item.totalRows?.toLocaleString() || 0}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-success">
                                      {item.insertedRows?.toLocaleString() || 0}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    {item.rejectedRows > 0 ? (
                                      <span className="badge bg-danger">
                                        {item.rejectedRows?.toLocaleString()}
                                      </span>
                                    ) : (
                                      <span className="badge bg-light text-muted">0</span>
                                    )}
                                  </td>
                                  <td className="text-center">
                                    <CBadge color={
                                      item.statusRaw === 'completed' ? 'success' :
                                      item.statusRaw === 'failed' ? 'danger' :
                                      item.statusRaw === 'processing' ? 'primary' :
                                      item.statusRaw === 'cancelled' ? 'warning' : 'secondary'
                                    }>
                                      {item.status}
                                    </CBadge>
                                  </td>
                                  <td>
                                    {item.errorReason ? (
                                      <small className="text-danger" title={item.errorReason}>
                                        {item.errorReason.substring(0, 50)}
                                        {item.errorReason.length > 50 ? '...' : ''}
                                      </small>
                                    ) : (
                                      <span className="text-muted">-</span>
                                    )}
                                  </td>
                                  <td>
                                    <small>
                                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                                    </small>
                                  </td>
                                  <td>
                                    <small className="text-muted">
                                      {item.duration || '-'}
                                    </small>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Controls */}
                        {historyTotalPages > 1 && (
                          <div className="d-flex justify-content-between align-items-center mt-3">
                            <div className="d-flex align-items-center gap-2">
                              <small className="text-muted">
                                Showing {((historyCurrentPage - 1) * historyItemsPerPage) + 1} - {Math.min(historyCurrentPage * historyItemsPerPage, importHistory.length)} of {importHistory.length}
                              </small>
                              <CFormSelect
                                size="sm"
                                style={{ width: '80px' }}
                                value={historyItemsPerPage}
                                onChange={(e) => {
                                  setHistoryItemsPerPage(Number(e.target.value));
                                  setHistoryCurrentPage(1);
                                }}
                              >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </CFormSelect>
                              <small className="text-muted">per page</small>
                            </div>
                            
                            <CPagination size="sm" aria-label="History pagination">
                              <CPaginationItem
                                aria-label="First"
                                disabled={historyCurrentPage === 1}
                                onClick={() => setHistoryCurrentPage(1)}
                              >
                                «
                              </CPaginationItem>
                              <CPaginationItem
                                aria-label="Previous"
                                disabled={historyCurrentPage === 1}
                                onClick={() => setHistoryCurrentPage(prev => Math.max(1, prev - 1))}
                              >
                                ‹
                              </CPaginationItem>
                              
                              {/* Page Numbers */}
                              {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                                let pageNum;
                                if (historyTotalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (historyCurrentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (historyCurrentPage >= historyTotalPages - 2) {
                                  pageNum = historyTotalPages - 4 + i;
                                } else {
                                  pageNum = historyCurrentPage - 2 + i;
                                }
                                return (
                                  <CPaginationItem
                                    key={pageNum}
                                    active={historyCurrentPage === pageNum}
                                    onClick={() => setHistoryCurrentPage(pageNum)}
                                  >
                                    {pageNum}
                                  </CPaginationItem>
                                );
                              })}
                              
                              <CPaginationItem
                                aria-label="Next"
                                disabled={historyCurrentPage === historyTotalPages}
                                onClick={() => setHistoryCurrentPage(prev => Math.min(historyTotalPages, prev + 1))}
                              >
                                ›
                              </CPaginationItem>
                              <CPaginationItem
                                aria-label="Last"
                                disabled={historyCurrentPage === historyTotalPages}
                                onClick={() => setHistoryCurrentPage(historyTotalPages)}
                              >
                                »
                              </CPaginationItem>
                            </CPagination>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CTabPane>

                <CTabPane visible={activeTab === 'cleanup'}>
                  <div className="p-3">
                    <h5 className="mb-3">🧹 Field Cleanup — Restore Mutated Fields</h5>
                    <CAlert color="info" className="mb-4">
                      <strong>What this does:</strong> Scans the selected collection for documents with mutated <code>id</code> and <code>email</code> fields
                      (containing <code>__transferId__</code> suffixes). Restores original values from <code>id_original</code> and <code>email_original</code> fields,
                      then removes those extra fields. Safe for bulk operations (10 crore+ records).
                    </CAlert>

                    <CRow className="g-3 mb-4">
                      <CCol sm={5}>
                        <CFormLabel className="fw-bold">Database</CFormLabel>
                        <CFormSelect
                          value={cleanupDatabase}
                          onChange={async (e) => {
                            const db = e.target.value;
                            setCleanupDatabase(db);
                            setCleanupCollection('');
                            setCleanupCollections([]);
                            setCleanupError('');
                            if (db) {
                              setLoadingCleanupCollections(true);
                              try {
                                const authAxios = getAuthAxios();
                                const resp = await authAxios.get(`/api/import/collections?database=${db}`);
                                setCleanupCollections(resp.data.collections || []);
                              } catch (err) {
                                setCleanupError('Failed to fetch collections: ' + err.message);
                              } finally {
                                setLoadingCleanupCollections(false);
                              }
                            }
                          }}
                          disabled={loadingDatabases || cleanupRunning}
                        >
                          <option value="">{loadingDatabases ? 'Loading...' : 'Select Database'}</option>
                          {databases.map(db => (
                            <option key={db.name} value={db.name}>{db.label}</option>
                          ))}
                        </CFormSelect>
                      </CCol>

                      <CCol sm={5}>
                        <CFormLabel className="fw-bold">Collection</CFormLabel>
                        <CFormSelect
                          value={cleanupCollection}
                          onChange={(e) => { setCleanupCollection(e.target.value); setCleanupError(''); }}
                          disabled={!cleanupDatabase || loadingCleanupCollections || cleanupRunning}
                        >
                          <option value="">{loadingCleanupCollections ? 'Loading...' : 'Select Collection'}</option>
                          {cleanupCollections.map(col => (
                            <option key={col.name} value={col.name}>{col.label} ({col.documentCount} docs)</option>
                          ))}
                        </CFormSelect>
                        {loadingCleanupCollections && (
                          <div className="mt-1"><CSpinner size="sm" className="me-1" /><small className="text-muted">Loading...</small></div>
                        )}
                      </CCol>

                      <CCol sm={2} className="d-flex align-items-end">
                        <CButton
                          color="warning"
                          className="w-100"
                          disabled={!cleanupDatabase || !cleanupCollection || cleanupRunning}
                          onClick={async () => {
                            try {
                              setCleanupRunning(true);
                              setCleanupError('');
                              setCleanupProgress({});
                              const authAxios = getAuthAxios();
                              const resp = await authAxios.post('/api/cleanup-fields', {
                                database: cleanupDatabase,
                                collection: cleanupCollection
                              });
                              const { jobId } = resp.data;
                              setCleanupJobId(jobId);

                              // Start polling
                              if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
                              cleanupIntervalRef.current = setInterval(async () => {
                                try {
                                  const pollResp = await authAxios.get(`/api/cleanup-fields?jobId=${jobId}`);
                                  const { status, progress, result, error: jobError } = pollResp.data;
                                  setCleanupProgress(progress || {});

                                  if (status === 'completed') {
                                    clearInterval(cleanupIntervalRef.current);
                                    cleanupIntervalRef.current = null;
                                    setCleanupRunning(false);
                                    setCleanupProgress({ ...progress, phase: 'completed', result });
                                  } else if (status === 'failed') {
                                    clearInterval(cleanupIntervalRef.current);
                                    cleanupIntervalRef.current = null;
                                    setCleanupRunning(false);
                                    setCleanupError(jobError || 'Cleanup job failed');
                                  }
                                } catch (pollErr) {
                                  console.error('Polling error:', pollErr);
                                }
                              }, 2000);
                            } catch (err) {
                              setCleanupRunning(false);
                              setCleanupError('Failed to start cleanup: ' + (err.response?.data?.error || err.message));
                            }
                          }}
                        >
                          {cleanupRunning ? (
                            <><CSpinner size="sm" className="me-1" /> Running...</>
                          ) : (
                            '🧹 Start Cleanup'
                          )}
                        </CButton>
                      </CCol>
                    </CRow>

                    {/* Error */}
                    {cleanupError && (
                      <CAlert color="danger" className="mb-3">{cleanupError}</CAlert>
                    )}

                    {/* Progress Display */}
                    {(cleanupRunning || cleanupProgress.phase === 'completed') && (
                      <CCard className="mb-3" style={{ borderColor: cleanupProgress.phase === 'completed' ? '#28a745' : '#ffc107' }}>
                        <CCardBody>
                          <CRow className="align-items-center">
                            <CCol sm={3} className="text-center">
                              <div style={{ width: 120, margin: '0 auto' }}>
                                <CircularProgressbar
                                  value={cleanupProgress.percentage || 0}
                                  text={`${cleanupProgress.percentage || 0}%`}
                                  styles={buildStyles({
                                    textSize: '22px',
                                    pathColor: cleanupProgress.phase === 'completed' ? '#28a745' : '#ffc107',
                                    textColor: cleanupProgress.phase === 'completed' ? '#28a745' : '#ffc107',
                                    trailColor: '#e9ecef',
                                    pathTransitionDuration: 0.5
                                  })}
                                />
                              </div>
                            </CCol>
                            <CCol sm={9}>
                              <h6 className="mb-2">
                                {cleanupProgress.phase === 'connecting' && '🔗 Connecting to database...'}
                                {cleanupProgress.phase === 'counting' && '📊 Counting affected documents...'}
                                {cleanupProgress.phase === 'cleaning' && '🔄 Cleaning documents...'}
                                {cleanupProgress.phase === 'completed' && '✅ Cleanup Complete!'}
                                {!cleanupProgress.phase && '⏳ Starting...'}
                              </h6>
                              <p className="text-muted mb-1">{cleanupProgress.message || 'Initializing...'}</p>
                              {cleanupProgress.total > 0 && (
                                <div className="d-flex gap-4 mt-2">
                                  <div>
                                    <small className="text-muted">Processed</small>
                                    <div className="fw-bold">{(cleanupProgress.processed || 0).toLocaleString()} / {(cleanupProgress.total || 0).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <small className="text-muted">Restored</small>
                                    <div className="fw-bold text-success">{(cleanupProgress.restored || 0).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <small className="text-muted">Cleaned</small>
                                    <div className="fw-bold text-warning">{(cleanupProgress.cleaned || 0).toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                              {cleanupProgress.phase === 'completed' && cleanupProgress.result && (
                                <CAlert color="success" className="mt-3 mb-0" style={{ fontSize: '13px' }}>
                                  <strong>Summary:</strong> {cleanupProgress.result.cleaned?.toLocaleString() || cleanupProgress.cleaned?.toLocaleString()} documents cleaned.
                                  Fields restored: id, email. Extra fields removed: id_original, email_original.
                                </CAlert>
                              )}
                            </CCol>
                          </CRow>
                        </CCardBody>
                      </CCard>
                    )}
                  </div>
                </CTabPane>

                <CTabPane visible={activeTab === 'deduplicate'}>
                  <div className="p-3">
                    <h5 className="mb-3">🔍 Deduplicate — Remove Duplicate Records</h5>
                    <CAlert color="warning" className="mb-4">
                      <strong>Optimized for 10-20 crore+ records.</strong> Uses sorted cursor streaming — single pass, O(1) memory.
                      <br /><strong>Case 1:</strong> Removes duplicates by <code>email</code> field (case-insensitive). Keeps oldest record.
                      <br /><strong>Case 2:</strong> For records with <strong>no email</strong>, removes duplicates by <code>li_full_name</code> + <code>li_company_name</code> combo.
                      <br /><strong>Case 3:</strong> Removes duplicates by <code>li_full_name</code> + <code>li_smtp</code> (name + domain) combo.
                      <br />Select which criteria to apply using the checkboxes below.
                    </CAlert>

                    <CRow className="g-3 mb-4">
                      <CCol sm={5}>
                        <CFormLabel className="fw-bold">Database</CFormLabel>
                        <CFormSelect
                          value={dedupDatabase}
                          onChange={async (e) => {
                            const db = e.target.value;
                            setDedupDatabase(db);
                            setDedupCollection('');
                            setDedupCollections([]);
                            setDedupError('');
                            if (db) {
                              setLoadingDedupCollections(true);
                              try {
                                const authAxios = getAuthAxios();
                                const resp = await authAxios.get(`/api/import/collections?database=${db}`);
                                setDedupCollections(resp.data.collections || []);
                              } catch (err) {
                                setDedupError('Failed to fetch collections: ' + err.message);
                              } finally {
                                setLoadingDedupCollections(false);
                              }
                            }
                          }}
                          disabled={loadingDatabases || dedupRunning}
                        >
                          <option value="">{loadingDatabases ? 'Loading...' : 'Select Database'}</option>
                          {databases.map(db => (
                            <option key={db.name} value={db.name}>{db.label}</option>
                          ))}
                        </CFormSelect>
                      </CCol>

                      <CCol sm={5}>
                        <CFormLabel className="fw-bold">Collection</CFormLabel>
                        <CFormSelect
                          value={dedupCollection}
                          onChange={(e) => { setDedupCollection(e.target.value); setDedupError(''); }}
                          disabled={!dedupDatabase || loadingDedupCollections || dedupRunning}
                        >
                          <option value="">{loadingDedupCollections ? 'Loading...' : 'Select Collection'}</option>
                          {dedupCollections.map(col => (
                            <option key={col.name} value={col.name}>{col.label} ({col.documentCount} docs)</option>
                          ))}
                        </CFormSelect>
                        {loadingDedupCollections && (
                          <div className="mt-1"><CSpinner size="sm" className="me-1" /><small className="text-muted">Loading...</small></div>
                        )}
                      </CCol>
                    </CRow>

                    {/* Dedup Criteria Checkboxes */}
                    <CRow className="g-3 mb-4">
                      <CCol xs={12}>
                        <CFormLabel className="fw-bold">Deduplication Criteria</CFormLabel>
                        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                          <CFormCheck
                            type="checkbox"
                            id="dedup-email"
                            label={<><strong>Email</strong> — Remove records with duplicate email (case-insensitive). Keeps oldest record.</>}
                            checked={dedupCriteria.includes('email')}
                            onChange={() => setDedupCriteria(prev => prev.includes('email') ? prev.filter(c => c !== 'email') : [...prev, 'email'])}
                            disabled={dedupRunning}
                            style={{ marginBottom: '12px', fontSize: '14px' }}
                          />
                          <CFormCheck
                            type="checkbox"
                            id="dedup-name-company"
                            label={<><strong>Name + Company</strong> — For records with no email, remove duplicates by <code>li_full_name</code> + <code>li_company_name</code> combo.</>}
                            checked={dedupCriteria.includes('name_company')}
                            onChange={() => setDedupCriteria(prev => prev.includes('name_company') ? prev.filter(c => c !== 'name_company') : [...prev, 'name_company'])}
                            disabled={dedupRunning}
                            style={{ fontSize: '14px' }}
                          />
                          <CFormCheck
                            type="checkbox"
                            id="dedup-name-domain"
                            label={<><strong>Name + Domain</strong> — Remove duplicates by <code>li_full_name</code> + <code>li_smtp</code> (name + domain) combo.</>}
                            checked={dedupCriteria.includes('name_domain')}
                            onChange={() => setDedupCriteria(prev => prev.includes('name_domain') ? prev.filter(c => c !== 'name_domain') : [...prev, 'name_domain'])}
                            disabled={dedupRunning}
                            style={{ fontSize: '14px', marginTop: '8px' }}
                          />
                        </div>
                        <small className="text-muted d-block mt-2">Select at least one criterion. Both can run together.</small>
                      </CCol>
                    </CRow>

                    <CRow className="g-3 mb-4">
                      <CCol xs={12} className="text-end">
                        <CButton
                          color="danger"
                          style={{ minWidth: '220px' }}
                          disabled={!dedupDatabase || !dedupCollection || dedupRunning || dedupCriteria.length === 0}
                          onClick={async () => {
                            try {
                              setDedupRunning(true);
                              setDedupError('');
                              setDedupProgress({});
                              const authAxios = getAuthAxios();
                              const resp = await authAxios.post('/api/deduplicate', {
                                database: dedupDatabase,
                                collection: dedupCollection,
                                criteria: dedupCriteria
                              });
                              const { jobId } = resp.data;
                              setDedupJobId(jobId);

                              if (dedupIntervalRef.current) clearInterval(dedupIntervalRef.current);
                              dedupIntervalRef.current = setInterval(async () => {
                                try {
                                  const pollResp = await authAxios.get(`/api/deduplicate?jobId=${jobId}`);
                                  const { status, progress, result, error: jobError } = pollResp.data;
                                  setDedupProgress(progress || {});

                                  if (status === 'completed') {
                                    clearInterval(dedupIntervalRef.current);
                                    dedupIntervalRef.current = null;
                                    setDedupRunning(false);
                                    setDedupProgress({ ...progress, phase: 'completed', result });
                                  } else if (status === 'failed') {
                                    clearInterval(dedupIntervalRef.current);
                                    dedupIntervalRef.current = null;
                                    setDedupRunning(false);
                                    setDedupError(jobError || 'Deduplicate job failed');
                                  }
                                } catch (pollErr) {
                                  console.error('Polling error:', pollErr);
                                }
                              }, 2000);
                            } catch (err) {
                              setDedupRunning(false);
                              setDedupError('Failed to start: ' + (err.response?.data?.error || err.message));
                            }
                          }}
                        >
                          {dedupRunning ? (
                            <><CSpinner size="sm" className="me-1" /> Running...</>
                          ) : (
                            '🗑️ Clean Duplicates'
                          )}
                        </CButton>
                      </CCol>
                    </CRow>

                    {dedupError && (
                      <CAlert color="danger" className="mb-3">{dedupError}</CAlert>
                    )}

                    {(dedupRunning || dedupProgress.phase === 'completed') && (
                      <CCard className="mb-3" style={{ borderColor: dedupProgress.phase === 'completed' ? '#28a745' : '#dc3545' }}>
                        <CCardBody>
                          <CRow className="align-items-center">
                            <CCol sm={3} className="text-center">
                              <div style={{ width: 120, margin: '0 auto' }}>
                                <CircularProgressbar
                                  value={dedupProgress.percentage || 0}
                                  text={`${dedupProgress.percentage || 0}%`}
                                  styles={buildStyles({
                                    textSize: '22px',
                                    pathColor: dedupProgress.phase === 'completed' ? '#28a745' : '#dc3545',
                                    textColor: dedupProgress.phase === 'completed' ? '#28a745' : '#dc3545',
                                    trailColor: '#e9ecef',
                                    pathTransitionDuration: 0.5
                                  })}
                                />
                              </div>
                            </CCol>
                            <CCol sm={9}>
                              <h6 className="mb-2">
                                {dedupProgress.phase === 'connecting' && '🔗 Connecting to database...'}
                                {dedupProgress.phase === 'scanning' && `🔍 ${dedupProgress.currentCase || 'Scanning for duplicates'}...`}
                                {dedupProgress.phase === 'deleting' && `🗑️ ${dedupProgress.currentCase || 'Deleting duplicates'}...`}
                                {dedupProgress.phase === 'completed' && '✅ Deduplication Complete!'}
                                {!dedupProgress.phase && '⏳ Starting...'}
                              </h6>
                              <p className="text-muted mb-1">{dedupProgress.message || 'Initializing...'}</p>
                              {(dedupProgress.totalDuplicateGroups > 0 || dedupProgress.phase === 'completed') && (
                                <div className="d-flex gap-4 mt-2">
                                  <div>
                                    <small className="text-muted">Duplicate Groups</small>
                                    <div className="fw-bold">{(dedupProgress.totalDuplicateGroups || 0).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <small className="text-muted">Records to Delete</small>
                                    <div className="fw-bold text-danger">{(dedupProgress.totalDuplicateRecords || 0).toLocaleString()}</div>
                                  </div>
                                  <div>
                                    <small className="text-muted">Deleted</small>
                                    <div className="fw-bold text-success">{(dedupProgress.deleted || 0).toLocaleString()}</div>
                                  </div>
                                </div>
                              )}
                              {dedupProgress.phase === 'completed' && (
                                <CAlert color="success" className="mt-3 mb-0" style={{ fontSize: '13px' }}>
                                  <strong>Summary:</strong> {(dedupProgress.deleted || 0).toLocaleString()} duplicate records deleted.
                                  {dedupProgress.case1Deleted != null && (
                                    <><br />Case 1 (email): <strong>{(dedupProgress.case1Groups || 0).toLocaleString()}</strong> groups → <strong className="text-danger">{(dedupProgress.case1Deleted || 0).toLocaleString()}</strong> deleted</>
                                  )}
                                  {dedupProgress.case2Deleted != null && (
                                    <><br />Case 2 (name+company): <strong>{(dedupProgress.case2Groups || 0).toLocaleString()}</strong> groups → <strong className="text-danger">{(dedupProgress.case2Deleted || 0).toLocaleString()}</strong> deleted</>
                                  )}
                                  {dedupProgress.case3Deleted != null && (
                                    <><br />Case 3 (name+domain): <strong>{(dedupProgress.case3Groups || 0).toLocaleString()}</strong> groups → <strong className="text-danger">{(dedupProgress.case3Deleted || 0).toLocaleString()}</strong> deleted</>
                                  )}
                                  {dedupProgress.totalDocsBefore && dedupProgress.totalDocsAfter && (
                                    <><br />Collection: {dedupProgress.totalDocsBefore.toLocaleString()} → {dedupProgress.totalDocsAfter.toLocaleString()} records.</>
                                  )}
                                </CAlert>
                              )}
                            </CCol>
                          </CRow>
                        </CCardBody>
                      </CCard>
                    )}
                  </div>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Add Rule Modal */}
      <CModal visible={showAddRuleModal} onClose={handleCloseAddRuleModal} size="lg">
        <CModalHeader>
          <CModalTitle>Add New Duplicate Rule</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormLabel>Rule Name</CFormLabel>
              <CFormInput
                type="text"
                placeholder="e.g., first_name + last_name + email"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
              />
              <small className="text-muted">Rule name will be auto-generated from selected columns if left empty</small>
            </div>

            <div className="mb-3">
              <CFormLabel>Select Columns (1 to N columns)</CFormLabel>
              {!mainDatabase || !mainCollection ? (
                <div className="alert alert-warning">
                  <small>Please select Main Database and Main Collection first to load available columns.</small>
                </div>
              ) : loadingColumns ? (
                <div className="text-center">
                  <CSpinner size="sm" className="me-2" />
                  <small className="text-muted">Loading columns...</small>
                </div>
              ) : availableColumns.length === 0 ? (
                <div className="alert alert-info">
                  <small>No columns found. Please ensure the collection exists and has data.</small>
                </div>
              ) : (
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {availableColumns.map((col) => (
                    <CFormCheck
                      key={col.name}
                      type="checkbox"
                      id={`col-${col.name}`}
                      label={col.displayName || col.name}
                      checked={newRuleColumns.includes(col.name)}
                      onChange={() => handleColumnToggle(col.name)}
                      style={{ marginBottom: '8px', fontSize: '14px' }}
                    />
                  ))}
                </div>
              )}
              <small className="text-muted d-block mt-2">
                Selected columns: {newRuleColumns.length > 0 ? newRuleColumns.join(' + ') : 'None'}
              </small>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={handleCloseAddRuleModal} disabled={creatingRule}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleCreateRule}
            disabled={creatingRule || newRuleColumns.length === 0}
          >
            {creatingRule ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              'Create Rule'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  );
};

export default Insert;
