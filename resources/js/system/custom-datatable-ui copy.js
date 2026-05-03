/**
 * Custom DataTable UI System
 * Extracts visual components from DataTables while allowing full customization
 * Created for UNQ Project - ChronoSpark Solutions
 */

class CustomDataTableUI {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      columns: options.columns || [],
      data: options.data || [],
      showFilters: options.showFilters !== false,
      showSearch: options.showSearch !== false,
      showPagination: options.showPagination !== false,
      showLengthControl: options.showLengthControl !== false,
      customActions: options.customActions || [],
      pageSize: options.pageSize || 10,
      pageSizes: options.pageSizes || [10, 25, 50, 100],
      onRowAction: options.onRowAction || null,
      onFilterChange: options.onFilterChange || null,
      onSearchChange: options.onSearchChange || null,
      onPageChange: options.onPageChange || null,
      loadingTemplate: options.loadingTemplate || null,
      emptyTemplate: options.emptyTemplate || null,
      ...options
    };
    
    this.currentPage = 1;
    this.currentPageSize = this.options.pageSize;
    this.filteredData = [...this.options.data];
    this.filters = {};
    this.searchTerm = '';
    
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
    this.updateTable();
  }
  
  render() {
    const tableHTML = `
      <div class="skeleton-view-container">
        ${this.renderControls()}
        ${this.renderFilters()}
        ${this.renderTable()}
        ${this.renderPagination()}
      </div>
    `;
    
    this.container.innerHTML = tableHTML;
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
    if (this.options.customActions.length === 0) return '';
    
    return `
      <div class="action-buttons me-2">
        ${this.options.customActions.map(action => `
          <button class="btn btn-outline-primary btn-sm action-btn" data-action="${action.type || action.label.toLowerCase()}">
            ${action.icon ? `<i class="${action.icon}"></i>` : ''}
            ${action.label}
          </button>
        `).join('')}
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
    if (this.filteredData.length === 0) {
      return `
        <tr>
          <td colspan="${this.options.columns.length + (this.options.customActions.length > 0 ? 1 : 0)}" class="text-center">
            ${this.options.emptyTemplate || 'No data available'}
          </td>
        </tr>
      `;
    }
    
    const startIndex = (this.currentPage - 1) * this.currentPageSize;
    const endIndex = startIndex + this.currentPageSize;
    const pageData = this.filteredData.slice(startIndex, endIndex);
    
    return pageData.map((row, index) => `
      <tr data-row-index="${startIndex + index}">
        ${this.options.columns.map(col => `
          <td class="${col.className || ''}">
            ${this.renderCellValue(row[col.data], col, row)}
          </td>
        `).join('')}
        ${this.options.customActions.length > 0 ? this.renderActionCell(row, startIndex + index) : ''}
      </tr>
    `).join('');
  }
  
  renderCellValue(value, column, row) {
    if (value === null || value === undefined) return '-';
    
    if (column.render) {
      return column.render(value, row);
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
    return `
      <td class="actions-cell">
        <div class="dropdown">
          <button class="btn btn-link dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-three-dots-vertical"></i>
          </button>
          <ul class="dropdown-menu">
            ${this.options.customActions.map(action => `
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
    if (!this.options.showPagination) return '';
    
    const totalPages = Math.ceil(this.filteredData.length / this.currentPageSize);
    if (totalPages <= 1) return '';
    
    const paginationItems = this.generatePaginationItems(totalPages);
    
    return `
      <div class="row">
        <div class="col-sm-12 col-md-6">
          <div class="dt-info">
            Showing ${(this.currentPage - 1) * this.currentPageSize + 1} to ${Math.min(this.currentPage * this.currentPageSize, this.filteredData.length)} of ${this.filteredData.length} entries
          </div>
        </div>
        <div class="col-sm-12 col-md-6">
          <nav aria-label="Table pagination">
            <ul class="pagination justify-content-end">
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
    
    // Previous button
    items.push(`
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}">
          <i class="ti ti-chevron-left" title="Previous"></i>
        </a>
      </li>
    `);
    
    // Page numbers
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(`
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `);
    }
    
    // Next button
    items.push(`
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}">
          <i class="ti ti-chevron-right" title="Next"></i>
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
      if (e.target.closest('.page-link')) {
        e.preventDefault();
        const page = parseInt(e.target.closest('.page-link').dataset.page);
        if (page && page !== this.currentPage) {
          this.currentPage = page;
          this.updateTable();
          if (this.options.onPageChange) {
            this.options.onPageChange(page);
          }
        }
      }
    });
    
    // Action buttons
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn')) {
        e.preventDefault();
        const action = e.target.closest('.action-btn').dataset.action;
        if (this.options.onRowAction) {
          this.options.onRowAction(action, null);
        }
      }
      
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
    
    // Clear filters
    const clearFiltersBtn = this.container.querySelector('.clear-all-filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearAllFilters();
      });
    }
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
    this.filterData();
    
    // Update table body
    const tbody = this.container.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = this.renderTableBody();
    }
    
    // Update pagination
    const paginationContainer = this.container.querySelector('.pagination').parentElement.parentElement;
    if (paginationContainer) {
      paginationContainer.innerHTML = this.renderPagination();
    }
    
    // Update filter pills
    this.updateFilterPills();
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
  
  getCurrentPage() {
    return this.currentPage;
  }
  
  getCurrentPageSize() {
    return this.currentPageSize;
  }
  
  getFilteredData() {
    return this.filteredData;
  }
  
  getSelectedRows() {
    const checkboxes = this.container.querySelectorAll('tbody input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.closest('tr').dataset.rowIndex));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomDataTableUI;
} else if (typeof window !== 'undefined') {
  window.CustomDataTableUI = CustomDataTableUI;
} 