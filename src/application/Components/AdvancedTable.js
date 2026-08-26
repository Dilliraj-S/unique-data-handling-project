
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CCardBody,
  CBadge,
  CSpinner,
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilFilter, cilReload, cilCalendar, cilX, cilTrash, cilCheck } from '@coreui/icons';
import TableHelper from '../../services/TableHelper';
import ExportService from '../../services/ExportService';
import AuthService from '../Services/AuthService';

const AdvancedTable = ({
  token,
  tableName,
  system = 'central',
  columns = {},
  custom = [],
  reqSet = {},
  onAction,
  initialFilters = {},
  apiEndpoint = '/api/skeleton-action'
}) => {
  const [data, setData] = useState([]);
  const [columnsMeta, setColumnsMeta] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    dateRange: {},
    columns: {},
    filterType: {},
    sort: {},
    pagination: { page: 1, limit: 10 },
    export: {},
    processId: null,
    ...initialFilters
  });
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsFiltered, setRecordsFiltered] = useState(0);
  const [draw, setDraw] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [filterPills, setFilterPills] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const tableRef = useRef(null);
  const rowMapRef = useRef(new Map());
  const searchInputRef = useRef(null);
  const dateRangeInputRef = useRef(null);

  // Generate unique token for this table instance
  const tableToken = token || `table_${Date.now()}`;

  // Fetch data from API
  const fetchData = useCallback(async (currentFilters, currentDraw) => {
    try {
      setLoading(true);
      setError(null);

      const params = TableHelper.generateParams(columns, [], [], {
        ...reqSet,
        token: tableToken,
        table: tableName,
        filters: currentFilters,
        draw: currentDraw
      });

      // Get authentication token
      const authToken = AuthService.getToken();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if token exists
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiEndpoint}/${tableToken}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          skeleton_filters: params.filters,
          skeleton_view: 'table',
          draw: currentDraw
        })
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
          // Clear token and redirect to login
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

      // Check if response is already processed (has columns array and processed data structure)
      let processedResponse;
      if (result.columns && Array.isArray(result.columns) && result.filters && result.reqSet) {
        // Response is already processed by TableCtrl through TableHelper
        processedResponse = result;
      } else if (result.data && Array.isArray(result.data) && result.recordsTotal !== undefined) {
        // Raw DataService response - needs processing
        processedResponse = TableHelper.generateResponse(
          result,
          columns,
          custom,
          {
            ...reqSet,
            token: tableToken,
            table: tableName,
            actions: reqSet.actions || 'cevd',
            act: reqSet.act || 'id'
          }
        );
      } else {
        // Fallback: use result as-is but ensure required fields
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
      setRecordsTotal(processedResponse.recordsTotal || 0);
      setRecordsFiltered(processedResponse.recordsFiltered || 0);
      setDraw(processedResponse.draw || 1);

      // Store row map for action callbacks
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
  }, [token, tableName, columns, custom, reqSet, apiEndpoint, tableToken]);

  // Update filter pills based on current filters
  const updateFilterPills = (currentFilters) => {
    const pills = [];

    // Search pill
    if (currentFilters.search) {
      pills.push({
        type: 'search',
        label: `Search: ${currentFilters.search}`,
        onRemove: () => {
          setFilters(prev => ({ ...prev, search: '' }));
        }
      });
    }

    // Column filter pills
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

    // Date range pill
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

    // Sort pills
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

  // Initial load
  useEffect(() => {
    fetchData(filters, draw);
  }, []);

  // Reload when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchData(filters, draw);
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [filters, fetchData]);

  // Handle search
  const handleSearch = (value) => {
    setFilters(prev => ({
      ...prev,
      search: value,
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle column filter
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

  // Handle date range
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

  // Handle sort
  const handleSort = (column, direction) => {
    setFilters(prev => ({
      ...prev,
      sort: { ...prev.sort, [column]: direction }
    }));
  };

  // Handle page change
  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
  };

  // Handle limit change
  const handleLimitChange = (limit) => {
    setFilters(prev => ({
      ...prev,
      pagination: { ...prev.pagination, limit: parseInt(limit), page: 1 }
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      search: '',
      dateRange: {},
      columns: {},
      filterType: {},
      sort: {},
      pagination: { page: 1, limit: 10 },
      export: {},
      processId: null
    });
    setSelectedRows([]);
  };

  // Handle row selection
  const handleRowSelect = (rowId, checked) => {
    if (checked) {
      setSelectedRows(prev => [...prev, rowId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== rowId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(data.map(row => row[reqSet.act] || row.id || row._id).filter(Boolean));
    } else {
      setSelectedRows([]);
    }
  };

  // Render cell content (handle HTML)
  const renderCell = (value, renderHtml = false) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">—</span>;
    }

    if (renderHtml && typeof value === 'string' && value.includes('<')) {
      return <span dangerouslySetInnerHTML={{ __html: value }} />;
    }

    return String(value);
  };

  // Handle action button clicks
  const handleActionClick = useCallback((event) => {
    if (!onAction) return;
    const button = event.target.closest('button.skeleton-popup');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const classes = button.className.split(' ');
    const actionCode = classes.find(cls => ['e', 'v', 'd'].includes(cls));
    if (!actionCode) return;

    const dataToken = button.getAttribute('data-token') || '';
    let rowId = button.dataset?.id;
    if (!rowId && dataToken) {
      const parts = dataToken.split('_');
      rowId = parts[parts.length - 1];
    }

    const rowData = rowMapRef.current.get(String(rowId)) || rowMapRef.current.get(String(rowId).toUpperCase());
    if (!rowData) return;

    const actionMap = { e: 'edit', v: 'view', d: 'delete' };
    const actionType = actionMap[actionCode] || actionCode;

    onAction(actionType, rowData, { token: dataToken });
  }, [onAction]);

  // Attach action listeners
  useEffect(() => {
    if (!tableRef.current || !onAction) return;
    const container = tableRef.current;
    container.addEventListener('click', handleActionClick);

    return () => {
      container.removeEventListener('click', handleActionClick);
    };
  }, [handleActionClick, onAction, data]);

  // Calculate pagination
  const totalPages = Math.ceil(recordsFiltered / filters.pagination.limit);
  const startRecord = (filters.pagination.page - 1) * filters.pagination.limit + 1;
  const endRecord = Math.min(filters.pagination.page * filters.pagination.limit, recordsFiltered);

  if (error) {
    return (
      <CAlert color="danger">
        <strong>Error:</strong> {error}
      </CAlert>
    );
  }

  return (
    <div className="advanced-table-container">
      {/* Filter Controls */}
      <div
        className="d-flex justify-content-between align-items-center mb-3 p-2"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color-translucent)',
          borderRadius: '8px'
        }}
      >
        <div className="d-flex align-items-center gap-2">
          {/* Search */}
          <CFormInput
            ref={searchInputRef}
            type="search"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="skl-filter-search"
            style={{ width: '250px' }}
          />
          
          {/* Refresh */}
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => fetchData(filters, draw)}
            className="skl-refresh-btn"
          >
            <CIcon icon={cilReload} />
          </CButton>

          {/* Date Range */}
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowDateRangeModal(true)}
            className="skl-date-range-btn"
          >
            <CIcon icon={cilCalendar} />
          </CButton>

          {/* Filter Modal */}
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setShowFilterModal(true)}
            className="skl-filter-btn"
          >
            <CIcon icon={cilFilter} />
          </CButton>

          {/* Export Buttons */}
          <div className="btn-group">
            <CButton
              color="success"
              variant="outline"
              size="sm"
              onClick={() => ExportService.exportToCSV(data, columnsMeta, `${tableName}_${Date.now()}.csv`)}
              title="Export to CSV"
            >
              CSV
            </CButton>
            <CButton
              color="success"
              variant="outline"
              size="sm"
              onClick={() => ExportService.exportToExcel(data, columnsMeta, `${tableName}_${Date.now()}.xlsx`)}
              title="Export to Excel"
            >
              Excel
            </CButton>
            <CButton
              color="success"
              variant="outline"
              size="sm"
              onClick={() => ExportService.exportToPDF(data, columnsMeta, `${tableName}_${Date.now()}.pdf`)}
              title="Export to PDF"
            >
              PDF
            </CButton>
          </div>
        </div>

        {/* Action Buttons */}
        {selectedRows.length > 0 && (
          <div className="action-icons">
            <CButton
              color="danger"
              size="sm"
              onClick={() => {
                if (onAction) onAction('bulkDelete', selectedRows);
                setSelectedRows([]);
              }}
            >
              <CIcon icon={cilTrash} className="me-1" />
              Delete Selected ({selectedRows.length})
            </CButton>
          </div>
        )}
      </div>

      {/* Filter Pills */}
      {filterPills.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          {filterPills.map((pill, index) => (
            <CBadge
              key={index}
              color="secondary"
              className="d-flex align-items-center gap-2"
              style={{ cursor: 'pointer' }}
            >
              {pill.label}
              <CIcon
                icon={cilX}
                size="sm"
                onClick={pill.onRemove}
                style={{ cursor: 'pointer' }}
              />
            </CBadge>
          ))}
          <CButton
            color="link"
            size="sm"
            onClick={clearAllFilters}
            className="text-danger"
          >
            Clear all filters
          </CButton>
        </div>
      )}

      {/* Table */}
      <div className="table-responsive" ref={tableRef}>
        {loading ? (
          <div className="text-center p-5">
            <CSpinner />
            <p className="mt-2">Loading...</p>
          </div>
        ) : (
          <CTable hover striped responsive>
            <CTableHead>
              <CTableRow>
                {reqSet.actions?.includes('c') && (
                  <CTableHeaderCell style={{ width: '40px' }}>
                    <CFormCheck
                      checked={selectedRows.length === data.length && data.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </CTableHeaderCell>
                )}
                {columnsMeta
                  .filter(col => col.visible !== false && col.data !== 'selection' && col.data !== 'actions')
                  .map(col => (
                    <CTableHeaderCell
                      key={col.data}
                      className={col.className}
                      style={{ cursor: col.orderable ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (col.orderable && col.data !== 'selection' && col.data !== 'actions') {
                          const currentSort = filters.sort[col.data];
                          const newDirection = currentSort === 'asc' ? 'desc' : 'asc';
                          handleSort(col.data, newDirection);
                        }
                      }}
                    >
                      {col.renderHtml && typeof col.title === 'string' && col.title.includes('<') ? (
                        <span dangerouslySetInnerHTML={{ __html: col.title }} />
                      ) : (
                        <>
                          {col.title}
                          {col.orderable && filters.sort[col.data] && (
                            <span className="ms-1">
                              {filters.sort[col.data] === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </>
                      )}
                    </CTableHeaderCell>
                  ))}
                {/* Actions column header */}
                {reqSet.actions && (reqSet.actions.includes('e') || reqSet.actions.includes('v') || reqSet.actions.includes('d')) && (
                  <CTableHeaderCell className="text-center" style={{ width: '120px' }}>
                    Actions
                  </CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan={columnsMeta.length + (reqSet.actions?.includes('c') ? 1 : 0)} className="text-center">
                    No records found
                  </CTableDataCell>
                </CTableRow>
              ) : (
                data.map((row, index) => {
                  const rowId = row[reqSet.act] || row.id || row._id || index;
                  return (
                    <CTableRow key={rowId}>
                      {reqSet.actions?.includes('c') && (
                        <CTableDataCell>
                          <CFormCheck
                            checked={selectedRows.includes(rowId)}
                            onChange={(e) => handleRowSelect(rowId, e.target.checked)}
                          />
                        </CTableDataCell>
                      )}
                      {columnsMeta
                        .filter(col => col.visible !== false && col.data !== 'selection' && col.data !== 'actions')
                        .map(col => (
                          <CTableDataCell key={col.data}>
                            {renderCell(row[col.data], col.renderHtml)}
                          </CTableDataCell>
                        ))}
                      {/* Actions column */}
                      {reqSet.actions && (reqSet.actions.includes('e') || reqSet.actions.includes('v') || reqSet.actions.includes('d')) && (
                        <CTableDataCell className="text-center">
                          <div className="table-actions-group">
                            {reqSet.actions.includes('v') && (
                              <button
                                type="button"
                                className="v skeleton-popup"
                                onClick={() => onAction && onAction('view', row)}
                                title="View"
                              >
                                <i className="fa fa-eye"></i>
                              </button>
                            )}
                            {reqSet.actions.includes('e') && (
                              <button
                                type="button"
                                className="e skeleton-popup"
                                onClick={() => onAction && onAction('edit', row)}
                                title="Edit"
                              >
                                <i className="fa fa-edit"></i>
                              </button>
                            )}
                            {reqSet.actions.includes('d') && (
                              <button
                                type="button"
                                className="d skeleton-popup"
                                onClick={() => onAction && onAction('delete', row)}
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
                })
              )}
            </CTableBody>
          </CTable>
        )}
      </div>

      {/* Pagination */}
      {recordsFiltered > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <div>
            Showing {startRecord} to {endRecord} of {recordsFiltered} entries
            {recordsTotal !== recordsFiltered && (
              <span className="text-muted"> (Total: {recordsTotal})</span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
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
            <CPagination>
              <CPaginationItem
                disabled={filters.pagination.page === 1}
                onClick={() => filters.pagination.page > 1 && handlePageChange(filters.pagination.page - 1)}
              >
                Previous
              </CPaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = filters.pagination.page <= 3
                  ? i + 1
                  : filters.pagination.page >= totalPages - 2
                  ? totalPages - 4 + i
                  : filters.pagination.page - 2 + i;
                if (page < 1 || page > totalPages) return null;
                return (
                  <CPaginationItem
                    key={page}
                    active={page === filters.pagination.page}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </CPaginationItem>
                );
              })}
              <CPaginationItem
                disabled={filters.pagination.page === totalPages}
                onClick={() => filters.pagination.page < totalPages && handlePageChange(filters.pagination.page + 1)}
              >
                Next
              </CPaginationItem>
            </CPagination>
          </div>
        </div>
      )}

      {/* Filter Modal - Will be implemented in next part */}
      <FilterModal
        show={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        columns={columnsMeta}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setShowFilterModal(false);
        }}
      />

      {/* Date Range Modal */}
      <DateRangeModal
        show={showDateRangeModal}
        onClose={() => setShowDateRangeModal(false)}
        onApply={handleDateRange}
        currentRange={filters.dateRange}
      />
    </div>
  );
};

// Filter Modal Component
const FilterModal = ({ show, onClose, columns, filters, onApply }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, show]);

  const handleColumnFilter = (column, value, filterType) => {
    setLocalFilters(prev => {
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
        filterType: newFilterType
      };
    });
  };

  return (
    <CModal visible={show} onClose={onClose} size="xl">
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilFilter} className="me-2" />
          Filters & Export
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="row">
          <div className="col-md-7 border-end pe-3">
            <CCard className="mb-3" style={{ backgroundColor: '#1db4cd', color: '#fff' }}>
              <CCardBody className="p-2">
                <strong>Filters</strong>
              </CCardBody>
            </CCard>
            
            <div className="table-responsive" style={{ maxHeight: '400px' }}>
              <CTable bordered size="sm">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell width="30%">Column</CTableHeaderCell>
                    <CTableHeaderCell width="25%">Filter Type</CTableHeaderCell>
                    <CTableHeaderCell width="45%">Value</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {columns
                    .filter(col => col.data !== 'selection' && col.data !== 'actions' && !col.isDate)
                    .map(col => (
                      <CTableRow key={col.data}>
                        <CTableDataCell>
                          <strong>{col.title}</strong>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormSelect
                            size="sm"
                            value={localFilters.filterType[col.data] || 'strict'}
                            onChange={(e) => {
                              const currentValue = localFilters.columns[col.data]?.search?.value || '';
                              handleColumnFilter(col.data, currentValue, e.target.value);
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
                        </CTableDataCell>
                        <CTableDataCell>
                          <CFormInput
                            size="sm"
                            type="text"
                            placeholder={`Filter ${col.title}`}
                            value={Array.isArray(localFilters.columns[col.data]?.search?.value)
                              ? localFilters.columns[col.data].search.value.join(',')
                              : (localFilters.columns[col.data]?.search?.value || '')}
                            onChange={(e) => {
                              const filterType = localFilters.filterType[col.data] || 'strict';
                              handleColumnFilter(col.data, e.target.value, filterType);
                            }}
                          />
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                </CTableBody>
              </CTable>
            </div>
          </div>
          
          <div className="col-md-5 ps-3">
            <CCard className="mb-3" style={{ backgroundColor: '#1db4cd', color: '#fff' }}>
              <CCardBody className="p-2">
                <strong>Export Configuration</strong>
              </CCardBody>
            </CCard>
            
            <CCard>
              <CCardBody>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Columns to Export</label>
                  <CFormSelect multiple size="lg">
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
                <CFormCheck
                  label="Enable export"
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
              </CCardBody>
            </CCard>
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => {
          setLocalFilters({
            search: '',
            dateRange: {},
            columns: {},
            filterType: {},
            sort: localFilters.sort,
            pagination: localFilters.pagination,
            export: {}
          });
        }}>
          Clear
        </CButton>
        <CButton color="primary" onClick={() => onApply(localFilters)}>
          Apply Filters
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

// Date Range Modal Component
const DateRangeModal = ({ show, onClose, onApply, currentRange }) => {
  const [column, setColumn] = useState(currentRange.column || 'created_at');
  const [from, setFrom] = useState(currentRange[column]?.from || '');
  const [to, setTo] = useState(currentRange[column]?.to || '');

  return (
    <CModal visible={show} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>
          <CIcon icon={cilCalendar} className="me-2" />
          Date Range Filter
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        <div className="mb-3">
          <label className="form-label fw-semibold">Select Date Column</label>
          <CFormSelect value={column} onChange={(e) => setColumn(e.target.value)}>
            <option value="created_at">Created Date</option>
            <option value="updated_at">Updated Date</option>
          </CFormSelect>
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">From Date</label>
          <CFormInput
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label fw-semibold">To Date</label>
          <CFormInput
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={() => {
          setFrom('');
          setTo('');
          onApply(column, '', '');
        }}>
          Clear
        </CButton>
        <CButton color="primary" onClick={() => {
          if (from && to) {
            onApply(column, from, to);
          }
        }}>
          Apply
        </CButton>
      </CModalFooter>
    </CModal>
  );
};

export default AdvancedTable;

