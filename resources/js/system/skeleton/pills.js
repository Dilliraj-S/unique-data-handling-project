/**
 * Initializes Tagify for <input> elements with the [data-pills] attribute.
 * Supports user and option pill types with whitelist, avatars, grouping, and sortable tags.
 * Uses window.general for logging, toasts, and validation without external libraries.
 *
 * @requires window.general
 * @requires Tagify
 * @optional Sortable
 */
export function pills() {
  // Validate window.general availability
  if (!window.general) {
    window.general?.error('window.general is required but not available');
    return;
  }

  // Select all inputs with data-pills attribute
  const inputs = document.querySelectorAll('input[data-pills]');
  if (!inputs.length) {
    return;
  }

  // Validate Tagify dependency
  if (typeof Tagify !== 'function') {
    window.general.error('Tagify is required but not loaded');
    return;
  }

  inputs.forEach(input => {
    try {
      // Skip if already initialized
      if (input.dataset.tagified === 'true') {
        return;
      }

      const type = input.getAttribute('data-pills');

      // Parse pill list data
      let pillList = [];
      try {
        pillList = JSON.parse(input.getAttribute('data-pills-list') || '[]');
        if (!Array.isArray(pillList)) {
          throw new Error('data-pills-list must be an array');
        }
      } catch (error) {
        window.general.showToast({
          icon: 'error',
          title: 'Configuration Error',
          message: `Invalid JSON in data-pills-list for input ${input.id || 'unknown'}: ${error.message}`,
          duration: 5000
        });
        window.general.error('Invalid data-pills-list', { id: input.id, error: error.message });
        return;
      }

      // Configure input
      input.type = 'text';
      input.classList.add('pills-list');
      input.placeholder = input.placeholder || '-';
      input.dataset.tagified = 'true';

      // Initialize Tagify configuration
      const config = {
        originalInputValueFormat: values =>
          values.map(v => v.id || v.value).join(input.getAttribute('data-pills-separator') || ','),
        ...(type === 'user' || type === 'option'
          ? {
              tagTextProp: 'id',
              enforceWhitelist: true,
              skipInvalid: true,
              dropdown: {
                maxItems: Infinity,
                closeOnSelect: false,
                enabled: 0,
                classname: 'pills-list',
                searchKeys: ['id', 'value', 'group']
              },
              templates: {
                tag: tagData => `
                  <tag title="${tagData.id || ''}" contenteditable="false" spellcheck="false" tabIndex="-1" class="tagify__tag ${
                    tagData.class || ''
                  }" ${Object.entries(tagData)
                    .map(([k, v]) => `${k}="${v || ''}"`)
                    .join(' ')}>
                    <x class="tagify__tag__removeBtn" role="button" aria-label="remove tag"></x>
                    <div>
                      ${
                        type === 'user' && tagData.avatar
                          ? `<div class="tagify__tag__avatar-wrap"><img src="${tagData.avatar}" onerror="this.style.display='none'"></div>`
                          : ''
                      }
                      <span class="tagify__tag-text">${tagData.value || ''}</span>
                    </div>
                  </tag>`,
                dropdownItem: item => `
                  <div ${Object.entries(item)
                    .map(([k, v]) => `${k}="${v || ''}"`)
                    .join(' ')} class="tagify__dropdown__item ${item.class || ''}" tabindex="0" role="option">
                    ${
                      type === 'user' && item.avatar
                        ? `<div class="tagify__dropdown__item__avatar-wrap"><img src="${item.avatar}" onerror="this.style.display='none'"></div>`
                        : ''
                    }
                    <strong>${item.value || ''}${type === 'option' ? ` <small>(${item.id || ''})</small>` : ''}</strong>
                    ${type === 'user' ? `<span><b>Id:</b> ${item.id || ''}</span>` : ''}
                  </div>`
              },
              whitelist: pillList
            }
          : {})
      };

      // Handle existing value
      const existingValue = input.value.trim();
      if (existingValue) {
        config.value = existingValue.split(input.getAttribute('data-pills-separator') || ',').filter(Boolean);
      }

      // Initialize Tagify
      let tagify;
      try {
        tagify = new Tagify(input, config);
      } catch (error) {
        window.general.error('Error initializing Tagify', { id: input.id, error: error.message });
        window.general.showToast({
          icon: 'error',
          title: 'Initialization Error',
          message: 'Failed to initialize tag input',
          duration: 5000
        });
        return;
      }

      // Update not-empty class based on tag count
      const updateNotEmptyClass = () => {
        input.classList.toggle('tagify--not-empty', tagify.value.length > 0);
      };
      tagify.on('add remove', updateNotEmptyClass);
      updateNotEmptyClass();

      // Customize dropdown list with grouping
      tagify.dropdown.createListHTML = items => {
        try {
          const grouped = items.reduce((acc, item) => {
            const group = item.group || 'Not Assigned';
            acc[group] = (acc[group] || []).concat(item);
            return acc;
          }, {});
          const hasGroups = Object.keys(grouped).length > 1 || Object.keys(grouped)[0] !== 'Not Assigned';

          return `
            <div class="tagify__dropdown__header">
              <div class="tagify__dropdown__item tagify__dropdown__item__clear-all" tabindex="0" role="option"><strong>Clear All</strong></div>
              <div class="tagify__dropdown__item tagify__dropdown__item__select-all" tabindex="0" role="option"><strong>Select All</strong></div>
            </div>
            ${Object.entries(grouped)
              .map(
                ([group, groupItems]) => `
                <div class="tagify__dropdown__itemsGroup" data-title="${group}">
                  ${hasGroups ? `<div class="tagify__dropdown__item tagify__dropdown__item__select-group" data-group="${group}" tabindex="0" role="option"><strong>Select Group</strong></div>` : ''}
                  ${groupItems
                    .map(item =>
                      tagify.settings.templates.dropdownItem.apply(tagify, [typeof item === 'object' ? item : { value: item }])
                    )
                    .join('')}
                </div>`
              )
              .join('')}`;
        } catch (error) {
          window.general.error('Error creating dropdown HTML', { id: input.id, error: error.message });
          return '';
        }
      };

      // Handle dropdown selections
      tagify.on('dropdown:select', e => {
        try {
          const target = e.detail.elm;
          if (!target) return;

          if (target.classList.contains('tagify__dropdown__item__clear-all')) {
            tagify.removeAllTags();
          } else if (target.classList.contains('tagify__dropdown__item__select-all')) {
            const allItems = tagify.settings.whitelist.filter(
              item => !tagify.value.some(tag => tag.id === item.id)
            );
            if (allItems.length) {
              tagify.addTags(allItems);
            }
          } else if (target.classList.contains('tagify__dropdown__item__select-group')) {
            const group = target.dataset.group;
            const groupItems = tagify.settings.whitelist
              .filter(item => item.group === group)
              .filter(item => !tagify.value.some(tag => tag.id === item.id));
            if (groupItems.length) {
              tagify.addTags(groupItems);
            }
          }
        } catch (error) {
          window.general.error('Error handling dropdown select', { id: input.id, error: error.message });
        }
      });

      // Initialize Sortable for tag reordering
      if (typeof Sortable === 'function') {
        try {
          new Sortable(tagify.DOM.scope, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.tagify__tag__removeBtn, .tagify__input',
            onEnd: () => {
              try {
                tagify.updateValueByDOMTags();
              } catch (e) {
                window.general.error('Error updating Tagify values after sort', { id: input.id, error: e.message });
              }
            }
          });
        } catch (e) {
          window.general.error('Error initializing Sortable', { id: input.id, error: e.message });
        }
      }

      // Handle required field validation
      if (input.hasAttribute('required')) {
        const validateRequired = () => {
          input.classList.toggle('is-invalid', tagify.value.length === 0);
        };
        tagify.on('change', validateRequired);
        validateRequired(); // Initialize validation state
      }
    } catch (e) {
      window.general.error('Error in pills', { id: input.id, error: e.message });
      window.general.showToast({
        icon: 'error',
        title: 'Error',
        message: 'Failed to initialize tag input',
        duration: 5000
      });
    }
  });
}