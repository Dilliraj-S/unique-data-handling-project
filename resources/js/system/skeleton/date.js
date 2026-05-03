/**
 * Initializes daterangepicker for inputs with the [data-date-picker] attribute.
 * Supports single date, date range, datetime, and datetime range pickers with
 * past/future constraints, source/target dependencies, and modal/offcanvas cleanup.
 * Relies on window.general for logging, toasts, and utilities.
 * 
 * @requires jQuery
 * @requires moment.js
 * @requires daterangepicker
 */
export function datePicker() {
  // Validate dependencies
  if (!window.general) {
    console.error('window.general is required but not available');
    return;
  }
  if (!window.jQuery) {
    window.general.error('jQuery is required but not loaded');
    return;
  }
  if (!window.moment) {
    window.general.error('Moment.js is required but not loaded');
    return;
  }
  if (!window.jQuery.fn.daterangepicker) {
    window.general.error('Daterangepicker is required but not loaded');
    return;
  }

  const $ = window.jQuery;
  const inputs = document.querySelectorAll('[data-date-picker]');
  if (!inputs.length) {
    window.general.log('No date picker inputs found');
    return;
  }

  const today = window.moment().startOf('day');

  inputs.forEach(input => {
    try {
      // Clean up existing picker
      const cleanupPicker = () => {
        if ($(input).data('daterangepicker')) {
          $(input).data('daterangepicker').remove();
          $(input).off('apply.daterangepicker cancel.daterangepicker show.daterangepicker');
          $(input).removeData('daterangepicker');
        }
        $(input).val('');
      };

      // Extract attributes
      const type = input.getAttribute('data-date-picker');
      const allow = input.getAttribute('data-date-picker-allow') || '';
      const targetId = input.getAttribute('data-date-picker-target');
      const sourceId = input.getAttribute('data-date-picker-source');

      // Determine date constraints
      let minDate, maxDate;
      const match = allow.match(/^(past|future)-(\d+)([ymd])$/);
      if (match) {
        const [, direction, value, unit] = match;
        const units = { y: 'years', m: 'months', d: 'days' };
        const date = window.moment(today)[direction === 'past' ? 'subtract' : 'add Eliot']
        if (!date.isValid()) {
          window.general.error('Invalid date calculated for constraints', { direction, value, unit });
          return;
        }
        [minDate, maxDate] = direction === 'past' ? [date, today] : [today, date];
      } else if (allow === 'past') {
        maxDate = today;
      } else if (allow === 'future' || allow === 'future-range') {
        minDate = today;
      } else if (allow === 'past-range') {
        maxDate = today;
      }

      // Configure picker
      const isTimeEnabled = type === 'datetime' || type === 'datetime-range';
      const format = isTimeEnabled ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD';
      const isRange = type === 'range' || type === 'datetime-range';

      const config = {
        singleDatePicker: !isRange,
        timePicker: isTimeEnabled,
        timePicker24Hour: false,
        autoApply: false,
        locale: {
          format,
          cancelLabel: 'Clear',
          applyLabel: 'Apply',
          daysOfWeek: window.moment.weekdaysMin(),
          monthNames: window.moment.monthsShort(),
          firstDay: window.moment.localeData().firstDayOfWeek()
        },
        minDate,
        maxDate,
        showDropdowns: true,
        autoUpdateInput: false,
        startDate: isRange ? today.clone() : null,
        endDate: isRange ? today.clone() : null
      };

      // Set parent element for modal
      const $modal = $(input).closest('.modal');
      const $modalBody = $(input).closest('.modal-body');
      if ($modalBody.length) {
        config.parentEl = $modalBody[0];
      } else {
        config.parentEl = document.body;
      }

      // Add predefined ranges
      if (isRange) {
        config.ranges = {
          'Today': [today.clone(), today.clone()],
          'Yesterday': [today.clone().subtract(1, 'days'), today.clone().subtract(1, 'days')],
          'Last 7 Days': [today.clone().subtract(6, 'days'), today.clone()],
          'Last 30 Days': [today.clone().subtract(29, 'days'), today.clone()],
          'This Month': [today.clone().startOf('month'), today.clone().endOf('month')],
          'Last Month': [
            today.clone().subtract(1, 'month').startOf('month'),
            today.clone().subtract(1, 'month').endOf('month')
          ]
        };
      }

      // Initialize picker
      const initializePicker = () => {
        cleanupPicker(); // Ensure clean state
        $(input).daterangepicker(config);
        $(input).val(''); // Keep input empty
        // Debug picker initialization
        window.general.log('Picker initialized', { id: input.id });

        // Handle show event
        $(input).off('show.daterangepicker').on('show.daterangepicker', (ev, picker) => {
          picker.container.css('z-index', $modal.length ? 1051 : 1000);
          picker.updateCalendars();
          picker.updateView();
          window.general.log('Picker shown', { id: input.id });
        });

        // Handle date/range selection
        if (isRange) {
          $(input).off('apply.daterangepicker').on('apply.daterangepicker', (ev, picker) => {
            window.general.log('Apply event triggered', {
              id: input.id,
              startDate: picker.startDate.toString(),
              endDate: picker.endDate.toString()
            });
            if (!picker.startDate.isValid() || !picker.endDate.isValid()) {
              window.general.error('Invalid date range selected', {
                id: input.id,
                startDate: picker.startDate,
                endDate: picker.endDate
              });
              $(input).val('').trigger('change');
              return;
            }
            if (allow === 'future-range' && picker.startDate.isBefore(today)) {
              picker.startDate = today.clone();
              picker.setStartDate(picker.startDate);
            }
            if (allow === 'past-range' && picker.endDate.isAfter(today)) {
              picker.endDate = today.clone();
              picker.setEndDate(picker.endDate);
            }
            const value = `${picker.startDate.format(format)} - ${picker.endDate.format(format)}`;
            $(input).val(value).trigger('change');
            picker.hide();
            window.general.log('Date applied', { id: input.id, value });
          });

          $(input).off('cancel.daterangepicker').on('cancel.daterangepicker', () => {
            $(input).val('').trigger('change');
            window.general.log('Picker cancelled', { id: input.id });
          });
        } else {
          $(input).off('apply.daterangepicker').on('apply.daterangepicker', (ev, picker) => {
            window.general.log('Apply event triggered', {
              id: input.id,
              startDate: picker.startDate.toString()
            });
            if (!picker.startDate.isValid()) {
              window.general.error('Invalid start date selected', {
                id: input.id,
                startDate: picker.startDate
              });
              $(input).val('').trigger('change');
              return;
            }
            const value = picker.startDate.format(format);
            $(input).val(value).trigger('change');
            picker.hide();
            window.general.log('Date applied', { id: input.id, value });

            // Update target input if applicable
            if (targetId) {
              const target = document.getElementById(targetId);
              if (target && $(target).data('daterangepicker')) {
                const tPicker = $(target).data('daterangepicker');
                if (allow === 'source-future' && tPicker.startDate.isValid() && tPicker.startDate.isBefore(picker.startDate)) {
                  tPicker.minDate = picker.startDate;
                  tPicker.setStartDate(picker.startDate);
                  tPicker.setEndDate(picker.startDate);
                  $(target).val(picker.startDate.format(format)).trigger('change');
                } else if (allow === 'source-past' && tPicker.startDate.isValid() && tPicker.startDate.isAfter(picker.startDate)) {
                  tPicker.maxDate = picker.startDate;
                  tPicker.setStartDate(picker.startDate);
                  tPicker.setEndDate(picker.startDate);
                  $(target).val(picker.startDate.format(format)).trigger('change');
                }
              }
            }
          });

          $(input).off('cancel.daterangepicker').on('cancel.daterangepicker', () => {
            $(input).val('').trigger('change');
            window.general.log('Picker cancelled', { id: input.id });
          });
        }
      };

      // Initial initialization
      initializePicker();

      // Handle modal events
      if ($modal.length) {
        // Cleanup on modal close
        $modal.off('hidden.bs.modal').on('hidden.bs.modal', () => {
          cleanupPicker();
          window.general.log('Date picker cleaned up on modal close', { id: input.id });
        });

        // Reinitialize on modal show
        $modal.off('shown.bs.modal').on('shown.bs.modal', () => {
          initializePicker();
          window.general.log('Date picker reinitialized on modal show', { id: input.id });
        });
      }

    } catch (e) {
      window.general.error('Error initializing date picker for input', { id: input.id, error: e.message });
    }
  });
}