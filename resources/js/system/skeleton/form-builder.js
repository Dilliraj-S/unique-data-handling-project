import '../../../libs/forms/form-builder/jquery-ui.js';
import '../../../libs/forms/form-builder/jquery-ui.min.css';
import '../../../libs/forms/form-builder/form-builder.min.js';
/**
 * Initializes jQuery FormBuilder v3.20.0 with custom sidebar and hidden input update.
 * Dynamically reads allowed fields from `data-form-builder-fields` to control sidebar visibility.
 *
 * @param {string} id - Target form-builder ID (data-form-builder-id).
 * @param {string|Array|null} preTemplate - Optional JSON or Array with preloaded form data.
 */
export function formBuilder(id, preTemplate = null) {
  if (!window.general || typeof $ !== 'function' || !$.fn.formBuilder) {
    console.error('Dependencies missing: window.general, jQuery, or formBuilder');
    return;
  }
  const selector = `div[data-form-builder-id="${id}"]`;
  const target = document.querySelector(selector);
  if (!target) {
    showError(`No element found for form builder ID: ${id}`);
    return;
  }
  const inputName = getInputName(target);
  const { allowedFields, disabledFields } = getFieldConfig(target);
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';
  hiddenInput.name = inputName;
  target.before(hiddenInput);
  const formBuilderConfig = {
    scrollToFieldOnAdd: true,
    stickyControls: {
      enable: true,
      offset: { top: 20, right: 20, left: 'auto' }
    },
    disableFields: disabledFields,
    controlOrder: allowedFields,
    disabledAttrs: [
      'access', 'className', 'inline', 'rows', 'step',
      'style', 'description', 'name'
    ],
    controlPosition: 'left',
    showActionButtons: false
  };
  if (preTemplate) {
    const template = parsePreTemplate(preTemplate, allowedFields);
    if (template) formBuilderConfig.formData = template;
  }
  const fbPromise = $(target).formBuilder(formBuilderConfig);
  fbPromise.promise.then(fb => {
    updateHidden(fb);
    const debouncedUpdate = debounce(() => updateHidden(fb), 100);
    $(target).on(
      'fieldAdded fieldRemoved fieldEdited keyup change input click',
      debouncedUpdate
    );
  }).catch(err => {
    showError(`Initialization failed: ${err.message}`);
  });
  /** --- Helpers --- **/
  function updateHidden(fb) {
    try {
      const formData = JSON.parse(fb.actions.getData('json', true));
      hiddenInput.value = JSON.stringify({ content: formData });
    } catch (e) {
      showError(`Failed to update content: ${e.message}`);
    }
  }
  function getInputName(el) {
    const name = el.getAttribute('data-form-builder-name')?.trim();
    if (!name || !/^[\w\-]+$/.test(name)) {
      showWarn(`Invalid or missing input name: "${name}", using default "content"`);
      return 'content';
    }
    return name;
  }
  function getFieldConfig(el) {
    const allFields = [
      'autocomplete', 'button', 'checkbox-group', 'date', 'file',
      'header', 'hidden', 'number', 'paragraph', 'radio-group',
      'select', 'starRating', 'text', 'textarea', 'email'
    ];
    const attr = el.getAttribute('data-form-builder-fields')?.trim();
    let allowedFields = ['text', 'number', 'textarea', 'select', 'date']; // Default fields
    if (attr) {
      allowedFields = attr
        .split('|')
        .map(f => f.trim().toLowerCase())
        .filter(f => allFields.includes(f));
      if (!allowedFields.length) {
        showWarn(`No valid fields in "${attr}", using defaults`);
        allowedFields = ['text', 'number', 'textarea', 'select', 'date'];
      }
    }
    const disabledFields = allFields.filter(f => !allowedFields.includes(f));
    return { allowedFields, disabledFields };
  }
  function showError(msg, title = 'Error') {
    window.general.error(msg);
    window.general.showToast({ icon: 'error', title, message: msg, duration: 5000 });
  }
  function showWarn(msg, title = 'Warning') {
    window.general.error(msg);
    window.general.showToast({ icon: 'warning', title, message: msg, duration: 5000 });
  }
  function debounce(fn, delay) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }
  function parsePreTemplate(template, allowedFields) {
    try {
      const parsed = typeof template === 'string' ? JSON.parse(template) : template;
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(field => allowedFields.includes(field.type));
    } catch (e) {
      showError(`Invalid preTemplate: ${e.message}`);
      return null;
    }
  }
}