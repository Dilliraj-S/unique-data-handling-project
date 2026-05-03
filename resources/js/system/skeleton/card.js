/**
 * Generates a loading skeleton for cards with a dynamic container class and placeholder type.
 * @param {string} placeholderConfig - Placeholder configuration in the format 'type|count' (e.g., 'card|3', 'list|4', 'custom|10').
 * @param {string} [containerClass='row'] - Container class (e.g., 'row', 'container-fluid').
 * @returns {string} HTML string for the loading skeleton.
 */
export function generateCardLoading(placeholderConfig = 'card|6', containerClass = 'row') {
  // Validate placeholder configuration
  const [type, countStr] = placeholderConfig.split('|').map(s => s.trim());
  const validTypes = ['card', 'list', 'custom'];
  const placeholderType = validTypes.includes(type) ? type : 'card';
  const count = Math.max(1, parseInt(countStr) || 6); // Default to 6 if count is invalid
  const placeholder = '<div class="skeleton-placeholder bg-gray-200 rounded animate-pulse" style="height: 20px;"></div>';
  // Validate container class
  const validContainers = ['row', 'container', 'container-fluid'];
  const finalContainerClass = validContainers.includes(containerClass) ? containerClass : 'row';
  // Generate placeholder HTML based on type
  switch (placeholderType) {
    case 'card':
      return `
        <div class="${finalContainerClass} row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          ${Array(count)
          .fill()
          .map(
            () => `
              <div class="col">
                <div class="card h-100 bg-white shadow-sm rounded-lg">
                  <div class="card-body p-4">
                    ${placeholder}
                    <div class="mt-3">${placeholder}</div>
                    <div class="mt-3">${placeholder}</div>
                  </div>
                </div>
              </div>
            `
          )
          .join('')}
        </div>
      `;
    case 'list':
      return `
        <div class="${finalContainerClass}">
          <div class="list-group">
            ${Array(count)
          .fill()
          .map(
            () => `
                <div class="list-group-item bg-white border rounded mb-2 p-3">
                  ${placeholder}
                </div>
              `
          )
          .join('')}
          </div>
        </div>
      `;
    case 'custom':
      return `
        <div class="${finalContainerClass} row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          ${Array(count)
          .fill()
          .map(
            () => `
              <div class="col">
                <div class="card bg-white shadow-sm rounded-lg">
                  <div class="card-body p-4">
                    ${placeholder}
                  </div>
                </div>
              </div>
            `
          )
          .join('')}
        </div>
      `;
    default:
      window.general?.log?.('Invalid placeholder type, defaulting to card', { placeholderConfig });
      return `
        <div class="${finalContainerClass} row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          ${Array(count)
          .fill()
          .map(
            () => `
              <div class="col">
                <div class="card h-100 bg-white shadow-sm rounded-lg">
                  <div class="card-body p-4">
                    ${placeholder}
                    <div class="mt-3">${placeholder}</div>
                    <div class="mt-3">${placeholder}</div>
                  </div>
                </div>
              </div>
            `
          )
          .join('')}
        </div>
      `;
  }
}
/**
 * Initializes card sets for elements with the 'data-skeleton-card-set' attribute.
 * Supports paging/scroll types, dynamic filters, and clean animations.
 */
export function initializeCardSet() {
  // Dependency checks
  if (!window.jQuery || !window.axios || !window.bootstrap || !window.general?.csrfToken || !window.general?.sanitizeInput || !window.general?.manageCookie || !window.general?.requestAction) {
    console.error('Missing required dependencies: jQuery, axios, Bootstrap, or window.general utilities');
    window.general?.errorToast?.('Missing required libraries');
    return;
  }
  const elements = document.querySelectorAll('[data-skeleton-card-set]');
  if (!elements.length) {
    return;
  }
  elements.forEach(element => {
    const $element = jQuery(element);
    const token = $element.data('skeleton-card-set');
    const cardType = String($element.data('type') || 'paging').toLowerCase();
    const limit = parseInt($element.data('limit') || (cardType === 'scroll' ? 16 : 12)) || 12;
    const placeholderConfig = String($element.data('placeholder') || 'card|6').trim();
    const allowedFilters = String($element.data('filters') || '')
      .split('|')
      .map(f => f.trim())
      .filter(f => ['search', 'sort', 'date', 'counts'].includes(f));
    const containerClass = String($element.data('container') || 'row').trim();
    if (!token) {
      window.general?.errorToast?.('Missing token for card set');
      return;
    }
    // Validate container class
    const validContainers = ['row', 'container', 'container-fluid'];
    const finalContainerClass = validContainers.includes(containerClass) ? containerClass : 'row';
    // Validate placeholder configuration
    const [placeholderType, placeholderCountStr] = placeholderConfig.split('|').map(s => s.trim());
    const validPlaceholderTypes = ['card', 'list', 'custom'];
    const finalPlaceholderType = validPlaceholderTypes.includes(placeholderType) ? placeholderType : 'card';
    const placeholderCount = Math.max(1, parseInt(placeholderCountStr) || 6);
    // Initialize state
    const state = {
      filters: {
        search: '',
        sort: {},
        dateRange: {},
        pagination: { type: 'offset', page: 1, limit }
      },
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      columns: [],
      isLoading: false,
      hasMore: true,
      draw: 0
    };
    // State management
    const loadState = () => {
      try {
        const saved = window.general.manageCookie({ action: 'get', name: `skeleton-card-state-${token}` });
        if (saved && typeof saved === 'object') {
          state.filters = {
            ...state.filters,
            search: saved.search || '',
            sort: saved.sort && typeof saved.sort === 'object' ? saved.sort : {},
            dateRange: saved.dateRange && typeof saved.dateRange === 'object' ? saved.dateRange : {},
            pagination: {
              ...state.filters.pagination,
              ...(saved.pagination && typeof saved.pagination === 'object' ? saved.pagination : {}),
              limit // Enforce dynamic limit
            }
          };
        }
      } catch (e) {
        window.general?.log?.('Failed to load state', { token, error: e.message });
      }
    };
    const saveState = () => {
      try {
        window.general.manageCookie({
          action: 'set',
          name: `skeleton-card-state-${token}`,
          value: state.filters,
          hours: window.general.cacheDurationMinutes / 60 || 24
        });
      } catch (e) {
        window.general?.log?.('Failed to save state', { token, error: e.message });
      }
    };
    // Displays filter pills
    const displayFilterPills = () => {
      const escapedToken = $.escapeSelector(token);
      const $container = $element.find(`.filters-pill-container-${escapedToken}`);
      if (!$container.length) {
        return;
      }
      $container.empty();
      let count = 0;
      if (allowedFilters.includes('search') && state.filters.search) {
        count++;
        $container.append(`
          <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
            Search: ${window.general.sanitizeInput(state.filters.search)}
            <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="search" aria-label="Remove search filter"></button>
          </span>
        `);
      }
      if (allowedFilters.includes('sort')) {
        Object.entries(state.filters.sort).forEach(([col, order]) => {
          const colDef = state.columns.find(c => c.data === col);
          if (colDef && colDef.orderable) {
            count++;
            $container.append(`
              <span class="badge badge-light ps-2 border border-secondary text-dark sf-9 d-flex align-items-center me-2 my-1 rounded-pill">
                Sort ${window.general.sanitizeInput(colDef.title || col)}: ${order}
                <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="sort_${window.general.sanitizeInput(col)}" data-value="${window.general.sanitizeInput(col)}:${order}" aria-label="Remove sort filter"></button>
              </span>
            `);
          }
        });
      }
      if (allowedFilters.includes('date') && state.filters.dateRange.created_at) {
        count++;
        $container.append(`
          <span class="badge bg-gray-100 text-gray-800 d-flex align-items-center me-2 mb-2 px-3 py-2 rounded-full">
            Date: ${window.general.sanitizeInput(state.filters.dateRange.created_at.from)} - ${window.general.sanitizeInput(state.filters.dateRange.created_at.to)}
            <button type="button" class="btn-close btn-close-sm ms-2 skeleton-pill-btn" data-filter="dateRange" aria-label="Remove date filter"></button>
          </span>
        `);
      }
      $container.css('display', count > 0 ? 'flex' : 'none');
      $element.find(`.skeleton-clear-all-${escapedToken}`).css('display', count > 0 ? 'inline-block' : 'none');
    };
    // Fetches card data
    const fetchData = async (filters, append = false) => {
      if (state.isLoading) {
        return;
      }
      state.isLoading = true;
      const escapedToken = $.escapeSelector(token);
      const $container = $element.find(`.card-container-${escapedToken}`);
      const $status = $element.find(`.status-container-${escapedToken}`);
      const $loadMore = $element.find(`.load-more-${escapedToken}`);
      const $refreshBtn = $element.find('.skl-card-refresh-btn').find('i');
      if (!$container.length || (allowedFilters.includes('counts') && !$status.length)) {
        state.isLoading = false;
        window.general?.errorToast?.('Card or status container not found');
        return;
      }
      // Save scroll position for paging and start spinning animation
      const scrollPosition = cardType === 'paging' ? window.scrollY : null;
      $container.css({ opacity: 0.5 }); // Fade container during load
      $refreshBtn.addClass('fa-spin'); // Start spinning animation
      if (!append) $container.html(generateCardLoading(`${finalPlaceholderType}|${placeholderCount}`, finalContainerClass));
      else if (cardType === 'scroll') $loadMore.html('<div class="text-center my-3"><i class="fas fa-spinner fa-spin fa-2x text-blue-600"></i></div>');
      try {
        state.draw++;
        const payload = {
          skeleton_filters: {
            search: filters.search || '',
            sort: filters.sort || {},
            dateRange: filters.dateRange || {},
            pagination: {
              page: filters.pagination.page || 1,
              limit: filters.pagination.limit || limit
            }
          },
          skeleton_view: 'card',
          draw: state.draw
        };
        const response = await window.general.requestAction(token, payload);
        if (!response.data?.status) {
          throw new Error(response.data?.message || 'Invalid server response');
        }
        state.isLoading = false;
        $refreshBtn.removeClass('fa-spin'); // Stop spinning animation
        if (!append) {
          state.data = response.data.data || [];
        } else {
          state.data = [...state.data, ...(response.data.data || [])];
        }
        state.recordsTotal = response.data.recordsTotal || 0;
        state.recordsFiltered = response.data.recordsFiltered || 0;
        state.columns = response.data.columns || [];
        state.hasMore = state.data.length < state.recordsFiltered;
        saveState();
        renderCards();
        renderPagination();
        updateStatus();
        displayFilterPills();
        $container.animate({ opacity: 1 }, 300); // Fade in
        if (scrollPosition !== null) window.scrollTo(0, scrollPosition); // Restore scroll
      } catch (e) {
        state.isLoading = false;
        $refreshBtn.removeClass('fa-spin'); // Stop spinning animation on error
        const errorMessage = e.response?.data?.message || e.message || 'Failed to load card data';
        $container.html(window.general.errorDivEmpty());
        $loadMore.empty();
        $container.animate({ opacity: 1 }, 300);
        if (scrollPosition !== null) window.scrollTo(0, scrollPosition);
        window.general?.errorToast?.(errorMessage);
      }
    };
    // Renders cards
    const renderCards = () => {
      const escapedToken = $.escapeSelector(token);
      const $container = $element.find(`.card-container-${escapedToken}`);
      const $loadMore = $element.find(`.load-more-${escapedToken}`);
      if (!$container.length) {
        return;
      }
      $container.empty();
      if (!state.data.length) {
        $container.html(window.general.errorDivEmpty());
        $loadMore.empty();
        return;
      }
      const $row = jQuery('<div>', { class: `${finalContainerClass} row-cols-1 row-cols-md-2 row-cols-lg-3 g-4` });
      state.data.forEach(card => $row.append(`<div class="col">${card}</div>`));
      $container.append($row);
      $container.find('.col').css({ opacity: 0 }).animate({ opacity: 1 }, 500);
      $loadMore.html(cardType === 'scroll' && state.hasMore ? '' : (cardType === 'scroll' ? '<div class="text-center my-3 text-gray-500">You reached the end</div>' : ''));
    };
    // Renders pagination controls
    const renderPagination = () => {
      if (cardType !== 'paging') return;
      const escapedToken = $.escapeSelector(token);
      const $pagination = $element.find(`.pagination-container-${escapedToken}`);
      if (!$pagination.length) {
        return;
      }
      $pagination.empty();
      const totalPages = Math.ceil(state.recordsFiltered / state.filters.pagination.limit);
      if (totalPages <= 1) return;
      const currentPage = state.filters.pagination.page;
      const $nav = jQuery('<nav>', { 'aria-label': 'Card pagination' });
      const $ul = jQuery('<ul>', { class: 'pagination justify-content-center' });
      $ul.append(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
          <a class="page-link skl-card-page-btn" href="#" data-page="${currentPage - 1}" aria-label="Previous"><span aria-hidden="true">«</span></a>
        </li>
      `);
      const maxPages = 5;
      let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
      let endPage = Math.min(totalPages, startPage + maxPages - 1);
      if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
      }
      for (let i = startPage; i <= endPage; i++) {
        $ul.append(`
          <li class="page-item ${i === currentPage ? 'active' : ''}">
            <a class="page-link skl-card-page-btn" href="#" data-page="${i}">${i}</a>
          </li>
        `);
      }
      $ul.append(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
          <a class="page-link skl-card-page-btn" href="#" data-page="${currentPage + 1}" aria-label="Next"><span aria-hidden="true">»</span></a>
        </li>
      `);
      $nav.append($ul);
      $pagination.append($nav);
    };
    // Updates status (total and filtered records)
    const updateStatus = () => {
      if (!allowedFilters.includes('counts')) return;
      const escapedToken = $.escapeSelector(token);
      const $status = $element.find(`.status-container-${escapedToken}`);
      if (!$status.length) {
        return;
      }
      $status.html(`
        <span class="text-gray-500 text-sm">
          Showing ${state.data.length} of ${state.recordsFiltered} records (Total: ${state.recordsTotal})
          ${state.isLoading ? '<i class="fas fa-spinner fa-spin ms-2"></i>' : ''}
        </span>
      `);
    };
    // Initializes IntersectionObserver for infinite scroll
    let scrollObserver = null;
    const initScrollObserver = () => {
      if (cardType !== 'scroll') return;
      const escapedToken = $.escapeSelector(token);
      const $sentinel = $element.find(`.sentinel-${escapedToken}`);
      if (!$sentinel.length) {
        return;
      }
      if (scrollObserver) scrollObserver.disconnect();
      scrollObserver = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && state.hasMore && !state.isLoading) {
            state.filters.pagination.page++;
            saveState();
            fetchData(state.filters, true);
          }
        },
        { rootMargin: '200px' }
      );
      scrollObserver.observe($sentinel[0]);
    };
    // Debounce function
    const debounce = (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
      };
    };
    // Initialize card set
    loadState();
    const escapedToken = $.escapeSelector(token);
    const inputGroup = [];
    if (allowedFilters.includes('sort')) {
      inputGroup.push(`
        <div class="col-md-4 col-sm-6">
          <select class="form-select skl-card-sort-select" data-select="dropdown" aria-label="Sort cards">
            <option value="">Sort by...</option>
          </select>
        </div>
      `);
    }
    if (allowedFilters.includes('date')) {
      inputGroup.push(`
        <div class="col-md-4 col-sm-6">
          <input type="text" class="form-control skl-card-date-filter" placeholder="Filter by date..." aria-label="Date filter">
        </div>
      `);
    }
    if (allowedFilters.includes('search')) {
      inputGroup.push(`
        <div class="col-md-4 col-sm-12">
          <div class="d-flex flex-row justify-content-between w-100">
            <input type="text" class="form-control skl-card-filter-search" placeholder="Search..." aria-label="Search cards">
            <button class="skl-card-refresh-btn" type="button" title="Refresh Cards">
              <i class="fas fa-refresh ${state.isLoading ? 'fa-spin' : ''}"></i>
            </button>
          </div>
        </div>
      `);
    }
    $element.html(`
      <div class="skeleton-card-container skeleton-card-container-${escapedToken}">
        ${inputGroup.length ? `
          <div class="row skl-filter-bar mb-1 justify-content-between">
            ${inputGroup.join('')}
          </div>
        ` : ''}
        <div class="row mb-2">
          <div class="col d-flex flex-wrap align-items-center filters-pill-container-${escapedToken}"></div>
          <div class="col-auto">
            <button class="btn btn-link text-danger text-decoration-none sf-12 skeleton-clear-all-${escapedToken}" style="display: none;">
              Clear all filters
            </button>
          </div>
        </div>
        ${allowedFilters.includes('counts') ? `<div class="status-container-${escapedToken} mb-2 sf-12"></div>` : ''}
        <div class="card-container-${escapedToken}"></div>
        <div class="load-more-${escapedToken}"></div>
        ${cardType === 'scroll' ? `<div class="sentinel-${escapedToken}" style="height: 10px;"></div>` : ''}
        ${cardType === 'paging' ? `<div class="pagination-container-${escapedToken} mt-3"></div>` : ''}
      </div>
    `);
    // Initialize sort dropdown
    const $sortSelect = $element.find('.skl-card-sort-select');
    const updateSortOptions = () => {
      if (!allowedFilters.includes('sort')) return;
      $sortSelect.empty().append('<option value="">Sort by...</option>');
      state.columns.forEach(col => {
        if (col.orderable) {
          $sortSelect.append(`
            <option value="${col.data}:asc" ${state.filters.sort[col.data] === 'asc' ? 'selected' : ''}>${window.general.sanitizeInput(col.title || col.data)} (Ascending)</option>
            <option value="${col.data}:desc" ${state.filters.sort[col.data] === 'desc' ? 'selected' : ''}>${window.general.sanitizeInput(col.title || col.data)} (Descending)</option>
          `);
        }
      });
    };
    // Initialize date filter
    const $dateFilter = $element.find('.skl-card-date-filter');
    if ($dateFilter.length && allowedFilters.includes('date')) {
      $dateFilter.daterangepicker({
        autoUpdateInput: false,
        locale: { format: 'YYYY-MM-DD' }
      }).on('apply.daterangepicker', (ev, picker) => {
        state.filters.dateRange = {
          created_at: {
            from: picker.startDate.format('YYYY-MM-DD'),
            to: picker.endDate.format('YYYY-MM-DD')
          }
        };
        $dateFilter.val(`${picker.startDate.format('YYYY-MM-DD')} - ${picker.endDate.format('YYYY-MM-DD')}`);
        state.filters.pagination.page = 1;
        saveState();
        fetchData(state.filters, false);
      }).on('cancel.daterangepicker', () => {
        state.filters.dateRange = {};
        $dateFilter.val('');
        state.filters.pagination.page = 1;
        saveState();
        fetchData(state.filters, false);
      });
      if (state.filters.dateRange.created_at) {
        $dateFilter.val(`${state.filters.dateRange.created_at.from} - ${state.filters.dateRange.created_at.to}`);
      }
    }
    // Event listeners
    const $searchInput = $element.find('.skl-card-filter-search');
    if ($searchInput.length && allowedFilters.includes('search')) {
      const debouncedSearch = debounce(() => {
        state.filters.search = window.general.sanitizeInput($searchInput.val() || '');
        state.filters.pagination.page = 1;
        saveState();
        fetchData(state.filters, false);
      }, window.general.debounceDelay || 300);
      $searchInput.val(state.filters.search || '');
      $searchInput.off('input.skeleton').on('input.skeleton', debouncedSearch);
    }
    if ($sortSelect.length && allowedFilters.includes('sort')) {
      $sortSelect.off('change.skeleton').on('change.skeleton', () => {
        const sortValue = $sortSelect.val();
        state.filters.sort = {};
        if (sortValue) {
          const [col, order] = sortValue.split(':');
          state.filters.sort[col] = order;
        }
        state.filters.pagination.page = 1;
        saveState();
        fetchData(state.filters, false);
      });
    }
    $element.off('click.skeleton', '.skl-card-refresh-btn').on('click.skeleton', '.skl-card-refresh-btn', () => {
      state.filters.pagination.page = 1;
      saveState();
      fetchData(state.filters, false);
    });
    $element.off('click.skeleton', `.skeleton-clear-all-${escapedToken}`).on('click.skeleton', `.skeleton-clear-all-${escapedToken}`, () => {
      state.filters = {
        search: '',
        sort: {},
        dateRange: {},
        pagination: { type: 'offset', page: 1, limit }
      };
      $searchInput.val('');
      $sortSelect.val('');
      $dateFilter.val('');
      saveState();
      fetchData(state.filters, false);
    });
    $element.off('click.skeleton', '.skl-card-page-btn').on('click.skeleton', '.skl-card-page-btn', e => {
      e.preventDefault();
      const page = parseInt(jQuery(e.currentTarget).data('page'));
      if (page && page !== state.filters.pagination.page && !state.isLoading) {
        state.filters.pagination.page = page;
        saveState();
        fetchData(state.filters, false);
      }
    });
    $element.off('click.skeleton', '.skeleton-pill-btn').on('click.skeleton', '.skeleton-pill-btn', e => {
      e.preventDefault();
      const $btn = jQuery(e.currentTarget);
      const filterKey = $btn.data('filter');
      let updated = false;
      if (filterKey === 'search' && allowedFilters.includes('search')) {
        state.filters.search = '';
        $searchInput.val('');
        updated = true;
      } else if (filterKey.startsWith('sort_') && allowedFilters.includes('sort')) {
        const [field] = String($btn.data('value')).split(':');
        delete state.filters.sort[field];
        $sortSelect.val('');
        updated = true;
      } else if (filterKey === 'dateRange' && allowedFilters.includes('date')) {
        state.filters.dateRange = {};
        $dateFilter.val('');
        updated = true;
      }
      if (updated) {
        state.filters.pagination.page = 1;
        saveState();
        fetchData(state.filters, false);
      }
    });
    // Load initial state and fetch data immediately
    loadState();
    fetchData(state.filters, false).then(() => {
      updateSortOptions();
      initScrollObserver(); // Initialize scroll observer after initial data load
    }).catch(e => {
      // console.error('Initial fetch failed:', e);
      // window.general?.errorToast?.('Failed to load initial card data');
    });
  });
}
/**
 * Reloads a card set by its token.
 * @param {string} token - The unique token for the card set.
 */
export function reloadCardSet(token) {
  if (!token) {
    window.general?.errorToast?.('No token provided for card reload');
    return;
  }
  const escapedToken = $.escapeSelector(token);
  const $elements = jQuery(`.skeleton-card-container-${escapedToken}`);
  if (!$elements.length) {
    window.general?.errorToast?.('Card container not found for the provided token');
    return;
  }
  $elements.find('.skl-card-refresh-btn').trigger('click.skeleton');
}