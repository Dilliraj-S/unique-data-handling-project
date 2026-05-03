import Sortable from 'sortablejs';

/**
 * Initializes form steppers for elements with the [data-stepper] attribute.
 * Manages multi-step forms with navigation and validation.
 * Uses window.general for logging and toasts without external libraries.
 *
 * @requires window.general
 * @requires bootstrap
 */
export function stepper() {
  // Validate window.general availability
  if (!window.general) {
    window.general?.error('window.general is required but not available');
    return;
  }

  // Select all steppers
  const steppers = document.querySelectorAll('[data-stepper]');
  if (!steppers.length) {
    window.general.log('No steppers found with data-stepper attribute');
    return;
  }

  steppers.forEach(stepper => {
    try {
      // Skip if already initialized
      if (stepper.dataset.stepperInitialized === 'true') {
        return;
      }

      const form = stepper.closest('form');
      if (!form) {
        window.general.error('No parent form found for stepper', { id: stepper.id });
        return;
      }

      const steps = stepper.querySelectorAll('[data-step]');
      if (!steps.length) {
        window.general.error('No steps found in stepper', { id: stepper.id });
        return;
      }

      const nav = stepper.querySelector('[data-stepper-nav]');
      let currentStep = 0;

      // Initialize navigation
      const updateNavigation = () => {
        steps.forEach((step, index) => {
          step.classList.toggle('d-none', index !== currentStep);
          if (nav) {
            const navItems = nav.querySelectorAll('[data-step-nav]');
            navItems.forEach((item, i) => {
              item.classList.toggle('active', i === currentStep);
              item.classList.toggle('completed', i < currentStep);
            });
          }
        });

        const prevBtn = stepper.querySelector('[data-stepper-prev]');
        const nextBtn = stepper.querySelector('[data-stepper-next]');
        const submitBtn = form.querySelector('[type="submit"]');

        if (prevBtn) prevBtn.disabled = currentStep === 0;
        if (nextBtn) nextBtn.disabled = currentStep === steps.length - 1;
        if (submitBtn) submitBtn.classList.toggle('d-none', currentStep !== steps.length - 1);
      };

      // Validate current step
      const validateStep = () => {
        const currentStepElement = steps[currentStep];
        const inputs = currentStepElement.querySelectorAll(
          'input[data-validate], select[data-validate], [required]'
        );
        let isValid = true;

        inputs.forEach(input => {
          const value = input.value.trim();
          const format = input.dataset.validate?.toLowerCase();
          if (input.hasAttribute('required') && !value) {
            isValid = false;
            input.classList.add('is-invalid');
          } else if (format && value) {
            const isFormatValid = this.validateForm({ isSubmit: false });
            if (!isFormatValid) isValid = false;
          }
        });

        return isValid;
      };

      // Handle navigation clicks
      stepper.addEventListener('click', e => {
        const prev = e.target.closest('[data-stepper-prev]');
        const next = e.target.closest('[data-stepper-next]');
        const navItem = e.target.closest('[data-step-nav]');

        if (prev && currentStep > 0) {
          currentStep--;
          updateNavigation();
        } else if (next && currentStep < steps.length - 1) {
          if (validateStep()) {
            currentStep++;
            updateNavigation();
          } else {
            window.general.showToast({
              icon: 'error',
              title: 'Validation Error',
              message: 'Please complete all required fields in this step',
              duration: 5000
            });
          }
        } else if (navItem) {
          const targetStep = parseInt(navItem.dataset.stepNav, 10);
          if (targetStep <= currentStep || validateStep()) {
            currentStep = targetStep;
            updateNavigation();
          } else {
            window.general.showToast({
              icon: 'error',
              title: 'Navigation Error',
              message: 'Please complete previous steps first',
              duration: 5000
            });
          }
        }
      });

      // Initialize form submission
      form.addEventListener('submit', e => {
        if (!validateStep()) {
          e.preventDefault();
          window.general.showToast({
            icon: 'error',
            title: 'Validation Error',
            message: 'Please complete all required fields in this step',
            duration: 5000
          });
        }
      });

      // Initialize stepper
      stepper.dataset.stepperInitialized = 'true';
      updateNavigation();
      window.general.log('Stepper initialized', { id: stepper.id, steps: steps.length });
    } catch (e) {
      window.general.error('Error initializing stepper', { id: stepper.id, error: e.message });
      window.general.showToast({
        icon: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize form stepper',
        duration: 5000
      });
    }
  });
}

/**
 * Initializes form repeaters for elements with the [data-repeater] attribute.
 * Manages repeatable form sections with add, remove, and reorder capabilities.
 * Uses window.general for logging and toasts, and Sortable.js for drag-and-drop.
 *
 * @requires window.general
 * @requires Sortable
 */
export function repeater() {
  // Validate window.general availability
  if (!window.general) {
    window.general?.error('window.general is required but not available');
    return;
  }

  // Validate Sortable dependency
  if (typeof Sortable !== 'function') {
    window.general.error('Sortable.js is required but not loaded');
    return;
  }

  // Select all repeaters
  const repeaters = document.querySelectorAll('[data-repeater]');
  if (!repeaters.length) {
    window.general.log('No repeaters found with data-repeater attribute');
    return;
  }

  repeaters.forEach(repeater => {
    try {
      // Skip if already initialized
      if (repeater.dataset.repeaterInitialized === 'true') {
        return;
      }

      const form = repeater.closest('form');
      if (!form) {
        window.general.error('No parent form found for repeater', { id: repeater.id });
        return;
      }

      const template = repeater.querySelector('[data-repeater-template]');
      if (!template) {
        window.general.error('No template found in repeater', { id: repeater.id });
        return;
      }

      const container = repeater.querySelector('[data-repeater-container]');
      if (!container) {
        window.general.error('No container found in repeater', { id: repeater.id });
        return;
      }

      const maxItems = parseInt(repeater.dataset.repeaterMax, 10) || Infinity;
      let itemCount = container.querySelectorAll('[data-repeater-item]').length;

      // Add new repeater item
      const addItem = () => {
        if (itemCount >= maxItems) {
          window.general.showToast({
            icon: 'warning',
            title: 'Limit Reached',
            message: `Cannot add more than ${maxItems} items`,
            duration: 5000
          });
          return;
        }

        const clone = template.cloneNode(true);
        clone.removeAttribute('data-repeater-template');
        clone.setAttribute('data-repeater-item', '');
        clone.classList.remove('d-none');

        // Update input names with index
        const inputs = clone.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
          if (input.name) {
            input.name = input.name.replace(/\[template\]/g, `[${itemCount}]`);
          }
        });

        container.appendChild(clone);
        itemCount++;

        // Reinitialize components in the new item
        this.select();
        this.pills();
        this.datePicker();
        this.editor();
        this.unique();

        window.general.log('Repeater item added', { id: repeater.id, itemCount });
      };

      // Remove repeater item
      const removeItem = item => {
        item.remove();
        itemCount--;

        // Reindex remaining items
        const items = container.querySelectorAll('[data-repeater-item]');
        items.forEach((item, index) => {
          const inputs = item.querySelectorAll('input, select, textarea');
          inputs.forEach(input => {
            if (input.name) {
              input.name = input.name.replace(/\[\d+\]/g, `[${index}]`);
            }
          });
        });

        window.general.log('Repeater item removed', { id: repeater.id, itemCount });
      };

      // Handle add button
      repeater.addEventListener('click', e => {
        if (e.target.closest('[data-repeater-add]')) {
          addItem();
        }
      });

      // Handle remove button
      container.addEventListener('click', e => {
        const removeBtn = e.target.closest('[data-repeater-remove]');
        if (removeBtn) {
          const item = removeBtn.closest('[data-repeater-item]');
          if (item) removeItem(item);
        }
      });

      // Initialize sortable
      new Sortable(container, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        handle: '[data-repeater-drag]',
        onEnd: () => {
          // Reindex items after sorting
          const items = container.querySelectorAll('[data-repeater-item]');
          items.forEach((item, index) => {
            const inputs = item.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
              if (input.name) {
                input.name = input.name.replace(/\[\d+\]/g, `[${index}]`);
              }
            });
          });
          window.general.log('Repeater items reordered', { id: repeater.id });
        }
      });

      // Initialize repeater
      repeater.dataset.repeaterInitialized = 'true';
      window.general.log('Repeater initialized', { id: repeater.id, maxItems });
    } catch (e) {
      window.general.error('Error initializing repeater', { id: repeater.id, error: e.message });
      window.general.showToast({
        icon: 'error',
        title: 'Initialization Error',
        message: 'Failed to initialize form repeater',
        duration: 5000
      });
    }
  });
}