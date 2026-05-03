/**
 * Initializes a permissions UI with a single accordion per module, containing a table with module, section, and item permissions.
 * Ensures pre-selected checkboxes (check: 1) are checked during rendering, supports dynamic child selection for check/uncheck events,
 * handles partial checks with indeterminate states, enforces view-only logic, updates permission_ids input and total permissions count
 * (total available and selected) in real-time on every checkbox change, and prepares permission_ids for server submission on form submit.
 * Total permissions count reflects both total available permissions and the length of permission_ids array.
 * Selecting an item mandates selecting its section and module; selecting a section mandates selecting its module.
 *
 * @requires window.general
 * @param {Object} viewPermissions - Permissions structure from PHP loadPermissions.
 * @returns {Object} - Contains reinitPermissions, updatedPermissions, and assignPermissions.
 */
export function permissions(viewPermissions) {
  if (!window.general) {
    console.error('window.general is required but not available');
    return { reinitPermissions: () => { }, updatedPermissions: {}, assignPermissions: () => { } };
  }
  try {
    // Validate viewPermissions
    if (!viewPermissions || typeof viewPermissions !== 'object' || Object.keys(viewPermissions).length === 0) {
      window.general.error('Invalid or empty viewPermissions provided');
      return { reinitPermissions: () => { }, updatedPermissions: {}, assignPermissions: () => { } };
    }
    // Define fixed permission types
    const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];
    // Utility to sanitize strings for IDs
    const sanitizeId = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    // Track unique modules
    const seenModules = new Set();
    // Generate unique ID suffix
    let idCounter = 0;
    const generateUniqueId = (baseId) => `${baseId}-${idCounter++}`;
    // Calculate total available and selected permissions
    const calculateTotalPermissions = () => {
      try {
        const permissionIdsInput = document.getElementById('permission_ids');
        if (!permissionIdsInput) {
          window.general.error('Permission IDs input not found for counting');
          return { totalAvailable: 0, totalSelected: 0 };
        }
        // Calculate total available permissions
        let totalAvailable = 0;
        const allPermissionIds = new Set();
        for (const module in viewPermissions) {
          if (viewPermissions[module].permissions) {
            for (const permType of permissionTypes) {
              if (viewPermissions[module].permissions[permType]) {
                for (const permId in viewPermissions[module].permissions[permType]) {
                  allPermissionIds.add(permId);
                }
              }
            }
          }
          for (const section in viewPermissions[module]) {
            if (section === 'permissions') continue;
            if (viewPermissions[module][section].permissions) {
              for (const permType of permissionTypes) {
                if (viewPermissions[module][section].permissions[permType]) {
                  for (const permId in viewPermissions[module][section].permissions[permType]) {
                    allPermissionIds.add(permId);
                  }
                }
              }
            }
            for (const item in viewPermissions[module][section]) {
              if (item === 'permissions') continue;
              if (viewPermissions[module][section][item].permissions) {
                for (const permType of permissionTypes) {
                  if (viewPermissions[module][section][item].permissions[permType]) {
                    for (const permId in viewPermissions[module][section][item].permissions[permType]) {
                      allPermissionIds.add(permId);
                    }
                  }
                }
              }
            }
          }
        }
        totalAvailable = allPermissionIds.size;
        // Calculate total selected permissions
        let currentIds = [];
        try {
          currentIds = JSON.parse(permissionIdsInput.value || '[]');
          if (!Array.isArray(currentIds)) {
            currentIds = [];
          }
          // Validate permission IDs
          currentIds = currentIds.filter(id => allPermissionIds.has(id));
          if (currentIds.length !== JSON.parse(permissionIdsInput.value || '[]').length) {
            permissionIdsInput.value = JSON.stringify(currentIds);
          }
        } catch (e) {
          window.general.error('Error parsing permission_ids for counting', { value: permissionIdsInput.value, error: e.message });
          currentIds = [];
        }
        const totalSelected = currentIds.length;
        return { totalAvailable, totalSelected };
      } catch (e) {
        window.general.error('Error calculating total permissions', { error: e.message });
        return { totalAvailable: 0, totalSelected: 0 };
      }
    };
    // Update permissions count display
    const updatePermissionsCountDisplay = () => {
      try {
        const permissionsContainer = document.querySelector('[data-permissions-container]');
        if (!permissionsContainer) {
          window.general.error('Permissions container not found for count display');
          return;
        }
        let countElement = permissionsContainer.querySelector('#permissions-count');
        if (!countElement) {
          countElement = document.createElement('div');
          countElement.id = 'permissions-count';
          countElement.className = 'alert alert-info mb-3';
          permissionsContainer.insertBefore(countElement, permissionsContainer.firstChild);
        }
        const { totalAvailable, totalSelected } = calculateTotalPermissions();
        countElement.innerHTML = `Selected <b>${totalSelected}</b> of <b>${totalAvailable}</b> permissions`;
      } catch (e) {
        window.general.error('Error updating permissions count display', { error: e.message });
      }
    };
    // Update hidden input with selected permission IDs
    const updateHiddenInput = (permissionId = null, checked = null) => {
      try {
        const permissionIdsInput = document.getElementById('permission_ids');
        if (!permissionIdsInput) {
          window.general.error('Permission IDs input not found in DOM');
          return;
        }
        let currentIds = [];
        try {
          currentIds = JSON.parse(permissionIdsInput.value || '[]');
          if (!Array.isArray(currentIds)) {
            currentIds = [];
          }
        } catch (e) {
          window.general.error('Error parsing permission_ids', { value: permissionIdsInput.value, error: e.message });
          currentIds = [];
        }
        if (permissionId !== null && checked !== null) {
          // Handle specific checkbox change
          if (checked && !currentIds.includes(permissionId)) {
            currentIds.push(permissionId);
          } else if (!checked && currentIds.includes(permissionId)) {
            currentIds = currentIds.filter(id => id !== permissionId);
          }
        } else {
          // Full update (e.g., on initialization or assignPermissions)
          const selectedIds = new Set();
          for (const module in updatedPermissions) {
            for (const permType in updatedPermissions[module].permissions) {
              for (const permId in updatedPermissions[module].permissions[permType]) {
                if (updatedPermissions[module].permissions[permType][permId]?.check === 1) {
                  selectedIds.add(permId);
                }
              }
            }
            for (const section in updatedPermissions[module]) {
              if (section === 'permissions') continue;
              for (const permType in updatedPermissions[module][section].permissions) {
                for (const permId in updatedPermissions[module][section].permissions[permType]) {
                  if (updatedPermissions[module][section].permissions[permType][permId]?.check === 1) {
                    selectedIds.add(permId);
                  }
                }
              }
              for (const item in updatedPermissions[module][section]) {
                if (item === 'permissions') continue;
                for (const permType in updatedPermissions[module][section][item].permissions) {
                  for (const permId in updatedPermissions[module][section][item].permissions[permType]) {
                    if (updatedPermissions[module][section][item].permissions[permType][permId]?.check === 1) {
                      selectedIds.add(permId);
                    }
                  }
                }
              }
            }
          }
          currentIds = [...selectedIds];
        }
        const newValue = JSON.stringify(currentIds);
        permissionIdsInput.value = newValue;
        updatePermissionsCountDisplay();
      } catch (e) {
        // window.general.error('Error updating hidden input', { error: e.message }); 
      }
    };
    // Check if a permission is checked
    const isPermissionChecked = (data, module, section, item, permission) => {
      try {
        if (!data || !data[module]) return false;
        let target = data[module];
        if (section && target[section]) target = target[section];
        else if (section) return false;
        if (item && target[item]) target = target[item];
        else if (item) return false;
        const permObj = target.permissions?.[permission];
        return permObj && Object.values(permObj).some(p => p?.check === 1);
      } catch (e) {
        window.general.error('Error checking permission status', { error: e.message, module, section, item, permission });
        return false;
      }
    };
    // Check if a level has non-skeleton permissions (for highlighting only)
    const isNonSkeleton = (data, module, section, item) => {
      try {
        if (!data || !data[module]) return false;
        let target = data[module];
        if (section && target[section]) target = target[section];
        else if (section) return false;
        if (item && target[item]) target = target[item];
        else if (item) return false;
        return target.permissions && Object.values(target.permissions).some(perm =>
          typeof perm === 'object' && perm !== null &&
          Object.values(perm).some(p => p?.is_skeleton === 0)
        );
      } catch (e) {
        window.general.error('Error checking non-skeleton status', { error: e.message, module, section, item });
        return false;
      }
    };
    // Initialize nested structure
    const ensureNestedStructure = (target, module, section, item) => {
      try {
        if (!target[module]) target[module] = { permissions: {} };
        if (section && !target[module][section]) target[module][section] = { permissions: {} };
        if (item && !target[module][section][item]) target[module][section][item] = { permissions: {} };
      } catch (e) {
        window.general.error('Error ensuring nested structure', { error: e.message, module, section, item });
      }
    };
    // Update permissions state
    const updatePermissions = (updated, module, section, item, permission, checked, permissionId = null) => {
      try {
        ensureNestedStructure(updated, module, section, item);
        let target = updated[module];
        if (section) target = target[section];
        if (item) target = target[item];
        if (!target.permissions) target.permissions = {};
        if (!target.permissions[permission]) target.permissions[permission] = {};
        if (checked && permissionId) {
          const isSkeleton = viewPermissions[module]?.[section]?.[item]?.permissions?.[permission]?.[permissionId]?.is_skeleton ??
            viewPermissions[module]?.[section]?.permissions?.[permission]?.[permissionId]?.is_skeleton ??
            viewPermissions[module]?.permissions?.[permission]?.[permissionId]?.is_skeleton ?? 1;
          const type = viewPermissions[module]?.[section]?.[item]?.permissions?.[permission]?.[permissionId]?.type ??
            viewPermissions[module]?.[section]?.permissions?.[permission]?.[permissionId]?.type ??
            viewPermissions[module]?.permissions?.[permission]?.[permissionId]?.type ?? 'role';
          target.permissions[permission][permissionId] = { check: 1, is_skeleton: isSkeleton, type };
        } else if (!checked && permissionId && target.permissions[permission]) {
          delete target.permissions[permission][permissionId];
          if (Object.keys(target.permissions[permission]).length === 0) {
            delete target.permissions[permission];
          }
        }
        updateHiddenInput(permissionId, checked);
      } catch (e) {
        window.general.error('Error updating permissions', { error: e.message, module, section, item, permission });
      }
    };
    // Enforce view-only logic
    const enforceViewOnlyLogic = (checkbox, tableBody) => {
      try {
        const container = checkbox.closest('.permission-selection');
        if (!container) {
          return;
        }
        const viewCheckbox = container.querySelector('.view-checkbox');
        const nonViewCheckboxes = container.querySelectorAll('.permission-checkbox:not([data-permission="view"])');
        if (checkbox.dataset.permission === 'view' && checkbox.checked) {
          nonViewCheckboxes.forEach(cb => {
            if (cb.checked) {
              cb.checked = false;
              updatePermissions(
                updatedPermissions,
                cb.dataset.module,
                cb.dataset.section || null,
                cb.dataset.item || null,
                cb.dataset.permission,
                false,
                cb.value
              );
            }
          });
        } else if (checkbox.dataset.permission !== 'view' && checkbox.checked && viewCheckbox && !viewCheckbox.checked) {
          viewCheckbox.checked = true;
          updatePermissions(
            updatedPermissions,
            checkbox.dataset.module,
            checkbox.dataset.section || null,
            checkbox.dataset.item || null,
            'view',
            true,
            viewCheckbox.value
          );
        }
        updateRowStates(tableBody, checkbox.dataset.module);
        updateViewDisabledState(tableBody, checkbox.dataset.module, checkbox.dataset.section || null, checkbox.dataset.item || null);
      } catch (e) {
        window.general.error('Error enforcing view-only logic', { error: e.message });
      }
    };
    // Update view checkbox disabled state
    const updateViewDisabledState = (tableBody, module, section, item) => {
      try {
        if (!tableBody) return;
        const selector = `.permission-selection[data-module="${sanitizeId(module)}"]${section ? `[data-section="${sanitizeId(section)}"]` : ''}${item ? `[data-item="${sanitizeId(item)}"]` : ''}`;
        const containers = tableBody.querySelectorAll(selector);
        containers.forEach(container => {
          const viewCheckbox = container.querySelector('.view-checkbox');
          const nonViewCheckboxes = container.querySelectorAll('.permission-checkbox:not([data-permission="view"])');
          if (viewCheckbox) {
            viewCheckbox.disabled = Array.from(nonViewCheckboxes).some(cb => cb.checked);
          }
        });
      } catch (e) {
        window.general.error('Error updating view disabled state', { error: e.message });
      }
    };
    // Update row checkbox states with indeterminate support and enforce parent selection
    const updateRowStates = (tableBody, module) => {
      try {
        if (!tableBody) {
          return;
        }
        const updateSingleRow = (row) => {
          const checkboxes = row.querySelectorAll('.permission-checkbox[type="checkbox"]');
          const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
          const totalCheckboxes = checkboxes.length;
          const selectRow = row.querySelector('.select-row');
          if (selectRow) {
            selectRow.checked = checkedCount > 0 && checkedCount === totalCheckboxes;
            selectRow.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes;
          }
        };
        const allRows = tableBody.querySelectorAll('.permission-selection');
        allRows.forEach(row => {
          updateSingleRow(row);
        });
        const updateParentStates = (module, section, item) => {
          if (item && section) {
            const sectionRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"]:not([data-item])`);
            if (sectionRow) {
              const itemRows = tableBody.querySelectorAll(`.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"][data-item]`);
              const checkedItems = Array.from(itemRows).filter(row => {
                const checkboxes = row.querySelectorAll('.permission-checkbox[type="checkbox"]');
                return Array.from(checkboxes).some(cb => cb.checked);
              });
              const selectSection = sectionRow.querySelector('.select-row');
              if (selectSection) {
                selectSection.checked = checkedItems.length > 0; // Mandatory: select section if any item is checked
                selectSection.indeterminate = checkedItems.length > 0 && checkedItems.length < itemRows.length;
              }
            }
          }
          const moduleRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"]:not([data-section]):not([data-item])`);
          if (moduleRow) {
            const sectionRows = tableBody.querySelectorAll(`.permission-selection[data-module="${sanitizeId(module)}"][data-section]:not([data-item])`);
            const itemRows = tableBody.querySelectorAll(`.permission-selection[data-module="${sanitizeId(module)}"][data-item]`);
            const allChildren = [...sectionRows, ...itemRows];
            const checkedChildren = allChildren.filter(row => {
              const checkboxes = row.querySelectorAll('.permission-checkbox[type="checkbox"]');
              return Array.from(checkboxes).some(cb => cb.checked);
            });
            const selectModule = moduleRow.querySelector('.select-row');
            if (selectModule) {
              selectModule.checked = checkedChildren.length > 0; // Mandatory: select module if any section/item is checked
              selectModule.indeterminate = checkedChildren.length > 0 && checkedChildren.length < allChildren.length;
            }
          }
        };
        for (const section in viewPermissions[module]) {
          if (section === 'permissions') continue;
          for (const item in viewPermissions[module][section]) {
            if (item === 'permissions') continue;
            updateParentStates(module, section, item);
          }
          updateParentStates(module, section, null);
        }
      } catch (error) {
        window.general.error('Error updating row states', { error });
      }
    };
    // Toggle row selection with child propagation and enforce parent selection
    const toggleRowSelection = (selectRow, tableBody, updatedPermissions) => {
      try {
        if (!tableBody) {
          return;
        }
        const checked = selectRow.checked;
        const row = selectRow.closest('tr');
        if (!row) {
          return;
        }
        const module = selectRow.dataset.module;
        const section = selectRow.dataset.section || null;
        const item = selectRow.dataset.item || null;
        const checkboxes = row.querySelectorAll('.permission-checkbox[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          if (!checkbox.disabled && checkbox.checked !== checked) {
            checkbox.checked = checked;
            updatePermissions(
              updatedPermissions,
              checkbox.dataset.module,
              checkbox.dataset.section || null,
              checkbox.dataset.item || null,
              checkbox.dataset.permission,
              checked,
              checkbox.value
            );
          }
        });
        if (!item) {
          const childSelector = section
            ? `.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"][data-item]`
            : `.permission-selection[data-module="${sanitizeId(module)}"][data-section], .permission-selection[data-module="${sanitizeId(module)}"][data-item]`;
          const childRows = tableBody.querySelectorAll(childSelector);
          childRows.forEach(childRow => {
            const childCheckboxes = childRow.querySelectorAll('.permission-checkbox[type="checkbox"]');
            childCheckboxes.forEach(childCheckbox => {
              if (!childCheckbox.disabled && childCheckbox.checked !== checked) {
                childCheckbox.checked = checked;
                updatePermissions(
                  updatedPermissions,
                  childCheckbox.dataset.module,
                  childCheckbox.dataset.section || null,
                  childCheckbox.dataset.item || null,
                  childCheckbox.dataset.permission,
                  checked,
                  childCheckbox.value
                );
              }
            });
          });
        }
        // Enforce parent selection
        if (checked) {
          if (item && section) {
            const sectionRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"]:not([data-item])`);
            if (sectionRow) {
              const selectSection = sectionRow.querySelector('.select-row');
              if (selectSection && !selectSection.checked) {
                selectSection.checked = true;
              }
            }
          }
          const moduleRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"]:not([data-section]):not([data-item])`);
          if (moduleRow) {
            const selectModule = moduleRow.querySelector('.select-row');
            if (selectModule && !selectModule.checked) {
              selectModule.checked = true;
            }
          }
        }
        updateRowStates(tableBody, module);
        updateViewDisabledState(tableBody, module, section, item);
      } catch (error) {
        window.general.error('Error toggling row selection', { error });
      }
    };
    // Propagate permission changes to children
    const propagatePermissionChange = (checkbox, tableBody, updatedPermissions, checked) => {
      try {
        const module = checkbox.dataset.module;
        const section = checkbox.dataset.section || null;
        const item = checkbox.dataset.item || null;
        const permission = checkbox.dataset.permission;
        if (!item) {
          const childSelector = section
            ? `.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"][data-item]`
            : `.permission-selection[data-module="${sanitizeId(module)}"][data-section], .permission-selection[data-module="${sanitizeId(module)}"][data-item]`;
          const childRows = tableBody.querySelectorAll(childSelector);
          childRows.forEach(childRow => {
            const childCheckbox = childRow.querySelector(`.permission-checkbox[data-permission="${permission}"][type="checkbox"]`);
            if (childCheckbox && !childCheckbox.disabled && childCheckbox.checked !== checked) {
              childCheckbox.checked = checked;
              updatePermissions(
                updatedPermissions,
                childCheckbox.dataset.module,
                childCheckbox.dataset.section || null,
                childCheckbox.dataset.item || null,
                childCheckbox.dataset.permission,
                checked,
                childCheckbox.value
              );
            }
          });
        }
        // Enforce parent selection
        if (checked) {
          if (item && section) {
            const sectionRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"][data-section="${sanitizeId(section)}"]:not([data-item])`);
            if (sectionRow) {
              const selectSection = sectionRow.querySelector('.select-row');
              if (selectSection && !selectSection.checked) {
                selectSection.checked = true;
              }
            }
          }
          const moduleRow = tableBody.querySelector(`.permission-selection[data-module="${sanitizeId(module)}"]:not([data-section]):not([data-item])`);
          if (moduleRow) {
            const selectModule = moduleRow.querySelector('.select-row');
            if (selectModule && !selectModule.checked) {
              selectModule.checked = true;
            }
          }
        }
      } catch (error) {
        window.general.error('Error propagating permission change', { error });
      }
    };
    // Synchronize pre-selected permissions
    const syncPreSelections = (tbody, module) => {
      try {
        if (!viewPermissions[module]) {
          return;
        }
        let syncCount = 0;
        const applyCheck = (data, mod, sec = null, itm = null) => {
          if (!data || !data.permissions || typeof data.permissions !== 'object') {
            return;
          }
          for (const permType in data.permissions) {
            if (permissionTypes.includes(permType)) {
              for (const permId in data.permissions[permType]) {
                const shouldBeChecked = data.permissions[permType][permId].check === 1;
                const selector = `.permission-checkbox[data-module="${sanitizeId(mod)}"]${sec ? `[data-section="${sanitizeId(sec)}"]` : ''}${itm ? `[data-item="${sanitizeId(itm)}"]` : ''}[data-permission="${permType}"][value="${permId}"]`;
                const checkbox = tbody.querySelector(selector);
                if (checkbox && checkbox.checked !== shouldBeChecked) {
                  checkbox.checked = shouldBeChecked;
                  syncCount++;
                  updatePermissions(
                    updatedPermissions,
                    mod,
                    sec,
                    itm,
                    permType,
                    shouldBeChecked,
                    permId
                  );
                }
                const cell = checkbox?.closest('td');
                if (cell) {
                  const permTypeValue = data.permissions[permType][permId].type;
                  cell.className = `col-1 text-center ${permTypeValue === 'user' ? 'bg-info-subtle' : permTypeValue === 'role' ? 'bg-success-subtle' : ''}`;
                }
              }
            }
          }
        };
        applyCheck(viewPermissions[module], module);
        for (const section in viewPermissions[module]) {
          if (section === 'permissions') continue;
          if (!viewPermissions[module][section]) continue;
          applyCheck(viewPermissions[module][section], module, section);
          for (const item in viewPermissions[module][section]) {
            if (item === 'permissions') continue;
            if (!viewPermissions[module][section][item]) continue;
            applyCheck(viewPermissions[module][section][item], module, section, item);
          }
        }
        updateRowStates(tbody, module);
        updateViewDisabledState(tbody, module, null, null);
        updateHiddenInput();
      } catch (error) {
        window.general.error('Error synchronizing pre-selected permissions', { error, module });
      }
    };
    // Render permissions for a specific level
    const renderPermissions = (tbody, data, module, section = null, item = null, level = 0) => {
      try {
        if (!tbody || !data || !data.permissions || typeof data.permissions !== 'object') {
          return;
        }
        const normalizedModule = sanitizeId(module);
        const normalizedSection = section ? sanitizeId(section) : '';
        const normalizedItem = item ? sanitizeId(item) : '';
        const idSuffix = generateUniqueId(`perm-${normalizedModule}${normalizedSection ? `-${normalizedSection}` : ''}${normalizedItem ? `-${normalizedItem}` : ''}`);
        if (permissionTypes.some(perm => data.permissions[perm] && Object.keys(data.permissions[perm]).length > 0)) {
          const row = document.createElement('tr');
          row.className = `permission-selection ${level === 0 ? 'module-row' : level === 1 ? 'section-row' : 'item-row'} ${isNonSkeleton(viewPermissions, module, section, item) ? 'bg-light' : ''}`;
          row.dataset.scope = level === 0 ? 'module' : level === 1 ? 'section' : 'item';
          row.dataset.module = normalizedModule;
          if (section) row.dataset.section = normalizedSection;
          if (item) row.dataset.item = normalizedItem;
          const label = item || section || module;
          const checkboxesHtml = permissionTypes.map(perm => {
            const permObj = data.permissions[perm];
            if (permObj && Object.keys(permObj).length > 0) {
              const permId = Object.keys(permObj)[0];
              const isChecked = permObj[permId]?.check === 1;
              const permType = permObj[permId]?.type ?? 'role';
              return `
                <td class="col-1 text-center ${permType === 'user' ? 'bg-info-subtle' : permType === 'role' ? 'bg-success-subtle' : ''}">
                  <input class="form-check-input pckb permission-checkbox ${perm === 'view' ? 'view-checkbox' : ''}" type="checkbox" value="${permId}" id="perm-${idSuffix}-${perm}" data-scope="${row.dataset.scope}" data-module="${normalizedModule}" ${section ? `data-section="${normalizedSection}"` : ''} ${item ? `data-item="${normalizedItem}"` : ''} data-permission="${perm}" ${isChecked ? 'checked' : ''}>
                </td>
              `;
            }
            return `<td class="col-1 text-center"><span>-</span></td>`;
          }).join('');
          row.innerHTML = ` 
            <td class="col-4" style="padding-left: ${level * 20}px">
              <div class="d-flex align-items-center">
                ${level === 0
                  ? `<i class="fas fa-cube ms-3 me-2 text-primary"></i>`
                  : `<i class="fas fa-${level === 1 ? 'folder-open' : 'file-alt'} ms-3 me-2 text-${level === 1 ? 'warning' : 'success'}"></i>`
                }
                ${label}
              </div>
            </td>
            <td class="col-1 text-center">
              <input type="checkbox" class="form-check-input pckb select-row" id="perm-${idSuffix}-select-row" data-module="${normalizedModule}" ${section ? `data-section="${normalizedSection}"` : ''} ${item ? `data-item="${normalizedItem}"` : ''} data-scope="${row.dataset.scope}">
            </td>
            ${checkboxesHtml}
          `;
          tbody.appendChild(row);
        }
      } catch (error) {
        window.general.error('Error rendering permissions', { error, module, section, item, level });
      }
    };
    // Initialize updatedPermissions
    const initializeUpdatedPermissions = () => {
      try {
        const initialized = {};
        const preSelectedIds = [];
        for (const module in viewPermissions) {
          if (!viewPermissions[module]) continue;
          initialized[module] = { permissions: {} };
          if (viewPermissions[module].permissions) {
            for (const permType in viewPermissions[module].permissions) {
              if (permissionTypes.includes(permType)) {
                initialized[module].permissions[permType] = {};
                for (const permId in viewPermissions[module].permissions[permType]) {
                  const permData = viewPermissions[module].permissions[permType][permId];
                  if (permData && typeof permData === 'object') {
                    initialized[module].permissions[permType][permId] = {
                      check: permData.check || 0,
                      is_skeleton: permData.is_skeleton || 1,
                      type: permData.type || 'role'
                    };
                    if (permData.check === 1) {
                      preSelectedIds.push({ permId, module, section: null, item: null, permission: permType });
                    }
                  }
                }
              }
            }
          }
          for (const section in viewPermissions[module]) {
            if (section === 'permissions') continue;
            if (!viewPermissions[module][section]) continue;
            initialized[module][section] = { permissions: {} };
            if (viewPermissions[module][section].permissions) {
              for (const permType in viewPermissions[module][section].permissions) {
                if (permissionTypes.includes(permType)) {
                  initialized[module][section].permissions[permType] = {};
                  for (const permId in viewPermissions[module][section].permissions[permType]) {
                    const permData = viewPermissions[module][section].permissions[permType][permId];
                    if (permData && typeof permData === 'object') {
                      initialized[module][section].permissions[permType][permId] = {
                        check: permData.check || 0,
                        is_skeleton: permData.is_skeleton || 1,
                        type: permData.type || 'role'
                      };
                      if (permData.check === 1) {
                        preSelectedIds.push({ permId, module, section, item: null, permission: permType });
                      }
                    }
                  }
                }
              }
            }
            for (const item in viewPermissions[module][section]) {
              if (item === 'permissions') continue;
              if (!viewPermissions[module][section][item]) continue;
              initialized[module][section][item] = { permissions: {} };
              if (viewPermissions[module][section][item].permissions) {
                for (const permType in viewPermissions[module][section][item].permissions) {
                  if (permissionTypes.includes(permType)) {
                    initialized[module][section][item].permissions[permType] = {};
                    for (const permId in viewPermissions[module][section][item].permissions[permType]) {
                      const permData = viewPermissions[module][section][item].permissions[permType][permId];
                      if (permData && typeof permData === 'object') {
                        initialized[module][section][item].permissions[permType][permId] = {
                          check: permData.check || 0,
                          is_skeleton: permData.is_skeleton || 1,
                          type: permData.type || 'role'
                        };
                        if (permData.check === 1) {
                          preSelectedIds.push({ permId, module, section, item, permission: permType });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        updateHiddenInput();
        return initialized;
      } catch (error) {
        window.general.error('Error initializing updated permissions', { error });
        return {};
      }
    };
    let updatedPermissions = initializeUpdatedPermissions();
    // Get permission status
    const getPermissionStatus = () => {
      try {
        const available = {};
        const current = {};
        for (const module in viewPermissions) {
          available[module] = { permissions: { ...viewPermissions[module].permissions } };
          current[module] = { permissions: { ...updatedPermissions[module].permissions } };
          for (const section in viewPermissions[module]) {
            if (section === 'permissions') continue;
            available[module][section] = { permissions: { ...viewPermissions[module][section].permissions } };
            current[module][section] = { permissions: { ...updatedPermissions[module][section].permissions } };
            for (const item in viewPermissions[module][section]) {
              if (item === 'permissions') continue;
              available[module][section][item] = { permissions: { ...viewPermissions[module][section][item].permissions } };
              current[module][section][item] = { permissions: { ...updatedPermissions[module][section][item].permissions } };
            }
          }
        }
        return { available, current };
      } catch (error) {
        window.general.error('Error getting permission status', { error });
        return { available: {}, current: {} };
      }
    };
    // Assign permissions to others
    const assignPermissions = (targetPermissions) => {
      try {
        if (!targetPermissions) {
          return updatedPermissions;
        }
        updatedPermissions = initializeUpdatedPermissions();
        let assignedCount = 0;
        for (const module in targetPermissions) {
          if (targetPermissions[module].permissions) {
            for (const perm in targetPermissions[module].permissions) {
              if (permissionTypes.includes(perm) && viewPermissions[module]?.permissions?.[perm]) {
                for (const permId in targetPermissions[module].permissions[perm]) {
                  if (targetPermissions[module].permissions[perm][permId]?.check === 1) {
                    updatePermissions(updatedPermissions, module, null, null, perm, true, permId);
                    assignedCount++;
                  }
                }
              }
            }
          }
          for (const section in targetPermissions[module]) {
            if (section === 'permissions') continue;
            if (targetPermissions[module][section].permissions) {
              for (const perm in targetPermissions[module][section].permissions) {
                if (permissionTypes.includes(perm) && viewPermissions[module]?.[section]?.permissions?.[perm]) {
                  for (const permId in targetPermissions[module][section].permissions[perm]) {
                    if (targetPermissions[module][section].permissions[perm][permId]?.check === 1) {
                      updatePermissions(updatedPermissions, module, section, null, perm, true, permId);
                      assignedCount++;
                    }
                  }
                }
              }
            }
            for (const item in targetPermissions[module][section]) {
              if (item === 'permissions') continue;
              if (targetPermissions[module][section][item].permissions) {
                for (const perm in targetPermissions[module][section][item].permissions) {
                  if (permissionTypes.includes(perm) && viewPermissions[module]?.[section]?.[item]?.permissions?.[perm]) {
                    for (const permId in targetPermissions[module][section][item].permissions[perm]) {
                      if (targetPermissions[module][section][item].permissions[perm][permId]?.check === 1) {
                        updatePermissions(updatedPermissions, module, section, item, perm, true, permId);
                        assignedCount++;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        const tbodies = document.querySelectorAll('tbody');
        tbodies.forEach(tbody => {
          const module = tbody.dataset.module || 'unknown';
          syncPreSelections(tbody, module);
        });
        return updatedPermissions;
      } catch (error) {
        window.general.error('Error assigning permissions', { error });
        return updatedPermissions;
      }
    };
    const initPermissions = () => {
      try {
        const permissionsContainer = document.querySelector('[data-permissions-container]');
        if (!permissionsContainer) {
          throw new Error('Permissions container [data-permissions-container] not found');
        }
        permissionsContainer.innerHTML = `
          <div id="permissions-count" class="text-end sf-10">Selected <b>0</b> of <b>0</b> permissions</div>
          <input type="hidden" id="permission_ids" name="permission_ids" value="[]">
          <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>
          <div id="accordion-permissions" class="accordion"></div>
          <div id="errorMessage" class="alert alert-danger d-none"></div>
        `;
        const permissionIdsInput = document.getElementById('permission_ids');
        if (!permissionIdsInput) {
          window.general.error('Permission IDs input not initialized in DOM');
        }
        const accordionPermissions = document.getElementById('accordion-permissions');
        if (!accordionPermissions) {
          throw new Error('Accordion container not found');
        }
        if (!viewPermissions || !Object.keys(viewPermissions).length) {
          accordionPermissions.innerHTML = '<p class="text-muted p-3">No permissions available.</p>';
          updateHiddenInput();
          return;
        }
        seenModules.clear();
        for (const module in viewPermissions) {
          const moduleId = sanitizeId(module);
          if (seenModules.has(moduleId)) {
            continue;
          }
          if (!viewPermissions[module]) continue;
          seenModules.add(moduleId);
          const moduleAccordion = document.createElement('div');
          moduleAccordion.className = 'accordion-item';
          moduleAccordion.innerHTML = `
            <h2 class="accordion-header" id="heading-module-${moduleId}">
              <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-module-${moduleId}" aria-expanded="false" aria-controls="collapse-module-${moduleId}">
                <i class="fas fa-cube fa-lg me-2 text-info"></i>${module}
              </button>
            </h2>
            <div id="collapse-module-${moduleId}" class="accordion-collapse collapse" aria-labelledby="heading-module-${moduleId}" data-bs-parent="#accordion-permissions">
              <div class="accordion-body">
                <div class="table-responsive">
                  <table class="table table-hover align-middle">
                    <thead class="table-primary bg-light">
                      <tr>
                        <th class="col-4">Name</th>
                        <th class="col-1 text-center">All</th>
                        ${permissionTypes.map(perm => `
                          <th class="col-1 text-center">${perm.charAt(0).toUpperCase() + perm.slice(1)}</th>
                        `).join('')}
                      </tr>
                    </thead>
                    <tbody id="table-body-module-${moduleId}" data-module="${moduleId}"></tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
          accordionPermissions.appendChild(moduleAccordion);
          const moduleTbody = moduleAccordion.querySelector(`#table-body-module-${moduleId}`);
          if (moduleTbody) {
            if (viewPermissions[module].permissions) {
              renderPermissions(moduleTbody, viewPermissions[module], module, null, null, 0);
            }
            for (const section in viewPermissions[module]) {
              if (section === 'permissions') continue;
              if (viewPermissions[module][section].permissions) {
                renderPermissions(moduleTbody, viewPermissions[module][section], module, section, null, 1);
              }
              for (const item in viewPermissions[module][section]) {
                if (item === 'permissions') continue;
                if (viewPermissions[module][section][item].permissions) {
                  renderPermissions(moduleTbody, viewPermissions[module][section][item], module, section, item, 2);
                }
              }
            }
            syncPreSelections(moduleTbody, module);
          } else {
            window.general.error('Failed to find module tbody', { module, moduleId });
          }
        }
        updateHiddenInput();
        // MutationObserver for DOM changes
        const observer = new MutationObserver((mutations) => {
          let needsSync = false;
          mutations.forEach(mutation => {
            if (mutation.addedNodes.length || mutation.removedNodes.length) {
              needsSync = true;
            }
          });
          if (needsSync) {
            const tbodies = document.querySelectorAll('tbody');
            tbodies.forEach(tbody => {
              const module = tbody.dataset.module || 'unknown';
              syncPreSelections(tbody, module);
            });
          }
        });
        observer.observe(accordionPermissions, { childList: true, subtree: true });
        permissionsContainer.querySelector('.spinner-border')?.remove();
        // Remove existing event listeners
        const removeEventListeners = () => {
          const permissionsContainer = document.querySelector('[data-permissions-container]');
          if (permissionsContainer) {
            permissionsContainer.removeEventListener('change', handlePermissionCheckboxChange);
            permissionsContainer.removeEventListener('change', handleSelectRowChange);
          }
          const form = document.getElementById('permission_ids')?.closest('form') || document.querySelector('form[data-permissions-form]');
        };
        // Event handlers with delegation
        const handlePermissionCheckboxChange = (event) => {
          try {
            const checkbox = event.target;
            if (!checkbox.matches('.permission-checkbox[type="checkbox"]')) return;
            if (!checkbox.isConnected) {
              return;
            }
            const tableBody = checkbox.closest('table');
            if (!tableBody) {
              window.general.error('Table body not found for checkbox', { checkboxId: checkbox.id, dataset: checkbox.dataset });
              return;
            }
            const module = checkbox.dataset.module;
            const section = checkbox.dataset.section || null;
            const item = checkbox.dataset.item || null;
            const permission = checkbox.dataset.permission;
            const checked = checkbox.checked;
            const permissionId = checkbox.value;
            updatePermissions(
              updatedPermissions,
              module,
              section,
              item,
              permission,
              checked,
              permissionId
            );
            propagatePermissionChange(checkbox, tableBody, updatedPermissions, checked);
            enforceViewOnlyLogic(checkbox, tableBody);
          } catch (error) {
            window.general.error('Error handling checkbox change', { error });
          }
        };
        const handleSelectRowChange = (event) => {
          try {
            const selectRow = event.target;
            if (!selectRow.matches('.select-row')) return;
            if (!selectRow.isConnected) {
              return;
            }
            const tableBody = selectRow.closest('table');
            if (!tableBody) {
              window.general.error('Table body not found for select-row', { selectRowId: selectRow.id, dataset: selectRow.dataset });
              return;
            }
            toggleRowSelection(selectRow, tableBody, updatedPermissions);
          } catch (error) {
            window.general.error('Error handling row select change', { error });
          }
        };
        // Add event delegation
        const addEventListeners = () => {
          removeEventListeners();
          const permissionsContainer = document.querySelector('[data-permissions-container]');
          if (permissionsContainer) {
            permissionsContainer.addEventListener('change', handlePermissionCheckboxChange);
            permissionsContainer.addEventListener('change', handleSelectRowChange);
          }
        };
        // Reattach event listeners on accordion show
        const accordions = document.querySelectorAll('.accordion');
        accordions.forEach(accordion => {
          accordion.addEventListener('shown.bs.collapse', () => {
            addEventListeners();
            const tbodies = document.querySelectorAll('tbody');
            tbodies.forEach(tbody => {
              const module = tbody.dataset.module || 'unknown';
              syncPreSelections(tbody, module);
            });
          });
        });
        addEventListeners();
        return {
          reinitPermissions: () => {
            observer.disconnect();
            removeEventListeners();
            initPermissions();
          },
          updatedPermissions,
          assignPermissions
        };
      } catch (error) {
        window.general.error('Error initializing permissions UI', { error });
        const permissionsContainer = document.querySelector('[data-permissions-container]');
        const errorMessage = permissionsContainer?.querySelector('#errorMessage');
        if (errorMessage) {
          errorMessage.textContent = `Failed to initialize permissions: ${error.message}`;
          errorMessage.classList.remove('d-none');
        }
        permissionsContainer?.querySelector('.spinner-border')?.remove();
        return { reinitPermissions: () => { }, updatedPermissions, assignPermissions };
      }
    };
    // Initialize only once DOM is ready
    const initialize = () => {
      document.removeEventListener('DOMContentLoaded', initialize);
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initPermissions();
      } else {
        setTimeout(initialize, 50);
      }
    };
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initPermissions();
    } else {
      document.addEventListener('DOMContentLoaded', initialize);
    }
    return {
      reinitPermissions: () => initPermissions(),
      updatedPermissions,
      assignPermissions
    };
  } catch (error) {
    window.general.error('Fatal error in permissions function', { error });
    return { reinitPermissions: () => { }, updatedPermissions: {}, assignPermissions: () => { } };
  }
}