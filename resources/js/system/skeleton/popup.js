import interact from 'interactjs';
/**
 * Sets up global event listeners for popup triggers, form submissions, and form validation.
 * Handles clicks on elements with class 'skeleton-popup' and form input events for validation.
 * 
 * @requires window.general
 * @requires jQuery
 * @requires bootstrap
 */
export function setupEventListeners() {
  // Handle clicks on popup trigger elements
  document.addEventListener('click', e => {
    const target = e.target.closest('.skeleton-popup');
    if (target) {
      e.preventDefault();
      this.showPopup({
        element: target,
        token: target.dataset.token || '',
        id: target.dataset.id || '',
        type: target.dataset.type || '',
      });
    }
  });
  // Handle form submissions
  document.addEventListener('submit', e => {
    const form = e.target.closest('form');
    if (form) {
      e.preventDefault();
      this.currentForm = form;
      if (this.validateForm({ isSubmit: true })) {
        this.savePopup({ formElement: form, beforeText: 'Saving', afterText: 'Saved' });
      }
    }
  });
  // Handle input events for validation
  ['blur', 'change', 'focus', 'paste', 'cut'].forEach(event => {
    document.addEventListener(
      event,
      e => {
        const element = e.target.closest('input[data-validate], select[data-validate]');
        if (element) {
          const form = element.closest('form');
          if (form) {
            this.currentForm = form;
            this.validateForm();
          }
        }
      },
      event === 'blur' ? { capture: true } : {}
    );
  });
}
/**
 * Displays a popup (modal or offcanvas) based on the provided token.
 * Fetches content via AJAX and renders the popup with form elements.
 * 
 * @param {Object} options - Configuration options.
 * @param {HTMLElement} [options.element] - The trigger element.
 * @param {string} [options.token=''] - The token for the AJAX request.
 * @returns {Promise<void>}
 */
export async function showPopup({ element, token = '', id = '', type='' } = {}) {
  if (!window.general.canProceed()) {
    window.general.log('Cannot proceed with popup display');
    return;
  }
  let originalHtml;
  try {
    if (element) {
      originalHtml = element.innerHTML;
      element.disabled = true;
      element.classList.add('disabled');
      element.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i>';
    }
    const response = await window.general.requestAction(token, { id: id || '' , type: type || ''});
    await this.handlePopupSuccess(
      response.data,
      element,
      originalHtml,
      `${window.general.baseUrl}/skeleton-action/${window.general.modifyToken(token, 's')}`
    );
  } catch (e) {
    window.general.error('Error in showPopup:', e);
    window.general.showToast({
      icon: 'error',
      title: e.response?.data?.title || 'Popup Error',
      message: e.response?.data?.message || 'Failed to load options',
      duration: 5000
    });
  } finally {
    if (element) {
      element.disabled = false;
      element.classList.remove('disabled');
      element.innerHTML = originalHtml || '';
    }
  }
}
/**
 * Saves form data via AJAX submission.
 * Updates the submit button state and handles success/error responses.
 * 
 * @param {Object} options - Configuration options.
 * @param {HTMLFormElement} [options.formElement] - The form element to submit.
 * @param {string} [options.beforeText='Saving'] - Text to display on the button during submission.
 * @param {string} [options.afterText='Saved'] - Text to display on the button after submission.
 * @returns {Promise<void>}
 */
export async function savePopup({ formElement, beforeText = 'Saving', afterText = 'Saved' } = {}) {
  if (!formElement) {
    window.general.error('No form element provided for savePopup');
    return;
  }
  const button = formElement.querySelector('button[type="submit"]');
  let originalHtml;
  try {
    if (button) {
      originalHtml = button.innerHTML;
      button.disabled = true;
      button.classList.add('disabled');
      button.innerHTML = `${beforeText} <i class="fa-solid fa-arrows-rotate fa-spin"></i>`;
    }
    const formData = new FormData(formElement);
    const isStatic = formElement.classList.contains('static');
    const url = isStatic
      ? `${window.general.baseUrl}/skeleton-action/${formData.get('save_token')}`
      : formElement.action;
    const response = await axios.post(url, formData, {
      headers: {
        'X-CSRF-TOKEN': window.general.csrfToken,
        'Content-Type': 'multipart/form-data'
      }
    });
    await this.handleSaveSuccess(response.data, formElement, button, originalHtml, afterText);
  } catch (e) {
    window.general.showToast({
      icon: 'error',
      title: e.response?.data?.title || 'Error',
      message: e.response?.data?.message || 'Failed to save form data',
      duration: 5000
    });
    window.general.error('Error in savePopup:', e);
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('disabled');
      button.innerHTML = originalHtml || '';
    }
  }
}
/**
 * Handles successful form submission responses.
 * Updates UI, triggers table reloads, or refreshes the page as needed.
 * 
 * @param {Object} data - The server response data.
 * @param {HTMLFormElement} formElement - The form element.
 * @param {HTMLButtonElement} button - The submit button.
 * @param {string} originalHtml - The original button HTML.
 * @param {string} afterText - The text to display on the button after submission.
 */
export function handleSaveSuccess(data, formElement, button, originalHtml, afterText) {
  // Re-enable button and update its content
  if (button) {
    button.disabled = false;
    button.classList.remove('disabled');
    button.innerHTML = afterText ?? originalHtml ?? '';
  }
  if (!data.status) {
    window.general.showToast({
      icon: 'error',
      title: data.title || 'Error',
      message: data.message || 'Save failed',
      duration: 5000
    });
    if (data.errors) {
      window.general.error('Save errors:', data.errors);
    }
    return;
  }
  // Success: close modal or offcanvas
  const modal = formElement.closest('.modal');
  const offcanvas = formElement.querySelector('.offcanvas');
  const instance = modal
    ? bootstrap.Modal.getInstance(modal)
    : offcanvas
      ? bootstrap.Offcanvas.getInstance(offcanvas)
      : null;
  // Reload table if needed
  if (data.token && data.reload_table) {
    const tableId = data.reload_table === true
      ? `${data.token}_t`
      : `${data.token}_t_${data.reload_table}`;
    this.reloadTable(tableId);
  }
  // Reload card if needed
  if (data.token && data.reload_card) {
    const cardId = data.reload_card === true
      ? `${data.token}_c`
      : `${data.token}_c_${data.reload_card}`;
    this.reloadCard(cardId);
  }
  // Reload page
  if (data.reload_page) {
    window.location.reload(true);
  }
  // Run Script
  if (data.script) {
      try {
        new Function(data.script)();
      } catch (e) {
        window.general.error('Script execution failed:', e);
      }
    }
  // Close modal or offcanvas unless hold_popup is true
  if (!data.hold_popup) {
    instance?.hide();
  }
  // Show success toast
  window.general.showToast({
    icon: 'success',
    title: data.title || 'Success',
    message: data.message || 'Saved successfully',
    duration: 5000
  });
}
/**
 * Handles successful popup data responses.
 * Renders a modal or offcanvas with form content and sets up interactivity.
 * 
 * @param {Object} data - The server response data.
 * @param {HTMLElement} element - The trigger element.
 * @param {string} originalHtml - The original element HTML.
 * @param {string} formUrl - The form submission URL.
 * @returns {Promise<void>}
 */
export async function handlePopupSuccess(data, element, originalHtml, formUrl) {
  if (element) {
    element.disabled = false;
    element.classList.remove('disabled');
    element.innerHTML = originalHtml || '';
  }
  try {
    if (!data || typeof data !== 'object' || !data.status) {
      throw new Error(data?.message || 'Invalid popup data');
    }
    const formClass = window.general.generateFormClass(data.token || 'default');
    const isModal = data.type === 'modal';
    const isToValidate = data.type === 'validate';
    const validateClass = isToValidate ? ' was-validated' : '';
    const popupClass = isModal ? `skeleton-modal-${formClass}` : `skeleton-offcanvas-${formClass}`;
    // Remove existing popups and forms
    document.querySelectorAll(`.${popupClass}`).forEach(el => el.remove());
    document.querySelectorAll(`form.${formClass}`).forEach(el => el.remove());
    // Generate popup HTML
    const popupHTML = isModal
      ? `
          <div class="modal fade skeleton-modal ${popupClass}" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
            <div class="modal-dialog modal-dialog-centered ${data.size || 'modal-lg'} resizable-modal">
              <div class="modal-content draggable-modal">
                <div class="modal-header skeleton-modal-header ${data.header === 'hide' ? 'd-none' : ''}">
                  <div class="skeleton-mdl-hdr-lbl-grp">
                    <button type="button" class="btn modal-drag-handle"><span>⋮⋮</span></button>
                    <h5 class="modal-title skeleton-modal-label m-0">${data.label || 'Info'}</h5>
                  </div>
                  <div class="skeleton-mdl-hdr-btn-grp">
                    <button type="button" class="download-btn ${data.download ? '' : 'd-none'} modal-download-btn"><i class="fa-light fa-download"></i></button>
                    <button type="button" class="share-btn ${data.share ? '' : 'd-none'} modal-share-btn"><i class="fa-light fa-share-from-square"></i></button>
                    <button type="button" class="modal-data-reload-btn update-form-data-dyn" data-form-name=".${formClass}"><i class="fa-light fa-refresh"></i></button>
                    <button type="button" class="modal-fullscreen-btn"><i class="fa-light fa-expand"></i></button>
                    <button type="button" data-bs-dismiss="modal" aria-label="Close"><i class="fa fa-times" aria-hidden="true"></i></button>
                  </div>
                </div>
                <form action="${formUrl || ''}" method="POST" class="skeleton-form ${formClass} ${validateClass}" enctype="multipart/form-data">
                  <input type="hidden" name="_token" value="${window.general.csrfToken || ''}">
                  <div class="modal-body skeleton-modal-body ${data.header === 'hide' || data.footer === 'hide' ? 'pb-4' : ''}">
                    <div class="p-1px">${data.content || ''}</div>
                  </div>
                  <div class="modal-footer skeleton-modal-footer ${data.footer === 'hide' ? 'd-none' : ''}">
                    <button type="button" class="btn btn-secondary m-0 me-2 btn-md" data-bs-dismiss="modal">Close</button>
                    <button type="submit" class="btn m-0 btn-md skeleton-form-btn ${data.button_class || 'btn-primary'}">
                      ${data.button || '<i class="fa-solid fa-plus me-2"></i>Save'}
                    </button>
                  </div>
                </form>
                <div class="modal-resize-handle bottom-right"></div>
              </div>
            </div>
          </div>`
      : `
          <form action="${formUrl || ''}" method="POST" class="skeleton-form ${formClass} ${validateClass}" enctype="multipart/form-data">
            <div class="offcanvas skeleton-offcanvas ${popupClass} offcanvas-${data.position || 'end'} ${data.size || ''}" data-bs-backdrop="static" tabindex="-1">
              <div class="offcanvas-header skeleton-offcanvas-header ${data.header === 'hide' ? 'd-none' : ''}">
                <h5 class="offcanvas-title skeleton-offcanvas-label">${data.label || 'Resizable Off-Canvas'}</h5>
                <div class="skeleton-ofc-hdr-btn-grp">
                  <button type="button" class="download-btn ${data.download ? '' : 'd-none'} offcanvas-download-btn"><i class="fa-light fa-download"></i></button>
                  <button type="button" class="share-btn ${data.share ? '' : 'd-none'} offcanvas-share-btn"><i class="fa-light fa-share-from-square"></i></button>
                  <button type="button" class="offcanvas-data-reload-btn update-form-data-dyn" data-form-name=".${formClass}"><i class="fa-light fa-refresh"></i></button>
                  <button type="button" class="offcanvas-fullscreen-btn"><i class="fa-light fa-expand"></i></button>
                  <button type="button" data-bs-dismiss="offcanvas" aria-label="Close"><i class="fa fa-times" aria-hidden="true"></i></button>
                </div>
              </div>
              <div class="offcanvas-body skeleton-offcanvas-body h-100 ${data.header === 'hide' || data.footer === 'hide' ? 'pb-5' : ''}">
                <input type="hidden" name="_token" value="${window.general.csrfToken || ''}">
                <div class="p-1px">${data.content || ''}</div>
              </div>
              <div class="offcanvas-dragbar"><i class="fa-solid fa-ellipsis-vertical"></i></div>
              <div class="offcanvas-footer text-end skeleton-offcanvas-footer ${data.footer === 'hide' ? 'd-none' : ''}">
                <button type="button" class="btn btn-secondary me-0 btn-md" data-bs-dismiss="offcanvas" aria-label="Close">Close</button>
                <button type="submit" class="btn btn-md skeleton-form-btn ${data.button_class || 'btn-primary'}">
                  ${data.button || '<i class="fa-solid fa-plus me-2"></i>Save'}
                </button>
              </div>
            </div>
          </form>`;
    // Append popup to DOM
    document.body.insertAdjacentHTML('beforeend', popupHTML.trim());
    const popup = document.querySelector(`.${popupClass}`);
    if (!popup) throw new Error('Popup element not found');
    const form = document.querySelector(`form.${formClass}`);
    if (!form) throw new Error('Form element not found');
    // Execute optional script
    if (data.script) {
      try {
        new Function(data.script)();
      } catch (e) {
        window.general.error('Script execution failed:', e);
      }
    }
    // Initialize popup
    let instance;
    try {
      instance = isModal
        ? new bootstrap.Modal(popup, { backdrop: 'static', keyboard: false })
        : new bootstrap.Offcanvas(popup, { backdrop: 'static' });
      instance.show();
    } catch (e) {
      throw new Error(`Failed to initialize ${isModal ? 'modal' : 'offcanvas'}: ${e.message}`);
    }
    // Handle popup close
    popup.addEventListener(
      isModal ? 'hidden.bs.modal' : 'hidden.bs.offcanvas',
      () => {
        if (document.activeElement && popup.contains(document.activeElement)) {
          (element && element.focus ? element : document.body).focus();
        }
        popup.remove();
        form.remove();
        window.general.log(`${isModal ? 'Modal' : 'Offcanvas'} closed and removed`, { formClass });
      },
      { once: true }
    );
    // Set inert state on hide
    popup.addEventListener(
      isModal ? 'hide.bs.modal' : 'hide.bs.offcanvas',
      () => (popup.inert = true),
      { once: true }
    );
    // Setup interactivity
    if (isModal) {
      this.makeDraggable(popup);
      this.makeResizableModal(popup);
    } else {
      this.makeResizableOffcanvas(popup);
    }
    this.setupFullscreenToggle(popup);
    this.setupDownloadShareButtons(popup);
    this.setupFormCookieStorage(form, formClass, popup);
    this.setupReloadButton(popup, formClass);
  } catch (e) {
    window.general.error('Popup rendering failed:', e);
    window.general.showToast({
      icon: 'warning',
      title: 'Error',
      message: e?.message || 'Failed to render popup',
      duration: 5000
    });
  }
}
/**
 * Makes a modal draggable using interact.js.
 * 
 * @param {HTMLElement} popup - The modal element.
 * @requires interactjs
 */
export function makeDraggable(popup) {
  if (typeof interact !== 'function') {
    window.general.error('Interact.js not loaded');
    return;
  }
  const dragHandle = popup.querySelector('.modal-drag-handle');
  if (!dragHandle) {
    window.general.log('No drag handle found for modal');
    return;
  }
  try {
    interact(dragHandle).draggable({
      listeners: {
        move: event => {
          const modal = event.target.closest('.modal-dialog');
          const x = (parseFloat(modal.dataset.x) || 0) + event.dx;
          const y = (parseFloat(modal.dataset.y) || 0) + event.dy;
          modal.style.transform = `translate(${x}px, ${y}px)`;
          modal.dataset.x = x;
          modal.dataset.y = y;
        }
      },
      modifiers: [interact.modifiers.restrict({ restriction: 'parent', endOnly: true })],
      inertia: true
    });
  } catch (e) {
    window.general.error('Error in makeDraggable:', e);
  }
}
/**
 * Makes a modal resizable using interact.js.
 * 
 * @param {HTMLElement} popup - The modal element.
 * @requires interactjs
 */
export function makeResizableModal(popup) {
  if (typeof interact !== 'function') {
    window.general.error('Interact.js not loaded');
    return;
  }
  const resizeHandle = popup.querySelector('.modal-resize-handle');
  if (!resizeHandle) {
    window.general.log('No resize handle found for modal');
    return;
  }
  try {
    interact(resizeHandle).resizable({
      edges: { bottom: true, right: true },
      listeners: {
        move: event => {
          const modal = event.target.closest('.modal-dialog');
          const width = Math.max(200, Math.min(event.rect.width, 1200));
          const height = Math.max(200, Math.min(event.rect.height, 1200));
          modal.style.width = `${width}px`;
          modal.style.height = `${height}px`;
          modal.classList.add('resized');
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({ min: { width: 200, height: 200 }, max: { width: 1200, height: 1200 } })
      ],
      inertia: true
    });
  } catch (e) {
    window.general.error('Error in makeResizableModal:', e);
  }
}
/**
 * Makes an offcanvas resizable using interact.js.
 * 
 * @param {HTMLElement} offcanvas - The offcanvas element.
 * @requires interactjs
 */
export function makeResizableOffcanvas(offcanvas) {
  if (typeof interact !== 'function') {
    window.general.error('Interact.js not loaded');
    return;
  }
  const dragbar = offcanvas.querySelector('.offcanvas-dragbar');
  if (!dragbar) {
    window.general.log('No dragbar found for offcanvas');
    return;
  }
  try {
    const position = ['end', 'start', 'top', 'bottom'].find(pos => offcanvas.classList.contains(`offcanvas-${pos}`)) || 'bottom';
    const direction = position === 'start' || position === 'end' ? 'horizontal' : 'vertical';
    interact(dragbar).draggable({
      listeners: {
        start: () => offcanvas.classList.add('highlight'),
        move: event => {
          const rect = offcanvas.getBoundingClientRect();
          const clientX = event.clientX || event.touches?.[0]?.clientX || 0;
          const clientY = event.clientY || event.touches?.[0]?.clientY || 0;
          if (direction === 'horizontal') {
            const newWidth =
              position === 'start'
                ? Math.max(200, Math.min(clientX - rect.left, 1200))
                : Math.max(200, Math.min(rect.left + rect.width - clientX, 1200));
            offcanvas.style.width = `${newWidth}px`;
          } else {
            const newHeight =
              position === 'top'
                ? Math.max(200, Math.min(clientY - rect.top, 1200))
                : Math.max(200, Math.min(rect.top + rect.height - clientY, 1200));
            offcanvas.style.height = `${newHeight}px`;
          }
        },
        end: () => offcanvas.classList.remove('highlight')
      },
      modifiers: [interact.modifiers.restrict({ restriction: 'parent', endOnly: true })],
      axis: direction === 'horizontal' ? 'x' : 'y',
      inertia: true
    });
  } catch (e) {
    window.general.error('Error in makeResizableOffcanvas:', e);
  }
}
/**
 * Sets up fullscreen toggle functionality for modals and offcanvas.
 * 
 * @param {HTMLElement} popup - The modal or offcanvas element.
 */
export function setupFullscreenToggle(popup) {
  const btn = popup.querySelector('.modal-fullscreen-btn, .offcanvas-fullscreen-btn');
  if (!btn || !document.fullscreenEnabled) {
    window.general.log('Fullscreen not supported or button not found');
    return;
  }
  const target = popup.classList.contains('modal') ? popup.querySelector('.modal-dialog') : popup;
  const content = popup.querySelector('.modal-content, .offcanvas-body');
  const updateState = () => {
    const icon = btn.querySelector('i');
    if (document.fullscreenElement) {
      target.classList.add('fullscreen');
      content.classList.add('fullscreen');
      icon.classList.replace('fa-expand', 'fa-compress');
    } else {
      target.classList.remove('fullscreen');
      content.classList.remove('fullscreen');
      icon.classList.replace('fa-compress', 'fa-expand');
    }
  };
  btn.addEventListener('click', () => {
    try {
      document.fullscreenElement ? document.exitFullscreen() : target.requestFullscreen();
    } catch (e) {
      window.general.error('Error toggling fullscreen:', e);
    }
  });
  document.addEventListener('fullscreenchange', updateState);
  updateState();
}
/**
 * Sets up download and share buttons for modals and offcanvas.
 * 
 * @param {HTMLElement} popup - The modal or offcanvas element.
 */
export function setupDownloadShareButtons(popup) {
  const downloadBtn = popup.querySelector('.modal-download-btn, .offcanvas-download-btn');
  const shareBtn = popup.querySelector('.modal-share-btn, .offcanvas-share-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      window.general.showToast({
        icon: 'warning',
        title: 'Download',
        message: 'Downloading content...',
        duration: 5000
      });
      window.general.log('Download triggered');
    });
  }
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      window.general.showToast({
        icon: 'warning',
        title: 'Share',
        message: 'Sharing content...',
        duration: 5000
      });
      window.general.log('Share triggered');
    });
  }
}
/**
 * Sets up form data storage in cookies for persistence.
 * Saves form data on blur and on popup close.
 * 
 * @param {HTMLFormElement} form - The form element.
 * @param {string} formClass - The unique form class.
 * @param {HTMLElement} popup - The modal or offcanvas element.
 */
export function setupFormCookieStorage(form, formClass, popup) {
  if (!form || !formClass || !popup) {
    window.general.log('Invalid parameters for setupFormCookieStorage');
    return;
  }
  const cookieName = `form-data-${formClass}`;
  const cookieDurationHours = 24;
  const updateCookieField = (name, value) => {
    try {
      const existingData = window.general.manageCookie({ action: 'get', name: cookieName }) || {};
      if (JSON.stringify(existingData[name]) !== JSON.stringify(value)) {
        existingData[name] = value;
        window.general.manageCookie({
          action: 'set',
          name: cookieName,
          value: existingData,
          hours: cookieDurationHours
        });
      }
    } catch (e) {
      window.general.error('Error updating cookie field:', e);
    }
  };
  const saveFormData = () => {
    try {
      const existingData = window.general.manageCookie({ action: 'get', name: cookieName }) || {};
      const formData = {};
      Array.from(form.elements).forEach(el => {
        const name = el.name;
        if (!name || ['submit', 'button', 'file'].includes(el.type) || el.tagName === 'IMG') return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) formData[name] = el.value;
        } else if (el.tagName === 'SELECT' && el.multiple) {
          formData[name] = Array.from(el.selectedOptions).map(opt => opt.value);
        } else {
          formData[name] = el.value;
        }
      });
      const updatedData = { ...existingData, ...formData };
      window.general.manageCookie({
        action: 'set',
        name: cookieName,
        value: updatedData,
        hours: cookieDurationHours
      });
    } catch (e) {
      window.general.error('Error saving form data to cookie:', e);
    }
  };
  const handleFieldBlur = event => {
    const el = event.target;
    const name = el.name;
    if (!name || ['submit', 'button', 'file'].includes(el.type) || el.tagName === 'IMG') return;
    let value;
    if (el.type === 'checkbox' || el.type === 'radio') {
      value = el.checked ? el.value : '';
    } else if (el.tagName === 'SELECT' && el.multiple) {
      value = Array.from(el.selectedOptions).map(opt => opt.value);
    } else {
      value = el.value;
    }
    updateCookieField(name, value);
  };
  const handleClose = () => {
    saveFormData();
    popup.removeEventListener('hidden.bs.modal', handleClose);
    popup.removeEventListener('hidden.bs.offcanvas', handleClose);
  };
  popup.addEventListener('hidden.bs.modal', handleClose, { once: true });
  popup.addEventListener('hidden.bs.offcanvas', handleClose, { once: true });
  form.addEventListener('blur', handleFieldBlur, true);
}
/**
 * Sets up the reload button to restore form data from cookies.
 * 
 * @param {HTMLElement} popup - The modal or offcanvas element.
 * @param {string} formClass - The unique form class.
 */
export function setupReloadButton(popup, formClass) {
  const btn = popup.querySelector('.modal-data-reload-btn, .offcanvas-data-reload-btn');
  const form = document.querySelector(`form.${formClass}`);
  if (!btn || !form) {
    window.general.log('Reload button or form not found');
    return;
  }
  btn.addEventListener('click', async () => {
    const icon = btn.querySelector('i');
    if (!icon) return;
    try {
      icon.classList.remove('fa-refresh');
      icon.classList.add('fa-arrows-rotate', 'fa-spin');
      const data = window.general.manageCookie({ action: 'get', name: `form-data-${formClass}` });
      if (!data) {
        window.general.log('No cookie data found for form', { formClass });
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      Array.from(form.elements).forEach(el => {
        const name = el.name;
        if (!name || ['submit', 'button', 'file'].includes(el.type) || el.tagName === 'IMG') return;
        const value = data[name];
        if (value === undefined || value === null) return;
        const isEmpty =
          (el.type === 'checkbox' && !el.checked) ||
          (el.type === 'radio' && !el.checked) ||
          (el.tagName === 'SELECT' && !el.selectedOptions.length) ||
          (el.value === '');
        if (isEmpty) {
          if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = value === el.value;
          } else if (el.tagName === 'SELECT') {
            const $el = window.jQuery?.(el);
            if ($el?.data('select2')) {
              $el.val(value).trigger('change');
            } else {
              Array.from(el.options).forEach(opt => {
                opt.selected = el.multiple ? Array.isArray(value) && value.includes(opt.value) : opt.value === value;
              });
            }
          } else {
            el.value = value;
          }
        }
      });
    } catch (e) {
      window.general.error('Error reloading form data:', e);
    } finally {
      icon.classList.remove('fa-arrows-rotate', 'fa-spin');
      icon.classList.add('fa-refresh');
    }
  });
  
}