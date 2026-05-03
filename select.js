/**
 * Initializes Select2 dropdowns for <select> elements with the [data-select] attribute.
 * Supports static dropdowns, dropdowns with data-target for triggering dependent updates, and dynamic AJAX-loaded options.
 * Shows a fetching status in target dropdowns and ensures pre-selection for dynamic and static dropdowns, including multiple selections.
 * Stores optionsList in memory for reinitialization in modals/offcanvas without adding attributes.
 * Uses window.general for logging, toasts, and validation.
 *
 * @requires window.general
 * @requires jQuery
 * @requires Select2
 */
export function select() {
  // Validate window.general availability
  if (!window.general || !window.general.requestAction || !window.general.sanitizeInput || !window.general.csrfToken) {
    console.error('window.general and its utilities are required but not available');
    return;
  }

  // Select all elements with data-select attribute
  const selects = document.querySelectorAll('select[data-select]');
  if (!selects.length) {
    return;
  }

  // Validate required dependencies
  if (!window.jQuery || !window.jQuery.fn.select2) {
    window.general.error('jQuery or Select2 is required but not loaded');
    return;
  }

  const $ = window.jQuery;

  /**
   * Debounce utility to limit rapid function calls.
   * @param {Function} func - Function to debounce.
   * @param {number} wait - Wait time in milliseconds.
   * @returns {Function} Debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Finds dependent selects based on source select's target and context.
   * @param {jQuery} $sourceSelect - The source select element.
   * @returns {jQuery} Collection of dependent select elements.
   */
  function getDependentSelects($sourceSelect) {
    const target = $sourceSelect.data('target');
    if (!target) return $();

    const ctx = $sourceSelect.data('ctx');
    let selector = `select[data-source="${target}"]`;

    // Strictly match data-ctx: if source has data-ctx, only match same data-ctx; if no data-ctx, only match no data-ctx
    if (ctx) {
      selector += `[data-ctx="${ctx}"]`;
    } else {
      selector += `[data-ctx=""], select[data-source="${target}"]:not([data-ctx])`;
    }

    return $(selector);
  }

  /**
   * Initializes Select2 with the provided configuration.
   * @param {jQuery} $el - The jQuery select element.
   * @param {Array} optionsList - Array of options for static dropdowns.
   * @param {boolean} isDynamic - Whether the select is dynamic (for AJAX config).
   */
  function initSelect2($el, optionsList, isDynamic = false) {
    // Destroy existing Select2 instance if present
    if ($el.hasClass('select2-hidden-accessible')) {
      $el.select2('destroy');
    }

    // Add placeholder option for single-select if needed
    if (!$el.prop('multiple') && !$el.find('option[value=""]').length) {
      $el.prepend($('<option/>', { value: '', text: 'Select an option', disabled: true }));
    }

    // Base config
    const config = {
      placeholder: $el.prop('multiple') ? '' : 'Select an option',
      width: '100%',
      dropdownParent: $el.closest('.modal, .offcanvas').length ? $el.closest('.modal, .offcanvas') : $('body'),
      allowClear: !($el.prop('multiple') || $el.prop('required')),
      minimumInputLength: 0, // Allow initial load without search
      dropdownCssClass: 'select2-dropdown',
      templateResult: data => (data.id ? $(`<span>${data.text}</span>`) : data.text),
      templateSelection: data => data.text || data.id || 'Select an option'
    };

    // For dynamic selects, add AJAX with pagination
    if (isDynamic) {
      config.ajax = {
        cache: false, // Disable client-side caching
        delay: 250, // Debounce search requests
        data: function (params) {
          let parentSelector = `select[data-target="${$el.data('source')}"]`;
          const ctx = $el.data('ctx');
          if (ctx) {
            parentSelector += `[data-ctx="${ctx}"]`;
          } else {
            parentSelector += `[data-ctx=""], select[data-target="${$el.data('source')}"]:not([data-ctx])`;
          }
          const parent = document.querySelector(parentSelector);
          const parentVal = parent ? $(parent).val() : null;
          return {
            q: params.term || '', // Search term (empty for initial load)
            page: params.term ? 1 : (params.page || 1), // Reset to page 1 for searches
            per_page: 10, // Records per page
            skeleton_token: $el.data('source'),
            selected_value: parentVal, // For dependent dropdowns
            selected: parseDataValue($el.data('value')), // Preselected values
            initial_load: !params.term // Set initial_load true only if no search term
          };
        },
        processResults: function (data, params) {
          if (data.status && Array.isArray(data.data)) {
            return {
              results: data.data.map(item => ({
                id: item.value,
                text: item.view,
                selected: item.is_selected
              })),
              pagination: {
                more: data.pagination && data.pagination.more
              }
            };
          }
          return { results: [] };
        },
        transport: function (params, success, failure) {
          const payload = params.data || {};

          // Debug logging
          console.log('Select2 AJAX request:', {
            source: $el.data('source'),
            payload: payload,
            element: $el.attr('id') || $el.attr('name')
          });

          window.general.axiosRequest({
            method: 'post',
            url: '/select/options',
            data: payload,
            requestId: `select-options-${$el.attr('id') || $el.data('source')}`
          })
            .then(response => {
              console.log('Select2 AJAX response:', response);
              if (response?.data) {
                success(response.data);
              } else {
                failure(new Error('Invalid response format'));
              }
            })
            .catch(error => {
              console.error('Select2 AJAX error:', error);

              // Check if it's a 404 (table not found) or 500 error
              if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.message || 'Unknown error';

                if (status === 404) {
                  console.warn('Table not found:', message);
                  window.general.showToast({
                    icon: 'warning',
                    title: 'Table Not Found',
                    message: message,
                    duration: 5000
                  });
                  // Return empty results instead of failing
                  success({
                    status: false,
                    message: message,
                    data: []
                  });
                  return;
                } else if (status === 500) {
                  console.error('Server error:', message);
                  window.general.showToast({
                    icon: 'error',
                    title: 'Server Error',
                    message: 'Server error: ' + message,
                    duration: 5000
                  });
                  // Return empty results instead of failing
                  success({
                    status: false,
                    message: 'Server error: ' + message,
                    data: []
                  });
                  return;
                }
              }

              window.general.error('Error fetching dynamic options', {
                source: $el.data('source'),
                ctx: $el.data('ctx'),
                error: error.message
              });
              window.general.showToast({
                icon: 'error',
                title: 'Error',
                message: 'Failed to load dropdown options',
                duration: 5000
              });
              failure(error);
            });
        }
      };
    } else {
      // Add custom dropdown header for static multiple-select dropdowns
      if (optionsList && optionsList.length && $el.prop('multiple')) {
        try {
          const Dropdown = $.fn.select2.amd.require('select2/dropdown');
          if (typeof Dropdown.extend === 'function') {
            config.dropdownAdapter = Dropdown.extend({
              render() {
                const $dropdown = this._super();
                const $header = $(`
                  <div class="select2-dropdown__header">
                    <div class="select2-dropdown__item select2-dropdown__item__clear-all" tabindex="0" role="option"><strong>Clear All</strong></div>
                    <div class="select2-dropdown__item select2-dropdown__item__select-all" tabindex="0" role="option"><strong>Select All</strong></div>
                  </div>
                `);
                $dropdown.prepend($header);
                return $dropdown;
              }
            });
          }
        } catch (e) {
          window.general.error('Error extending Select2 dropdown adapter', { id: $el.attr('id'), error: e.message });
        }
      }
    }

    // Initialize Select2
    try {
      $el.select2(config);
    } catch (e) {
      window.general.error('Error initializing Select2', { id: $el.attr('id'), error: e.message });
      return;
    }

    // Handle dropdown open event for clear/select all buttons (static only)
    if (!isDynamic) {
      $el.on('select2:open', () => {
        const $dropdown = $('.select2-dropdown');
        $dropdown.find('.select2-dropdown__item__clear-all').off('click').on('click', () => {
          $el.val(null).trigger('change.select2');
          $el.select2('close');
        });
        $dropdown.find('.select2-dropdown__item__select-all').off('click').on('click', () => {
          const allValues = optionsList.map(item => item.value || item.id);
          $el.val(allValues).trigger('change.select2');
          $el.select2('close');
        });
      });
    }
  }

  /**
   * Parses and cleans data-value attribute to handle various formats.
   * @param {string} value - The data-value attribute.
   * @returns {Array} Clean array of values.
   */
  function parseDataValue(value) {
    if (!value && value !== 0) return [];

    if (Array.isArray(value)) return value;
    if (typeof value === 'number') return [value.toString()];
    if (typeof value !== 'string') return [String(value)];

    let cleanedValue = value.trim();

    if (/^[\d]+$/.test(cleanedValue)) {
      return [cleanedValue];
    }

    try {
      cleanedValue = cleanedValue
        .replace(/"="\s*$/, '')
        .replace(/\s*"\s*([^"]+)\s*"/g, '"$1"')
        .trim();
      const parsed = JSON.parse(cleanedValue);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return cleanedValue
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(val => val.trim())
        .filter(val => val);
    }
  }

  /**
   * Initializes the select element based on type.
   * @param {jQuery} $select - The jQuery select element.
   * @param {Array} optionsList - Array of options for static dropdowns.
   */
  function initSelect($select, optionsList) {
    try {
      const type = $select.data('select');
      if (!type) {
        throw new Error('data-select attribute is missing or invalid');
      }
      if (type === 'dropdown') {
        // Static dropdown, populate options first
        $select.find('option').not('[value=""]').remove();
        if (optionsList && optionsList.length) {
          optionsList.forEach(({ value, view }) => {
            $select.append(new Option(view || value, value, false, false));
          });
        }
        // Parse pre-selection
        const preselectVal = parseDataValue($select.data('value'));
        const availableValues = optionsList.map(opt => opt.value);
        const validValues = preselectVal.filter(val => availableValues.includes(val));
        // Initialize Select2 after populating options
        initSelect2($select, optionsList);
        // Apply pre-selection
        if (validValues.length) {
          $select.val(validValues).trigger('change.select2');
        }
      } else if (type === 'dynamic' && $select.data('source')) {
        // Dynamic with AJAX and pagination
        initSelect2($select, [], true); // Pass true for dynamic
      } else {
        throw new Error(`Invalid data-select type: ${type}`);
      }
      // Handle required field validation
      if ($select.prop('required')) {
        $select.off('change.validate').on('change.validate', () => {
          const isInvalid = $select.val() === null || $select.val().length === 0;
          $select.toggleClass('is-invalid', isInvalid);
          if (typeof window.general.validateForm === 'function') {
            window.general.validateForm({ isSubmit: false });
          }
        });
        $select.trigger('change.validate');
      }
    } catch (e) {
      window.general.error('Error initializing select', { id: $select.attr('id'), type: $select.data('select'), ctx: $select.data('ctx'), error: e.message });
    }
  }

  // Initialize all selects and handle dependencies for pre-selection
  selects.forEach(select => {
    try {
      const $select = $(select);
      // Parse options data for static dropdowns
      let optionsList = [];
      try {
        const optionsData = $select.data('options');
        if (optionsData) {
          optionsList = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
          if (!Array.isArray(optionsList)) {
            optionsList = Object.entries(optionsList).map(([value, view]) => ({ value, view }));
          }
        } else if ($select.data('select') === 'dropdown') {
          optionsList = $select.find('option').map((_, opt) => ({
            value: opt.value,
            view: opt.text
          })).get();
        }
        $select.data('options-list', optionsList);
      } catch (e) {
        window.general.error('Invalid data-select-options format', { id: select.id, ctx: $select.data('ctx'), error: e.message });
        return;
      }
      // Initialize select
      initSelect($select, optionsList);
    } catch (e) {
      window.general.error('Error processing select element', { id: select.id, ctx: $select.data('ctx'), error: e.message });
    }
  });

  // Handle dependencies for pre-selection and modal/offcanvas reinitialization
  selects.forEach(select => {
    const $select = $(select);
    if ($select.data('target')) {
      $select.off('change.selectHandler').on('change.selectHandler', debounce(() => {
        const $dependentSelects = getDependentSelects($select);
        for (const dep of $dependentSelects) {
          const $dep = $(dep);
          if ($dep.data('select') === 'dynamic') {
            // For dynamic, destroy and re-init to refresh AJAX data
            initSelect2($dep, [], true);
          } else if ($dep.data('select') === 'dropdown') {
            // For static, trigger change if needed
            $dep.trigger('change');
          }
        }
      }, 100));
    }
    // Ensure dependent dropdowns are re-fetched if pre-selection fails
    if ($select.data('select') === 'dropdown' || $select.data('select') === 'dynamic') {
      const preselectVal = parseDataValue($select.data('value'));
      if (preselectVal.length && !preselectVal.every(val => $select.val()?.includes(val))) {
        if ($select.data('select') === 'dropdown') {
          const optionsList = $select.data('options-list') || [];
          const validValues = preselectVal.filter(val => optionsList.some(opt => opt.value == val));
          if (validValues.length) {
            $select.val(validValues).trigger('change.select2');
          }
        } else if ($select.data('select') === 'dynamic' && $select.data('source')) {
          // Dynamic pre-selection handled by AJAX on init
          initSelect2($select, [], true);
        }
      }
    }
    // Reinitialize on modal/offcanvas show
    ['shown.bs.modal', 'shown.bs.offcanvas'].forEach(evt => {
      $(select.closest('.modal, .offcanvas')).on(evt, () => {
        try {
          let optionsList = $select.data('options-list') || [];
          if (!optionsList.length && $select.data('select') === 'dropdown') {
            const optionsData = $select.data('options');
            if (optionsData) {
              optionsList = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
              if (!Array.isArray(optionsList)) {
                optionsList = Object.entries(optionsList).map(([value, view]) => ({ value, view }));
              }
            } else {
              optionsList = $select.find('option').map((_, opt) => ({
                value: opt.value,
                view: opt.text
              })).get();
            }
            $select.data('options-list', optionsList);
          }
          initSelect($select, optionsList);
        } catch (e) {
          window.general.error('Error reinitializing select in modal/offcanvas', { id: $select.attr('id'), ctx: $select.data('ctx'), error: e.message });
        }
      });
    });
  });

}