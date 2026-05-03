import { select } from "./select";
import { pills } from "./pills";
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
        sort: {},
        pagination: { type: 'offset', page: 1, limit: 10 }
      },
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      columns: [],
      selectedCount: 0
    };
    // State management functions
    const loadState = () => {
      const saved = window.general.manageCookie({ action: 'get', name: `skeleton-state-${token}` });
      if (saved) {
        state.filters = { ...state.filters, ...saved };
        if (Array.isArray(state.filters.columns)) state.filters.columns = {};
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
      const checkedCount = $element.find('.row-select:checked').length;
      state.selectedCount = checkedCount;
      $element.find('.action-icons').toggleClass('d-none', checkedCount === 0);
      const $selectAll = $element.find('.select-all-checkbox');
      const totalRows = $element.find('.row-select').length;
      $selectAll.prop('checked', checkedCount === totalRows && totalRows > 0);
      $selectAll.prop('indeterminate', checkedCount > 0 && checkedCount < totalRows);
    };
    // Displays filter pills
    function displayFilterPills() {
  const $pillContainer = jQuery(`.filters-pill-container-${token}`);
  $pillContainer.empty();
  let pillCount = 0;

  // Helper to create pill HTML
  const createPill = (label, filterKey, value, filterType = 'strict') => {
    return `
      <span class="badge bg-primary me-1 mb-1 skeleton-pill-btn" 
            data-filter="${filterKey}" 
            data-value="${value}"
            data-filter-type="${filterType}"
            title="Filter type: ${filterType}">
        ${label} <i class="fa fa-times ms-1"></i>
      </span>
    `;
  };

  // 🔍 Search filter
  if (state.filters.search) {
    $pillContainer.append(createPill(
      `Search: ${state.filters.search}`,
      'search',
      state.filters.search,
      'partial'
    ));
    pillCount++;
  }

  // 📆 Date range filter
  if (state.filters.dateRange?.created_at) {
    const { from, to } = state.filters.dateRange.created_at;
    $pillContainer.append(createPill(
      `Date: ${from} to ${to}`,
      'date_created_at',
      `${from}-${to}`
    ));
    pillCount++;
  }

  // 🧱 Column filters
  Object.entries(state.filters.columns).forEach(([column, filterObj]) => {
    const values = filterObj?.search?.value || [];
    const filterType = state.filters.columnFilterTypes?.[column] || 'strict';
    const columnName = state.columns.find(c => c.data === column)?.title || column;

    values.forEach(value => {
      $pillContainer.append(createPill(
        `${columnName}: ${value}`,
        column,
        value,
        filterType
      ));
      pillCount++;
    });
  });

  // 🔢 Update filter count
  jQuery(`.filters-applied-${token} h6 .text-danger`).text(pillCount);
}

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
    $element.html(generateDataTableLoading(Array(5).fill({})));
    fetchData(state.filters, 1)
      .then(initialData => {
        // Update state with initial data
        state.data = initialData.data || [];
        state.recordsTotal = initialData.recordsTotal || 0;
        state.recordsFiltered = initialData.recordsFiltered || 0;
        state.columns = initialData.columns || [];
        // Validate columns
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
          <div class="modal fade" id="filter-modal-${token}" tabindex="-1" aria-labelledby="filterModalLabel-${token}" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg resizable-modal">
              <div class="modal-content draggable-modal">
                <div class="modal-header skeleton-modal-header">
                  <div class="skeleton-mdl-hdr-lbl-grp">
                    <button type="button" class="btn modal-drag-handle"><span>⋮⋮</span></button>
                    <h5 class="modal-title skeleton-modal-label m-0" id="filterModalLabel-${token}">Apply Filters</h5>
                  </div>
                  <div class="skeleton-mdl-hdr-btn-grp">
                    <button type="button" data-bs-dismiss="modal" aria-label="Close"><i class="fa fa-times" aria-hidden="true"></i></button>
                  </div>
                </div>
                <div class="modal-body py-1" id="filter-modal-body-${token}">${initialData.filters.set_2}</div>
                <div class="modal-footer mt-0 border border-top-0 pt-2">
                    <button type="button" class="btn btn-secondary skeleton-clear-filters" data-bs-dismiss="modal" aria-label="Close">Clear</button>
                    <button type="button" class="btn btn-primary skeleton-apply-filters">Apply</button>
                </div>
              </div>
            </div>
          </div>
        `);
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
        // Initialize DataTable
        let $currentRow; // define row holder outside the loop
        let filterCount = 0; // to track how many filters added in the current row
        const dataTable = $tableElement.DataTable({
          dom: '<"row data-table"<"col-sm-12 col-md-6 d-flex align-items-end"l><"col-sm-12 col-md-6 d-flex justify-content-end align-items-end">>t<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
          serverSide: true,
          processing: true,
          scrollX: true,
          scrollY: '700px',
          scrollCollapse: true,
          paging: true,
          ajax: (d, callback) => {
            const tableFilters = {
              search: window.general.sanitizeInput(d.search.value || ''),
              dateRange: state.filters.dateRange,
              columns: state.filters.columns,
              columnFilterTypes: state.filters.columnFilterTypes || {}, // Include filter types
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
              }
            };
            fetchData(tableFilters, d.draw)
              .then(data => {
                state.data = data.data;
                state.recordsTotal = data.recordsTotal;
                state.filters.search = tableFilters.search;
                state.filters.pagination = tableFilters.pagination;
                
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
            lengthMenu: 'Showing _MENU_ entries per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ records',
            infoEmpty: 'No records available',
            infoFiltered: '(filtered from _MAX_ total records)',
            paginate: {
              first: '<i class="ti ti-chevrons-left" title="First"></i>',
              last: '<i class="ti ti-chevrons-right" title="Last"></i>',
              next: '<i class="ti ti-chevron-right" title="Next"></i>',
              previous: '<i class="ti ti-chevron-left" title="Previous"></i>'
            }
          },
          // In the initComplete function, update the Apply Filters button handler
          initComplete: () => {
            select();
            pills();
            // Store DataTable instance
            this.dataTableMap = this.dataTableMap || new Map();
            this.dataTableMap.set(token, dataTable);

            // Render control elements
            const $controlsContainer = $element.find('.row.data-table .col-md-6:last-child');
            $controlsContainer.html(initialData.filters.set_1);

            // Add filters container row directly after search row
            const $searchRow = $element.find('.row').first();
            const $filtersRow = jQuery(`
              <div class="row filters-row-${token}">
                <div class="col-md-12 d-flex justify-content-between align-items-center">
                  <div class="filters-pill-container-${token} d-flex flex-wrap my-1"></div>
                  <button class="btn btn-link text-danger text-decoration-none sf-12 skeleton-clear-all-${token}" title="Clear All Filters">
                    Clear all filters
                  </button>
                </div>
              </div>
            `);
            $searchRow.after($filtersRow);

            // Initialize search input
            const $searchInput = $controlsContainer.find('input[type="search"]');
            if ($searchInput.length) {
              const debouncedSearch = debounce(() => dataTable.search($searchInput.val()).draw(), window.general.debounceDelay);
              $searchInput.val(state.filters.search || '');
              $searchInput.off('input').on('input', debouncedSearch);
            }

            // Initialize refresh button
            const $refreshBtn = $controlsContainer.find('.skl-refresh-btn');
            $refreshBtn.off('click').on('click', () => reloadTableInternal(dataTable));

            // Initialize clear-all button
            const $clearAllBtn = $element.find(`.skeleton-clear-all-${token}`);
            $clearAllBtn.off('click').on('click', () => {
              state.filters = {
                search: '',
                dateRange: {},
                columns: {},
                sort: {},
                pagination: { type: 'offset', page: 1, limit: state.filters.pagination.limit || 10 }
              };
              
              dataTable.ajax.reload(() => displayFilterPills(), false);
            });

            // Initialize filter modal
            let tempColumns = JSON.parse(JSON.stringify(state.filters.columns));
            const $modalBody = jQuery(`#filter-modal-body-${token}`);

            // Initialize date picker
            this.datePicker();

            // Apply filters
            const $applyFiltersBtn = jQuery(`.skeleton-apply-filters`);
          $applyFiltersBtn.off('click').on('click', function () {
            let filters = {
              search: $element.find('.skl-filter-search').val() || '',
              dateRange: {},
              columns: {},
              columnFilterTypes: {},
              sort: state.filters.sort || {},
              pagination: state.filters.pagination || {
                page: 1,
                limit: 10
              }
            };

            // 📆 Handle date range
            const dateRangeValue = jQuery(`#adt-date-filter-${token}`).val();
            if (dateRangeValue) {
              const [from, to] = dateRangeValue.split(' - ');
              if (from && to) {
                filters.dateRange = {
                  created_at: { from, to }
                };
              }
            }

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
                  filters.columns[columnName] = `"${valueArray.join('","')}"`; 
                  const filterType = jQuery(`#filter-type-${token}_${columnName}`).val();
                  filters.columnFilterTypes[columnName] = filterType || 'strict';
                }
            });
            console.log('🔍 Final Filters:', filters);
            state.filters = filters;
            dataTable.ajax.reload(() => {
              displayFilterPills();
              bootstrap.Modal.getInstance(document.getElementById(`filter-modal-${token}`)).hide();
            });
          });


            // Clear filters
            const $clearFiltersBtn = jQuery(`.skeleton-clear-filters`);
            $clearFiltersBtn.off('click').on('click', () => {
              state.filters.columns = {};
              state.filters.search = '';
              state.filters.dateRange = {};
              state.filters.sort = {};
              state.filters.columnFilterTypes = {};
              tempColumns = {};
              $modalBody.find('.tagify-input').each(function () {
                const tagify = this.__tagify;
                if (tagify) tagify.removeAllTags();
              });
              jQuery(`#adt-date-filter-${token}`).val('');
              
              dataTable.ajax.reload(() => displayFilterPills(), false);
            });

            // Render pills
            displayFilterPills();
          },
          drawCallback: () => {
            // Handle select-all checkbox
            const $selectAll = $element.find('.select-all-checkbox');
            if ($selectAll.length) {
              $selectAll.off('change').on('change', function () {
                const isChecked = jQuery(this).prop('checked');
                dataTable
                  .rows({ page: 'current' })
                  .nodes()
                  .each(row => {
                    const $checkbox = jQuery(row).find('.row-select');
                    $checkbox.prop('checked', isChecked);
                  });
                updateSelectedCount();
              });
            }
            // Handle individual row selection
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
              const selectedIds = $element
                .find('.row-select:checked')
                .map(function () {
                  return jQuery(this).data('id');
                })
                .get();
              if (selectedIds.length) {
                window.general.log('Update selected IDs', { token, selectedIds });
                // Implement update action (e.g., POST to /skeleton-action/update)
              } else {
                window.general.warningToast('Warning', 'No rows selected');
              }
            });
            // Handle delete selected button
            const $deleteButton = $element.find('.skeleton-delete-selected');
            $deleteButton.off('click').on('click', () => {
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
          const value = $btn.data('value');
          
          if (filterKey === 'search') {
            state.filters.search = '';
            dataTable.search('').draw();
          } 
          else if (filterKey === 'date_created_at') {
            delete state.filters.dateRange.created_at;
            jQuery(`#adt-date-filter-${token}`).val('');
          } 
          else {
            // Handle column filters
            if (state.filters.columns[filterKey] !== undefined) {
              let currentFilter = state.filters.columns[filterKey];
              
              // Remove value from array or string
              if (Array.isArray(currentFilter)) {
                currentFilter = currentFilter.filter(v => v !== value);
                if (currentFilter.length > 0) {
                  state.filters.columns[filterKey] = currentFilter;
                } else {
                  delete state.filters.columns[filterKey];
                  delete state.filters.columnFilterTypes[filterKey];
                }
              } else if (currentFilter === value) {
                delete state.filters.columns[filterKey];
                delete state.filters.columnFilterTypes[filterKey];
              }
              
              // Clear corresponding input in modal
              const columnIndex = state.columns.findIndex(c => c.data === filterKey);
              if (columnIndex !== -1) {
                const $input = jQuery(`#filter-modal-body-${token} input[name="${token}_${filterKey}"]`);
                if ($input.length) {
                  const tagify = $input[0].__tagify;
                  if (tagify) {
                    tagify.removeTags([{ value }]);
                  } else {
                    $input.val('');
                  }
                }
                
                // Reset filter type dropdown if no values left
                if (!state.filters.columns[filterKey]) {
                  jQuery(`#filter-type-${token}_${filterKey}`).val('strict').trigger('change');
                }
              }
            }
          }
          
          
          displayFilterPills();
          dataTable.ajax.reload(null, false);
        });
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