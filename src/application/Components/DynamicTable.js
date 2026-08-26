/**
 * DynamicTable Component - Enhanced with Advanced Features
 * Supports both simple mode (pass data directly) and advanced mode (fetch via API)
 * Merged from AdvancedTable.js to provide unified table component
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CAlert,
  CFormCheck,
  CFormInput,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CCol,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CCardBody,
  CBadge,
  CSpinner,
  CProgress,
  CProgressBar
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilTrash, cilFilter, cilReload, cilCalendar, cilX, cilPeople, cilLayers, cilShareAlt, cilCloudDownload, cilChevronLeft, cilChevronRight } from '@coreui/icons';
import TableHelper from '../../services/TableHelper';
import ExportService from '../../services/ExportService';
import AuthService from '../Services/AuthService';
import FilterSidebar from './FilterSidebar';
import styles from './DynamicTable.module.css';

const DynamicTable = ({ 
  // Simple mode props (for Developer module)
  data: propData = [], 
  onEdit, 
  onDelete,
  onView,
  onBulkDelete,
  emptyMessage = 'No data available',
  excludeColumns = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'actions', 'act', 'validate', 'value', 'selection', '_actionData'],
  // Pagination props (simple mode)
  totalRecords = 0,
  currentPage = 1,
  recordsPerPage = 50,
  onPageChange = () => {},
  
  // Advanced mode props (for Filters module)
  token,
  tableName,
  system = 'central',
  columns = {},
  custom = [],
  reqSet = {},
  onAction,
  initialFilters = {},
  apiEndpoint = '/api/skeleton-action',
  
  // Advanced mode: auto-fetch data
  autoFetch = false,

  // Selection callbacks
  enableSelection = false,
  enableBulkActions = false,
  onSelectionChange,
  onNeedToAction,
  onAudienceAction,
  onProductAction,
  onCellClick, // Function: (columnKey, cellValue, row) => void — makes cells clickable
  clickableColumns = [], // Array of column keys that should be clickable (e.g. ['li_company_name'])
  
  // Filter Sidebar Mode: 'fixed' (always visible) or 'collapsible' (toggleable)
  filterSidebarMode = 'collapsible',

  // Optional stats callback (advanced mode): { recordsTotal, recordsFiltered }
  onStatsChange
}) => {
  // State management
  const [data, setData] = useState(propData || []);
  const [columnsMeta, setColumnsMeta] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAllMode, setSelectAllMode] = useState(false); // Server-side select all flag
  const [excludedRows, setExcludedRows] = useState([]); // Rows excluded after select-all

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filterPills, setFilterPills] = useState([]);
  
  // Filter Sidebar State
  const isSidebarFixed = filterSidebarMode === 'fixed';
  const [isSidebarOpen, setIsSidebarOpen] = useState(isSidebarFixed);
  
  // Advanced mode state
  const [filters, setFilters] = useState({
    search: '',
    dateRange: {},
    columns: {},
    filterType: {},
    sort: {},
    pagination: { page: 1, limit: 25 }, // Default to 25 for better UX (was 10)
    export: {},
    processId: null,
    ...initialFilters
  });
  const [recordsTotal, setRecordsTotal] = useState(totalRecords);
  const [recordsFiltered, setRecordsFiltered] = useState(totalRecords);
  const [draw, setDraw] = useState(1);
  
  const tableRef = useRef(null);
  const rowMapRef = useRef(new Map());
  const searchInputRef = useRef(null);
  
  // Determine mode: advanced (has token and autoFetch) or simple (has data)
  const isAdvancedMode = !!(token && autoFetch);
  const isSimpleMode = !isAdvancedMode && (propData && propData.length > 0);

  // ── Select All helpers (placed AFTER filters/recordsFiltered are declared) ──
  const hasSelection = selectAllMode || selectedRows.length > 0;
  const effectiveSelectedCount = selectAllMode 
    ? Math.max(0, (recordsFiltered > 0 ? recordsFiltered : 0) - excludedRows.length) 
    : selectedRows.length;

  const buildActionPayload = () => {
    if (selectAllMode) {
      return {
        ids: [],
        rows: [],
        selectAll: true,
        excludedIds: excludedRows,
        filters: filters,
        totalCount: recordsFiltered || 0,
        meta: { token, tableName, system }
      };
    } else {
      const rows = selectedRows
        .map(id => rowMapRef.current.get(String(id)))
        .filter(Boolean);
      return {
        ids: selectedRows,
        rows,
        selectAll: false,
        meta: { token, tableName, system }
      };
    }
  };

  const clearSelection = () => {
    setSelectedRows([]);
    setSelectAllMode(false);
    setExcludedRows([]);
  };

  const handleNeedToActionClick = () => {
    if (typeof onNeedToAction === 'function' && hasSelection) {
      const payload = buildActionPayload();
      const maybePromise = onNeedToAction(payload);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.finally(() => clearSelection());
      } else {
        clearSelection();
      }
    }
  };
  const handleAudienceActionClick = () => {
    if (typeof onAudienceAction === 'function' && hasSelection) {
      const payload = buildActionPayload();
      const maybePromise = onAudienceAction(payload);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.finally(() => clearSelection());
      } else {
        clearSelection();
      }
    }
  };
  const handleProductActionClick = () => {
    if (typeof onProductAction === 'function' && hasSelection) {
      const payload = buildActionPayload();
      const maybePromise = onProductAction(payload);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.finally(() => clearSelection());
      } else {
        clearSelection();
      }
    }
  };

  const notifySelectionChange = useCallback(
    (rowIds) => {
      if (typeof onSelectionChange === 'function') {
        const rows = rowIds
          .map(id => rowMapRef.current.get(String(id)))
          .filter(Boolean);
        onSelectionChange(rowIds, rows);
      }
    },
    [onSelectionChange]
  );

  useEffect(() => {
    notifySelectionChange(selectedRows);
  }, [selectedRows, notifySelectionChange]);

  // Advanced mode: Fetch data from API
  const fetchData = useCallback(async (currentFilters, currentDraw) => {
    if (!isAdvancedMode) return;
    
    try {
      setLoading(true);
      setError(null);

      // Debug: Log filters before generating params
      console.log('📤 Frontend - Filters before generateParams:', {
        columns: Object.keys(currentFilters.columns || {}),
        filterType: currentFilters.filterType,
        search: currentFilters.search
      });

      const params = TableHelper.generateParams(columns, [], [], {
        ...reqSet,
        token: token,
        table: tableName,
        filters: currentFilters,
        draw: currentDraw
      });
      
      // Debug: Log params after generating
      console.log('📤 Frontend - Params.filters.FilterType:', params.filters?.FilterType);
      console.log('📤 Frontend - Sending skeleton_filters:', {
        hasFilterType: !!(params.filters?.FilterType),
        FilterType: params.filters?.FilterType,
        columnKeys: Object.keys(params.filters?.columns || {})
      });

      const authToken = AuthService.getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiEndpoint}/${token}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          skeleton_filters: params.filters,
          skeleton_view: 'table',
          draw: currentDraw
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          AuthService.logout();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.status) {
        throw new Error(result.message || 'Failed to fetch data');
      }

      // Process response
      let processedResponse;
      if (result.columns && Array.isArray(result.columns) && result.filters && result.reqSet) {
        processedResponse = result;
      } else if (result.data && Array.isArray(result.data) && result.recordsTotal !== undefined) {
        processedResponse = TableHelper.generateResponse(
          result,
          columns,
          custom,
          {
            ...reqSet,
            token: token,
            table: tableName,
            actions: reqSet.actions || 'cevd',
            act: reqSet.act || 'id'
          }
        );
      } else {
        processedResponse = {
          data: result.data || [],
          columns: result.columns || [],
          recordsTotal: result.recordsTotal || 0,
          recordsFiltered: result.recordsFiltered || 0,
          draw: result.draw || 1,
          filters: result.filters || { set_1: '', set_2: null, buttons: false, columns: [] },
          reqSet: result.reqSet || reqSet
        };
      }

      const processedData = processedResponse.data || [];
      setData(processedData);
      setColumnsMeta(processedResponse.columns || []);
      const nextTotal = processedResponse.recordsTotal || 0;
      const nextFiltered = processedResponse.recordsFiltered || 0;
      setRecordsTotal(nextTotal);
      setRecordsFiltered(nextFiltered);
      if (typeof onStatsChange === 'function') {
        onStatsChange({ recordsTotal: nextTotal, recordsFiltered: nextFiltered });
      }
      setDraw(processedResponse.draw || 1);

      // Store row map
      const map = new Map();
      processedData.forEach(row => {
        const key = String(row.id || row._id || row[reqSet.act] || '');
        if (key) {
          map.set(key, row);
        }
      });
      rowMapRef.current = map;

      // Update filter pills
      updateFilterPills(currentFilters);

    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token, tableName, columns, custom, reqSet, apiEndpoint, isAdvancedMode]);

  // Update filter pills
  const updateFilterPills = (currentFilters) => {
    const pills = [];

    if (currentFilters.search) {
      pills.push({
        type: 'search',
        label: `Search: ${currentFilters.search}`,
        onRemove: () => {
          setFilters(prev => ({ ...prev, search: '' }));
        }
      });
    }

    if (currentFilters.columns) {
      Object.keys(currentFilters.columns).forEach(col => {
        const filter = currentFilters.columns[col];
        const values = Array.isArray(filter.search?.value)
          ? filter.search.value
          : (filter.search?.value ? String(filter.search.value).split(',') : []);
        
        values.forEach(val => {
          if (val) {
            const colMeta = columnsMeta.find(c => c.data === col);
            pills.push({
              type: 'column',
              column: col,
              value: val,
              label: `${colMeta?.title || col}: ${val}`,
              onRemove: () => {
                setFilters(prev => {
                  const newColumns = { ...prev.columns };
                  const currentValues = Array.isArray(newColumns[col]?.search?.value)
                    ? newColumns[col].search.value
                    : (newColumns[col]?.search?.value ? String(newColumns[col].search.value).split(',') : []);
                  const newValues = currentValues.filter(v => String(v).trim() !== String(val).trim());
                  
                  if (newValues.length === 0) {
                    delete newColumns[col];
                  } else {
                    newColumns[col] = {
                      ...newColumns[col],
                      search: { value: newValues }
                    };
                  }
                  
                  return { ...prev, columns: newColumns };
                });
              }
            });
          }
        });
      });
    }

    if (currentFilters.dateRange) {
      Object.keys(currentFilters.dateRange).forEach(col => {
        if (col === 'column') return;
        const range = currentFilters.dateRange[col];
        if (range && range.from && range.to) {
          pills.push({
            type: 'dateRange',
            column: col,
            label: `Date: ${range.from} to ${range.to}`,
            onRemove: () => {
              setFilters(prev => {
                const newDateRange = { ...prev.dateRange };
                delete newDateRange[col];
                return { ...prev, dateRange: newDateRange };
              });
            }
          });
        }
      });
    }

    if (currentFilters.sort) {
      Object.keys(currentFilters.sort).forEach(col => {
        const colMeta = columnsMeta.find(c => c.data === col);
        pills.push({
          type: 'sort',
          column: col,
          direction: currentFilters.sort[col],
          label: `Sort ${colMeta?.title || col}: ${currentFilters.sort[col]}`,
          onRemove: () => {
            setFilters(prev => {
              const newSort = { ...prev.sort };
              delete newSort[col];
              return { ...prev, sort: newSort };
            });
          }
        });
      });
    }

    setFilterPills(pills);
  };

  // Track previous filters to prevent unnecessary fetches
  const prevFiltersRef = useRef('');
  
  // Advanced mode: Initial load
  useEffect(() => {
    if (isAdvancedMode) {
      fetchData(filters, draw);
      prevFiltersRef.current = JSON.stringify(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advanced mode: Reload when filters change (with debounce and comparison)
  useEffect(() => {
    if (isAdvancedMode) {
      const currentFiltersString = JSON.stringify(filters);
      
      // Only fetch if filters actually changed
      if (currentFiltersString !== prevFiltersRef.current) {
        prevFiltersRef.current = currentFiltersString;
        
       
        const timeoutId = setTimeout(() => {
          console.log('🔄 Fetching data with filters:', {
            columns: Object.keys(filters.columns || {}),
            filterType: filters.filterType,
            search: filters.search,
            hasDateRange: Object.keys(filters.dateRange || {}).filter(k => k !== 'column').length > 0
          });
          // CRITICAL: Only fetch data, do NOT remount table
          // fetchData updates state, which triggers re-render, NOT remount
          fetchData(filters, draw);
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isAdvancedMode]);

  // Simple mode: Update data when prop changes
  useEffect(() => {
    if (isSimpleMode && propData) {
      setData(propData);
      setRecordsTotal(totalRecords);
      setRecordsFiltered(totalRecords);
      const map = new Map();
      propData.forEach(row => {
        const rowId = row._id || row.id || row[reqSet.act] || row.id;
        if (rowId) {
          map.set(String(rowId), row);
        }
      });
      rowMapRef.current = map;
    }
  }, [propData, totalRecords, isSimpleMode]);

  // Handle search (advanced mode)
  const handleSearch = (value) => {
    setFilters(prev => ({
      ...prev,
      search: value,
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle column filter (advanced mode)
  const handleColumnFilter = (column, value, filterType = 'strict') => {
    setFilters(prev => {
      const newColumns = { ...prev.columns };
      const values = Array.isArray(value) ? value : (value ? String(value).split(',').map(v => v.trim()) : []);
      
      if (values.length > 0) {
        newColumns[column] = {
          search: { value: values }
        };
      } else {
        delete newColumns[column];
      }

      const newFilterType = { ...prev.filterType };
      if (values.length > 0) {
        newFilterType[column] = filterType;
      } else {
        delete newFilterType[column];
      }

      return {
        ...prev,
        columns: newColumns,
        filterType: newFilterType,
        pagination: { ...prev.pagination, page: 1 }
      };
    });
  };

  // Handle date range (advanced mode)
  const handleDateRange = (column, from, to) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [column]: { from, to },
        column: column
      },
      pagination: { ...prev.pagination, page: 1 }
    }));
    setShowDateRangeModal(false);
  };

  // Handle sort (advanced mode)
  const handleSort = (column, direction) => {
    setFilters(prev => ({
      ...prev,
      sort: { ...prev.sort, [column]: direction }
    }));
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (isAdvancedMode) {
      setFilters(prev => ({
        ...prev,
        pagination: { ...prev.pagination, page }
      }));
    } else {
      onPageChange(page);
    }
  };

  // Handle limit change (advanced mode)
  const handleLimitChange = (limit) => {
    setFilters(prev => ({
      ...prev,
      pagination: { ...prev.pagination, limit: parseInt(limit), page: 1 }
    }));
  };

  // Clear all filters (advanced mode)
  const clearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      dateRange: {},
      columns: {},
      filterType: {},
      sort: {},
      pagination: { page: 1, limit: 25 },
      export: {},
      processId: null
    });
    setSelectedRows([]);
  }, []);

  // Memoize the filters change handler to prevent infinite loops
  // CRITICAL FIX: Merge filters instead of replacing to preserve multiple column filters
  const handleFiltersChange = useCallback((newFilters) => {
    console.log('📥 DynamicTable - Received filters from FilterSidebar:', {
      columns: Object.keys(newFilters.columns || {}),
      filterType: newFilters.filterType,
      columnCount: Object.keys(newFilters.columns || {}).length,
      hasDateRange: Object.keys(newFilters.dateRange || {}).filter(k => k !== 'column').length > 0,
      search: newFilters.search
    });
    
    // CRITICAL: Merge new filters with existing filters to preserve multiple column filters
    // This ensures that when one filter changes, all other filters remain intact
    setFilters(prev => {
      // Smart merge: Only update columns that are explicitly provided in newFilters
      // If a column is not in newFilters.columns, keep the existing one from prev
      const mergedColumns = { ...prev.columns };
      const mergedFilterType = { ...prev.filterType };
      
      // Update columns from newFilters (this includes both additions and removals)
      if (newFilters.columns) {
        Object.keys(newFilters.columns).forEach(col => {
          const newColFilter = newFilters.columns[col];
          // If the new filter has empty values and no filterType, remove it
          const hasValues = Array.isArray(newColFilter?.search?.value)
            ? newColFilter.search.value.length > 0
            : (newColFilter?.search?.value && String(newColFilter.search.value).trim().length > 0);
          
          if (hasValues) {
            mergedColumns[col] = newColFilter;
          } else {
            // Remove column filter if no values, but check if filterType exists
            if (!newFilters.filterType?.[col] && !prev.filterType?.[col]) {
              delete mergedColumns[col];
            } else {
              // Keep empty filter structure if filterType exists
              mergedColumns[col] = { search: { value: [] } };
            }
          }
        });
        
        // Remove columns that were explicitly removed (not present in newFilters but were in prev)
        // Only if they're not in newFilters.columns at all
        Object.keys(prev.columns || {}).forEach(col => {
          if (!(col in newFilters.columns) && !newFilters.filterType?.[col] && !prev.filterType?.[col]) {
            // Column was removed - delete it
            delete mergedColumns[col];
          }
        });
      }
      
      // Merge filterType - CRITICAL: Preserve filterType even if values are empty
      // This allows users to set filterType before entering values
      if (newFilters.filterType) {
        // Merge new filterTypes into existing ones
        Object.keys(newFilters.filterType).forEach(col => {
          const newType = newFilters.filterType[col];
          if (newType && newType !== '') {
            mergedFilterType[col] = newType;
          }
        });
        
        // CRITICAL FIX: Don't remove filterType just because values are empty
        // Only remove filterType if it's explicitly not in newFilters and column is completely removed
        // This ensures filterType persists when user changes mode
        Object.keys(mergedFilterType).forEach(col => {
          // Only remove filterType if:
          // 1. Column is completely removed (not in mergedColumns)
          // 2. AND filterType is not in newFilters (user didn't set it)
          // 3. AND column is not in newFilters.columns at all
          if (!mergedColumns[col] && 
              !newFilters.filterType?.[col] && 
              !newFilters.columns?.[col]) {
            // Column and filterType were both removed
            delete mergedFilterType[col];
          }
          // Otherwise, keep the filterType even if values are empty
        });
      }
      
      console.log('🔄 DynamicTable - Merged filterType:', {
        prevFilterTypes: Object.keys(prev.filterType || {}),
        newFilterTypes: Object.keys(newFilters.filterType || {}),
        mergedFilterTypes: Object.keys(mergedFilterType),
        details: mergedFilterType
      });
      
      const merged = {
        search: newFilters.search !== undefined ? newFilters.search : prev.search,
        // Merge dateRange - preserve existing and update with new
        dateRange: newFilters.dateRange 
          ? { ...prev.dateRange, ...newFilters.dateRange }
          : prev.dateRange,
        columns: mergedColumns,
        filterType: mergedFilterType,
        sort: newFilters.sort ? { ...prev.sort, ...newFilters.sort } : prev.sort,
        pagination: newFilters.pagination || prev.pagination || { page: 1, limit: 25 },
        export: newFilters.export ? { ...prev.export, ...newFilters.export } : prev.export,
        processId: newFilters.processId !== undefined ? newFilters.processId : prev.processId
      };
      
      console.log('🔄 DynamicTable - Merged filters:', {
        prevColumns: Object.keys(prev.columns || {}),
        newColumns: Object.keys(newFilters.columns || {}),
        mergedColumns: Object.keys(merged.columns || {}),
        mergedColumnCount: Object.keys(merged.columns || {}).length,
        prevFilterTypes: Object.keys(prev.filterType || {}),
        mergedFilterTypes: Object.keys(merged.filterType || {})
      });
      
      return merged;
    });
  }, []);

  // Handle row selection
  const handleRowSelect = (rowId, checked, rowData) => {
    if (rowId) {
      const key = String(rowId);
      if (rowData) {
        rowMapRef.current.set(key, rowData);
      } else if (!rowMapRef.current.has(key)) {
        const fallbackRow = data.find(r => {
          const candidate = r[reqSet.act] || r.id || r._id || r._id?.toString();
          return String(candidate) === key;
        });
        if (fallbackRow) {
          rowMapRef.current.set(key, fallbackRow);
        }
      }
    }

    if (selectAllMode) {
      // In selectAllMode: unchecking adds to excludedRows, checking removes from excludedRows
      if (!checked) {
        setExcludedRows(prev => {
          const next = [...prev, String(rowId)];
          return Array.from(new Set(next));
        });
      } else {
        setExcludedRows(prev => prev.filter(id => String(id) !== String(rowId)));
      }
    } else {
      // Normal mode: individual selection
      if (checked) {
        setSelectedRows(prev => {
          const next = [...prev, String(rowId)];
          return Array.from(new Set(next));
        });
      } else {
        setSelectedRows(prev => prev.filter(id => String(id) !== String(rowId)));
      }
    }
  };

  // Use server-side select all when: (1) more than 500 total, or (2) more than one page (so we don't only select current page)
  const SELECT_ALL_CLIENT_THRESHOLD = 500;

  // Handle select all - INSTANT for large datasets (server-side query descriptor)
  const handleSelectAll = async (checked) => {
    if (checked) {
      if (isAdvancedMode) {
        const totalRecords = recordsFiltered || 0;
        const currentPageSize = data?.length || 0;
        const hasMultiplePages = totalRecords > currentPageSize;

        if (totalRecords > SELECT_ALL_CLIENT_THRESHOLD || hasMultiplePages) {
          // Server-side select all: backend resolves records from filters (no "only 25" bug)
          setSelectAllMode(true);
          setExcludedRows([]);
          setSelectedRows([]);
          console.log(`✅ Select All (server-side): ${totalRecords} records selected via filter query`);
        } else {
          // Single page and small dataset: client-side selection
          setSelectAllMode(false);
          setExcludedRows([]);
          const rowIds = data.map(row => {
            const rowId = row[reqSet.act] || row.id || row._id;
            if (rowId) {
              rowMapRef.current.set(String(rowId), row);
            }
            return rowId ? String(rowId) : null;
          }).filter(Boolean);
          setSelectedRows(rowIds);
          console.log(`✅ Select All (client-side): ${rowIds.length} records selected`);
        }
      } else {
        // Simple mode: select all current page
        setSelectAllMode(false);
        const rowIds = data.map(row => row._id || row.id).filter(Boolean);
        setSelectedRows(rowIds);
      }
    } else {
      // Deselect all
      clearSelection();
    }
  };

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one row to delete');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedRows.length} record(s)?`)) {
      if (onBulkDelete) {
        onBulkDelete(selectedRows);
        setSelectedRows([]);
      } else if (onDelete) {
        selectedRows.forEach(id => {
          const row = data.find(r => (r._id || r.id) === id);
          if (row) onDelete(row);
        });
        setSelectedRows([]);
      }
    }
  };

  // Render cell content
  const renderCell = (value, renderHtml = false) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">—</span>;
    }

    const content = (() => {
      if (renderHtml && typeof value === 'string' && value.includes('<')) {
        return <span dangerouslySetInnerHTML={{ __html: value }} />;
      }

      if (typeof value === 'boolean') {
        return value ? 
          <span className="badge bg-success">Yes</span> : 
          <span className="badge bg-secondary">No</span>;
      }

      return String(value);
    })();

    return <div className={styles.cellContent} title={typeof value === 'string' ? value.replace(/<[^>]*>/g, '') : String(value)}>{content}</div>;
  };

  // Format column header
  const formatHeader = (str) => {
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get columns (simple mode) or use columnsMeta (advanced mode)
  const getColumns = () => {
    if (isAdvancedMode && columnsMeta.length > 0) {
      return columnsMeta
        .filter(col => col.visible !== false && col.data !== 'selection' && col.data !== 'actions')
        .map(col => ({
          key: col.data,
          title: col.title,
          orderable: col.orderable,
          renderHtml: col.renderHtml
        }));
    } else if (isSimpleMode && data.length > 0) {
      return Object.keys(data[0])
        .filter(col => !excludeColumns.includes(col))
        .map(col => ({
          key: col,
          title: formatHeader(col),
          orderable: false,
          renderHtml: false
        }));
    }
    return [];
  };

  const tableColumns = getColumns();
  const hasSelectableRows = !!(
    enableSelection ||
    onNeedToAction ||
    onBulkDelete ||
    onDelete ||
    (isAdvancedMode && reqSet.actions?.includes('c'))
  );
  const hasActions = !!(onView || onEdit || onDelete || (isAdvancedMode && reqSet.actions && (reqSet.actions.includes('e') || reqSet.actions.includes('v') || reqSet.actions.includes('d'))));

  // Calculate pagination
  // SAFETY: If recordsFiltered is -1 (count timed out), fall back to data length for display
  const effectiveRecordsPerPage = isAdvancedMode ? filters.pagination.limit : recordsPerPage;
  const effectiveCurrentPage = isAdvancedMode ? filters.pagination.page : currentPage;
  const countUnknown = isAdvancedMode && recordsFiltered === -1;
  const effectiveTotalRecords = countUnknown ? data.length : (isAdvancedMode ? recordsFiltered : totalRecords);
  const totalPages = countUnknown ? effectiveCurrentPage + 1 : Math.ceil(effectiveTotalRecords / effectiveRecordsPerPage);
  const startRecord = (effectiveCurrentPage - 1) * effectiveRecordsPerPage + 1;
  const endRecord = countUnknown ? (startRecord + data.length - 1) : Math.min(effectiveCurrentPage * effectiveRecordsPerPage, effectiveTotalRecords);

  // Generate pagination items
  const generatePaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    
    items.push(
      <CPaginationItem 
        key="prev" 
        disabled={effectiveCurrentPage === 1}
        onClick={() => effectiveCurrentPage > 1 && handlePageChange(effectiveCurrentPage - 1)}
      >
        Previous
      </CPaginationItem>
    );

    let startPage = Math.max(1, effectiveCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <CPaginationItem key={1} onClick={() => handlePageChange(1)}>
          1
        </CPaginationItem>
      );
      if (startPage > 2) {
        items.push(<CPaginationItem key="ellipsis1" disabled>...</CPaginationItem>);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      items.push(
        <CPaginationItem 
          key={page} 
          active={page === effectiveCurrentPage}
          onClick={() => handlePageChange(page)}
        >
          {page}
        </CPaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<CPaginationItem key="ellipsis2" disabled>...</CPaginationItem>);
      }
      items.push(
        <CPaginationItem key={totalPages} onClick={() => handlePageChange(totalPages)}>
          {totalPages}
        </CPaginationItem>
      );
    }

    items.push(
      <CPaginationItem 
        key="next" 
        disabled={effectiveCurrentPage === totalPages}
        onClick={() => effectiveCurrentPage < totalPages && handlePageChange(effectiveCurrentPage + 1)}
      >
        Next
      </CPaginationItem>
    );

    return items;
  };

  // Handle action clicks
  const handleActionClick = (actionType, row) => {
    if (isAdvancedMode && onAction) {
      onAction(actionType, row);
    } else {
      if (actionType === 'view' && onView) onView(row);
      if (actionType === 'edit' && onEdit) onEdit(row);
      if (actionType === 'delete' && onDelete) onDelete(row);
    }
  };

  // Loading state
  if (loading && isAdvancedMode) {
  return (
      <div className="text-center p-5">
        <CSpinner />
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error:</strong> {error}
      </CAlert>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <CAlert color="info" className="text-center">
        {emptyMessage}
      </CAlert>
    );
  }

  return (
    <div className="skeleton-view-container">
      {/* Advanced Mode: Filter Sidebar + Table Layout */}
      {isAdvancedMode && (
        <div className="d-flex" style={{ gap: '16px', alignItems: 'flex-start' }}>
          {/* Filter Sidebar */}
          {isSidebarOpen && (
            <FilterSidebar
              columns={columnsMeta}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              token={token}
              onClearAll={clearAllFilters}
              activeFilterCount={filterPills.length}
            />
          )}
          
          {/* Main Content Area */}
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <>
          <div
            className="row data-table py-2 px-2"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color-translucent)',
              borderRadius: '8px'
            }}
          >
            <div className="col-sm-12 col-md-6 d-flex align-items-center gap-3 flex-wrap">
              {/* Select All Checkbox - Universal (all pages) */}
              <div className="universal-select-all-container ms-2 me-3 d-flex align-items-center">
                <CFormCheck
                  id={`universal-select-all-${token}`}
                  checked={selectAllMode || (selectedRows.length > 0 && (selectedRows.length === recordsFiltered || selectedRows.length === data.length))}
                  indeterminate={!selectAllMode && selectedRows.length > 0 && selectedRows.length < data.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="form-check-input skl-checkbox"
                />
                <label htmlFor={`universal-select-all-${token}`} className="ms-1 text-nowrap">
                  {selectAllMode 
                    ? `All ${((recordsFiltered > 0 ? recordsFiltered : 0) - excludedRows.length).toLocaleString()} selected`
                    : `Select All ${isAdvancedMode && recordsFiltered > 0 ? `(${recordsFiltered.toLocaleString()} records)` : ''}`
                  }
                </label>
              </div>
              
              {/* Showing Dropdown */}
              <div className="dt-length d-flex align-items-center">
                <span className="me-2">Showing</span>
                <CFormSelect
                  size="sm"
                  value={filters.pagination.limit}
                  onChange={(e) => handleLimitChange(e.target.value)}
                  style={{ width: '90px' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </CFormSelect>
              </div>
              
              {/* Info Text */}
              <div className="dt-info">
                Showing {startRecord} to {endRecord} {countUnknown ? 'records' : `of ${recordsFiltered.toLocaleString()} records`}
                {!countUnknown && recordsTotal !== recordsFiltered && recordsTotal > 0 && (
                  <span className="text-muted"> (filtered from {recordsTotal.toLocaleString()} total records)</span>
                )}
              </div>
            </div>
            
            <div className="col-sm-12 col-md-6 d-flex justify-content-end align-items-center flex-wrap gap-2">
              {/* Action Icons */}
              {hasSelection && (
                <div className="action-icons me-2 d-flex gap-2 flex-wrap">
                  {typeof onAudienceAction === 'function' && (
                    <CButton
                      color="info"
                      variant="outline"
                      size="sm"
                      onClick={handleAudienceActionClick}
                      title="Add to Audience"
                    >
                      <CIcon icon={cilPeople} className="me-1" />
                      Audience
                    </CButton>
                  )}
                  {typeof onProductAction === 'function' && (
                    <CButton
                      color="warning"
                      variant="outline"
                      size="sm"
                      onClick={handleProductActionClick}
                      title="Add to Product"
                    >
                      <CIcon icon={cilLayers} className="me-1" />
                      Product
                    </CButton>
                  )}
                  {typeof onNeedToAction === 'function' && (
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      onClick={handleNeedToActionClick}
                      title="Move to Need-To-Action"
                    >
                      <CIcon icon={cilShareAlt} className="me-1" />
                      Need To Action
                    </CButton>
                  )}
                  {(onBulkDelete || onDelete) && (
          <CButton
            color="danger"
                      variant="outline"
            size="sm"
                      className="skeleton-delete-selected"
            onClick={handleBulkDeleteClick}
                      title="Delete Selected"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  )}
                  {/* Export Button for Selected Rows */}
                  <CButton
                    color="success"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExportModal(true)}
                    title="Export Selected"
                  >
                    <CIcon icon={cilCloudDownload} className="me-1" />
                    Export
          </CButton>
        </div>
      )}

              {/* Search and Filter Buttons */}
              <div className="d-flex flex-row align-items-end gap-2">
                <CFormInput
                  ref={searchInputRef}
                  type="search"
                  className="skl-filter-search"
                  placeholder="Search..."
                  value={filters.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  style={{ minWidth: '180px' }}
                />
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="skl-refresh-btn"
                  type="button"
                  onClick={() => fetchData(filters, draw)}
                  title="Refresh Table"
                >
                  <CIcon icon={cilReload} />
                </CButton>
                <CButton
                  color="secondary"
                  variant={filters.dateRange && Object.keys(filters.dateRange).filter(k => k !== 'column').length > 0 ? 'solid' : 'outline'}
                  size="sm"
                  className="skl-date-range-btn"
                  type="button"
                  onClick={() => setShowDateRangeModal(true)}
                  title="Date Range Filter"
                >
                  <CIcon icon={cilCalendar} />
                </CButton>
                {!isSidebarFixed && (
                  <CButton
                    color="secondary"
                    variant={isSidebarOpen ? 'solid' : 'outline'}
                    size="sm"
                    className="skl-filter-btn"
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title="Toggle Filter Sidebar"
                  >
                    <CIcon icon={cilFilter} />
                  </CButton>
                )}
              </div>
            </div>
          </div>

          {/* Filter Pills Row - Matching bv project */}
          <div className={`row filters-row-${token} mt-2`}>
            <div className="col-md-12 d-flex justify-content-between align-items-center">
              <div className={`filters-pill-container-${token} d-flex flex-wrap my-1`} style={{ display: filterPills.length > 0 ? 'flex' : 'none' }}>
                {filterPills.map((pill, index) => (
                  <span
                    key={index}
                    className="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill"
                  >
                    {pill.label}
                    <button
                      type="button"
                      className="btn-close btn-close-sm ms-2 skeleton-pill-btn"
                      onClick={pill.onRemove}
                      aria-label="Remove filter"
                    ></button>
                  </span>
                ))}
              </div>
              <CButton
                color="danger"
                variant="ghost"
                className={`d-none rounded-pill text-decoration-none sf-12 skeleton-clear-all-${token}`}
                onClick={clearAllFilters}
                title="Clear All Filters"
                style={{ display: filterPills.length > 0 ? 'inline-block' : 'none' }}
                size="sm"
              >
                Clear all filters
              </CButton>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive" ref={tableRef} style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <CTable hover striped bordered className="table table-sm table-bordered table-striped table-hover w-100">
          <CTableHead>
            <CTableRow>
              {hasSelectableRows && (
                <CTableHeaderCell style={{ width: '40px' }}>
                  <CFormCheck
                        checked={selectedRows.length > 0 && (selectedRows.length === recordsFiltered || selectedRows.length === data.length)}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </CTableHeaderCell>
              )}
                  {tableColumns.map(col => (
                    <CTableHeaderCell
                      key={col.key}
                      className="thead-primary"
                      style={{ cursor: col.orderable ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (col.orderable && isAdvancedMode) {
                          const currentSort = filters.sort[col.key];
                          const newDirection = currentSort === 'asc' ? 'desc' : 'asc';
                          handleSort(col.key, newDirection);
                        }
                      }}
                    >
                      {col.title}
                      {isAdvancedMode && col.orderable && filters.sort[col.key] && (
                        <span className="ms-1">
                          {filters.sort[col.key] === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                </CTableHeaderCell>
              ))}
              {hasActions && (
                    <CTableHeaderCell className="text-center thead-primary" style={{ width: '150px' }}>
                  Actions
                </CTableHeaderCell>
              )}
            </CTableRow>
          </CTableHead>
          <CTableBody>
                {data.map((row, index) => {
                  const rowId = isAdvancedMode 
                    ? (row[reqSet.act] || row.id || row._id || index)
                    : (row._id || row.id || index);
                  return (
                    <CTableRow key={rowId}>
                {hasSelectableRows && (
                  <CTableDataCell>
                    <CFormCheck
                            checked={selectAllMode ? !excludedRows.includes(String(rowId)) : selectedRows.includes(rowId)}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked, row)}
                    />
                  </CTableDataCell>
                )}
                      {tableColumns.map(col => {
                        const isClickable = onCellClick && clickableColumns.includes(col.key) && row[col.key];
                        return (
                        <CTableDataCell
                          key={col.key}
                          onClick={() => isClickable && onCellClick(col.key, row[col.key], row)}
                          style={isClickable ? { cursor: 'pointer' } : {}}
                        >
                          {isClickable ? (
                            <span style={{ color: 'var(--cui-link-color, #0d6efd)', textDecoration: 'underline' }}>
                              {renderCell(row[col.key], col.renderHtml)}
                            </span>
                          ) : (
                            renderCell(row[col.key], col.renderHtml)
                          )}
                  </CTableDataCell>
                        );
                      })}
                {hasActions && (
                  <CTableDataCell className="text-center">
                          <div className="table-actions-group">
                            {(isAdvancedMode ? reqSet.actions?.includes('v') : onView) && (
                              <button
                                type="button"
                                className="view"
                                onClick={() => handleActionClick('view', row)}
                          title="View"
                        >
                                <i className="fa fa-eye"></i>
                              </button>
                            )}
                            {(isAdvancedMode ? reqSet.actions?.includes('e') : onEdit) && (
                              <button
                                type="button"
                                className="edit"
                                onClick={() => handleActionClick('edit', row)}
                          title="Edit"
                        >
                                <i className="fa fa-edit"></i>
                              </button>
                            )}
                            {(isAdvancedMode ? reqSet.actions?.includes('d') : onDelete) && (
                              <button
                                type="button"
                                className="delete"
                                onClick={() => handleActionClick('delete', row)}
                          title="Delete"
                        >
                                <i className="fa fa-trash"></i>
                              </button>
                      )}
                          </div>
                  </CTableDataCell>
                )}
              </CTableRow>
                  );
                })}
              </CTableBody>
            </CTable>
          </div>

          {/* Pagination */}
          {effectiveTotalRecords > 0 && (
            <div className={`${styles.paginationContainer || ''} mt-3`}>
              <CRow className="align-items-center">
                <CCol md={6}>
                  <div className="dt-info">
                    Showing {startRecord} to {endRecord} {countUnknown ? 'entries' : `of ${effectiveTotalRecords.toLocaleString()} entries`}
                    {!countUnknown && isAdvancedMode && recordsTotal !== recordsFiltered && recordsTotal > 0 && (
                      <span className="text-muted"> (Total: {recordsTotal.toLocaleString()})</span>
                    )}
                  </div>
                </CCol>
                <CCol md={6} className="d-flex justify-content-end align-items-center gap-2">
                  {isAdvancedMode && (
                    <CFormSelect
                      size="sm"
                      value={filters.pagination.limit}
                      onChange={(e) => handleLimitChange(e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </CFormSelect>
                  )}
                  {totalPages > 1 && (
                    <CPagination className="mb-0">
                      {generatePaginationItems()}
                    </CPagination>
                  )}
                </CCol>
              </CRow>
            </div>
          )}
        </>
          </div>
        </div>
      )}

      {/* Simple Mode: No sidebar */}
      {!isAdvancedMode && (
        <>
          {/* Simple Mode: Bulk delete button */}
          {hasSelectableRows && selectedRows.length > 0 && (
            <div className="mb-3 d-flex gap-2 flex-wrap">
              {typeof onAudienceAction === 'function' && (
                <CButton color="info" size="sm" onClick={handleAudienceActionClick}>
                  <i className="fa fa-users me-1"></i>
                  Audience ({selectedRows.length})
                </CButton>
              )}
              {typeof onProductAction === 'function' && (
                <CButton color="warning" size="sm" onClick={handleProductActionClick}>
                  <i className="fa fa-box me-1"></i>
                  Add to Product ({selectedRows.length})
                </CButton>
              )}
              {typeof onNeedToAction === 'function' && (
                <CButton color="primary" size="sm" onClick={handleNeedToActionClick}>
                  <i className="fa fa-share-square me-1"></i>
                  Need To Action ({selectedRows.length})
                </CButton>
              )}
              {(onBulkDelete || onDelete) && (
                <CButton color="danger" size="sm" onClick={handleBulkDeleteClick}>
                  <CIcon icon={cilTrash} className="me-1" />
                  Delete Selected ({selectedRows.length})
                </CButton>
              )}
            </div>
          )}

          {/* Table */}
          <div className="table-responsive" ref={tableRef} style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <CTable hover striped bordered className="table table-sm table-bordered table-striped table-hover w-100">
              <CTableHead>
                <CTableRow>
                  {hasSelectableRows && (
                    <CTableHeaderCell style={{ width: '40px' }}>
                      <CFormCheck
                        checked={selectedRows.length > 0 && selectedRows.length === data.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </CTableHeaderCell>
                  )}
                  {tableColumns.map(col => (
                    <CTableHeaderCell key={col.key} className="thead-primary">
                      {col.title}
                    </CTableHeaderCell>
                  ))}
                  {hasActions && (
                    <CTableHeaderCell className="text-center thead-primary" style={{ width: '150px' }}>
                      Actions
                    </CTableHeaderCell>
                  )}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {data.map((row, index) => {
                  const rowId = row._id || row.id || index;
                  return (
                    <CTableRow key={rowId}>
                      {hasSelectableRows && (
                        <CTableDataCell>
                          <CFormCheck
                            checked={selectedRows.includes(rowId)}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked, row)}
                          />
                        </CTableDataCell>
                      )}
                      {tableColumns.map(col => (
                        <CTableDataCell key={col.key}>
                          {renderCell(row[col.key], col.renderHtml)}
                        </CTableDataCell>
                      ))}
                      {hasActions && (
                        <CTableDataCell className="text-center">
                          <div className="table-actions-group">
                            {onView && (
                              <button type="button" className="view" onClick={() => handleActionClick('view', row)} title="View">
                                <i className="fa fa-eye"></i>
                              </button>
                            )}
                            {onEdit && (
                              <button type="button" className="edit" onClick={() => handleActionClick('edit', row)} title="Edit">
                                <i className="fa fa-edit"></i>
                              </button>
                            )}
                            {onDelete && (
                              <button type="button" className="delete" onClick={() => handleActionClick('delete', row)} title="Delete">
                                <i className="fa fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </CTableDataCell>
                      )}
                    </CTableRow>
                  );
                })}
          </CTableBody>
        </CTable>
      </div>

          {/* Pagination */}
          {effectiveTotalRecords > 0 && (
            <div className={`${styles.paginationContainer || ''} mt-3`}>
              <CRow className="align-items-center">
                <CCol md={6}>
                  <div className="dt-info">
                    Showing {startRecord} to {endRecord} {countUnknown ? 'entries' : `of ${effectiveTotalRecords.toLocaleString()} entries`}
                  </div>
                </CCol>
                <CCol md={6} className="d-flex justify-content-end align-items-center gap-2">
                  {totalPages > 1 && (
                    <CPagination className="mb-0">
                      {generatePaginationItems()}
                    </CPagination>
                  )}
                </CCol>
              </CRow>
            </div>
          )}
        </>
      )}

      {/* Filter Modal (Advanced Mode) - Keep for collapsible mode or as fallback */}
      {isAdvancedMode && !isSidebarFixed && (
        <FilterModal
          show={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          columns={columnsMeta}
          filters={filters}
          token={token}
          onApply={(newFilters) => {
            console.log('📥 DynamicTable - Received filters from FilterModal:', {
              columns: Object.keys(newFilters.columns || {}),
              filterType: newFilters.filterType,
              filterTypeEntries: Object.entries(newFilters.filterType || {})
            });
            
            // Handle export if enabled
            if (newFilters.export?.export && newFilters.export?.action) {
              const exportColumns = newFilters.export?.columns || columnsMeta
                .filter(col => col.data !== 'selection' && col.data !== 'actions')
                .map(col => col.data);
              
              // Export current filtered data
              switch (newFilters.export.action) {
                case 'csv':
                  ExportService.exportToCSV(data, columnsMeta, `export_${Date.now()}.csv`);
                  break;
                case 'excel':
                  ExportService.exportToExcel(data, columnsMeta, `export_${Date.now()}.xlsx`);
                  break;
                case 'pdf':
                  ExportService.exportToPDF(data, columnsMeta, `export_${Date.now()}.pdf`);
                  break;
              }
              
              // Reset export action after export
              newFilters.export = { ...newFilters.export, action: null };
            }
            
            // CRITICAL: Ensure filterType is always an object and is preserved
            if (!newFilters.filterType || typeof newFilters.filterType !== 'object') {
              newFilters.filterType = {};
            }
            
            console.log('📥 DynamicTable - Setting filters with filterType:', newFilters.filterType);
            
            setFilters(newFilters);
            setShowFilterModal(false);
          }}
        />
      )}

      {/* Date Range Modal (Advanced Mode) */}
      {isAdvancedMode && (
        <DateRangeModal
          show={showDateRangeModal}
          onClose={() => setShowDateRangeModal(false)}
          onApply={handleDateRange}
          currentRange={filters.dateRange}
          token={token}
        />
      )}

      {/* Export Modal (Advanced Mode) */}
      {isAdvancedMode && (
        <ExportModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          data={selectedRows.length > 0 && !selectAllMode ? data.filter(row => {
            const rowId = row[reqSet.act] || row.id || row._id;
            return selectedRows.includes(String(rowId));
          }) : data}
          columns={columnsMeta}
          token={token}
          apiEndpoint={apiEndpoint}
          selectAllMode={selectAllMode}
          recordsFiltered={recordsFiltered}
          excludedRows={excludedRows}
          filters={filters}
          reqSet={reqSet}
        />
      )}
    </div>
  );
};

// Filter Modal Component - Matching bv project exactly
const FilterModal = ({ show, onClose, columns, filters, onApply, token }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [dateRangeValue, setDateRangeValue] = useState('');

  useEffect(() => {
    // Deep clone filters to avoid reference issues and ensure filterType is always an object
    setLocalFilters({
      search: filters.search || '',
      dateRange: filters.dateRange || {},
      columns: filters.columns ? { ...filters.columns } : {},
      filterType: filters.filterType ? { ...filters.filterType } : {},
      sort: filters.sort || {},
      pagination: filters.pagination || { page: 1, limit: 10 },
      export: filters.export || {}
    });
    // Restore date range if exists
    if (filters.dateRange && Object.keys(filters.dateRange).length > 0) {
      const dateKey = Object.keys(filters.dateRange).find(k => k !== 'column');
      if (dateKey && filters.dateRange[dateKey]) {
        const { from, to } = filters.dateRange[dateKey];
        if (from && to) {
          setDateRangeValue(`${from} - ${to}`);
        }
      }
    }
  }, [filters, show]);

  const handleColumnFilter = (column, value, filterType) => {
    setLocalFilters(prev => {
      const newColumns = { ...prev.columns };
      const newFilterType = { ...(prev.filterType || {}) };
      let values = [];
      
      if (Array.isArray(value)) {
        values = value.filter(v => v && String(v).trim());
      } else if (value) {
        values = String(value).split(',').map(v => v.trim()).filter(v => v);
      }
      
      // CRITICAL: Always update filterType if provided, regardless of values
      // This ensures the filter type dropdown selection is preserved
      if (filterType && filterType !== '') {
        newFilterType[column] = filterType;
        console.log(`🔧 FilterModal - Updating filterType for ${column}:`, filterType);
      }
      
      // Update columns if there are values
      if (values.length > 0) {
        newColumns[column] = {
          search: { value: values }
        };
      } else {
        // If no values but filterType exists, keep empty structure
        if (newFilterType[column]) {
          newColumns[column] = {
            search: { value: [] }
          };
        } else {
          // Only delete if no filterType and no values
          delete newColumns[column];
        }
      }

      // Only delete filterType if explicitly removed (not just empty values)
      // Don't delete filterType when values are empty - user might add values later

      const updated = {
        ...prev,
        columns: newColumns,
        filterType: newFilterType
      };
      
      console.log(`🔧 FilterModal - Updated localFilters for ${column}:`, {
        filterType: newFilterType[column],
        hasValues: values.length > 0,
        values: values
      });
      
      return updated;
    });
  };

  return (
    <CModal visible={show} onClose={onClose} size="xl" className="skeleton-modal">
      <CModalHeader className="skeleton-modal-header">
        <div className="skeleton-mdl-hdr-lbl-grp">
          <CModalTitle className="skeleton-modal-label m-0">
            <i className="fa-regular fa-folder me-1"></i>Filters & Export
          </CModalTitle>
        </div>
        <div className="skeleton-mdl-hdr-btn-grp">
          <button type="button" onClick={onClose} aria-label="Close">
            <i className="fa fa-times"></i>
          </button>
        </div>
      </CModalHeader>
      <CModalBody className="py-1">
        <div className="container-fluid p-0">
          <div className="row">
            {/* Left Side - Filters */}
            <div className="col-md-7 border-end pe-3">
              <div className="card shadow-none p-2 mb-3" style={{ backgroundColor: '#1db4cd', color: '#fff' }}>
                <div className="d-flex flex-row justify-content-between align-items-center mb-1 p-1">
                  <span className="sf-13 fw-bold text-white">
                    <i className="fa-duotone fa-solid fa-bars-filter me-2"></i>Filters
                  </span>
                </div>
              </div>
              
              <div className="card p-3 mb-3 shadow-none border border-1 rounded">
                <div className="row g-3 align-items-center">
                  <div className="col-md-12">
                    <label htmlFor={`date-range-${token}`} className="form-label fw-semibold">Date Range</label>
                    <CFormInput
                      type="text"
                      className="form-control date-range-picker"
                      id={`date-range-${token}`}
                      placeholder="Select date range"
                      value={dateRangeValue}
                      onChange={(e) => setDateRangeValue(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                <table className="table table-sm table-bordered filter-config-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th width="30%">Column</th>
                      <th width="25%">Filter Type</th>
                      <th width="45%">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns
                      .filter(col => col.data !== 'selection' && col.data !== 'actions' && !col.isDate)
                      .map(col => (
                        <tr key={col.data} className={`filter-row-${col.data} col-toggle-${col.data}`}>
                          <td>
                            <label className="fw-semibold sf-15">{col.title}</label>
                          </td>
                          <td>
                            <CFormSelect
                              size="sm"
                              className={`form-select form-select-sm adt-filter-${token}`}
                              value={localFilters.filterType?.[col.data] || 'strict'}
                              onChange={(e) => {
                                const filterType = e.target.value;
                                console.log(`🔧 FilterModal - Filter type changed for ${col.data}:`, filterType);
                                // Get current values or empty array
                                const currentValues = Array.isArray(localFilters.columns?.[col.data]?.search?.value)
                                  ? localFilters.columns[col.data].search.value
                                  : (localFilters.columns?.[col.data]?.search?.value 
                                      ? String(localFilters.columns[col.data].search.value).split(',').map(v => v.trim()).filter(v => v)
                                      : []);
                                // Update filter type immediately, even if no values
                                // Pass filterType explicitly to ensure it's saved
                                handleColumnFilter(col.data, currentValues, filterType);
                              }}
                            >
                              <option value="strict">Strict</option>
                              <option value="partial">Partial</option>
                              <option value="starts_with">Starts With</option>
                              <option value="ends_with">Ends With</option>
                              {['id', '_id'].includes(col.data) && (
                                <>
                                  <option value="greater_than">Greater Than</option>
                                  <option value="less_than">Less Than</option>
                                </>
                              )}
                              <option value="not">Not</option>
                            </CFormSelect>
                          </td>
                          <td>
                            <TagInput
                              value={Array.isArray(localFilters.columns[col.data]?.search?.value)
                                ? localFilters.columns[col.data].search.value
                                : (localFilters.columns[col.data]?.search?.value 
                                    ? String(localFilters.columns[col.data].search.value).split(',').map(v => v.trim()).filter(v => v)
                                    : [])}
                              onChange={(values) => {
                                const filterType = localFilters.filterType[col.data] || 'strict';
                                handleColumnFilter(col.data, values, filterType);
                              }}
                              placeholder={`Search in ${col.data}`}
                              id={`adt-filter-${token}-${col.data}`}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Right Side - Export Configuration */}
            <div className="col-md-5 ps-3">
              <div className="card shadow-none p-2 mb-3" style={{ backgroundColor: '#1db4cd', color: '#fff' }}>
                <div className="d-flex flex-row justify-content-between align-items-center mb-1 p-1">
                  <span className="sf-13 fw-bold text-white">
                    <i className="fa-duotone fa-file-export me-2"></i>Export Configuration
                  </span>
                </div>
              </div>
              
              <div className="card p-3 mb-3 shadow-none border border-1 rounded">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Columns to Export</label>
                  <CFormSelect
                    multiple
                    size={8}
                    className="form-select choice-select"
                    id={`export-columns-${token}`}
                    value={localFilters.export?.columns || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setLocalFilters(prev => ({
                        ...prev,
                        export: {
                          ...prev.export,
                          columns: selected
                        }
                      }));
                    }}
                  >
                    {columns
                      .filter(col => col.data !== 'selection' && col.data !== 'actions')
                      .map(col => (
                        <option key={col.data} value={col.data}>
                          {col.title}
                        </option>
                      ))}
                  </CFormSelect>
                  <small className="text-muted">Hold CTRL to select multiple columns</small>
                </div>
                <div className="form-check form-switch mb-3">
                  <CFormCheck
                    type="checkbox"
                    id={`apply-export-${token}`}
                    checked={localFilters.export?.export || false}
                    onChange={(e) => {
                      setLocalFilters(prev => ({
                        ...prev,
                        export: {
                          ...prev.export,
                          export: e.target.checked
                        }
                      }));
                    }}
                  />
                  <label className="form-check-label" htmlFor={`apply-export-${token}`}>
                    Enable export
                  </label>
                </div>
                
                {/* Export Buttons */}
                {localFilters.export?.export && (
                  <div className="d-flex gap-2 flex-wrap">
                    <CButton
                      color="success"
                      size="sm"
                      onClick={() => {
                        // Store export action in filters
                        setLocalFilters(prev => ({
                          ...prev,
                          export: {
                            ...prev.export,
                            action: 'csv'
                          }
                        }));
                      }}
                    >
                      <i className="fa fa-file-csv me-1"></i>Export CSV
                    </CButton>
                    <CButton
                      color="info"
                      size="sm"
                      onClick={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          export: {
                            ...prev.export,
                            action: 'excel'
                          }
                        }));
                      }}
                    >
                      <i className="fa fa-file-excel me-1"></i>Export Excel
                    </CButton>
                    <CButton
                      color="danger"
                      size="sm"
                      onClick={() => {
                        setLocalFilters(prev => ({
                          ...prev,
                          export: {
                            ...prev.export,
                            action: 'pdf'
                          }
                        }));
                      }}
                    >
                      <i className="fa fa-file-pdf me-1"></i>Export PDF
                    </CButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CModalBody>
      <CModalFooter className="mt-0 border border-top-0 pt-2">
        <CButton
          color="secondary"
          className="skeleton-clear-filters"
          onClick={() => {
            setLocalFilters({
              search: '',
              dateRange: {},
              columns: {},
              filterType: {},
              sort: localFilters.sort,
              pagination: localFilters.pagination,
              export: {}
            });
            setDateRangeValue('');
          }}
        >
          Clear
        </CButton>
        <CButton
          color="primary"
          className="skeleton-form-btn skeleton-apply-filters"
          onClick={() => {
            // Handle date range
            let finalFilters = { 
              ...localFilters,
              filterType: localFilters.filterType || {} // Ensure filterType is always an object
            };
            if (dateRangeValue) {
              const [from, to] = dateRangeValue.split(' - ').map(s => s.trim());
              if (from && to) {
                finalFilters.dateRange = {
                  created_at: { from, to },
                  column: 'created_at'
                };
              }
            }
            // Clean up empty filters - remove columns with no values
            // BUT preserve filterType even if column has no values (user might add values later)
            const cleanedColumns = {};
            Object.keys(finalFilters.columns || {}).forEach(col => {
              const filter = finalFilters.columns[col];
              const values = Array.isArray(filter?.search?.value) 
                ? filter.search.value 
                : (filter?.search?.value ? String(filter.search.value).split(',').map(v => v.trim()) : []);
              if (values.length > 0) {
                cleanedColumns[col] = filter;
              }
              // If column has no values but has a filterType, we still want to keep the filterType
              // The backend will handle empty values appropriately
            });
            finalFilters.columns = cleanedColumns;
            
            // CRITICAL: Ensure filterType is preserved for all columns that have values
            // Also ensure filterType is an object (not undefined or null)
            if (!finalFilters.filterType || typeof finalFilters.filterType !== 'object') {
              finalFilters.filterType = {};
            }
            
            // CRITICAL: Preserve filterType for ALL columns that have values in cleanedColumns
            // Also preserve filterType from localFilters for columns that might have been cleaned but have filterType set
            const preservedFilterType = {};
            
            // First, preserve filterType for columns that have values (in cleanedColumns)
            Object.keys(finalFilters.columns || {}).forEach(col => {
              if (finalFilters.filterType?.[col]) {
                preservedFilterType[col] = finalFilters.filterType[col];
              } else if (localFilters.filterType?.[col]) {
                // Fallback to localFilters if not in finalFilters
                preservedFilterType[col] = localFilters.filterType[col];
              }
            });
            
            // Also preserve filterType from localFilters for any column that has a filterType set
            // This ensures filterType is preserved even if the column was cleaned due to empty values
            Object.keys(localFilters.filterType || {}).forEach(col => {
              // Only add if not already in preservedFilterType and if column has values
              if (!preservedFilterType[col] && finalFilters.columns[col]) {
                preservedFilterType[col] = localFilters.filterType[col];
              }
            });
            
            // Final check: ensure filterType exists for all columns in cleanedColumns
            Object.keys(finalFilters.columns || {}).forEach(col => {
              if (!preservedFilterType[col] && localFilters.filterType?.[col]) {
                preservedFilterType[col] = localFilters.filterType[col];
              } else if (!preservedFilterType[col]) {
                // Default to 'strict' if no filterType is set
                preservedFilterType[col] = 'strict';
              }
            });
            
            finalFilters.filterType = preservedFilterType;
            
            console.log('🔧 FilterModal - Preserved filterType after cleanup:', preservedFilterType);
            
            // Reset pagination to page 1 when applying filters
            finalFilters.pagination = { ...finalFilters.pagination, page: 1 };
            
            console.log('📤 FilterModal - Applying filters:', {
              columns: Object.keys(finalFilters.columns || {}),
              filterType: finalFilters.filterType,
              filterTypeEntries: Object.entries(finalFilters.filterType || {}),
              dateRange: finalFilters.dateRange,
              localFiltersFilterType: localFilters.filterType
            });
            
            onApply(finalFilters);
          }}
        >
          Apply Filters
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

// Date Range Modal Component - Matching bv project exactly
const DateRangeModal = ({ show, onClose, onApply, currentRange, token }) => {
  const [column, setColumn] = useState(currentRange.column || 'created_at');
  const [dateRangeValue, setDateRangeValue] = useState('');

  useEffect(() => {
    if (currentRange && Object.keys(currentRange).length > 0) {
      const dateKey = Object.keys(currentRange).find(k => k !== 'column');
      if (dateKey && currentRange[dateKey]) {
        const { from, to } = currentRange[dateKey];
        if (from && to) {
          setDateRangeValue(`${from} - ${to}`);
        }
      }
    }
  }, [currentRange, show]);

  return (
    <CModal visible={show} onClose={onClose} className="skeleton-modal">
      <CModalHeader className="skeleton-modal-header">
        <div className="skeleton-mdl-hdr-lbl-grp">
          <CModalTitle className="skeleton-modal-label m-0">
            <i className="fa fa-calendar me-1"></i>Date Range Filter
          </CModalTitle>
        </div>
        <div className="skeleton-mdl-hdr-btn-grp">
          <button type="button" onClick={onClose} aria-label="Close">
            <i className="fa fa-times"></i>
          </button>
        </div>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <label htmlFor={`date-column-select-${token}`} className="form-label fw-semibold">Select Date Column</label>
          <CFormSelect
            id={`date-column-select-${token}`}
            value={column}
            onChange={(e) => setColumn(e.target.value)}
          >
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated Date</option>
          </CFormSelect>
        </div>
        <div className="mb-3">
          <label htmlFor={`external-date-range-${token}`} className="form-label fw-semibold">Date Range</label>
          <CFormInput
            type="text"
            className="form-control date-range-picker"
            id={`external-date-range-${token}`}
            placeholder="Select date range"
            value={dateRangeValue}
            onChange={(e) => setDateRangeValue(e.target.value)}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton
          color="secondary"
          id={`clear-date-range-${token}`}
          onClick={() => {
            setDateRangeValue('');
            onApply(column, '', '');
          }}
        >
          Clear
        </CButton>
        <CButton
          color="primary"
          id={`apply-date-range-${token}`}
          onClick={() => {
            if (dateRangeValue) {
              const [from, to] = dateRangeValue.split(' - ').map(s => s.trim());
              if (from && to) {
                onApply(column, from, to);
              }
            }
          }}
        >
          Apply
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

// TagInput Component - Multi-value input with tags/pills
const TagInput = ({ value = [], onChange, placeholder, id }) => {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState(value || []);

  useEffect(() => {
    setTags(value || []);
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !tags.includes(trimmed)) {
        const newTags = [...tags, trimmed];
        setTags(newTags);
        onChange(newTags);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      const newTags = tags.slice(0, -1);
      setTags(newTags);
      onChange(newTags);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    onChange(newTags);
  };

  return (
    <div className="tagify-input-wrapper" style={{ 
      border: '1px solid #1db4cd', 
      borderRadius: '5px', 
      padding: '2px 8px',
      minHeight: '34px',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#fff',
      cursor: 'text'
    }}>
      {tags.map((tag, index) => (
        <span
          key={index}
          className="badge"
          style={{
            backgroundColor: '#1db4cd',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '0',
              marginLeft: '4px',
              fontSize: '12px',
              lineHeight: '1'
            }}
            aria-label="Remove tag"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        id={id}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          border: 'none',
          outline: 'none',
          flex: 1,
          minWidth: '100px',
          fontSize: '12px',
          padding: '4px 0'
        }}
      />
    </div>
  );
};

// Export Modal Component — Queue-Based for Large Datasets
const ExportModal = ({ show, onClose, data, columns, token, apiEndpoint = '/api/skeleton-action', selectAllMode = false, recordsFiltered = 0, excludedRows = [], filters = {}, reqSet = {} }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportColumns, setExportColumns] = useState(
    columns.filter(col => col.data !== 'selection' && col.data !== 'actions').map(col => col.data)
  );
  const [exporting, setExporting] = useState(false);

  // Queue-based export state
  const [exportJobId, setExportJobId] = useState(null);
  const [exportJobState, setExportJobState] = useState(null);
  const [exportProgress, setExportProgress] = useState({});
  const [exportResult, setExportResult] = useState(null);
  const [exportError, setExportError] = useState(null);
  const exportPollRef = useRef(null);

  const exportCount = selectAllMode
    ? Math.max(0, (recordsFiltered || 0) - (excludedRows?.length || 0))
    : (data?.length || 0);

  // Threshold: use queue-based export for large datasets
  const QUEUE_EXPORT_THRESHOLD = 10000;
  const useQueueExport = selectAllMode || exportCount > QUEUE_EXPORT_THRESHOLD;

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!show) {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current);
        exportPollRef.current = null;
      }
      // Only reset on close if no active job
      if (exportJobState === 'completed' || exportJobState === 'failed' || !exportJobState) {
        setExportJobId(null);
        setExportJobState(null);
        setExportProgress({});
        setExportResult(null);
        setExportError(null);
        setExporting(false);
      }
    }
  }, [show]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exportPollRef.current) {
        clearInterval(exportPollRef.current);
      }
    };
  }, []);

  // Poll export job progress
  const pollExportProgress = useCallback(async (jobId) => {
    try {
      const authToken = AuthService.getToken();
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`/api/export-csv?jobId=${jobId}`, { headers });
      const data = await response.json();

      if (data.success) {
        setExportJobState(data.state);
        if (data.progress && typeof data.progress === 'object') {
          setExportProgress(data.progress);
        }
        if (data.result) {
          setExportResult(data.result);
        }
        if (data.failedReason) {
          setExportError(data.failedReason);
        }

        // Stop polling on completion or failure
        if (data.state === 'completed' || data.state === 'failed') {
          if (exportPollRef.current) {
            clearInterval(exportPollRef.current);
            exportPollRef.current = null;
          }
          setExporting(false);
        }
      }
    } catch (error) {
      console.error('Error polling export progress:', error);
    }
  }, []);

  // Download completed export
  const handleDownloadExport = async () => {
    if (!exportJobId) return;
    try {
      const authToken = AuthService.getToken();
      const headers = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const response = await fetch(`/api/export-csv?jobId=${exportJobId}&download=true`, { headers });
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const contentType = response.headers.get('content-type') || '';
      const isZip = contentType.includes('zip');
      const ext = isZip ? 'zip' : 'csv';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `export_${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download export file');
    }
  };

  const handleExport = async () => {
    const visibleColumns = columns.filter(col =>
      exportColumns.includes(col.data) &&
      col.data !== 'selection' &&
      col.data !== 'actions'
    );
    if (visibleColumns.length === 0) {
      alert('Please select at least one column to export');
      return;
    }
    if (exportCount === 0) {
      alert('No records to export');
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      // ─── Queue-based export for large datasets ───
      if (useQueueExport) {
        const authToken = AuthService.getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        // Transform raw filters using TableHelper (same transformation as fetchData)
        // Raw: { search: 'Apex', columns: { li_company_name: 'Apex' }, filterType: {}, ... }
        // Transformed: { search: { value: 'Apex' }, columns: { li_company_name: { search: { value: ['Apex'] } } }, FilterType: {}, ... }
        let transformedFilters = filters;
        try {
          const colsDef = {};
          columns.forEach(c => { if (c.data && c.data !== 'selection' && c.data !== 'actions') colsDef[c.data] = [c.data, true]; });
          const params = TableHelper.generateParams(colsDef, [], [], {
            ...reqSet,
            token,
            table: reqSet?.table || 'export',
            filters: filters,
            draw: 1
          });
          transformedFilters = params.filters || filters;
        } catch (e) {
          console.warn('Filter transform failed, using raw filters:', e.message);
        }

        const response = await fetch('/api/export-csv', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            token,
            filters: transformedFilters,
            exportColumns: exportColumns,
            excludedIds: excludedRows || [],
            totalExpected: exportCount,
            // Pass the actual system/table from reqSet (may differ from token config)
            system: reqSet?.system || undefined,
            tableName: reqSet?.table || undefined
          })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Export failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to queue export');
        }

        setExportJobId(result.jobId);
        setExportJobState('waiting');
        setExportProgress({ processed: 0, total: exportCount, phase: 'queued' });

        // Start polling
        if (exportPollRef.current) clearInterval(exportPollRef.current);
        exportPollRef.current = setInterval(() => {
          pollExportProgress(result.jobId);
        }, 2000);

        // Immediate first poll
        setTimeout(() => pollExportProgress(result.jobId), 500);
        return; // Don't close modal — show progress
      }

      // ─── Client-side export for small datasets ───
      const exportData = data || [];
      switch (exportFormat) {
        case 'csv':
          ExportService.exportToCSV(exportData, visibleColumns, `export_${Date.now()}.csv`);
          break;
        case 'excel':
          ExportService.exportToExcel(exportData, visibleColumns, `export_${Date.now()}.xlsx`);
          break;
        case 'pdf':
          ExportService.exportToPDF(exportData, visibleColumns, `export_${Date.now()}.pdf`);
          break;
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setExportError(err.message || 'Export failed');
      setExporting(false);
    }
  };

  // Progress percentage
  const progressPercent = exportProgress.total > 0
    ? Math.round((exportProgress.processed / exportProgress.total) * 100)
    : 0;

  const isJobActive = exportJobState === 'active' || exportJobState === 'waiting';

  return (
    <CModal visible={show} onClose={() => { if (!isJobActive) onClose(); }} className="skeleton-modal">
      <CModalHeader className="skeleton-modal-header">
        <div className="skeleton-mdl-hdr-lbl-grp">
          <CModalTitle className="skeleton-modal-label m-0">
            <i className="fa fa-file-export me-1"></i>Export Data
          </CModalTitle>
        </div>
        <div className="skeleton-mdl-hdr-btn-grp">
          <button type="button" onClick={() => { if (!isJobActive) onClose(); }} aria-label="Close" disabled={isJobActive}>
            <i className="fa fa-times"></i>
          </button>
        </div>
      </CModalHeader>
      <CModalBody>
        {/* Export Error */}
        {exportError && (
          <CAlert color="danger" className="mb-3" dismissible onClose={() => setExportError(null)}>
            <i className="fa fa-exclamation-triangle me-1"></i>{exportError}
          </CAlert>
        )}

        {/* ─── Progress Section (queue-based export active) ─── */}
        {exportJobId && (
          <div className="card border-0 mb-3" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%)', borderRadius: '12px' }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h6 className="mb-0 fw-bold">
                  {exportJobState === 'completed' ? '✅ Export Complete' :
                   exportJobState === 'failed' ? '❌ Export Failed' :
                   exportJobState === 'active' ? '🔄 Exporting...' :
                   '⏳ Waiting in queue...'}
                </h6>
                {exportJobState && (
                  <CBadge color={
                    exportJobState === 'completed' ? 'success' :
                    exportJobState === 'failed' ? 'danger' :
                    exportJobState === 'active' ? 'primary' : 'warning'
                  } className="px-2 py-1">
                    {exportJobState.toUpperCase()}
                  </CBadge>
                )}
              </div>

              {/* Progress Bar */}
              <CProgress className="mb-2" style={{ height: '10px' }}>
                <CProgressBar
                  value={exportJobState === 'completed' ? 100 : progressPercent}
                  color={exportJobState === 'completed' ? 'success' : exportJobState === 'failed' ? 'danger' : 'info'}
                  animated={isJobActive}
                />
              </CProgress>

              {/* Progress Stats */}
              <div className="d-flex flex-wrap gap-3 mt-2">
                <div>
                  <small className="text-muted d-block">Records Exported</small>
                  <strong>{(exportProgress.processed || 0).toLocaleString()} / {(exportProgress.total || exportCount).toLocaleString()}</strong>
                </div>
                <div>
                  <small className="text-muted d-block">Progress</small>
                  <strong>{exportJobState === 'completed' ? 100 : progressPercent}%</strong>
                </div>
                {exportProgress.phase && (
                  <div>
                    <small className="text-muted d-block">Phase</small>
                    <CBadge color="info" className="px-2 py-1">{exportProgress.phase}</CBadge>
                  </div>
                )}
                {exportProgress.totalParts > 1 && (
                  <div>
                    <small className="text-muted d-block">File Parts</small>
                    <CBadge color="warning" className="px-2 py-1">{exportProgress.totalParts} CSV files</CBadge>
                  </div>
                )}
              </div>

              {/* Download Button */}
              {exportJobState === 'completed' && exportResult && (
                <div className="mt-3">
                  <CAlert color="success" className="mb-2 py-2">
                    <div className="d-flex flex-wrap gap-3 align-items-center">
                      <div>
                        <small className="text-muted d-block">Records</small>
                        <strong>{(exportResult.totalRecords || 0).toLocaleString()}</strong>
                      </div>
                      <div>
                        <small className="text-muted d-block">File Size</small>
                        <strong>{exportResult.fileSizeMB || '0'} MB</strong>
                      </div>
                      {(exportResult.totalParts || 1) > 1 && (
                        <div>
                          <small className="text-muted d-block">Parts</small>
                          <strong>{exportResult.totalParts} files (ZIP)</strong>
                        </div>
                      )}
                    </div>
                  </CAlert>
                  <CButton color="success" className="w-100" onClick={handleDownloadExport}>
                    <i className="fa fa-download me-2"></i>
                    {(exportResult.totalParts || 1) > 1
                      ? `Download ZIP (${(exportResult.totalRecords || 0).toLocaleString()} records)`
                      : `Download CSV (${(exportResult.totalRecords || 0).toLocaleString()} records)`
                    }
                  </CButton>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Export Configuration (hidden during active job) ─── */}
        {!exportJobId && (
          <>
            <div className="mb-3">
              <label className="form-label fw-semibold">Export Format</label>
              <CFormSelect
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                disabled={exporting}
              >
                <option value="csv">CSV</option>
                {!useQueueExport && <option value="excel">Excel</option>}
                {!useQueueExport && <option value="pdf">PDF</option>}
              </CFormSelect>
              {useQueueExport && (
                <small className="text-muted">
                  <i className="fa fa-info-circle me-1"></i>
                  Large dataset detected ({exportCount.toLocaleString()} records). Using server-side queue export.
                </small>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Columns to Export</label>
              <CFormSelect
                multiple
                size={8}
                className="form-select"
                value={exportColumns}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setExportColumns(selected);
                }}
                disabled={exporting}
              >
                {columns
                  .filter(col => col.data !== 'selection' && col.data !== 'actions')
                  .map(col => (
                    <option key={col.data} value={col.data}>
                      {col.title}
                    </option>
                  ))}
              </CFormSelect>
              <small className="text-muted">Hold CTRL to select multiple columns</small>
            </div>
            <div className="alert alert-info">
              <strong>Total Records:</strong> {exportCount.toLocaleString()} {exportCount === 1 ? 'record' : 'records'} will be exported
              {useQueueExport && (
                <div className="mt-1"><small><i className="fa fa-server me-1"></i>Export will be processed on the server. Files &gt; 1 GB will be auto-split.</small></div>
              )}
            </div>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        {exportJobState === 'completed' ? (
          <CButton color="secondary" onClick={() => {
            setExportJobId(null);
            setExportJobState(null);
            setExportProgress({});
            setExportResult(null);
            onClose();
          }}>
            Close
          </CButton>
        ) : (
          <>
            <CButton color="secondary" onClick={onClose} disabled={isJobActive}>
              Cancel
            </CButton>
            {!exportJobId && (
              <CButton color="primary" onClick={handleExport} disabled={exporting}>
                {exporting ? <><CSpinner size="sm" className="me-1" /> Exporting…</> : <><i className="fa fa-download me-1"></i>Export</>}
              </CButton>
            )}
          </>
        )}
      </CModalFooter>
    </CModal>
  );
};

export default DynamicTable;
