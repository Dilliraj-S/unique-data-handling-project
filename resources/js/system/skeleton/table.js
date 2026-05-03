import { select } from "./select";
import { pills } from "./pills";
import 'datatables.net-bs5';
import 'datatables.net-buttons-bs5';
import 'datatables.net-buttons/js/buttons.colVis';
import 'datatables.net-buttons-bs5/css/buttons.bootstrap5.css';
import {generateProcessId,listenProgress} from "./../broadcast/import";
import { choiceSelect } from "./choice";
import { listenCount } from "../broadcast/index";

/**
 * Generates a loading skeleton for a DataTable.
 * @param {Object[]} columns - Array of column definitions.
 * @param {number} [rows=5] - Number of placeholder rows (default: 5).
 * @returns {string} HTML string for the loading skeleton table.
 */
export function generateDataTableLoading(columns, rows = 10) {
  const placeholder = '<div class="skeleton-placeholder bg-light rounded" style="height: 20px;"></div>';
  return `
    <div class="table-responsive">
      <table class="table table-bordered w-100">
        <thead>
          <tr>${columns.map(() => `<th>${placeholder}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${Array(rows)
      .fill()
      .map(() => `<tr>${columns.map(() => `<td>${placeholder}</td>`).join('')}</tr>`)
      .join('')}
        </tbody>
      </table>
    </div>
  `;
}
/**
 * Initializes DataTables for elements with the 'data-skeleton-table-set' attribute.
 * Handles server-side processing, filtering, sorting, and state management.
 */
export function initializeDataTable() {
  // Select all elements with the data-skeleton-table-set attribute
  const elements = document.querySelectorAll('[data-skeleton-table-set]');
  if (!elements.length) {
    return;
  }
  // Validate required dependencies
  if (!window.general.csrfToken) {
    window.general.errorToast('CSRF token not found');
    return;
  }
  if (!window.jQuery || !jQuery.fn.DataTable || !window.Tagify) {
    window.general.errorToast('Missing required libraries');
    return;
  }
  // Process each table element
  elements.forEach(element => {
    const $element = jQuery(element);
    const token = $element.data('skeleton-table-set');
    if (!token) {
      window.general.errorToast('Missing token for table');
      return;
    }
    // Initialize state for the table
    const state = {
      filters: {
        search: '',
        dateRange: {},
        columns: {},
        filterType: {},
        sort: {},
        pagination: { type: 'offset', page: 1, limit: 10 },
        export: {},
        processId: generateProcessId()
      },
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      columns: [],
      selectedCount: 0,
      selectedIds: [], 
      universalSelectAll: false,
      query: {},
      reqSet: {
        table: $element.data('skeleton-table-name') || 'default_table'
      }
    };
    // State management functions
    const loadState = () => {
      const saved = window.general.manageCookie({ action: 'get', name: `skeleton-state-${token}` });
      if (saved) {
        state.filters = { ...state.filters, ...saved };
        if (Array.isArray(state.filters.columns)) state.filters.columns = {};
        state.filters.export = {
          columns: saved.export?.columns || [],
          is_export: saved.export?.is_export === true || false,
        };
      }
    };
    const saveState = () => {
      window.general.manageCookie({
        action: 'set',
        name: `skeleton-state-${token}`,
        value: state.filters,
        hours: window.general.cacheDurationMinutes / 60
      });
    };
    // Updates the count of selected rows and toggles action buttons
    const updateSelectedCount = () => {
  const $selectAll = $element.find('.select-all-checkbox');
  const $universalSelectAll = $element.find(`.universal-select-all-${token}`);

  const totalRows = $element.find('.row-select').length;
  const checkedRows = $element.find('.row-select:checked').length;

  // If universal is enabled, skip tracking per-page selected IDs
  if (state.universalSelectAll) {
    state.selectedIds = []; // optional: empty array since we won't use it
    state.selectedCount = state.recordsFiltered;
  } else {
    state.selectedIds = $element
      .find('.row-select:checked')
      .map(function () {
        return jQuery(this).data('id');
      })
      .get();
    state.selectedCount = state.selectedIds.length;
  }
  // Toggle action icons visibility
  const hasSelection = state.universalSelectAll || checkedRows > 0;
  $element.find('.action-icons').toggleClass('d-none', !hasSelection);

  // Update per-page select-all checkbox state
  $selectAll.prop('checked', checkedRows === totalRows && totalRows > 0);
  $selectAll.prop('indeterminate', checkedRows > 0 && checkedRows < totalRows);

  // Update universal checkbox state
  if (state.universalSelectAll) {
    $universalSelectAll.prop('checked', true).prop('indeterminate', false);
  } else {
    $universalSelectAll.prop('checked', false);
    $universalSelectAll.prop('indeterminate', checkedRows > 0);
  }
  let dataId;
  if (state.universalSelectAll) {
    dataId = encodeURIComponent(JSON.stringify(state.query));
  } else {
    dataId = state.selectedIds.join('@');
  }
  const baseToken = token.split('_').slice(0, 4).concat('').slice(0, 4).join('_');
  $element.find('.skeleton-audience-selected').attr('data-id', dataId);
  $element.find('.skeleton-product-selected').attr('data-id', dataId);
  $element.find('.skeleton-needToAction-selected').attr('data-id', dataId);
  $element.find('.skeleton-delete-selected')
    .attr('data-id', dataId)
    .attr('data-token', `${baseToken}_db`);
};




    // Displays filter pills
   const displayFilterPills = () => {
  const $container = $element.find(`.filters-pill-container-${token}`);
   if (!$container.length){
        $(`.skeleton-clear-all-${token}`).removeClass('d-none');
        return;
      }
      $(`.skeleton-clear-all-${token}`).toggleClass('d-none', $container.children().length === 0);


  $container.empty();
  let count = 0;

  // Search filter pill
  if (state.filters.search) {
    count++;
    $container.append(`
      <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
        Search: ${window.general.sanitizeInput(state.filters.search)}
        <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn"
          data-filter="search"
          aria-label="Remove search filter"></button>
      </span>
    `);
  }

  // Column filter pills
  Object.entries(state.filters.columns).forEach(([col, raw]) => {
    const colDef = state.columns.find(c => c.data === col);
    if (!colDef) return;

    // Handle comma-separated string or array
    const values = Array.isArray(raw)
      ? raw
      : String(raw).split(',').map(v => v.trim()).filter(Boolean);

    values.forEach(val => {
      count++;
      $container.append(`
        <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
          ${window.general.sanitizeInput(colDef.title)}: ${window.general.sanitizeInput(val)}
          <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn"
            data-filter="${col}"
            data-value="${val}"
            aria-label="Remove ${col} filter"></button>
        </span>
      `);
    });
  });

  // Date range pill
  if (state.filters.dateRange?.created_at) {
    const { from, to } = state.filters.dateRange.created_at;
    count++;
    $container.append(`
      <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
        Date: ${window.general.sanitizeInput(from)} to ${window.general.sanitizeInput(to)}
        <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn"
          data-filter="date_created_at"
          data-value="${from}-${to}"
          aria-label="Remove date filter"></button>
      </span>
    `);
  }

  // Sort filter pills
  Object.entries(state.filters.sort).forEach(([col, order]) => {
    const colDef = state.columns.find(c => c.data === col);
    if (!colDef) return;

    count++;
    $container.append(`
      <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
        Sort ${window.general.sanitizeInput(colDef.title)}: ${window.general.sanitizeInput(order)}
        <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn"
          data-filter="sort_${col}"
          data-value="${col}:${order}"
          aria-label="Remove sort filter"></button>
      </span>
    `);
  });

  // Toggle container visibility
  const hasFilters = count > 0;
  $container.css('display', hasFilters ? 'flex' : 'none');
  $element.find(`.skeleton-clear-all-${token}`).css('display', hasFilters ? 'inline-block' : 'none');
};


   
    // Fetches data from the server
    
    const fetchData = async (filters, draw) => {
      try {
        const response = await window.general.requestAction(token, {
          skeleton_filters: filters,
          skeleton_view: 'table',
          draw
        });
        if (!response.data?.status) {
          throw new Error(response.data?.message || 'Invalid server response');
        }
        console.log(response.data.company_queries);
        clientsCount(response.data);

        return response.data;
      } catch (e) {
        if (e.response?.status === 404) {
          throw new Error('Data endpoint not found. Please check server configuration.');
        }
        throw e;
      }
    };
    // Debounce function to limit rapid function calls
    const debounce = (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    };
    // Reloads the table with a loading indicator
    const reloadTableInternal = dataTable => {
      const $refreshBtn = $element.find('.skl-refresh-btn');
      if ($refreshBtn.length) {
        $refreshBtn.find('i').addClass('fa-spin');
      }
      dataTable.ajax.reload(() => {
        if ($refreshBtn.length) {
          $refreshBtn.find('i').removeClass('fa-spin');
        }
        displayFilterPills();
      }, false);
    };
    // Initialize the table
    loadState();
    const initialColumnsStr = $element.data('skeleton-initial-columns');
if (initialColumnsStr) {
  try {
    const initialColumns = JSON.parse(initialColumnsStr);
    Object.assign(state.filters.columns, initialColumns);
    saveState(); // Save the initial filters to cookie for persistence
  } catch (e) {
    console.warn('Invalid skeleton-initial-columns data:', e);
  }
}
    $element.html(generateDataTableLoading(Array(5).fill({})));
    fetchData(state.filters, 1)
      .then(initialData => {
        // Update state with initial data
        state.data = initialData.data || [];
        state.recordsTotal = initialData.recordsTotal || 0;
        state.recordsFiltered = initialData.recordsFiltered || 0;
        state.columns = initialData.columns || [];
        
        if (!state.columns.length) {
          $element.html('<div class="alert alert-danger">No columns provided.</div>');
          window.general.errorToast('No columns provided');
          return;
        }
        

        if (!state.columns.every(col => col.data)) {
          $element.html('<div class="alert alert-danger">Invalid column configuration: missing data property.</div>');
          window.general.errorToast('Invalid column configuration');
          return;
        }
        // Clean up invalid sort fields
        state.filters.sort = Object.fromEntries(
          Object.entries(state.filters.sort).filter(([field]) => {
            const col = state.columns.find(c => c.data === field && c.orderable && c.data !== 'selection' && c.data !== 'actions');
            return !!col;
          })
        );
        // Render table and modal HTML
        $element.html(`
          <div class="skeleton-view-container skeleton-view-container-${token}">
            <div class="table-responsive">
              <table id="skeleton-table-${token}" class="table table-bordered table-striped table-hover w-100"></table>
            </div>
          </div>
          ${initialData.filters.set_2}
        `);  
        /* Start Filter Cookies */   
        
        const $tableElement = jQuery(`#skeleton-table-${token}`);
        if (!$tableElement.length) {
          window.general.errorToast('Table element not found');
          return;
        }
        // Configure columns for DataTable
        const columns = state.columns.map(col => ({
          ...col,
          render: (data, type, row) => {
            if (type === 'display' && data && col.renderHtml !== false && (col.renderHtml || (typeof data === 'string' && data.match(/^<.+>$/)))) {
              try {
                const parsed = $.parseHTML(data);
                if (parsed && parsed.length) {
                  return $('<div>').append(parsed).html();
                }
              } catch (e) {
                window.general.log('Error parsing HTML content', { column: col.data, data, error: e, token });
              }
            }
            return window.general.isEmpty(data) ? window.general.emptyValue : data;
          }
        }));

        const dataTable = $tableElement.DataTable({
           dom: `
          <"row data-table"
            <"col-sm-12 col-md-6 d-flex align-items-end gap-3"l i>
            <"col-sm-12 col-md-6 d-flex justify-content-end align-items-end"B>
          >
          t
          <"row mt-2"
            <"col-sm-12 col-md-6 d-flex align-items-center gap-3"i>
            <"col-sm-12 col-md-6"p>
          >
        `,
          serverSide: true,
          processing: true,
          scrollX: true,
          scrollY: '700px',
          scrollCollapse: true,
          paging: true,
          buttons: [
            {
              extend: 'colvis',
              text: '<i class="fa fa-columns-3"></i>',
              className: 'd-none'
            }
          ],

          ajax: (d, callback) => {
              const cookieKey = initialData.reqSet.key || 'default-table'; 
              let visibleColumns = [];
              const visibleColumnsRaw = window.general.manageCookie({
                action: 'get',
                name: `skeleton-visible-columns-${cookieKey}`
              }); 

               if (visibleColumnsRaw) {
                  try {
                    const visibleColumnsArray = JSON.parse(visibleColumnsRaw);
                    if (Array.isArray(visibleColumnsArray)) {
                      visibleColumns = visibleColumnsArray
                        .map((isVisible, index) => (isVisible && state.columns[index]?.name ? state.columns[index].name : null))
                        .filter(name => name);
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to parse visible columns JSON from cookie:', e);
                  }
                }
                       
              const tableFilters = {
              search: window.general.sanitizeInput(d.search.value || ''),
              dateRange: state.filters.dateRange,
              columns: state.filters.columns,
              filterType: state.filters.filterType || {}, // Include filter types
              sort: Object.fromEntries(
                d.order
                  .map(o => {
                    const col = state.columns[o.column];
                    if (col && col.name && col.orderable && col.data !== 'selection' && col.data !== 'actions') {
                      return [col.name, o.dir];
                    }
                    return null;
                  })
                  .filter(s => s)
              ),
              pagination: {
                type: 'offset',
                page: Math.ceil(d.start / d.length) + 1,
                limit: d.length
              },
              visible_columns: visibleColumns,
              processId: state.filters.processId,
            };
            if (state.filters.export?.export === true) {
              tableFilters.export = {
                export: true,
                columns: Array.isArray(state.filters.export.columns)
                  ? state.filters.export.columns
                  : visibleColumns,
                processId:state.filters.export.processId
              };
            }
            fetchData(tableFilters, d.draw)
              .then(data => {
                state.data = data.data;
                state.recordsTotal = data.recordsTotal;
                state.filters.search = tableFilters.search;
                state.filters.pagination = tableFilters.pagination;
                state.tableKey = initialData.reqSet.key|| 'default-table';
                state.query = data.query;
                callback({
                  data: state.data,
                  recordsTotal: state.recordsTotal,
                  recordsFiltered: data.recordsFiltered,
                  draw: d.draw
                });
              })
              .catch(e => {
                callback({ data: [], recordsTotal: 0, recordsFiltered: 0, draw: d.draw });
                window.general.errorToast('Failed to load table data');
              });
          },
          columns,
          columnDefs: [
            {
              targets: '_all',
              render: data => (window.general.isEmpty(data) ? '-' : data)
            }
          ],
          order: Object.entries(state.filters.sort).length
            ? Object.entries(state.filters.sort)
              .map(([field, order]) => {
                const idx = state.columns.findIndex(c => c.data === field);
                return idx !== -1 ? [idx, order] : null;
              })
              .filter(s => s)
            : [[state.columns.findIndex(c => c.orderable && c.data !== 'selection' && c.data !== 'actions'), 'asc']],
          lengthMenu: [10, 50, 150, 250],
          pageLength: state.filters.pagination.limit || 10,
          saveState: true,
          language: {
            search: '',
            searchPlaceholder: 'Search...',
            processing: '<div class="mt-5"></div>',
            lengthMenu: 'Showing _MENU_ ',  
            info: 'Showing _START_ to _END_ of _TOTAL_ records',
            infoEmpty: 'No records available',
            infoFiltered: '(filtered from _MAX_ total records)',
            paginate: {
              first: '<i class="ti ti-chevrons-left" title="First"></i>',
              last: '<i class="ti ti-chevrons-right" title="Last"></i>',
              next: '<i class="ti ti-chevron-right" title="Next"></i>',
              previous: '<i class="ti ti-chevron-left" title="Previous"></i>'
            },
            infoCallback: function(settings, start, end, max, total, pre) {
              return `Showing <b>${start}</b> to <b>${end}</b> of <b>${total}</b> records`;
            }
          },
          // In the initComplete function, update the Apply Filters button handler
          initComplete: () => {
            choiceSelect();
            select();
            pills();
            this.datePicker();
            const cookieKey = initialData.reqSet.key;
            
            // Initialize row selection checkboxes
            dataTable.rows().every(function() {
              const row = this.node();
              const $row = $(row);
              const $checkbox = $row.find('.row-select');
              if ($checkbox.length) {
                const id = $checkbox.data('id');
                if (id) {
                  $checkbox.prop('checked', state.selectedIds.includes(id));
                }
              }
            });
            this.dataTableMap = this.dataTableMap || new Map();
            this.dataTableMap.set(token, dataTable);
            const $controlsContainer = $element.find('.row.data-table .col-md-6:last-child');
            const $buttonsContainer = $element.find('.dt-buttons').addClass('me-2').detach();
            $controlsContainer.empty();
            $controlsContainer.append($buttonsContainer);            
            $controlsContainer.append(initialData.filters.set_1); 
            const $infoContainer = $element.find('.row.data-table .col-md-6:first-child');
            $infoContainer.prepend(`
              <div class="universal-select-all-container ms-2 me-3 d-flex">
                <input type="checkbox" class="form-check-input skl-checkbox universal-select-all-${token}" id="universal-select-all-${token}">
                <label for="universal-select-all-${token}" class="ms-1 text-nowrap">Select All</label>
              </div>
            `);
            const $colvisBtn = $element.find('.buttons-colvis');
            $colvisBtn.removeClass().addClass('skl-filter-btn');
            const $searchRow = $element.find('.row').first();
            const $filtersRow = jQuery(`
              <div class="row filters-row-${token}">
                <div class="col-md-12 d-flex justify-content-between align-items-center">
                  <div class="filters-pill-container-${token} d-flex flex-wrap my-1"></div>
                  <button class="d-none btn rounded-pill border border-1 text-danger text-decoration-none sf-12 skeleton-clear-all-${token}" title="Clear All Filters">
                    Clear all filters
                  </button>
                </div>
              </div>
            `);
          $searchRow.after($filtersRow);
          const $searchInput = $controlsContainer.find('input[type="search"]');
                if ($searchInput.length) {
                  const debouncedSearch = debounce(() => dataTable.search($searchInput.val()).draw(), window.general.debounceDelay);
                  $searchInput.val(state.filters.search || '');
                  $searchInput.off('input').on('input', debouncedSearch);
                }
                const visibleColumnsRaw = window.general.manageCookie({
                  action: 'get',
                  name: `skeleton-visible-columns-${cookieKey}`
                });
                if (visibleColumnsRaw) {
                  try {
                    const visibleColumns = JSON.parse(visibleColumnsRaw);
                    if (Array.isArray(visibleColumns)) {
                      dataTable.columns().every(function (index) {
                        try {
                          if (typeof visibleColumns[index] !== 'undefined') {
                            this.visible(visibleColumns[index]);
                          }
                        } catch (err) {
                          console.warn(`⚠️ Couldn't set visibility for column ${index}:`, err);
                        }
                      });
                    }
                  } catch (e) {
                    console.warn('⚠️ Failed to parse visible columns JSON:', e);
                  }
                }
            dataTable.on('column-visibility.dt', function (e, settings, column, state) {
              const visibleColumns = dataTable.columns().visible().toArray();
              window.general.manageCookie({
                action: 'set',
                name: `skeleton-visible-columns-${cookieKey}`,
                value: JSON.stringify(visibleColumns),
                days: 30 // Cookie expires in 30 days
              });
            });
            // Initialize refresh button
            const $refreshBtn = $controlsContainer.find('.skl-refresh-btn');
            $refreshBtn.off('click').on('click', () => reloadTableInternal(dataTable));
            
            // Initialize external date range button and modal
            const $dateRangeBtn = $controlsContainer.find('.skl-date-range-btn');
            const $dateRangeModal = jQuery(`#date-range-modal-${token}`);
            const $externalDateRangeInput = jQuery(`#external-date-range-${token}`);
            const $dateColumnSelect = jQuery(`#date-column-select-${token}`);
            const $applyDateRangeBtn = jQuery(`#apply-date-range-${token}`);
            const $clearDateRangeBtn = jQuery(`#clear-date-range-${token}`);

            // Update date range button appearance based on active filters
const updateDateRangeButtonState = () => {
  // Check if there are any actual date range filters (excluding the 'column' property)
  const dateRangeKeys = Object.keys(state.filters.dateRange || {}).filter(key => key !== 'column');
  const hasDateFilter = dateRangeKeys.length > 0 && dateRangeKeys.some(key => {
    const dateData = state.filters.dateRange[key];
    return dateData && dateData.from && dateData.to;
  });

  // Always keep skl-filter-btn class, only toggle skl-filter-btn-active
  if (hasDateFilter) {
    $dateRangeBtn.addClass('skl-filter-btn-active');
  } else {
    $dateRangeBtn.removeClass('skl-filter-btn-active');
  }

  // Always show calendar icon
  $dateRangeBtn.find('i').removeClass('fa-check').addClass('fa-calendar');
};

            // Apply date range filter
            $applyDateRangeBtn.off('click').on('click', () => {
              const dateRangeValue = $externalDateRangeInput.val();
              const selectedColumn = $dateColumnSelect.val();
              
              if (dateRangeValue && selectedColumn) {
                const [from, to] = dateRangeValue.split(' - ');
                if (from && to) {
                  state.filters.dateRange = {
                    [selectedColumn]: { from: from.trim(), to: to.trim() },
                    column: selectedColumn
                  };
                  
                  updateDateRangeButtonState();
                  bootstrap.Modal.getInstance($dateRangeModal[0]).hide();
                  
                  saveState();
                  dataTable.ajax.reload(() => displayFilterPills(), false);
                }
              }
            });

            // Clear date range filter
            $clearDateRangeBtn.off('click').on('click', () => {
              state.filters.dateRange = {};
              $externalDateRangeInput.val('');
              $dateColumnSelect.val('created_at');
              
              updateDateRangeButtonState();
              bootstrap.Modal.getInstance($dateRangeModal[0]).hide();
              
              saveState();
              dataTable.ajax.reload(() => displayFilterPills(), false);
            });

            // Restore external date range filter state
            const restoreExternalDateRange = () => {
              if (state.filters.dateRange && Object.keys(state.filters.dateRange).length > 0) {
                const column = state.filters.dateRange.column || 'created_at';
                const dateData = state.filters.dateRange[column];
                
                if (dateData && dateData.from && dateData.to) {
                  $dateColumnSelect.val(column);
                  $externalDateRangeInput.val(`${dateData.from} - ${dateData.to}`);
                }
                updateDateRangeButtonState();
              }
            };

            // Initialize external date range state
            restoreExternalDateRange();
            
            const $clearAllBtn = $element.find(`.skeleton-clear-all-${token}`);
            $clearAllBtn.off('click').on('click', () => {
              state.filters = {
                search: '',
                dateRange: {},
                columns: {},
                sort: {},
                pagination: { type: 'offset', page: 1, limit: state.filters.pagination.limit || 10 }
              };
              state.filters.columns = {};
              state.filters.search = '';
              state.filters.dateRange = {};
              state.filters.sort = {};
              state.filters.export={};
              $modalBody.find('.tagify-input').each(function () {
                const tagify = this.__tagify;
                if (tagify) tagify.removeAllTags();
              });
              jQuery(`#date-range-${token}`).val('');
              $externalDateRangeInput.val('');
              $dateColumnSelect.val('created_at');
              updateDateRangeButtonState();
              const exportSelect = document.querySelector(`#export-columns-${token}`);
                  if (exportSelect && exportSelect._choicesInstance) {
                      exportSelect._choicesInstance.removeActiveItems();
                  }
                  const selectAllCheckbox = document.getElementById(`select-all-${token}`);
                  if (selectAllCheckbox) {
                      selectAllCheckbox.checked = false;
                  }
              saveState();
              dataTable.ajax.reload(() => displayFilterPills(), false);
            });
            
            jQuery(`#filter-modal-${token}`).on('shown.bs.modal', function () {
              restoreFiltersColumns(token);
            });
            
            const $modalBody = jQuery(`#filter-modal-body-${token}`);
            const $applyFiltersBtn = jQuery(`#filter-modal-${token} .skeleton-apply-filters`);
           $applyFiltersBtn.off('click').on('click', function () {
            console.log(token);

              // Preserve external date range filter
              console.log("helloo");
              const existingExternalDateRange = { ...state.filters.dateRange };
              
              let filters = {
                search: $element.find('.skl-filter-search').val() || '',
                dateRange: existingExternalDateRange, // Preserve external date range
                columns: {},
                filterType: {},
                sort: state.filters.sort || {},
                pagination: state.filters.pagination || {
                  page: 1,
                  limit: 10
                },
                export: {},
                processId: generateProcessId()
              };

              // Handle internal date range filter (from main modal)
              const dateRangeValue = jQuery(`#date-range-${token}`).val();
              if (dateRangeValue) {
                const [from, to] = dateRangeValue.split(' - ');
                if (from && to) {
                  filters.dateRange = {
                    ...filters.dateRange,
                    created_at: { from, to }
                  };
                }
              }

              const exportColumns = jQuery(`#export-columns-${token}`).val() || [];
              const enableExport = jQuery(`#apply-export-${token}`).is(':checked');

              if (enableExport && exportColumns.length === 0) {
                window.general.showToast({
                  icon: 'error',
                  title: 'Validation Error',
                  message: 'Please select at least one column to export.',
                  duration: 5000
                });
                return;
              }

              filters.export = {
                columns: exportColumns,
                export: enableExport,
                processId: generateProcessId()
              };

              jQuery(`.adt-filter-${token}[name]`).each(function () {
                const $input = jQuery(this);
                const nameAttr = $input.attr('name');
                if (!nameAttr || nameAttr.startsWith('filter-type-')) return;

                const [, columnName] = nameAttr.split('::');
                const tagifyInstance = $input[0]?.tagify;
                let value = tagifyInstance
                  ? tagifyInstance.value.map(tag => tag.value)
                  : $input.val();

                if (value && value.length > 0) {
                  const valueArray = Array.isArray(value) ? value : [value];
                  filters.columns[columnName] = valueArray.join(',');

                  const rawId = `filter-type-${token}::${columnName}`;
                  const escapedSelector = `#${CSS.escape(rawId)}`;
                  const selectedType = jQuery(escapedSelector).val();

                  filters.filterType[columnName] = selectedType || 'strict';
                }
              });

              if (enableExport && exportColumns.length > 0) {
                listenProgress(filters.export.processId);
              }

              bootstrap.Modal.getInstance(document.getElementById(`filter-modal-${token}`)).hide();

              state.filters = filters;
              state.universalSelectAll = false;
              state.selectedIds = [];
              
              // Update external date range button state after applying filters
              updateDateRangeButtonState();
              
              dataTable.ajax.reload(() => {
                displayFilterPills();
                saveState();
              });
            });
            
            // Clear filters
            const $clearFiltersBtn = $element.find(`.skeleton-clear-filters`);
              $clearFiltersBtn.off('click').on('click', () => {
                  state.filters.columns = {};
                  state.filters.export = {};
                  state.filters.search = '';
                  state.filters.dateRange = {};
                  state.filters.sort = {};

                  jQuery(`#apply-export-${token}`).prop('checked', false); 
                  $modalBody.find('.tagify-input').each(function () {
                      const tagify = this.__tagify;
                      if (tagify) tagify.removeAllTags();
                  });
                  jQuery(`#date-range-${token}`).val('');
                 const exportSelect = document.querySelector(`#export-columns-${token}`);
                  if (exportSelect && exportSelect._choicesInstance) {
                      exportSelect._choicesInstance.removeActiveItems();
                  }

                  // Optional: reset "Select All" checkbox
                  const selectAllCheckbox = document.getElementById(`select-all-${token}`);
                  if (selectAllCheckbox) {
                      selectAllCheckbox.checked = false;
                  }
                  saveState();
                  dataTable.ajax.reload(() => displayFilterPills(), false);
              });

            displayFilterPills();
             $element.find(`.universal-select-all-${token}`).off('change').on('change', function () {
                const isChecked = $(this).is(':checked');
                state.universalSelectAll = isChecked;
                if (isChecked) {
                  state.selectedIds = [];
                }
                dataTable.draw(false);
                updateSelectedCount();
            });

          },
          drawCallback: () => {
            $(document).on('mouseenter', '.dt-button-collection', function () {
              const actCol = initialData.reqSet.act?.toLowerCase();
              $('.dt-button-collection a.buttons-columnVisibility').each(function () {
                const $a = $(this);
                const colName = $a.text().trim().toLowerCase();
                if (colName === actCol) {
                  $a.addClass('disabled-colvis');
                  $a.css({
                    pointerEvents: 'none',
                    opacity: 0.5,
                    cursor: 'not-allowed'
                  });
                }
              });
            });
            // Handle select-all checkbox
            $element.find('.select-all-checkbox').off('change').on('change', function () {
              const isChecked = $(this).is(':checked');
              dataTable.rows({ page: 'current' }).nodes().each(row => {
                $(row).find('.row-select').prop('checked', isChecked);
              });
              state.universalSelectAll = false;
              updateSelectedCount();
            });
            dataTable
              .rows({ page: 'current' })
              .nodes()
              .each(row => {
                const $rowSelect = jQuery(row).find('.row-select');
                if ($rowSelect.length) {
                  $rowSelect.off('change').on('change', () => {
                    updateSelectedCount();
                  });
                }
              });
            // Handle update selected button
            const $updateButton = $element.find('.skeleton-update-selected');
            $updateButton.off('click').on('click', () => {
              const selectedIds = [];
              
              // Get all visible rows
              dataTable.rows({ page: 'current' }).every(function() {
                const row = this.node();
                const $checkbox = $(row).find('.row-select:checked');
                if ($checkbox.length) {
                  const id = $checkbox.data('id');
                  if (id) {
                    selectedIds.push(id);
                  }
                }
              });
              
              if (selectedIds.length > 0) {
                window.general.log('Update selected IDs', { token, selectedIds });
                // Get the current URL
                const currentUrl = new URL(window.location.href);
                // Get the li_company_id from URL if it exists
                const liCompanyId = currentUrl.searchParams.get('li_company_id');
                
                // Get the table name from the data attribute or state
                const tableName = $element.data('skeleton-table-name') || 
                                 (state.reqSet && state.reqSet.table) || 
                                 'unq_tables';
                
                // Get the current table's data
                const tableData = dataTable.rows({ selected: true }).data().toArray();
                
                // Build the URL for the add form
                let addUrl = '/filters/add/unique_products';
                const params = new URLSearchParams();
                
                if (liCompanyId) {
                  params.append('li_company_id', liCompanyId);
                }
                
                // Add selected IDs as JSON string to preserve data types
                if (selectedIds.length > 0) {
                  // Get full row data for selected rows
                  const selectedRows = [];
                  dataTable.rows().every(function() {
                    const row = this.node();
                    const $checkbox = $(row).find('.row-select:checked');
                    if ($checkbox.length) {
                      const id = $checkbox.data('id');
                      if (id) {
                        const rowData = this.data();
                        selectedRows.push({
                          id: id,
                          data: rowData
                        });
                      }
                    }
                  });
                  
                  // Add the selected rows data as JSON
                  params.append('selected_data', JSON.stringify(selectedRows));
                  
                  // Also add the IDs as comma-separated for backward compatibility
                  params.append('ids', selectedIds.join(','));
                }
                
                // Add the table name and token
                params.append('type', tableName);
                params.append('save_token', token);
                
                // Add source table info if available
                if (state.reqSet && state.reqSet.table) {
                  params.append('source_table', state.reqSet.table);
                }
                
                // Redirect to the add form with selected IDs and parameters
                window.location.href = `${addUrl}?${params.toString()}`;
              } else {
                window.general.warningToast('Warning', 'Please select at least one record to create a product');
              }
            });
            // Handle delete selected button
            const $deleteButton = $element.find('.skeleton-delete-selected');
            $deleteButton.off('click', () => {
              const selectedIds = $element
                .find('.row-select:checked')
                .map(function () {
                  return jQuery(this).data('id');
                })
                .get();
              if (selectedIds.length) {
                window.general.log('Delete selected IDs', { token, selectedIds });
                // Implement delete action (e.g., POST to /skeleton-action/delete)
              } else {
                window.general.warningToast('Warning', 'No rows selected');
              }
            });
            updateSelectedCount();
            displayFilterPills();
          }
        });
        // Handle search event
        dataTable.on('search.dt', () => {
          const searchValue = dataTable.search();
          const sanitizedSearch = window.general.sanitizeInput(searchValue || '');
          if (state.filters.search !== sanitizedSearch) {
            state.filters.search = sanitizedSearch;
            // 
            dataTable.ajax.reload(() => displayFilterPills(), false);
          }
        });
        dataTable.on('draw', function () {
            const rows = dataTable.rows({ page: 'current' }).nodes();

            if (state.universalSelectAll) {
              // Select all visible checkboxes
              $(rows).find('.row-select').prop('checked', true);
            } else {
              // Restore based on manually selected IDs
              $(rows).find('.row-select').each(function () {
                const id = $(this).data('id');
                $(this).prop('checked', state.selectedIds.includes(id));
              });
            }
            updateSelectedCount(); // Refresh count display
          });
        // Handle page length change
        dataTable.on('length.dt', (e, settings, len) => {
          state.filters.pagination.limit = len;
          
          dataTable.ajax.reload(() => displayFilterPills(), false);
        });
        // Handle page change
        dataTable.on('page.dt', () => {
          const info = dataTable.page.info();
          state.filters.pagination.page = info.page + 1;
        });
        // Handle filter pill removal
        $element.off('click', '.skeleton-pill-btn').on('click', '.skeleton-pill-btn', function () {
        const $btn = jQuery(this);
        const filterKey = $btn.data('filter');
        const value = String($btn.data('value')).trim();

        if (filterKey === 'search') {
          state.filters.search = '';
          dataTable.search('').draw();

        } else if (filterKey.startsWith('date_')) {
          delete state.filters.dateRange;
          jQuery(`#date-range-${token}`).val('');

        } else if (filterKey.startsWith('sort_')) {
          const col = filterKey.replace('sort_', '');
          delete state.filters.sort[col];
        } else {
          const col = filterKey;
          if (state.filters.columns[col] !== undefined) {
            const raw = state.filters.columns[col];
            const values = String(raw)
              .split(',')
              .map(v => v.trim())
              .filter(v => v.length > 0);

            const newValues = values.filter(v => v !== value);
            if (newValues.length > 0) {
              state.filters.columns[col] = newValues.join(',');
            } else {
              delete state.filters.columns[col];
            }

            // Locate input by ID and remove tag from Tagify if it exists
            const inputSelector = `#adt-filter-${token}-${col}`;
            const $input = jQuery(inputSelector);
            if ($input.length) {
              const tagify = $input[0]?.tagify;
              if (tagify) {
                const allTags = tagify.value;
                const tagToRemove = allTags.find(tag => String(tag.value).trim() === value);
                if (tagToRemove) {
                  tagify.removeTags([tagToRemove.value]);
                }
              }
            }
            const $select2 = jQuery(`select#adt-filter-${token}-${col}`);
            if ($select2.length && $select2.hasClass('select2-hidden-accessible')) {
              let selected = $select2.val() || [];
              selected = Array.isArray(selected) ? selected : [selected];
              const updated = selected.filter(v => String(v).trim() !== value);
              $select2.val(updated).trigger('change');
            }
          }
        }
        saveState();
        displayFilterPills();
        dataTable.ajax.reload(null, false);
      });
      function restoreFiltersColumns(token) {
        if (!state.filters || !state.filters.columns) return;

        const columns = state.filters.columns;
        const exportValues = state.filters.export?.columns || [];
        const filterTypes = state.filters.filterType || {};

        for (const [col, val] of Object.entries(columns)) {
          if (!val || !val.length) continue;
          const values = String(val).split(',').map(v => v.trim()).filter(v => v.length > 0);
          const $tagInput = jQuery(`#adt-filter-${token}-${col}`);
          if ($tagInput.length && $tagInput[0].__tagify) {
            const tagify = $tagInput[0].__tagify;
            const tags = values.map(v => ({ value: v }));
            tagify.removeAllTags();
            tagify.addTags(tags);
          }
          else if ($tagInput.length && $tagInput.hasClass('select2-hidden-accessible')) {
            $tagInput.val(values).trigger('change');
          }
          else if ($tagInput.length) {
            $tagInput.val(values.join(','));
          }

          const rawFilterName = `${token}::${col}`;
          const safeFilterName = rawFilterName.replace(/:/g, '\\:');
          const $typeSelect = jQuery(`#filter-type-${safeFilterName}`);
          if ($typeSelect.length) {
            const type = filterTypes[col] || 'strict';
            $typeSelect.val(type).trigger('change');
          }
        }

        // --- Restore Export Columns (multi-select) ---
        const $exportSelect = jQuery(`#export-columns-${token}`);
        if ($exportSelect.length && $exportSelect.hasClass('select2-hidden-accessible')) {
          $exportSelect.val(exportValues).trigger('change');
        }

        // --- Restore Export Checkbox ---
        const $exportCheckbox = jQuery(`#apply-export-${token}`);
        if ($exportCheckbox.length) {
          $exportCheckbox.prop('checked', false);
        }
        // --- Restore Date Range ---
        const dateRange = state.filters.dateRange?.created_at;
        if (dateRange && dateRange.from && dateRange.to) {
          const $dateRangeInput = jQuery(`#date-range-${token}`);
          const picker = $dateRangeInput.data('daterangepicker');
          if ($dateRangeInput.length && picker) {
            picker.setStartDate(dateRange.from);
            picker.setEndDate(dateRange.to);
            $dateRangeInput.val(`${dateRange.from} - ${dateRange.to}`).trigger('change');
          
          }
        }

      }

      })
      .catch(e => {
        $element.html(`
          <div class="alert alert-danger d-flex align-items-center justify-content-center p-3 mb-3 rounded" role="alert" style="font-size: 1rem;">
            <i class="fas fa-exclamation-circle me-2" style="font-size: 1.2rem;"></i>
            <span>Failed to load data: ${window.general.sanitizeInput(e.message)}.</span>
          </div>
        `);
        window.general.errorToast('Failed to initialize table');
      });
  });
  

}
/**
 * Reloads a DataTable by its token.
 * @param {string} token - The unique token for the DataTable.
 */
export function reloadTable(token) {
  if (!token) {
    window.general.errorToast('No token provided for table reload');
    return;
  }
  const $table = jQuery(`#skeleton-table-${token}`);
  if (!$table.length) {
    window.general.errorToast('Table not found for the provided token');
    return;
  }
  const dataTable = this.dataTableMap?.get(token);
  if (!dataTable) {
    window.general.errorToast('DataTable instance not initialized');
    return;
  }
  const $refreshBtn = $table.closest('.skeleton-view-container').find('.skl-refresh-btn');
  if ($refreshBtn.length) {
    $refreshBtn.find('i').addClass('fa-spin');
  }
  dataTable.ajax.reload(() => {
    if ($refreshBtn.length) {
      $refreshBtn.find('i').removeClass('fa-spin');
    }
  }, false);
}


function clientsCount(response){
  const totalRecords=document.querySelector('#totalCount');

        const filterRecords=document.querySelector('#filterRecords');
        if(totalRecords || filterRecords){
            totalRecords.innerHTML=response.recordsTotal;
            filterRecords.innerHTML=response.recordsFiltered;
        }
        const btnTotalCompanies = document.getElementById('btnTotalCompanies');
        const display = document.getElementById('totalCompanies');
        const btnFilteredCompanies = document.getElementById('btnFilteredCompanies');
        const filterCompanies = document.getElementById('filterCompanies');
        if(btnTotalCompanies){
          btnTotalCompanies.classList.remove('d-none');
        }
        if(display){
          display.classList.add('d-none');
        }
        if(btnFilteredCompanies){
           btnFilteredCompanies.classList.remove('d-none');
        }
        if(filterCompanies){
          filterCompanies.classList.add('d-none');
        }

        if (response.company_queries) {
        const totalQuery = response.company_queries.total?.sql || '';
        const filteredQuery = response.company_queries.filtered?.sql || '';
        const totalBindings = response.company_queries.total?.bindings || [];
        const filteredBindings = response.company_queries.filtered?.bindings || [];
        const totalQueryInput = document.querySelector('#total_companies input[name="total_comapanies"]');
        const totalBindingsInput = document.querySelector('#total_companies input[name="total_bindings"]');
        const filteredQueryInput = document.querySelector('#filtered_companies input[name="filtered_companies"]');
        const filteredBindingsInput = document.querySelector('#filtered_companies input[name="filtered_bindings"]');
        const filteredProcessId = document.querySelector('#filtered_companies input[name="processId"]');
        const totalProcessId = document.querySelector('#total_companies input[name="processId"]');
        
        if (totalQueryInput) totalQueryInput.value = totalQuery;
        if (totalBindingsInput) totalBindingsInput.value = JSON.stringify(totalBindings);
        if (filteredQueryInput) filteredQueryInput.value = filteredQuery;
        if (filteredBindingsInput) filteredBindingsInput.value = JSON.stringify(filteredBindings);
        let processId=generateProcessId();
         
        if (filteredProcessId) filteredProcessId.value = processId;
        if (totalProcessId) totalProcessId.value = processId;
        listenCount(processId);

      }
}