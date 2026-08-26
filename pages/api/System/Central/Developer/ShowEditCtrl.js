import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';
import DataService from '../../../../../src/services/DataService';
import { ObjectId } from 'mongodb';

/**
 * ShowEditCtrl - Laravel ShowEditCtrl.php equivalent
 * Renders popup form for editing existing records
 */
export default class ShowEditCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 ShowEditCtrl::index() called');

      const token = req.params?.token || req.body?.skeleton_token || req.query?.token;
      const recordId = req.query?.id || req.body?.id;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key || !recordId) {
        console.error('❌ Invalid request:', { hasReqSet: !!reqSet, hasKey: !!reqSet?.key, hasRecordId: !!recordId });
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or missing required data (key, recordId).'
        });
      }

      console.log(`📋 Fetching record: table=${reqSet.table}, id=${recordId}`);

      // Fetch existing data
      // MongoDB uses _id as primary key, convert recordId to ObjectId
      let queryId = recordId;
      try {
        if (ObjectId.isValid(recordId)) {
          queryId = new ObjectId(recordId);
        }
      } catch (e) {
        // Keep original value if conversion fails
      }

      // For user_permissions case, fetch user data directly
      let data = null;
      if (reqSet.key === 'central_skeleton_user_permissions') {
        const usersCollection = await getCollection('users');
        if (!usersCollection) {
          return res.status(500).json({
            status: false,
            title: 'Database Error',
            message: 'Failed to connect to users collection.'
          });
        }
        data = await usersCollection.findOne({ _id: queryId });
        if (!data) {
          console.error(`❌ User not found: _id=${recordId}`);
          return res.status(404).json({
            status: false,
            title: 'User Not Found',
            message: 'The requested user was not found.'
          });
        }
      } else {
        // For other cases, use DataService
        const result = await DataService.get(reqSet.system, reqSet.table, {
          where: { _id: queryId }
        });
        
        data = result.data?.[0];
        if (!data) {
          console.error(`❌ Record not found: table=${reqSet.table}, _id=${recordId}`);
          return res.status(404).json({
            status: false,
            title: 'Record Not Found',
            message: 'The requested record was not found.'
          });
        }
      }

      console.log(`✅ Record fetched:`, { 
        table: reqSet.table, 
        id: data?._id, 
        user_id: data?.user_id,
        module_id: data?.module_id,
        name: data.name,
        hasModuleId: !!data.module_id
      });

      let popup = {};

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
          // Fetch modules for dropdown
          const modulesCollection = await getCollection('skeleton_modules');
          const modules = await modulesCollection.find({})
            .project({ name: 1, display: 1 })
            .toArray();

          // Parse actions if it's a string
          // For display, convert to array if string, but for single select use first value
          let actionsValue = '';
          if (data.actions) {
            if (typeof data.actions === 'string') {
              // If it's a string like "cve", convert to array ['c','v','e']
              const actionsArray = data.actions.split('');
              // For single select, use the first action or join with comma
              actionsValue = actionsArray.length > 0 ? actionsArray[0] : '';
            } else if (Array.isArray(data.actions)) {
              actionsValue = data.actions.length > 0 ? data.actions[0] : '';
            }
          }

          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'key',
                label: 'Key',
                value: data.key || '',
                required: true,
                col: 12,
                attr: {
                  'data-validate': 'key',
                  'maxlength': '100',
                  'readonly': 'readonly',
                  'data-unique-msg': 'This key is already registered'
                }
              },
              {
                type: 'select',
                name: 'system',
                label: 'System',
                value: data.system || '',
                options: ['central', 'business', 'open', 'lander'].map(val => ({
                  value: val,
                  label: val.charAt(0).toUpperCase() + val.slice(1)
                })),
                required: true,
                col: 6,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'module',
                label: 'Module',
                value: data.module || '',
                options: modules.map(m => ({ value: m.name, label: m.display || m.name })),
                required: false,
                col: 6,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'type',
                label: 'Type',
                value: data.type || '',
                options: ['data', 'unique', 'select', 'other'].map(val => ({
                  value: val,
                  label: val.charAt(0).toUpperCase() + val.slice(1)
                })),
                required: true,
                col: 4,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'text',
                name: 'table',
                label: 'Table',
                value: data.table || '',
                required: true,
                col: 4,
                attr: { 'data-validate': 'key', 'maxlength': '100' }
              },
              {
                type: 'text',
                name: 'column',
                label: 'Column',
                value: data.column || '',
                required: true,
                col: 4
              },
              {
                type: 'text',
                name: 'value',
                label: 'Value',
                value: data.value || '',
                required: true,
                col: 4
              },
              {
                type: 'select',
                name: 'validate',
                label: 'Validate',
                value: data.validate ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 4,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'text',
                name: 'act',
                label: 'Action Column',
                value: data.act || '',
                required: true,
                col: 4
              },
              {
                type: 'select',
                name: 'actions',
                label: 'Actions',
                value: actionsValue,
                options: ['c', 'v', 'e', 'd'].map(val => ({
                  value: val,
                  label: val.toUpperCase() + ' (' + (val === 'c' ? 'Create' : val === 'v' ? 'View' : val === 'e' ? 'Edit' : 'Delete') + ')'
                })),
                col: 12,
                attr: { 'data-select': 'dropdown' }
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Token',
            short_label: '',
            button: 'Update Token',
            script: 'window.general.select();window.general.unique();window.general.pills();'
          };
          break;

        case 'central_skeleton_modules':
          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'name',
                label: 'Name',
                value: data.name || '',
                required: true,
                col: 6,
                attr: { 'data-validate': 'module', 'readonly': 'readonly' }
              },
              {
                type: 'text',
                name: 'display',
                label: 'Display Name',
                value: data.display || '',
                required: false,
                col: 6
              },
              {
                type: 'text',
                name: 'icon',
                label: 'Icon',
                value: data.icon || '',
                required: true,
                col: 6,
                helpText: 'Accepts CoreUI icons (e.g., cil-apps, cil-user) or Bootstrap icons (e.g., bi-grid, bi-person)',
                attr: {
                  'maxlength': '100',
                  'placeholder': 'e.g., cil-apps or bi-grid',
                  'data-accept': 'both'
                }
              },
              {
                type: 'number',
                name: 'order',
                label: 'Order',
                value: data.order || 0,
                required: true,
                col: 6
              },
              {
                type: 'select',
                name: 'system',
                label: 'System',
                value: data.system || '',
                options: ['central', 'business', 'open'].map(val => ({
                  value: val,
                  label: val.charAt(0).toUpperCase() + val.slice(1)
                })),
                required: true,
                col: 4,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'is_approved',
                label: 'Approval',
                value: data.is_approved ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 4,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'is_navigable',
                label: 'Is Navigable',
                value: data.is_navigable ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 4,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'hidden',
                name: 'module_id',
                value: data.module_id || data.id || ''
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Module',
            short_label: '',
            button: 'Update Module',
            script: 'window.general.select();window.general.unique();'
          };
          break;

        case 'central_skeleton_sections':
          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'name',
                label: 'Name',
                value: data.name || '',
                required: true,
                col: 6,
                attr: { 'data-validate': 'module', 'readonly': 'readonly' }
              },
              {
                type: 'text',
                name: 'display',
                label: 'Display Name',
                value: data.display || '',
                required: false,
                col: 6
              },
              {
                type: 'text',
                name: 'icon',
                label: 'Icon',
                value: data.icon || '',
                required: true,
                col: 6,
                helpText: 'Accepts CoreUI icons (e.g., cil-apps, cil-user) or Bootstrap icons (e.g., bi-grid, bi-person)',
                attr: {
                  'maxlength': '100',
                  'placeholder': 'e.g., cil-apps or bi-grid',
                  'data-accept': 'both'
                }
              },
              {
                type: 'number',
                name: 'order',
                label: 'Order',
                value: data.order || 0,
                required: true,
                col: 6
              },
              {
                type: 'select',
                name: 'is_approved',
                label: 'Approval',
                value: data.is_approved ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 6,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'is_navigable',
                label: 'Is Navigable',
                value: data.is_navigable ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 6,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'hidden',
                name: 'section_id',
                value: data.section_id || data.id || ''
              },
              {
                type: 'hidden',
                name: 'module_id',
                value: data.module_id || data.module || ''
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Edit Skeleton Section',
            short_label: '',
            button: 'Update Section',
            script: 'window.general.select();window.general.unique();'
          };
          break;

        case 'central_skeleton_custom_permissions':
          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'name',
                label: 'Name',
                value: data.name || '',
                required: true,
                col: 12,
                attr: {
                  'data-validate': 'permission',
                  'data-unique-msg': 'This key is already registered'
                }
              },
              {
                type: 'textarea',
                name: 'description',
                label: 'Description',
                value: data.description || '',
                required: false,
                col: 12
              },
              {
                type: 'select',
                name: 'is_approved',
                label: 'Approval',
                value: data.is_approved ? '1' : '0',
                options: [
                  { value: '0', label: 'No' },
                  { value: '1', label: 'Yes' }
                ],
                required: true,
                col: 12,
                attr: { 'data-select': 'dropdown' }
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Edit Custom Permission',
            short_label: '',
            button: 'Update Permission',
            script: 'window.general.select();'
          };
          break;

        case 'central_skeleton_user_permissions': {
          // Build permissions structure from modules, sections, items
          // Using block scope to avoid variable name conflicts with other cases
          try {
            // Ensure database connection is established
            const userPermModulesCollection = await getCollection('skeleton_modules');
            const userPermSectionsCollection = await getCollection('skeleton_sections');
            const userPermItemsCollection = await getCollection('skeleton_items');
            const userPermPermissionsCollection = await getCollection('permissions');
            const userPermUserPermissionsCollection = await getCollection('user_permissions');
            const userPermUsersCollection = await getCollection('users');

            // Verify collections are valid
            if (!userPermModulesCollection || !userPermSectionsCollection || !userPermItemsCollection || 
                !userPermPermissionsCollection || !userPermUserPermissionsCollection || !userPermUsersCollection) {
              throw new Error('Failed to get database collections');
            }

            // Get user_id from the user record - data should have user_id
            let userId = data?.user_id;
            if (!userId) {
              // If we only have _id, fetch the user to get user_id
              const userRecord = await userPermUsersCollection.findOne({ _id: queryId });
              userId = userRecord?.user_id || recordId || data?._id?.toString();
            }

            if (!userId) {
              return res.status(400).json({
                status: false,
                title: 'User ID Missing',
                message: 'User ID is required to load permissions.'
              });
            }

          // Fetch existing user permissions
          const existingUserPerms = await userPermUserPermissionsCollection.find({
            user_id: userId,
            is_active: true
          }).toArray();

          const existingPermissionIds = new Set(
            existingUserPerms.map(up => up.permission_id).filter(Boolean)
          );

          // Build permissions structure
          const viewPermissions = {};
          const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];

          // Fetch all modules, sections, items
          const allModules = await userPermModulesCollection.find({ 
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
          }).sort({ order: 1 }).toArray();
          const allSections = await userPermSectionsCollection.find({ 
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
          }).sort({ order: 1 }).toArray();
          const allItems = await userPermItemsCollection.find({ 
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }] 
          }).sort({ order: 1 }).toArray();

          // First, build the complete structure with ALL modules, sections, and items
          // This ensures sections/items show even if they don't have permissions yet
          for (const module of allModules) {
            const moduleName = module.name;
            if (!viewPermissions[moduleName]) {
              viewPermissions[moduleName] = { permissions: {} };
            }

            // Get all sections for this module
            const moduleSections = allSections.filter(s => s.module_id === module.module_id);
            for (const section of moduleSections) {
              const sectionName = section.name;
              // Always add section to structure, even if no permissions exist
              if (!viewPermissions[moduleName][sectionName]) {
                viewPermissions[moduleName][sectionName] = { permissions: {} };
              }

              // Get all items for this section
              const sectionItems = allItems.filter(i => i.section_id === section.section_id);
              for (const item of sectionItems) {
                const itemName = item.name;
                // Always add item to structure, even if no permissions exist
                if (!viewPermissions[moduleName][sectionName][itemName]) {
                  viewPermissions[moduleName][sectionName][itemName] = { permissions: {} };
                }
              }
            }
          }

          // Now, populate permissions for each level (module, section, item)
          for (const module of allModules) {
            const moduleName = module.name;

            // Module-level permissions
            for (const permType of permissionTypes) {
              const permName = `${permType}:${moduleName}`;
              const permission = await userPermPermissionsCollection.findOne({ name: permName, is_approved: true });
              if (permission) {
                if (!viewPermissions[moduleName].permissions[permType]) {
                  viewPermissions[moduleName].permissions[permType] = {};
                }
                viewPermissions[moduleName].permissions[permType][permission.permission_id] = {
                  check: existingPermissionIds.has(permission.permission_id) ? 1 : 0,
                  is_skeleton: permission.is_skeleton || 0,
                  type: 'user'
                };
              }
            }

            // Section-level permissions
            const moduleSections = allSections.filter(s => s.module_id === module.module_id);
            for (const section of moduleSections) {
              const sectionName = section.name;

              // Ensure module exists
              if (!viewPermissions[moduleName]) {
                console.log(`⚠️ Module ${moduleName} not found in viewPermissions, creating...`);
                viewPermissions[moduleName] = { permissions: {} };
              }

              // Ensure section exists in viewPermissions structure
              if (!viewPermissions[moduleName][sectionName]) {
                console.log(`⚠️ Section ${sectionName} not found in module ${moduleName}, creating...`);
                viewPermissions[moduleName][sectionName] = { permissions: {} };
              }

              // Double-check section structure
              if (!viewPermissions[moduleName][sectionName].permissions) {
                viewPermissions[moduleName][sectionName].permissions = {};
              }

              for (const permType of permissionTypes) {
                const permName = `${permType}:${moduleName}::${sectionName}`;
                const permission = await userPermPermissionsCollection.findOne({ name: permName, is_approved: true });
                if (permission) {
                  // Defensive check: ensure all nested structures exist
                  if (!viewPermissions[moduleName]) {
                    viewPermissions[moduleName] = { permissions: {} };
                  }
                  if (!viewPermissions[moduleName][sectionName]) {
                    viewPermissions[moduleName][sectionName] = { permissions: {} };
                  }
                  if (!viewPermissions[moduleName][sectionName].permissions) {
                    viewPermissions[moduleName][sectionName].permissions = {};
                  }
                  if (!viewPermissions[moduleName][sectionName].permissions[permType]) {
                    viewPermissions[moduleName][sectionName].permissions[permType] = {};
                  }
                  
                  viewPermissions[moduleName][sectionName].permissions[permType][permission.permission_id] = {
                    check: existingPermissionIds.has(permission.permission_id) ? 1 : 0,
                    is_skeleton: permission.is_skeleton || 0,
                    type: 'user'
                  };
                }
              }

              // Item-level permissions
              const sectionItems = allItems.filter(i => i.section_id === section.section_id);
              for (const item of sectionItems) {
                const itemName = item.name;

                // Defensive check: ensure all nested structures exist
                if (!viewPermissions[moduleName]) {
                  viewPermissions[moduleName] = { permissions: {} };
                }
                if (!viewPermissions[moduleName][sectionName]) {
                  viewPermissions[moduleName][sectionName] = { permissions: {} };
                }
                if (!viewPermissions[moduleName][sectionName][itemName]) {
                  viewPermissions[moduleName][sectionName][itemName] = { permissions: {} };
                }

                for (const permType of permissionTypes) {
                  const permName = `${permType}:${moduleName}::${sectionName}::${itemName}`;
                  const permission = await userPermPermissionsCollection.findOne({ name: permName, is_approved: true });
                  if (permission) {
                    // Additional defensive check inside permission loop
                    if (!viewPermissions[moduleName][sectionName][itemName].permissions) {
                      viewPermissions[moduleName][sectionName][itemName].permissions = {};
                    }
                    if (!viewPermissions[moduleName][sectionName][itemName].permissions[permType]) {
                      viewPermissions[moduleName][sectionName][itemName].permissions[permType] = {};
                    }
                    
                    viewPermissions[moduleName][sectionName][itemName].permissions[permType][permission.permission_id] = {
                      check: existingPermissionIds.has(permission.permission_id) ? 1 : 0,
                      is_skeleton: permission.is_skeleton || 0,
                      type: 'user'
                    };
                  }
                }
              }
            }
          }

            // Return special response for user permissions modal
            return res.status(200).json({
              status: true,
              title: 'User Permissions Loaded',
              message: 'User permissions structure loaded successfully.',
              data: {
                viewPermissions,
                existingPermissions: Array.from(existingPermissionIds),
                userId: userId
              }
            });
          } catch (permError) {
            console.error('❌ Error in central_skeleton_user_permissions case:', permError);
            return res.status(500).json({
              status: false,
              title: 'Error Loading Permissions',
              message: `Failed to load user permissions: ${permError.message}`
            });
          }
          break;
        }

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      // Structure response for DynamicModal component
      // DynamicModal expects: { fields, labelType, modal: { size, title, button } }
      const responseData = {
        fields: popup.fields || [],
        labelType: popup.labelType || 'floating',
        modal: {
          size: popup.size || 'lg',
          title: popup.label || 'Form',
          button: popup.button || 'Update'
        },
        // Additional metadata (optional)
        script: popup.script || '',
        validate: reqSet.validate || '0',
        // Include other popup properties if needed
        type: popup.type,
        position: popup.position,
        short_label: popup.short_label || '',
        button_class: popup.button_class || ''
      };

      return res.status(200).json({
        status: true,
        title: 'Form Generated',
        message: `Edit form for ${reqSet.key} generated successfully.`,
        data: responseData  // Wrap in 'data' property for frontend
      });

    } catch (error) {
      console.error('❌ ShowEditCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while processing the request.'
      });
    }
  }

  /**
   * Generate form HTML from field configuration
   * @param {array} fields 
   * @param {string} labelType 
   * @returns {string}
   */
  generateFormHTML(fields, labelType) {
    let html = '<form>';
    const rowOpen = '<div class="row g-3">';
    const rowClose = '</div>';
    let currentRow = false;
    
    fields.forEach((field, index) => {
      const col = field.col || 12;
      const isFullWidth = col === 12;
      
      // Start new row if needed
      if (!currentRow || isFullWidth) {
        if (currentRow) html += rowClose;
        html += rowOpen;
        currentRow = true;
      }
      
      html += `<div class="col-md-${col}">`;
      
      switch (field.type) {
        case 'text':
        case 'number':
          const value = field.value !== undefined ? `value="${field.value}"` : '';
          html += `
            <div class="float-input-control">
              <input type="${field.type}" name="${field.name}" class="form-float-input" 
                ${value}
                ${field.required ? 'required' : ''} 
                ${field.attr ? Object.entries(field.attr).map(([k, v]) => `${k}="${v}"`).join(' ') : ''}>
              <label class="form-float-label">${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            </div>
          `;
          break;
        
        case 'textarea':
          html += `
            <div class="float-input-control">
              <textarea name="${field.name}" class="form-float-input" rows="3"
                ${field.required ? 'required' : ''}>${field.value || ''}</textarea>
              <label class="form-float-label">${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            </div>
          `;
          break;
        
        case 'select':
          const selectValue = field.value || field.attr?.['data-value'] || '';
          html += `
            <div class="float-input-control">
              <select name="${field.name}" class="form-float-input" 
                ${field.required ? 'required' : ''}
                ${field.attr?.multiple ? 'multiple' : ''}
                ${field.attr ? Object.entries(field.attr).filter(([k]) => k !== 'multiple').map(([k, v]) => `${k}="${v}"`).join(' ') : ''}>
                <option value="">Select ${field.label}</option>
                ${Array.isArray(field.options) 
                  ? field.options.map(opt => {
                      const optVal = typeof opt === 'string' ? opt : opt.value;
                      const optLabel = typeof opt === 'string' ? opt.charAt(0).toUpperCase() + opt.slice(1) : opt.label;
                      const selected = Array.isArray(selectValue) 
                        ? selectValue.includes(optVal) 
                        : selectValue === optVal;
                      return `<option value="${optVal}" ${selected ? 'selected' : ''}>${optLabel}</option>`;
                    }).join('')
                  : Object.entries(field.options).map(([val, lbl]) => {
                      const selected = selectValue === val;
                      return `<option value="${val}" ${selected ? 'selected' : ''}>${lbl}</option>`;
                    }).join('')
                }
              </select>
              <label class="form-float-label">${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            </div>
          `;
          break;
        
        case 'hidden':
          html += `<input type="hidden" name="${field.name}" value="${field.value || ''}">`;
          break;
      }
      
      html += '</div>';
      
      // Close row if full width or last field
      if (isFullWidth || index === fields.length - 1) {
        html += rowClose;
        currentRow = false;
      }
    });
    
    html += '</form>';
    
    return html;
  }
}

