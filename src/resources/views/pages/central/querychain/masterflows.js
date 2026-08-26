import React, { useState, useEffect, useRef } from 'react';
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
  CFormCheck,
  CFormLabel,
  CAlert,
  CSpinner,
  CBadge,
  CProgress,
  CProgressBar,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilArrowLeft,
  cilHome,
  cilCopy,
  cilCloudDownload,
  cilHistory,
  cilMediaPlay,
} from '@coreui/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthService from 'src/application/Services/AuthService';

/**
 * Masterflows Page
 * Equivalent to bv/resources/views/system/central/query-chain/master-flows.blade.php
 * Handles master flow and workflow execution with CSV/DB input and output
 */
const Masterflows = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State management
  const [workflows, setWorkflows] = useState([]);
  const [processDef, setProcessDef] = useState([]);
  const [allowedDatabases, setAllowedDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state
  const [mode, setMode] = useState('flow');
  const [processName, setProcessName] = useState('');
  const [preprocessId, setPreprocessId] = useState('custom');
  const [selectedWorkflows, setSelectedWorkflows] = useState([]);
  const [inputSource, setInputSource] = useState('csv');
  const [outputTarget, setOutputTarget] = useState('csv');
  const [csvFile, setCsvFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [addToProcess, setAddToProcess] = useState(false);

  // Database input/output state
  const [inputDb, setInputDb] = useState('');
  const [inputTable, setInputTable] = useState('');
  const [outputDb, setOutputDb] = useState('');
  const [outputTable, setOutputTable] = useState('');

  // AutoFlow state
  const [baseInputDb, setBaseInputDb] = useState('');
  const [baseInputTable, setBaseInputTable] = useState('');

  // Dynamic table/column loading
  const [inputTables, setInputTables] = useState([]);
  const [outputTables, setOutputTables] = useState([]);
  const [baseTables, setBaseTables] = useState([]);
  
  // Loading states
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [loadingInputCollections, setLoadingInputCollections] = useState(false);
  const [loadingOutputCollections, setLoadingOutputCollections] = useState(false);
  const [loadingBaseCollections, setLoadingBaseCollections] = useState(false);

  // Chunked upload state for large files (> 50MB)
  const [uploadPhase, setUploadPhase] = useState('idle'); // idle, uploading, processing
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transferId, setTransferId] = useState(''); // For pre-uploaded file reference

  // Progress tracking state
  const [activeProcesses, setActiveProcesses] = useState({});
  const [showProgress, setShowProgress] = useState(false);
  const progressIntervalsRef = useRef({});

  // Get authenticated axios instance
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      baseURL: '/api',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  };

  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      const response = await axios.get('/api/System/Central/querychain/workflows');
      if (response.data.status && response.data.data) {
        setWorkflows(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  // Fetch predefined processes
  const fetchProcesses = async () => {
    try {
      const response = await axios.get('/api/System/Central/querychain/processes');
      if (response.data.status && response.data.data) {
        setProcessDef(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  // Fetch allowed databases dynamically from API
  const fetchDatabases = async () => {
    try {
      setLoadingDatabases(true);
      const response = await axios.get('/api/import/databases');
      
      if (response.data.success && response.data.databases) {
        // Extract database names from API response
        const dbNames = response.data.databases.map(db => db.name);
        setAllowedDatabases(dbNames);
      } else {
        // Fallback to default list
        const dbs = ['sun', 'moon', 'mars', 'jupiter', 'earth', 'mercury', 'saturn', 'neptune', 'pluto', 'nextjs_stu'];
        setAllowedDatabases(dbs);
      }
    } catch (error) {
      console.error('Failed to fetch databases:', error);
      // Fallback to default list on error
      const dbs = ['sun', 'moon', 'mars', 'jupiter', 'earth', 'mercury', 'saturn', 'neptune', 'pluto', 'nextjs_stu'];
      setAllowedDatabases(dbs);
    } finally {
      setLoadingDatabases(false);
    }
  };

  // Fetch collections for a database
  const fetchCollections = async (databaseName, setCollections, setLoading) => {
    if (!databaseName) {
      setCollections([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`/api/import/collections?database=${databaseName}`);
      
      if (response.data.success && response.data.collections) {
        const collectionNames = response.data.collections.map(col => col.name);
        setCollections(collectionNames);
      } else {
        setCollections([]);
      }
    } catch (error) {
      console.error(`Error fetching collections for ${databaseName}:`, error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle database selection changes
  const handleBaseInputDbChange = (selectedDb) => {
    setBaseInputDb(selectedDb);
    setBaseInputTable(''); // Reset table selection
    if (selectedDb) {
      fetchCollections(selectedDb, setBaseTables, setLoadingBaseCollections);
    } else {
      setBaseTables([]);
    }
  };

  const handleInputDbChange = (selectedDb) => {
    setInputDb(selectedDb);
    setInputTable(''); // Reset table selection
    if (selectedDb) {
      fetchCollections(selectedDb, setInputTables, setLoadingInputCollections);
    } else {
      setInputTables([]);
    }
  };

  const handleOutputDbChange = (selectedDb) => {
    setOutputDb(selectedDb);
    setOutputTable(''); // Reset table selection
    if (selectedDb) {
      fetchCollections(selectedDb, setOutputTables, setLoadingOutputCollections);
    } else {
      setOutputTables([]);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkflows(), fetchProcesses(), fetchDatabases()]);
      setLoading(false);
    };
    loadData();

    // Cleanup intervals on unmount
    return () => {
      Object.values(progressIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      progressIntervalsRef.current = {};
    };
  }, []);

  // Populate workflow list based on mode
  const getFilteredWorkflows = () => {
    const allowedTypes = mode === 'workflow' ? ['wf', 'wmf'] : ['mf', 'wmf'];
    return workflows.filter((w) => allowedTypes.includes(w.type));
  };

  // Get selected headers
  const getSelectedHeaders = () => {
    const headers = [];
    if (mode === 'workflow') {
      const checked = selectedWorkflows;
      if (checked.length === 1) {
        const wf = workflows.find((w) => w.name === checked[0]);
        if (wf && wf.required_headers) {
          return wf.required_headers;
        }
      }
    } else {
      selectedWorkflows.forEach((workflowName) => {
        const wf = workflows.find((w) => w.name === workflowName);
        if (wf && wf.required_headers) {
          headers.push(...wf.required_headers);
        }
      });
    }
    return [...new Set(headers)];
  };

  // Copy headers to clipboard
  const copyHeaders = () => {
    const headers = getSelectedHeaders();
    if (headers.length) {
      const textToCopy = headers.join(',');
      navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Headers copied to clipboard!');
      });
    } else {
      alert('No headers available for selected workflows');
    }
  };

  // Download headers as CSV
  const downloadHeaders = () => {
    const headers = getSelectedHeaders();
    if (headers.length) {
      const csvContent = headers.join(',') + '\n';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'workflow_headers.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      alert('No headers available for selected workflows');
    }
  };

  // Handle file selection - with chunked upload for large files
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFileInfo(null);
      setCsvFile(null);
      setTransferId('');
      return;
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = 2000; // 2GB max
    const largeFileThreshold = 50; // 50MB - use chunked for larger

    setFileInfo({
      name: file.name,
      size: fileSizeMB,
      warning: fileSizeMB > maxSizeMB,
      large: fileSizeMB > largeFileThreshold,
    });

    setCsvFile(file);

    // For large files, pre-upload via chunks
    if (file.size > largeFileThreshold * 1024 * 1024) {
      console.log(`📦 Large file detected (${fileSizeMB} MB) - starting chunked upload`);
      await handleChunkedUpload(file);
    } else {
      setTransferId(''); // Small file will be uploaded with form
    }
  };

  // Chunked upload for large files (>50MB)
  const handleChunkedUpload = async (file) => {
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
    const chunks = Math.ceil(file.size / CHUNK_SIZE);
    const newUploadId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    setUploadPhase('uploading');
    setUploadProgress(0);

    let uploadedSize = 0;

    try {
      for (let chunkIndex = 0; chunkIndex < chunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', chunks.toString());
        formData.append('uploadId', newUploadId);
        formData.append('fileName', file.name);
        formData.append('fileSize', file.size.toString());
        formData.append('database', 'masterflow'); // dummy for API compatibility
        formData.append('table', 'uploads');

        const response = await axios.post('/api/import/upload-chunked', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const chunkProgress = progressEvent.loaded;
            const totalProgress = uploadedSize + chunkProgress;
            const percent = Math.round((totalProgress * 100) / file.size);
            setUploadProgress(Math.min(percent, 99));
          }
        });

        if (response.data.complete) {
          console.log(`✅ All chunks uploaded, transfer_id: ${newUploadId}`);
          setTransferId(newUploadId);
          setUploadPhase('idle');
          setUploadProgress(100);
          return;
        }

        uploadedSize += (end - start);
        console.log(`✅ Chunk ${chunkIndex + 1}/${chunks} uploaded`);
      }
    } catch (error) {
      console.error('Chunked upload failed:', error);
      setUploadPhase('idle');
      setUploadProgress(0);
      setTransferId('');
      alert('File upload failed: ' + (error.response?.data?.error || error.message));
    }
  };

  // Populate form with predefined process
  const populateFormWithProcess = (processId) => {
    if (processId === 'custom' || !processId) {
      setProcessName('');
      setPreprocessId('custom');
      setMode('flow');
      setInputSource('csv');
      setOutputTarget('csv');
      setSelectedWorkflows([]);
      setAddToProcess(false);
      return;
    }

    const process = processDef.find((p) => p.process_id === processId);
    if (!process) return;

    setProcessName(process.name || '');
    setPreprocessId(processId);
    setMode(process.mode || 'flow');
    setInputSource(process.input_source || 'csv');
    setOutputTarget(process.output_target || 'csv');
    setInputDb(process.input_db || '');
    setInputTable(process.input_table || '');
    setOutputDb(process.output_db || '');
    setOutputTable(process.output_table || '');

    // Parse flows from JSON string if needed
    let flows = [];
    if (Array.isArray(process.flows)) {
      flows = process.flows;
    } else if (typeof process.flows === 'string') {
      try {
        flows = JSON.parse(process.flows).map((f) => f.workflow_name || f);
      } catch (e) {
        console.error('Failed to parse flows:', e);
      }
    }
    setSelectedWorkflows(flows);
    setAddToProcess(false);
  };

  // Handle workflow selection
  const handleWorkflowToggle = (workflowName) => {
    if (mode === 'workflow') {
      // Only one workflow allowed in workflow mode
      setSelectedWorkflows([workflowName]);
    } else {
      // Multiple workflows allowed in flow mode
      setSelectedWorkflows((prev) => {
        if (prev.includes(workflowName)) {
          return prev.filter((w) => w !== workflowName);
        } else {
          return [...prev, workflowName];
        }
      });
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      const filtered = getFilteredWorkflows();
      setSelectedWorkflows(filtered.map((w) => w.name));
    } else {
      setSelectedWorkflows([]);
    }
  };

  // ─── Progress Monitoring Functions ───
  const startProgressMonitoring = (processId, procName) => {
    // Clear existing interval for this process
    if (progressIntervalsRef.current[processId]) {
      clearInterval(progressIntervalsRef.current[processId]);
    }

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(
          `/api/System/Central/querychain/flow-progress?process_id=${processId}`
        );
        const data = response.data.progress || response.data;

        const percentage = data.percentage !== undefined
          ? Math.min(100, Math.max(0, parseFloat(data.percentage)))
          : 0;

        setActiveProcesses(prev => ({
          ...prev,
          [processId]: {
            processName: procName,
            percentage: parseFloat(percentage.toFixed(1)),
            status: data.status || 'processing',
            currentWorkflow: data.current_workflow || '',
            workflowIndex: data.workflow_index || 0,
            workflowTotal: data.workflow_total || 0,
            processMode: data.process_mode || 'flow',
            errorMessage: data.error_message || null
          }
        }));

        // Stop polling on terminal states
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          delete progressIntervalsRef.current[processId];

          // Auto-remove completed processes after 30 seconds
          if (data.status === 'completed') {
            setTimeout(() => {
              setActiveProcesses(prev => {
                const updated = { ...prev };
                delete updated[processId];
                if (Object.keys(updated).length === 0) {
                  setShowProgress(false);
                }
                return updated;
              });
            }, 30000);
          }
        }
      } catch (err) {
        console.error(`Progress poll error for ${processId}:`, err);
      }
    }, 2000);

    progressIntervalsRef.current[processId] = interval;
  };

  const dismissProcess = (processId) => {
    if (progressIntervalsRef.current[processId]) {
      clearInterval(progressIntervalsRef.current[processId]);
      delete progressIntervalsRef.current[processId];
    }
    setActiveProcesses(prev => {
      const updated = { ...prev };
      delete updated[processId];
      if (Object.keys(updated).length === 0) {
        setShowProgress(false);
      }
      return updated;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'processing': return 'info';
      default: return 'warning';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'processing': return '⚙️';
      default: return '⏳';
    }
  };

  // Check if AutoFlow is selected
  const isAutoFlowSelected = selectedWorkflows.some(
    (name) =>
      name.toLowerCase().includes('auto flow') ||
      name.toLowerCase().includes('autoflow') ||
      name.toLowerCase() === 'auto flows'
  );

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation
      if (!processName.trim()) {
        throw new Error('Process name is required');
      }

      if (selectedWorkflows.length === 0) {
        throw new Error('Please select at least one workflow');
      }

      if (inputSource === 'csv' && !csvFile) {
        throw new Error('Please upload a CSV file');
      }

      if (inputSource === 'db' && (!inputDb || !inputTable)) {
        throw new Error('Please select input database and table');
      }

      if (outputTarget === 'db' && (!outputDb || !outputTable)) {
        throw new Error('Please select output database and table');
      }

      if (isAutoFlowSelected && (!baseInputDb || !baseInputTable)) {
        throw new Error('Base database and table are required for AutoFlow');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('save_token', 'central_unique_workflows_f'); // Token from skeleton
      formData.append('process_name', processName);
      formData.append('preprocess_id', preprocessId);
      formData.append('mode', mode);
      // Send workflows as array - formidable v3 handles multiple values with same name as array
      selectedWorkflows.forEach((wf) => formData.append('workflows', wf));
      formData.append('input_source', inputSource);
      formData.append('output_target', outputTarget);

      if (inputSource === 'csv') {
        if (transferId) {
          // Large file was pre-uploaded via chunks - send transfer_id
          formData.append('transfer_id', transferId);
          formData.append('csv_file_name', csvFile.name);
          console.log(`📤 Using pre-uploaded file: ${transferId}`);
        } else if (csvFile) {
          // Small file - upload with form
          formData.append('csv_file', csvFile);
          console.log(`📤 Uploading file with form: ${csvFile.name}`);
        }
      }

      if (inputSource === 'db') {
        formData.append('input_db', inputDb);
        formData.append('input_table', inputTable);
      }

      if (outputTarget === 'db') {
        formData.append('output_db', outputDb);
        formData.append('output_table', outputTable);
      }

      if (isAutoFlowSelected) {
        formData.append('base_input_db', baseInputDb);
        formData.append('base_input_table', baseInputTable);
      }

      if (addToProcess) {
        formData.append('add_to_process', 'true');
      }

      // Submit form
      const token = AuthService.getToken();
      const response = await axios.post('/api/System/Central/querychain/FormCtrl', formData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status) {
        const returnedProcessId = response.data.affected;

        // Initialize progress tracking
        if (returnedProcessId) {
          setActiveProcesses(prev => ({
            ...prev,
            [returnedProcessId]: {
              processName,
              percentage: 0,
              status: 'pending',
              currentWorkflow: '',
              workflowIndex: 0,
              workflowTotal: selectedWorkflows.length,
              processMode: mode,
              errorMessage: null
            }
          }));
          setShowProgress(true);
          startProgressMonitoring(returnedProcessId, processName);
          setSuccess(`Process ${returnedProcessId} queued! Track progress below.`);
        } else {
          setSuccess(response.data.message || 'Master flow started successfully!');
        }

        // Reset form for next submission
        setProcessName('');
        setPreprocessId('custom');
        setSelectedWorkflows([]);
        setCsvFile(null);
        setFileInfo(null);
        setTransferId('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.message || 'Failed to start master flow');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter workflows by mode
  const filteredWorkflows = getFilteredWorkflows();
  const allSelected = filteredWorkflows.length > 0 && selectedWorkflows.length === filteredWorkflows.length;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <CSpinner />
      </div>
    );
  }

  return (
    <div className="container-xxl flex-grow-1 py-1">
      <CRow>
    
        <CCol xs={12}>
          <CForm onSubmit={handleSubmit} encType="multipart/form-data">
            <CCard className="shadow-sm">
              <CCardHeader className="bg-primary text-white">
                <h5 className="mb-0">
                  <CIcon icon={cilMediaPlay} className="me-2" />
                  Start a New Process
                </h5>
              </CCardHeader>

              <CCardBody className="p-4">
                {error && (
                  <CAlert color="danger" dismissible onClose={() => setError(null)}>
                    {error}
                  </CAlert>
                )}

                {success && (
                  <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                    {success}
                  </CAlert>
                )}

                <CRow className="g-4">
                  <CCol md={6}>
                    {/* Execution Mode */}
                    <div className="mb-3">
                      <CFormLabel className="fw-bold">Execution Mode</CFormLabel>
                      <div className="d-flex flex-column mt-1 gap-2">
                        <CFormCheck
                          type="radio"
                          name="mode"
                          id="mode-flow"
                          value="flow"
                          checked={mode === 'flow'}
                          onChange={(e) => {
                            setMode(e.target.value);
                            if (e.target.value === 'workflow') {
                              // Reset to single selection
                              if (selectedWorkflows.length > 1) {
                                setSelectedWorkflows([selectedWorkflows[0]]);
                              }
                            }
                          }}
                          label={
                            <>
                              <span className="fw-medium">Master Process</span> - Multiple workflows in sequence
                            </>
                          }
                        />
                        <CFormCheck
                          type="radio"
                          name="mode"
                          id="mode-workflow"
                          value="workflow"
                          checked={mode === 'workflow'}
                          onChange={(e) => {
                            setMode(e.target.value);
                            if (e.target.value === 'workflow') {
                              // Reset to single selection
                              if (selectedWorkflows.length > 1) {
                                setSelectedWorkflows([selectedWorkflows[0]]);
                              }
                            }
                          }}
                          label={
                            <>
                              <span className="fw-medium">Workflows</span> - Runs only one workflow
                            </>
                          }
                        />
                      </div>
                    </div>

                    {/* Process Name */}
                    <div className="mb-3">
                      <CFormLabel className="fw-bold">Process Name</CFormLabel>
                      <div className="input-group mt-1">
                        <CFormSelect
                          id="process-select"
                          value={preprocessId}
                          onChange={(e) => {
                            setPreprocessId(e.target.value);
                            populateFormWithProcess(e.target.value);
                          }}
                          className="process-select"
                        >
                          <option value="custom">Custom</option>
                          {processDef.map((process) => (
                            <option key={process.process_id} value={process.process_id}>
                              {process.name}
                            </option>
                          ))}
                        </CFormSelect>
                        <CFormInput
                          id="process-name"
                          name="process_name"
                          placeholder="Enter new process name"
                          value={processName}
                          onChange={(e) => setProcessName(e.target.value)}
                          required
                          readOnly={preprocessId !== 'custom'}
                        />
                      </div>
                      {mode === 'flow' && (
                        <CFormCheck
                          id="add-to-predefined"
                          name="save_as_predefined"
                          label="Add to Process"
                          checked={addToProcess}
                          onChange={(e) => setAddToProcess(e.target.checked)}
                          disabled={preprocessId !== 'custom'}
                          className="ms-2 mt-2"
                        />
                      )}
                    </div>

                    {/* Select Workflows */}
                    <div className="mb-3">
                      <CFormLabel className="fw-bold">Select Workflows</CFormLabel>
                      <div className="border rounded p-4 pb-0 overflow-auto mt-2" style={{ maxHeight: '400px' }}>
                        {mode === 'flow' && (
                          <div className="d-flex justify-content-between border-bottom mb-2 pb-2">
                            <h6 className="text-dark fw-semibold">Choose Your Spell🪄</h6>
                            <CFormCheck
                              id="select-all"
                              label="Select All"
                              checked={allSelected}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                            />
                          </div>
                        )}

                        {filteredWorkflows.length === 0 ? (
                          <div className="text-muted p-2">
                            No workflows available for this mode
                          </div>
                        ) : (
                          filteredWorkflows.map((workflow) => (
                            <CFormCheck
                              key={workflow.id || workflow.name}
                              id={`workflow_${workflow.id || workflow.name}`}
                              name="workflows[]"
                              value={workflow.name}
                              checked={selectedWorkflows.includes(workflow.name)}
                              onChange={() => handleWorkflowToggle(workflow.name)}
                              label={
                                <>
                                  {workflow.name}{' '}
                                  <CBadge color="primary" className="ms-1">
                                    {workflow.type?.toUpperCase()}
                                  </CBadge>
                                </>
                              }
                              className="mt-2"
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </CCol>

                  <CCol md={6}>
                    {/* Input Source */}
                    <div className="mb-3">
                      <CFormLabel className="fw-bold">Input Source</CFormLabel>
                      <CCard className="shadow-sm mt-2">
                        <CCardBody className="p-3">
                          <CFormSelect
                            name="input_source"
                            id="input-source"
                            value={inputSource}
                            onChange={(e) => setInputSource(e.target.value)}
                          >
                            <option value="csv">CSV Upload</option>
                            <option value="db">Database</option>
                          </CFormSelect>

                          {/* CSV Upload Section */}
                          {inputSource === 'csv' && (
                            <div className="mt-3 p-2 bg-white rounded">
                              <CFormLabel>Upload CSV File</CFormLabel>
                              <CFormInput
                                type="file"
                                name="csv_file"
                                accept=".csv"
                                id="csv-file-input"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                              />
                              <div className="form-text">
                                <small className="text-muted">
                                  Maximum file size: 500MB | Maximum rows: 600,000 | Files with 50,000+ rows will be
                                  processed in the background
                                </small>
                              </div>
                              {fileInfo && (
                                <CAlert
                                  color={fileInfo.warning ? 'warning' : 'info'}
                                  className="mt-2"
                                >
                                  <strong>File Analysis:</strong>
                                  <div>
                                    <strong>File:</strong> {fileInfo.name}
                                  </div>
                                  <div>
                                    <strong>Size:</strong> {fileInfo.size} MB
                                  </div>
                                  {fileInfo.warning && (
                                    <div className="text-danger">
                                      <strong>Warning:</strong> File size exceeds 500MB limit
                                    </div>
                                  )}
                                  {fileInfo.large && !fileInfo.warning && (
                                    <div className="text-warning">
                                      <strong>Note:</strong> Large file detected - will be processed in background
                                    </div>
                                  )}
                                </CAlert>
                              )}
                              {selectedWorkflows.length > 0 && inputSource === 'csv' && (
                                <div className="d-flex gap-2 mt-2">
                                  <CButton
                                    type="button"
                                    color="primary"
                                    variant="outline"
                                    size="sm"
                                    onClick={copyHeaders}
                                  >
                                    <CIcon icon={cilCopy} className="me-1" />
                                    Copy Headers
                                  </CButton>
                  <CButton 
                                    type="button"
                    color="secondary" 
                    variant="outline"
                                    size="sm"
                                    onClick={downloadHeaders}
                  >
                                    <CIcon icon={cilCloudDownload} className="me-1" />
                                    Download CSV
                  </CButton>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Database Base Section (AutoFlow) */}
                          {isAutoFlowSelected && (
                            <div className="mt-3">
                              <CFormLabel className="fw-bold">Database Base</CFormLabel>
                              <CRow className="g-3 mt-1">
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="base_input_db"
                                    id="baseInputDatabaseSelect"
                                    value={baseInputDb}
                                    onChange={(e) => handleBaseInputDbChange(e.target.value)}
                                    disabled={loadingDatabases}
                                  >
                                    <option value="">
                                      {loadingDatabases ? 'Loading databases...' : 'Select Database'}
                                    </option>
                                    {allowedDatabases.map((db) => (
                                      <option key={db} value={db}>
                                        {db.charAt(0).toUpperCase() + db.slice(1).replace(/_/g, ' ')}
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
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="base_input_table"
                                    id="baseInputTableSelect"
                                    value={baseInputTable}
                                    onChange={(e) => setBaseInputTable(e.target.value)}
                                    disabled={!baseInputDb || loadingBaseCollections}
                                  >
                                    <option value="">
                                      {loadingBaseCollections
                                        ? 'Loading collections...'
                                        : baseInputDb
                                        ? 'Select Collection'
                                        : 'Select Database first'}
                                    </option>
                                    {baseTables.map((table) => (
                                      <option key={table} value={table}>
                                        {table}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                  {loadingBaseCollections && (
                                    <div className="mt-1">
                                      <CSpinner size="sm" className="me-2" />
                                      <small className="text-muted">Loading collections...</small>
                                    </div>
                                  )}
                                </CCol>
                              </CRow>
                            </div>
                          )}

                          {/* Database Input Section */}
                          {inputSource === 'db' && (
                            <div className="mt-3">
                              <CFormLabel className="fw-bold">Database Source</CFormLabel>
                              <CRow className="g-3 mt-1">
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="input_db"
                                    id="inputDatabaseSelect"
                                    value={inputDb}
                                    onChange={(e) => handleInputDbChange(e.target.value)}
                                    disabled={loadingDatabases}
                                  >
                                    <option value="">
                                      {loadingDatabases ? 'Loading databases...' : 'Select Database'}
                                    </option>
                                    {allowedDatabases.map((db) => (
                                      <option key={db} value={db}>
                                        {db.charAt(0).toUpperCase() + db.slice(1).replace(/_/g, ' ')}
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
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="input_table"
                                    id="inputTableSelect"
                                    value={inputTable}
                                    onChange={(e) => setInputTable(e.target.value)}
                                    disabled={!inputDb || loadingInputCollections}
                                  >
                                    <option value="">
                                      {loadingInputCollections
                                        ? 'Loading collections...'
                                        : inputDb
                                        ? 'Select Collection'
                                        : 'Select Database first'}
                                    </option>
                                    {inputTables.map((table) => (
                                      <option key={table} value={table}>
                                        {table}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                  {loadingInputCollections && (
                                    <div className="mt-1">
                                      <CSpinner size="sm" className="me-2" />
                                      <small className="text-muted">Loading collections...</small>
                                    </div>
                                  )}
                                </CCol>
                              </CRow>
                            </div>
                          )}
                        </CCardBody>
                      </CCard>
                    </div>

                    {/* Output Format */}
                    <div className="mb-3">
                      <CFormLabel className="fw-bold">Output Format</CFormLabel>
                      <CCard className="shadow-sm mt-2">
                        <CCardBody className="p-3">
                          <CFormSelect
                            name="output_target"
                            id="output-target"
                            value={outputTarget}
                            onChange={(e) => setOutputTarget(e.target.value)}
                          >
                            <option value="csv">CSV File</option>
                            <option value="excel">Excel File</option>
                            <option value="db">Database</option>
                          </CFormSelect>

                          {/* Database Output Section */}
                          {outputTarget === 'db' && (
                            <div className="mt-3">
                              <CFormLabel className="fw-bold">Output Target</CFormLabel>
                              <CRow className="g-3 mt-1">
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="output_db"
                                    id="outputDatabaseSelect"
                                    value={outputDb}
                                    onChange={(e) => handleOutputDbChange(e.target.value)}
                                    disabled={loadingDatabases}
                                  >
                                    <option value="">
                                      {loadingDatabases ? 'Loading databases...' : 'Select Target Database'}
                                    </option>
                                    {allowedDatabases.map((db) => (
                                      <option key={db} value={db}>
                                        {db.charAt(0).toUpperCase() + db.slice(1).replace(/_/g, ' ')}
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
                                <CCol lg={6}>
                                  <CFormSelect
                                    name="output_table"
                                    id="outputTableSelect"
                                    value={outputTable}
                                    onChange={(e) => setOutputTable(e.target.value)}
                                    disabled={!outputDb || loadingOutputCollections}
                                  >
                                    <option value="">
                                      {loadingOutputCollections
                                        ? 'Loading collections...'
                                        : outputDb
                                        ? 'Select Target Collection'
                                        : 'Select Database first'}
                                    </option>
                                    {outputTables.map((table) => (
                                      <option key={table} value={table}>
                                        {table}
                                      </option>
                                    ))}
                                  </CFormSelect>
                                  {loadingOutputCollections && (
                                    <div className="mt-1">
                                      <CSpinner size="sm" className="me-2" />
                                      <small className="text-muted">Loading collections...</small>
                                    </div>
                                  )}
                                </CCol>
                              </CRow>
                            </div>
                          )}
                        </CCardBody>
                      </CCard>
                    </div>
                  </CCol>
                </CRow>

                <div className="d-flex justify-content-end mt-4 gap-3">
                  <CButton 
                    type="button"
                    color="primary"
                    variant="outline"
                    onClick={() => {
                      // Open Previous Results modal/view
                      navigate('/central/querychain/process-logs');
                    }}
                  >
                    <CIcon icon={cilHistory} className="me-2" />
                    Previous Results
                  </CButton>
                  <CButton type="submit" color="primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilMediaPlay} className="me-2" />
                        Start Process
                      </>
                    )}
                  </CButton>
                </div>
            </CCardBody>
          </CCard>
          </CForm>
        </CCol>
      </CRow>

      {/* ─── Active Process Progress Section ─── */}
      {showProgress && Object.keys(activeProcesses).length > 0 && (
        <CRow className="mt-3">
          <CCol xs={12}>
            <CCard className="shadow-sm border-0">
              <CCardHeader className="bg-dark text-white d-flex justify-content-between align-items-center">
                <h6 className="mb-0">
                  ⚡ Active Processes ({Object.keys(activeProcesses).length})
                </h6>
              </CCardHeader>
              <CCardBody className="p-3">
                {Object.entries(activeProcesses).map(([id, proc]) => (
                  <div
                    key={id}
                    className="mb-3 p-3 rounded"
                    style={{
                      background: proc.status === 'completed' ? '#d4edda'
                        : proc.status === 'failed' ? '#f8d7da'
                        : '#e8f4fd',
                      border: `1px solid ${proc.status === 'completed' ? '#c3e6cb'
                        : proc.status === 'failed' ? '#f5c6cb'
                        : '#bee5eb'}`
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>{getStatusIcon(proc.status)} {proc.processName}</strong>
                        <CBadge color="secondary" className="ms-2" size="sm">
                          {proc.processMode === 'workflow' ? 'Workflow' : 'Master Flow'}
                        </CBadge>
                        <small className="text-muted ms-2">ID: {id}</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <CBadge color={getStatusColor(proc.status)} className="px-3 py-1">
                          {proc.percentage.toFixed(0)}%
                        </CBadge>
                        {(proc.status === 'completed' || proc.status === 'failed') && (
                          <CButton
                            color="secondary"
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissProcess(id)}
                            title="Dismiss"
                          >
                            ✕
                          </CButton>
                        )}
                      </div>
                    </div>

                    <CProgress className="mb-2" style={{ height: '10px' }}>
                      <CProgressBar
                        value={proc.percentage}
                        color={getStatusColor(proc.status)}
                        animated={proc.status === 'processing' || proc.status === 'pending'}
                      />
                    </CProgress>

                    <div className="d-flex justify-content-between">
                      <small className="fw-medium">
                        {proc.status === 'completed'
                          ? '✅ All workflows completed successfully'
                          : proc.status === 'failed'
                          ? `❌ Failed: ${proc.errorMessage || 'Unknown error'}`
                          : proc.status === 'pending'
                          ? '⏳ Queued — waiting for worker to pick up...'
                          : proc.currentWorkflow
                          ? `Processing: ${proc.currentWorkflow} (${proc.workflowIndex}/${proc.workflowTotal})`
                          : 'Initializing...'}
                      </small>
                      {proc.status === 'processing' && (
                        <small className="text-muted">
                          <CSpinner size="sm" className="me-1" />
                          In progress
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </div>
  );
};

export default Masterflows;
