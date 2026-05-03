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
    // Displays filter pills in the UI
    const displayFilterPills = () => {
      const $container = $element.find(`.filters-pill-container-${token}`);
      if (!$container.length) return;
      $container.empty();
      let count = 0;
      // Search filter pill
      if (state.filters.search) {
        count++;
        $container.append(`
          <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
            Search: ${window.general.sanitizeInput(state.filters.search)}
            <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="search" aria-label="Remove search filter"></button>
          </span>
        `);
      }
      // Column filter pills
      Object.entries(state.filters.columns).forEach(([col, value]) => {
        const colDef = state.columns.find(c => c.data === col);
        if (colDef) {
          const values = Array.isArray(value) ? value : [value];
          values.forEach(v => {
            count++;
            $container.append(`
              <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
                ${window.general.sanitizeInput(colDef.title)}: ${window.general.sanitizeInput(v)}
                <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="${col}" data-value="${window.general.sanitizeInput(v)}" aria-label="Remove filter"></button>
              </span>
            `);
          });
        }
      });
      // Date range filter pill
      if (state.filters.dateRange.created_at) {
        const { from, to } = state.filters.dateRange.created_at;
        if (from && to) {
          count++;
          $container.append(`
            <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
              Date: ${window.general.sanitizeInput(from)} to ${window.general.sanitizeInput(to)}
              <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="date_created_at" data-value="${window.general.sanitizeInput(from)}-${window.general.sanitizeInput(to)}" aria-label="Remove date filter"></button>
            </span>
          `);
        }
      }
      // Sort filter pills
      Object.entries(state.filters.sort).forEach(([col, order]) => {
        const colDef = state.columns.find(c => c.data === col);
        if (colDef) {
          count++;
          $container.append(`
            <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
              Sort ${window.general.sanitizeInput(colDef.title)}: ${order}
              <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="sort_${col}" data-value="${col}:${order}" aria-label="Remove sort filter"></button>
            </span>
          `);
        }
      });
      // Toggle visibility of filter container and clear-all button
      $container.css('display', count > 0 ? 'flex' : 'none');
      $element.find(`.skeleton-clear-all-${token}`).css('display', count > 0 ? 'inline-block' : 'none');
    };
    // Applies or removes column filters
    const applyFilter = (tempColumns, columnIndex, values, isRemove = false) => {
      const col = state.columns[columnIndex];
      if (!col || !col.searchable || col.data === 'selection' || col.data === 'actions') {
        return tempColumns;
      }
      if (isRemove) {
        if (tempColumns[col.data]) {
          if (Array.isArray(tempColumns[col.data])) {
            tempColumns[col.data] = tempColumns[col.data].filter(v => v !== values[0]);
            if (tempColumns[col.data].length === 0) delete tempColumns[col.data];
          } else if (tempColumns[col.data] === values[0]) {
            delete tempColumns[col.data];
          }
        }
      } else if (values.length) {
        tempColumns[col.data] = values.length > 1 ? [...new Set(values)] : values[0];
      }
      return tempColumns;
    };
    // Applies date range filter
    const applyDateRange = (fromDate, toDate) => {
      if (!fromDate || !toDate) {
        delete state.filters.dateRange.created_at;
        return false;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        window.general.errorToast('Error', 'From date cannot be after to date');
        return false;
      }
      state.filters.dateRange.created_at = { from: fromDate, to: toDate };
      saveState();
      return true;
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
        saveState();
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
                <div class="modal-body py-1" id="filter-modal-body-${token}">${initialData.filter.set_2}</div>
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
                saveState();
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
          initComplete: () => {
            // Store DataTable instance
            this.dataTableMap = this.dataTableMap || new Map();
            this.dataTableMap.set(token, dataTable);
            // Render control elements
            const $controlsContainer = $element.find('.row.data-table .col-md-6:last-child');
            $controlsContainer.html(`
              <div class="d-flex flex-column align-items-end">
                <div class="d-flex align-items-center flex-wrap">
                  <div class="action-icons d-none me-2">
                    <button class="skl-filter-btn btn-outline-warning skeleton-update-selected" title="Edit Selected">
                      <i class="fa fa-edit"></i>
                    </button>
                    <button class="skl-filter-btn btn-outline-danger skeleton-delete-selected" title="Delete Selected">
                      <i class="fa fa-trash"></i>
                    </button>
                  </div>
                  <div class="d-flex flex-row align-items-end">
                    <input type="search" class="skl-filter-search" placeholder="Search..." aria-controls="skeleton-table-${token}">
                    <button class="skl-filter-btn skl-refresh-btn" type="button" title="Refresh Table">
                      <i class="fa fa-refresh"></i>
                    </button>
                    <button class="skl-filter-btn" data-bs-toggle="modal" data-bs-target="#filter-modal-${token}" type="button" title="Filter Table">
                      <i class="fa fa-filter"></i>
                    </button>
                  </div>
                </div>
              </div>
            `);
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
              saveState();
              dataTable.ajax.reload(() => displayFilterPills(), false);
            });
            // Initialize filter modal
            let tempColumns = JSON.parse(JSON.stringify(state.filters.columns));
            const $modalBody = jQuery(`#filter-modal-body-${token}`);
            const dateRangeValue = state.filters.dateRange.created_at
              ? `${state.filters.dateRange.created_at.from} - ${state.filters.dateRange.created_at.to}`
              : '';
            $modalBody.html(`
              <div class="mb-2">
                <div class="float-input-control">
                  <input type="text" class="form-float-input" data-date-picker="range" data-date-picker-allow="past-range" id="date-range-${token}" value="${window.general.sanitizeInput(dateRangeValue)}" placeholder="Select date range">
                  <label class="form-float-label">Date Range</label>
                </div>
              </div>
            `);
            // Initialize date picker
            this.datePicker();
            // Add column filters
            state.columns.forEach((col, i) => {
              if (
                col.searchable &&
                col.data !== 'selection' &&
                col.data !== 'actions' &&
                col.data !== 'created_at'
              ) {
                const title = col.title || col.data;
                // Start a new row every 2 filters
                if (filterCount % 2 === 0) {
                  $currentRow = jQuery('<div>', { class: 'row g-2' });
                  $modalBody.append($currentRow);
                }
                const $filterGroup = jQuery('<div>', { class: 'col-md-6' }).html(`
                  <label class="sf-12 ms-1 text-primary">${window.general.sanitizeInput(title)}</label>
                  <input type="text" class="form-control h-auto" data-tagify data-index="${i}" placeholder="${window.general.sanitizeInput(title)}">
                `);
                $currentRow.append($filterGroup);
                filterCount++;
                const $tagifyInput = $filterGroup.find('[data-tagify]');
                try {
                  const tagify = new Tagify($tagifyInput[0], {
                    enforceWhitelist: false,
                    delimiters: ',',
                    editTags: 1,
                    dropdown: { enabled: 0 },
                    callbacks: {
                      add: e => {
                        const tags = e.detail.tagify.value.map(t => t.value);
                        tempColumns = applyFilter(tempColumns, i, tags);
                      },
                      remove: e => {
                        const tag = e.detail.data ? e.detail.data.value : null;
                        if (tag) {
                          tempColumns = applyFilter(tempColumns, i, [tag], true);
                        }
                      }
                    }
                  });
                  // Restore existing filter values
                  const existingValue = state.filters.columns[col.data];
                  if (existingValue) {
                    const values = Array.isArray(existingValue) ? existingValue : [existingValue];
                    tagify.addTags(values);
                  }
                } catch (e) {
                  window.general.errorToast('Error initializing filter input');
                }
              }
            });
            // Apply filters
            const $applyFiltersBtn = jQuery(`#filter-modal-${token} .skeleton-apply-filters`);
            $applyFiltersBtn.off('click').on('click', () => {
              const dateRangeInput = jQuery(`#date-range-${token}`).val();
              let isValid = true;
              if (dateRangeInput) {
                const [from, to] = dateRangeInput.split(' - ').map(d => d.trim());
                isValid = applyDateRange(from, to);
              } else {
                delete state.filters.dateRange.created_at;
              }
              if (isValid) {
                state.filters.columns = JSON.parse(JSON.stringify(tempColumns));
                saveState();
                dataTable.ajax.reload(() => displayFilterPills(), false);
                bootstrap.Modal.getInstance(jQuery(`#filter-modal-${token}`)[0]).hide();
              }
            });
            // Clear filters
            const $clearFiltersBtn = jQuery(`#filter-modal-${token} .skeleton-clear-filters`);
            $clearFiltersBtn.off('click').on('click', () => {
              state.filters.columns = {};
              state.filters.search = '';
              state.filters.dateRange = {};
              state.filters.sort = {};
              tempColumns = {};
              $modalBody.find('.tagify-input').each(function () {
                const tagify = this.__tagify;
                if (tagify) tagify.removeAllTags();
              });
              jQuery(`#date-range-${token}`).val('');
              saveState();
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
            saveState();
            dataTable.ajax.reload(() => displayFilterPills(), false);
          }
        });
        // Handle page length change
        dataTable.on('length.dt', (e, settings, len) => {
          state.filters.pagination.limit = len;
          saveState();
          dataTable.ajax.reload(() => displayFilterPills(), false);
        });
        // Handle page change
        dataTable.on('page.dt', () => {
          const info = dataTable.page.info();
          state.filters.pagination.page = info.page + 1;
          saveState();
        });
        // Handle filter pill removal
        $element.off('click', '.skeleton-pill-btn').on('click', '.skeleton-pill-btn', function () {
          const $btn = jQuery(this);
          const filterKey = $btn.data('filter');
          const value = $btn.data('value');
          if (filterKey === 'search') {
            state.filters.search = '';
            dataTable.search('').draw();
          } else if (filterKey.startsWith('date_')) {
            delete state.filters.dateRange.created_at;
            jQuery(`#date-range-${token}`).val('');
          } else if (filterKey.startsWith('sort_')) {
            const [field] = value.split(':');
            delete state.filters.sort[field];
          } else {
            const col = state.columns.find(c => c.data === filterKey);
            if (col && state.filters.columns[filterKey] !== undefined) {
              let currentFilter = state.filters.columns[filterKey];
              // If stored as stringified array, parse it
              if (typeof currentFilter === 'string') {
                try {
                  currentFilter = JSON.parse(currentFilter);
                } catch (_) {
                  // do nothing if not valid JSON
                }
              }
              // Remove value from array or string
              if (Array.isArray(currentFilter)) {
                currentFilter = currentFilter.filter(v => v !== value);
                if (currentFilter.length > 0) {
                  state.filters.columns[filterKey] = currentFilter;
                } else {
                  delete state.filters.columns[filterKey];
                }
              } else if (currentFilter === value) {
                delete state.filters.columns[filterKey];
              }
              // Clear tagify input if present
              const colIndex = state.columns.findIndex(c => c.data === filterKey);
              const $input = jQuery(`#filter-modal-body-${token} input[data-index="${colIndex}"]`);
              if ($input.length) {
                const tagify = $input[0].__tagify;
                if (tagify) {
                  tagify.removeTags([{ value }]);
                }
              }
            }
          }
          saveState();
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