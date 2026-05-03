/**
 * Custom DataTable UI System
 * Extracts visual components from DataTables while allowing full customization
 * Created for UNQ Project - ChronoSpark Solutions
 */

class CustomDataTableUI {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;

    if (!this.container) {
      console.error('CustomDataTableUI: Container not found:', container);
      throw new Error('Container not found: ' + container);
    }

    this.options = {
      columns: options.columns || [],
      data: options.data || [],
      showFilters: options.showFilters !== false,
      showSearch: options.showSearch !== false,
      showPagination: options.showPagination !== false,
      showLengthControl: options.showLengthControl !== false,
      showCheckboxes: options.showCheckboxes !== false,
      idField: options.idField || 'id',
      customActions: options.customActions || [],
      pageSize: options.pageSize || 10,
      pageSizes: options.pageSizes || [10, 25, 50, 100],
      onRowAction: options.onRowAction || null,
      onFilterChange: options.onFilterChange || null,
      onSearchChange: options.onSearchChange || null,
      onPageChange: options.onPageChange || null,
      onSelectionChange: options.onSelectionChange || null,
      onBulkDelete: options.onBulkDelete || null,
      onRefresh: options.onRefresh || null,
      loadingTemplate: options.loadingTemplate || null,
      emptyTemplate: options.emptyTemplate || null,
      ...options
    };

    this.currentPage = 1;
    this.currentPageSize = this.options.pageSize;
    this.filteredData = [...this.options.data];
    this.filters = {};
    this.searchTerm = '';
    this.selectedRows = new Set();
    this.selectAllState = false;

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.updateTable();
  }

  render() {
    console.log('Rendering table with pagination...');
    const paginationHTML = this.renderPagination();
    console.log('Initial pagination HTML:', paginationHTML ? 'Generated' : 'Empty');

    const tableHTML = `
      <div class="skeleton-view-container">
        ${this.renderControls()}
        ${this.renderFilters()}
        ${this.renderTable()}
        ${paginationHTML}
      </div>
      ${this.renderFilterModal()}
    `;

    this.container.innerHTML = tableHTML;
    console.log('Table rendered with pagination');
  }

  renderControls() {
    if (!this.options.showSearch && !this.options.showLengthControl && this.options.customActions.length === 0) {
      return '';
    }

    return `
      <div class="row data-table">
        <div class="col-sm-12 col-md-6 d-flex align-items-end">
          ${this.options.showLengthControl ? this.renderLengthControl() : ''}
        </div>
        <div class="col-sm-12 col-md-6 d-flex justify-content-end align-items-end">
          ${this.renderActionButtons()}
          ${this.options.showSearch ? this.renderSearchInput() : ''}
        </div>
      </div>
    `;
  }

  renderLengthControl() {
    return `
      <div class="dt-length">
        <label>Show 
          <select class="form-select form-select-sm page-size-select">
            ${this.options.pageSizes.map(size =>
      `<option value="${size}" ${size === this.currentPageSize ? 'selected' : ''}>${size}</option>`
    ).join('')}
          </select> entries
        </label>
      </div>
    `;
  }

  renderActionButtons() {
    const deleteButton = this.options.showCheckboxes ? `
      <button class="btn btn-outline-danger btn-sm delete-selected-btn" title="Delete Selected (0)" disabled>
        <i class="bi bi-trash"></i>
      </button>
    ` : '';

    return `
      <div class="action-buttons me-2">
        ${deleteButton}
        <button class="btn btn-outline-secondary btn-sm filter-btn" title="Filter Data">
          <i class="bi bi-funnel"></i>
        </button>
        <button class="btn btn-outline-info btn-sm refresh-btn" title="Refresh Table">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
    `;
  }

  renderSearchInput() {
    return `
      <div class="search-container">
        <input type="search" class="form-control form-control-sm search-input" 
               placeholder="Search..." value="${this.searchTerm}">
      </div>
    `;
  }

  renderFilterModal() {
    return `
      <div class="modal fade" id="filterModal" tabindex="-1" aria-labelledby="filterModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="filterModalLabel">
                <i class="bi bi-funnel"></i> Filter Data
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                ${this.options.columns.map(col => `
                  <div class="col-md-6 mb-3">
                    <label class="form-label">${col.title}</label>
                    <input type="text" class="form-control filter-input" 
                           data-column="${col.data}" 
                           placeholder="Filter ${col.title}..."
                           value="${this.filters[col.data] || ''}">
                  </div>
                `).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="clearFiltersBtn">
                <i class="bi bi-x-circle"></i> Clear All
              </button>
              <button type="button" class="btn btn-primary" id="applyFiltersBtn">
                <i class="bi bi-check-circle"></i> Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFilters() {
    if (!this.options.showFilters) return '';

    return `
      <div class="row filters-row">
        <div class="col-md-12 d-flex justify-content-between align-items-center">
          <div class="filters-pill-container d-flex flex-wrap my-1"></div>
          <button class="btn btn-link text-danger text-decoration-none sf-12 clear-all-filters" style="display: none;">
            Clear all filters
          </button>
        </div>
      </div>
    `;
  }

  renderTable() {
    return `
      <div class="table-responsive">
        <table class="table table-bordered table-striped table-hover w-100 custom-datatable">
          <thead>
            <tr>
              ${this.options.showCheckboxes ? `
                <th class="checkbox-column text-center" style="width: 40px;">
                  <input type="checkbox" class="form-check-input select-all-checkbox" id="selectAll">
                  <label class="form-check-label" for="selectAll"></label>
                </th>
              ` : ''}
              ${this.options.columns.map(col => `
                <th class="${col.className || ''}" data-column="${col.data}">
                  ${col.title}
                  ${col.sortable !== false ? '<span class="sort-indicator"></span>' : ''}
                </th>
              `).join('')}
              ${this.options.customActions.length > 0 ? '<th class="actions-column">Actions</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${this.renderTableBody()}
          </tbody>
        </table>
      </div>
    `;
  }

  renderTableBody() {
    const checkboxColspan = this.options.showCheckboxes ? 1 : 0;
    const actionsColspan = this.options.customActions.length > 0 ? 1 : 0;
    const totalColspan = this.options.columns.length + checkboxColspan + actionsColspan;

    if (this.filteredData.length === 0) {
      return `
        <tr>
          <td colspan="${totalColspan}" class="text-center">
            ${this.options.emptyTemplate || 'No data available'}
          </td>
        </tr>
      `;
    }

    const startIndex = (this.currentPage - 1) * this.currentPageSize;
    const endIndex = startIndex + this.currentPageSize;
    const pageData = this.filteredData.slice(startIndex, endIndex);

    return pageData.map((row, index) => {
      const rowId = row[this.options.idField];
      const isSelected = this.selectedRows.has(rowId);

      return `
        <tr data-row-index="${startIndex + index}" data-row-id="${rowId}">
          ${this.options.showCheckboxes ? `
            <td class="checkbox-column text-center">
              <input type="checkbox" class="form-check-input row-checkbox" 
                     value="${rowId}" ${isSelected ? 'checked' : ''}>
            </td>
          ` : ''}
          ${this.options.columns.map(col => `
            <td class="${col.className || ''}">
              ${this.renderCellValue(row[col.data], col, row, startIndex + index + 1)}
            </td>
          `).join('')}
          ${this.options.customActions.length > 0 ? this.renderActionCell(row, startIndex + index) : ''}
        </tr>
      `;
    }).join('');
  }

  renderCellValue(value, column, row, serialNumber = null) {
    if (column.type === 'sno') {
      return serialNumber || '-';
    }

    if (value === null || value === undefined) return '-';

    if (column.render) {
      return column.render(value, row, serialNumber);
    }

    if (column.type === 'date') {
      return new Date(value).toLocaleDateString();
    }

    if (column.type === 'datetime') {
      return new Date(value).toLocaleString();
    }

    if (column.type === 'boolean') {
      return value ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-secondary">No</span>';
    }

    if (column.type === 'status') {
      const statusClasses = {
        active: 'badge-success',
        inactive: 'badge-secondary',
        pending: 'badge-warning',
        completed: 'badge-info',
        error: 'badge-danger'
      };
      const statusClass = statusClasses[value.toLowerCase()] || 'badge-secondary';
      return `<span class="badge ${statusClass}">${value}</span>`;
    }

    return String(value);
  }

  renderActionCell(row, rowIndex) {
    const visibleActions = this.options.customActions.filter(action => {
      // If no condition is specified, always show the action
      if (!action.condition) return true;
      // If condition is specified, evaluate it
      return action.condition(row);
    });

    if (visibleActions.length === 0) {
      return '<td class="actions-cell"></td>';
    }

    return `
      <td class="actions-cell">
        <div class="dropdown">
          <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu">
            ${visibleActions.map(action => `
              <li>
                <a class="dropdown-item" href="#" data-action="${action.type || action.label.toLowerCase()}" data-row-index="${rowIndex}">
                  ${action.icon ? `<i class="${action.icon} me-2"></i>` : ''}
                  ${action.label}
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      </td>
    `;
  }

  renderPagination() {
    console.log('renderPagination called - showPagination:', this.options.showPagination);

    if (!this.options.showPagination) {
      console.log('Pagination disabled in options');
      return '';
    }

    const totalPages = Math.ceil(this.filteredData.length / this.currentPageSize);
    console.log('Total pages calculated:', totalPages, 'from', this.filteredData.length, 'entries and page size', this.currentPageSize);

    if (totalPages <= 1) {
      console.log('Pagination hidden - only 1 page or less');
      return '';
    }

    const paginationItems = this.generatePaginationItems(totalPages);
    const startEntry = (this.currentPage - 1) * this.currentPageSize + 1;
    const endEntry = Math.min(this.currentPage * this.currentPageSize, this.filteredData.length);

    console.log('Rendering pagination:', {
      currentPage: this.currentPage,
      totalPages: totalPages,
      totalEntries: this.filteredData.length,
      startEntry: startEntry,
      endEntry: endEntry
    });

    return `
      <div class="row pagination-container" style="margin-top: 1rem;">
        <div class="col-sm-12 col-md-6 d-flex align-items-center">
          <div class="dt-info">
            Showing ${startEntry} to ${endEntry} of ${this.filteredData.length} entries
          </div>
        </div>
        <div class="col-sm-12 col-md-6 d-flex justify-content-end align-items-center">
          <nav aria-label="Table pagination">
            <ul class="pagination pagination-sm mb-0">
              ${paginationItems}
            </ul>
          </nav>
        </div>
      </div>
    `;
  }

  generatePaginationItems(totalPages) {
    const items = [];
    const maxVisiblePages = 5;

    // First button
    items.push(`
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="1" title="First">
          <i class="bi bi-chevron-double-left"></i>
        </a>
      </li>
    `);

    // Previous button
    items.push(`
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}" title="Previous">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `);

    // Page numbers
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add ellipsis before if needed
    if (startPage > 1) {
      items.push(`
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(`
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `);
    }

    // Add ellipsis after if needed
    if (endPage < totalPages) {
      items.push(`
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `);
    }

    // Next button
    items.push(`
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}" title="Next">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `);

    // Last button
    items.push(`
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${totalPages}" title="Last">
          <i class="bi bi-chevron-double-right"></i>
        </a>
      </li>
    `);

    return items.join('');
  }

  bindEvents() {
    // Search functionality
    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value;
        this.currentPage = 1;
        this.filterData();
        this.updateTable();
        if (this.options.onSearchChange) {
          this.options.onSearchChange(this.searchTerm);
        }
      });
    }

    // Page size change
    const pageSizeSelect = this.container.querySelector('.page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.currentPageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.updateTable();
      });
    }

    // Pagination
    this.container.addEventListener('click', (e) => {
      const pageLink = e.target.closest('.page-link');
      if (pageLink && !pageLink.parentElement.classList.contains('disabled')) {
        e.preventDefault();
        e.stopPropagation();

        const page = parseInt(pageLink.dataset.page);
        const totalPages = Math.ceil(this.filteredData.length / this.currentPageSize);

        if (page && page >= 1 && page <= totalPages && page !== this.currentPage) {
          console.log('Changing page from', this.currentPage, 'to', page);
          this.currentPage = page;
          this.updateTable();
          if (this.options.onPageChange) {
            this.options.onPageChange(page);
          }
        }
      }
    });

    // Filter and Refresh buttons
    this.container.addEventListener('click', (e) => {
      // Filter button
      if (e.target.closest('.filter-btn')) {
        e.preventDefault();
        this.showFilterModal();
      }

      // Refresh button
      if (e.target.closest('.refresh-btn')) {
        e.preventDefault();
        this.refreshTable();
      }

      // Delete selected button
      if (e.target.closest('.delete-selected-btn')) {
        e.preventDefault();
        this.handleBulkDelete();
      }

      // Row action dropdown items
      if (e.target.closest('.dropdown-item')) {
        e.preventDefault();
        const action = e.target.closest('.dropdown-item').dataset.action;
        const rowIndex = parseInt(e.target.closest('.dropdown-item').dataset.rowIndex);
        const rowData = this.filteredData[rowIndex];

        if (this.options.onRowAction) {
          this.options.onRowAction(action, rowData, rowIndex);
        }
      }
    });

    // Filter modal events
    this.bindFilterModalEvents();

    // Clear filters
    const clearFiltersBtn = this.container.querySelector('.clear-all-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }

    // Checkbox events
    this.bindCheckboxEvents();
  }

  filterData() {
    this.filteredData = this.options.data.filter(row => {
      // Search filter
      if (this.searchTerm) {
        const searchMatch = this.options.columns.some(col => {
          const value = String(row[col.data] || '').toLowerCase();
          return value.includes(this.searchTerm.toLowerCase());
        });
        if (!searchMatch) return false;
      }

      // Column filters
      for (const [column, filterValue] of Object.entries(this.filters)) {
        const rowValue = row[column];
        if (!this.matchesFilter(rowValue, filterValue)) {
          return false;
        }
      }

      return true;
    });
  }

  matchesFilter(value, filterValue) {
    if (Array.isArray(filterValue)) {
      return filterValue.includes(value);
    }
    return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
  }

  updateTable() {
    if (!this.container) {
      console.warn('CustomDataTableUI: Container not found during updateTable');
      return;
    }

    this.filterData();

    // Ensure current page is valid
    const totalPages = Math.ceil(this.filteredData.length / this.currentPageSize);
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const start = (this.currentPage - 1) * this.currentPageSize;
    const end = start + this.currentPageSize;
    const paginatedData = this.filteredData.slice(start, end);

    // Update table body
    const tbody = this.container.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = this.renderTableBody();
    }

    // Update pagination
    console.log('Updating pagination...');
    const paginationContainer = this.container.querySelector('.pagination-container');
    if (paginationContainer) {
      console.log('Found existing pagination container, updating content');
      const paginationHTML = this.renderPagination();
      if (paginationHTML) {
        paginationContainer.innerHTML = paginationHTML;
      }
    } else {
      console.log('No existing pagination container found, trying to add new pagination');
      // If pagination doesn't exist, add it after the table
      const tableContainer = this.container.querySelector('.table-responsive');
      if (tableContainer) {
        const paginationHTML = this.renderPagination();
        console.log('Generated pagination HTML:', paginationHTML ? 'Yes' : 'No');
        if (paginationHTML) {
          console.log('Adding pagination after table');
          tableContainer.insertAdjacentHTML('afterend', paginationHTML);
        }
      } else {
        console.log('Table container not found');
      }
    }

    // Update filter pills
    this.updateFilterPills();

    // Update checkbox states if checkboxes are enabled
    if (this.options.showCheckboxes) {
      setTimeout(() => {
        this.updateVisibleCheckboxes();
        this.updateSelectAllCheckbox();
        this.updateDeleteButton();
      }, 0);
    }
  }

  updateFilterPills() {
    const pillContainer = this.container.querySelector('.filters-pill-container');
    const clearBtn = this.container.querySelector('.clear-all-filters');

    if (!pillContainer) return;

    pillContainer.innerHTML = '';
    let filterCount = 0;

    // Search pill
    if (this.searchTerm) {
      filterCount++;
      pillContainer.innerHTML += `
        <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
          Search: ${this.sanitizeInput(this.searchTerm)}
          <button type="button" class="btn-close btn-close-sm ms-2 filter-pill-btn" data-filter="search"></button>
        </span>
      `;
    }

    // Column filter pills
    Object.entries(this.filters).forEach(([column, value]) => {
      const columnDef = this.options.columns.find(col => col.data === column);
      if (columnDef) {
        filterCount++;
        const values = Array.isArray(value) ? value : [value];
        values.forEach(v => {
          pillContainer.innerHTML += `
            <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
              ${this.sanitizeInput(columnDef.title)}: ${this.sanitizeInput(v)}
              <button type="button" class="btn-close btn-close-sm ms-2 filter-pill-btn" data-filter="${column}" data-value="${this.sanitizeInput(v)}"></button>
            </span>
          `;
        });
      }
    });

    // Show/hide clear button
    if (clearBtn) {
      clearBtn.style.display = filterCount > 0 ? 'inline-block' : 'none';
    }

    // Bind pill removal events
    this.container.querySelectorAll('.filter-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        const value = e.target.dataset.value;
        this.removeFilter(filter, value);
      });
    });
  }

  removeFilter(filter, value) {
    if (filter === 'search') {
      this.searchTerm = '';
      const searchInput = this.container.querySelector('.search-input');
      if (searchInput) searchInput.value = '';
    } else {
      if (this.filters[filter]) {
        if (Array.isArray(this.filters[filter])) {
          this.filters[filter] = this.filters[filter].filter(v => v !== value);
          if (this.filters[filter].length === 0) {
            delete this.filters[filter];
          }
        } else {
          delete this.filters[filter];
        }
      }
    }

    this.currentPage = 1;
    this.updateTable();
  }

  clearAllFilters() {
    if (!this.container) {
      console.warn('CustomDataTableUI: Container not found during clearAllFilters');
      return;
    }

    this.searchTerm = '';
    this.filters = {};
    this.currentPage = 1;

    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) searchInput.value = '';

    this.updateTable();
  }

  setData(data) {
    this.options.data = data;
    this.filteredData = [...data];
    this.currentPage = 1;
    this.updateTable();
  }

  addFilter(column, value) {
    if (!this.filters[column]) {
      this.filters[column] = [];
    }
    if (!this.filters[column].includes(value)) {
      this.filters[column].push(value);
    }
    this.currentPage = 1;
    this.updateTable();
  }

  setLoading(loading = true) {
    const tbody = this.container.querySelector('tbody');
    if (!tbody) return;

    if (loading) {
      const loadingHTML = this.options.loadingTemplate || `
        <tr>
          <td colspan="${this.options.columns.length + (this.options.customActions.length > 0 ? 1 : 0)}" class="text-center">
            <div class="d-flex flex-column justify-content-center">
              <div class="loading-animation">
                <i class="fa-solid fa-loader fa-spin fa-2xl"></i>
              </div>
              <div class="loading-text">Loading data please wait...</div>
            </div>
          </td>
        </tr>
      `;
      tbody.innerHTML = loadingHTML;
    } else {
      this.updateTable();
    }
  }

  sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  // Public methods for external control
  refresh() {
    this.updateTable();
  }

  // Remove a specific row by ID
  removeRowById(id, idField = 'id') {
    const originalLength = this.options.data.length;
    this.options.data = this.options.data.filter(row => row[idField] !== id);
    const removed = originalLength !== this.options.data.length;

    if (removed) {
      this.filterData();
      this.updateTable();
      console.log(`Row with ${idField} ${id} removed from table`);
    }

    return removed;
  }

  refreshTable() {
    console.log('Refreshing table...');
    this.setLoading(true);

    if (this.options.onRefresh) {
      // Call the refresh callback if provided
      const refreshPromise = this.options.onRefresh();

      if (refreshPromise && typeof refreshPromise.then === 'function') {
        // Handle promise-based refresh
        refreshPromise
          .then(() => {
            this.setLoading(false);
            if (typeof toastr !== 'undefined') {
              toastr.success('Table refreshed successfully!');
            } else {
              console.log('Table refreshed successfully!');
            }
          })
          .catch((error) => {
            console.error('Error refreshing table:', error);
            this.setLoading(false);
            if (typeof toastr !== 'undefined') {
              toastr.error('Failed to refresh table.');
            } else {
              console.log('Failed to refresh table.');
            }
          });
      } else {
        // Handle non-promise refresh
        setTimeout(() => {
          this.setLoading(false);
          if (typeof toastr !== 'undefined') {
            toastr.success('Table refreshed successfully!');
          } else {
            console.log('Table refreshed successfully!');
          }
        }, 100);
      }
    } else {
      // Fallback to original behavior if no refresh callback
      setTimeout(() => {
        this.filterData();
        this.updateTable();
        this.setLoading(false);

        // Show success message
        if (typeof toastr !== 'undefined') {
          toastr.success('Table refreshed successfully!');
        } else {
          console.log('Table refreshed successfully!');
        }
      }, 500);
    }
  }

  showFilterModal() {
    // Populate filter inputs with current values
    this.options.columns.forEach(col => {
      const input = this.container.querySelector(`.filter-input[data-column="${col.data}"]`);
      if (input) {
        input.value = this.filters[col.data] || '';
      }
    });

    // Show the modal
    const modal = new bootstrap.Modal(this.container.querySelector('#filterModal'));
    modal.show();
  }

  bindFilterModalEvents() {
    // Apply filters button
    const applyBtn = this.container.querySelector('#applyFiltersBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyFilters();
        const modal = bootstrap.Modal.getInstance(this.container.querySelector('#filterModal'));
        if (modal) {
          modal.hide();
        }
      });
    }

    // Clear filters button
    const clearBtn = this.container.querySelector('#clearFiltersBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAllFilters();
        const modal = bootstrap.Modal.getInstance(this.container.querySelector('#filterModal'));
        if (modal) {
          modal.hide();
        }
      });
    }

    // Enter key on filter inputs
    this.container.querySelectorAll('.filter-input').forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.applyFilters();
          const modal = bootstrap.Modal.getInstance(this.container.querySelector('#filterModal'));
          if (modal) {
            modal.hide();
          }
        }
      });
    });
  }

  applyFilters() {
    // Clear existing filters
    this.filters = {};

    // Get filter values from inputs
    this.container.querySelectorAll('.filter-input').forEach(input => {
      const column = input.dataset.column;
      const value = input.value.trim();

      if (value) {
        this.filters[column] = value;
      }
    });

    // Reset to first page and update
    this.currentPage = 1;
    this.filterData();
    this.updateTable();

    // Show success message
    const filterCount = Object.keys(this.filters).length;
    if (filterCount > 0) {
      if (typeof toastr !== 'undefined') {
        toastr.success(`Applied ${filterCount} filter(s)`);
      } else {
        console.log(`Applied ${filterCount} filter(s)`);
      }
    }
  }

  getCurrentPage() {
    return this.currentPage;
  }

  getCurrentPageSize() {
    return this.currentPageSize;
  }

  getFilteredData() {
    return this.filteredData;
  }

  // Checkbox event handlers
  bindCheckboxEvents() {
    if (!this.options.showCheckboxes) return;

    // Select all checkbox
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('select-all-checkbox')) {
        this.handleSelectAll(e.target.checked);
      }
    });

    // Individual row checkboxes
    this.container.addEventListener('change', (e) => {
      if (e.target.classList.contains('row-checkbox')) {
        this.handleRowSelection(e.target.value, e.target.checked);
      }
    });
  }

  // Handle select all checkbox
  handleSelectAll(checked) {
    this.selectAllState = checked;

    if (checked) {
      // Select all rows across all pages
      this.options.data.forEach(row => {
        this.selectedRows.add(row[this.options.idField]);
      });
    } else {
      // Deselect all rows
      this.selectedRows.clear();
    }

    // Update visible checkboxes
    this.updateVisibleCheckboxes();

    // Trigger selection change callback
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.getSelectedRowData());
    }

    // Update delete button state
    this.updateDeleteButton();
  }

  // Handle individual row selection
  handleRowSelection(rowId, checked) {
    const numericRowId = parseInt(rowId) || rowId;

    if (checked) {
      this.selectedRows.add(numericRowId);
    } else {
      this.selectedRows.delete(numericRowId);
      this.selectAllState = false;
    }

    // Update select all checkbox state
    this.updateSelectAllCheckbox();

    // Trigger selection change callback
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.getSelectedRowData());
    }

    // Update delete button state
    this.updateDeleteButton();
  }

  // Update visible checkboxes to match selection state
  updateVisibleCheckboxes() {
    const rowCheckboxes = this.container.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(checkbox => {
      const rowId = parseInt(checkbox.value) || checkbox.value;
      checkbox.checked = this.selectedRows.has(rowId);
    });
  }

  // Update select all checkbox state
  updateSelectAllCheckbox() {
    const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
    if (!selectAllCheckbox) return;

    const totalRows = this.options.data.length;
    const selectedCount = this.selectedRows.size;

    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalRows) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
      this.selectAllState = true;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  // Get selected row data
  getSelectedRowData() {
    return this.options.data.filter(row =>
      this.selectedRows.has(row[this.options.idField])
    );
  }

  // Get selected row IDs
  getSelectedRows() {
    return Array.from(this.selectedRows);
  }

  // Clear all selections
  clearSelection() {
    this.selectedRows.clear();
    this.selectAllState = false;
    this.updateVisibleCheckboxes();
    this.updateSelectAllCheckbox();

    if (this.options.onSelectionChange) {
      this.options.onSelectionChange([]);
    }

    // Update delete button state
    this.updateDeleteButton();
  }

  // Select specific rows by ID
  selectRows(rowIds) {
    if (!Array.isArray(rowIds)) rowIds = [rowIds];

    rowIds.forEach(id => {
      const numericId = parseInt(id) || id;
      this.selectedRows.add(numericId);
    });

    this.updateVisibleCheckboxes();
    this.updateSelectAllCheckbox();

    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.getSelectedRowData());
    }

    // Update delete button state
    this.updateDeleteButton();
  }

  // Update delete button state based on selection
  updateDeleteButton() {
    if (!this.options.showCheckboxes) return;

    const deleteBtn = this.container.querySelector('.delete-selected-btn');

    if (deleteBtn) {
      const selectedCount = this.selectedRows.size;
      deleteBtn.disabled = selectedCount === 0;
      deleteBtn.title = `Delete Selected (${selectedCount})`;

      if (selectedCount === 0) {
        deleteBtn.classList.add('disabled');
      } else {
        deleteBtn.classList.remove('disabled');
      }
    }
  }

  // Handle bulk delete operation
  handleBulkDelete() {
    if (this.selectedRows.size === 0) {
      if (typeof toastr !== 'undefined') {
        toastr.warning('Please select rows to delete.');
      } else {
        alert('Please select rows to delete.');
      }
      return;
    }

    const selectedCount = this.selectedRows.size;
    const confirmMessage = `Are you sure you want to delete ${selectedCount} selected record${selectedCount > 1 ? 's' : ''}?`;

    if (confirm(confirmMessage)) {
      const selectedIds = Array.from(this.selectedRows);
      const selectedData = this.getSelectedRowData();

      if (this.options.onBulkDelete) {
        this.options.onBulkDelete(selectedIds, selectedData);
      } else {
        console.warn('No bulk delete handler provided. Set onBulkDelete callback.');
      }
    }
  }

  // Debug method to log pagination state
  logPaginationState() {
    const totalPages = Math.ceil(this.filteredData.length / this.currentPageSize);
    const startEntry = (this.currentPage - 1) * this.currentPageSize + 1;
    const endEntry = Math.min(this.currentPage * this.currentPageSize, this.filteredData.length);

    console.log('Pagination State:', {
      currentPage: this.currentPage,
      totalPages: totalPages,
      pageSize: this.currentPageSize,
      totalEntries: this.filteredData.length,
      startEntry: startEntry,
      endEntry: endEntry,
      hasData: this.filteredData.length > 0
    });
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomDataTableUI;
} else if (typeof window !== 'undefined') {
  window.CustomDataTableUI = CustomDataTableUI;
} 