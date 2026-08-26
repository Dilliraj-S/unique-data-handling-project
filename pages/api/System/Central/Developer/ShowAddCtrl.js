import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';

/**
 * ShowAddCtrl - Laravel ShowAddCtrl.php equivalent
 * Renders popup form for adding new records
 */
export default class ShowAddCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 ShowAddCtrl::index() called');

      const token = req.params?.token || req.body?.skeleton_token;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      let popup = {};

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
          // Fetch modules for dropdown
          const modulesCollection = await getCollection('skeleton_modules');
          const modules = await modulesCollection.find({})
            .project({ name: 1, display: 1, system: 1 })
            .toArray();

          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'key',
                label: 'Key',
                required: true,
                col: 12,
                attr: {
                  'data-validate': 'key',
                  'maxlength': '100',
                  'data-unique-msg': 'This key is already registered'
                }
              },
              {
                type: 'select',
                name: 'system',
                label: 'System',
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
                options: modules.map(m => ({ value: m.name, label: m.display || m.name })),
                required: true,
                col: 6,
                attr: { 'data-select': 'dropdown' }
              },
              {
                type: 'select',
                name: 'type',
                label: 'Type',
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
                required: true,
                col: 4,
                attr: { 'data-validate': 'key', 'maxlength': '100' }
              },
              {
                type: 'text',
                name: 'column',
                label: 'Column',
                required: true,
                col: 4
              },
              {
                type: 'text',
                name: 'value',
                label: 'Value',
                required: true,
                col: 4
              },
              {
                type: 'select',
                name: 'validate',
                label: 'Validate',
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
                required: true,
                col: 4
              }
            ],
            type: 'modal',
            size: 'md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Token',
            short_label: '',
            button: 'Save Token',
            script: 'window.general.select();window.general.unique();window.general.pills();'
          };
          break;

        case 'central_skeleton_modules':
          // Fetch systems for dropdown
          const systemsCollection = await getCollection('systems');
          const systems = await systemsCollection.find({ 
            deleted_at: null,
            is_active: true 
          })
            .project({ business_id: 1, name: 1, system: 1 })
            .toArray();

          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              { type: 'text', name: 'name', label: 'Name', required: true, col: 6 },
              { type: 'text', name: 'display', label: 'Display Name', required: false, col: 6 },
              { 
                type: 'text', 
                name: 'icon', 
                label: 'Icon', 
                required: true, 
                col: 6,
                helpText: 'Accepts CoreUI icons (e.g., cil-apps, cil-user) or Bootstrap icons (e.g., bi-grid, bi-person)',
                attr: { 
                  'maxlength': '100', 
                  'placeholder': 'e.g., cil-apps or bi-grid',
                  'data-accept': 'both'
                }
              },
              { type: 'number', name: 'order', label: 'Order', required: true, col: 6 },
              { 
                type: 'select', 
                name: 'system', 
                label: 'System', 
                options: systems.length > 0 
                  ? systems.map(s => ({ 
                      value: s.system || s.business_id, 
                      label: s.name || s.business_id || s.system 
                    }))
                  : ['central', 'business', 'open'].map(val => ({
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
                options: [
                  { value: '1', label: 'Yes' },
                  { value: '0', label: 'No' }
                ], 
                required: true, 
                col: 4, 
                attr: { 'data-select': 'dropdown' } 
              },
              { 
                type: 'select', 
                name: 'is_navigable', 
                label: 'Is Navigable', 
                options: [
                  { value: '1', label: 'Yes' },
                  { value: '0', label: 'No' }
                ], 
                required: true, 
                col: 4, 
                attr: { 'data-select': 'dropdown' } 
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Module',
            short_label: '',
            button: 'Save Module',
            script: 'window.general.select();'
          };
          break;

        case 'central_skeleton_sections':
          // Fetch modules for dropdown
          const sectionsModulesCollection = await getCollection('skeleton_modules');
          const sectionsModules = await sectionsModulesCollection.find({ 
            deleted_at: null,
            is_approved: true 
          })
            .project({ module_id: 1, name: 1, display: 1, system: 1 })
            .sort({ order: 1, name: 1 })
            .toArray();

          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              { 
                type: 'text', 
                name: 'name', 
                label: 'Name', 
                required: true, 
                col: 6,
                attr: { 'maxlength': '100', 'data-validate': 'key' }
              },
              { 
                type: 'text', 
                name: 'display', 
                label: 'Display Name', 
                required: false, 
                col: 6,
                attr: { 'maxlength': '100' }
              },
              { 
                type: 'text', 
                name: 'icon', 
                label: 'Icon', 
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
                required: true, 
                col: 6,
                attr: { 'min': '0', 'step': '1' }
              },
              { 
                type: 'select', 
                name: 'module_id', 
                label: 'Module', 
                options: sectionsModules.length > 0 
                  ? sectionsModules.map(m => ({ 
                      value: m.module_id || m.name, 
                      label: m.display || m.name || m.module_id 
                    }))
                  : [],
                required: true, 
                col: 6, 
                attr: { 'data-select': 'dropdown' } 
              },
              { 
                type: 'select', 
                name: 'is_approved', 
                label: 'Approval', 
                options: [
                  { value: '1', label: 'Yes' },
                  { value: '0', label: 'No' }
                ], 
                required: true, 
                col: 3, 
                attr: { 'data-select': 'dropdown' } 
              },
              { 
                type: 'select', 
                name: 'is_navigable', 
                label: 'Is Navigable', 
                options: [
                  { value: '1', label: 'Yes' },
                  { value: '0', label: 'No' }
                ], 
                required: true, 
                col: 3, 
                attr: { 'data-select': 'dropdown' } 
              }
            ],
            type: 'modal',
            size: 'modal-md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Add Skeleton Section',
            short_label: '',
            button: 'Save Section',
            script: 'window.general.select();'
          };
          break;

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
          button: popup.button || 'Save'
        },
        // Additional metadata (optional)
        script: popup.script || '',
        validate: reqSet.validate || '0'
      };

      return res.status(200).json({
        status: true,
        title: 'Form Generated',
        message: `Add form for ${reqSet.key} generated successfully.`,
        data: responseData  // Wrap in 'data' property for frontend
      });

    } catch (error) {
      console.error('❌ ShowAddCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'An error occurred while processing the request.'
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
    
    fields.forEach(field => {
      const colClass = `col-${field.col || 12}`;
      
      html += `<div class="${colClass}">`;
      
      switch (field.type) {
        case 'text':
        case 'number':
          html += `
            <div class="float-input-control">
              <input type="${field.type}" name="${field.name}" class="form-float-input" 
                ${field.required ? 'required' : ''} 
                ${field.attr ? Object.entries(field.attr).map(([k, v]) => `${k}="${v}"`).join(' ') : ''}>
              <label class="form-float-label">${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            </div>
          `;
          break;
        
        case 'select':
          html += `
            <div class="float-input-control">
              <select name="${field.name}" class="form-float-input" 
                ${field.required ? 'required' : ''}
                ${field.attr?.multiple ? 'multiple' : ''}>
                <option value="">Select ${field.label}</option>
                ${Array.isArray(field.options) 
                  ? field.options.map(opt => 
                      typeof opt === 'string' 
                        ? `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`
                        : `<option value="${opt.value}">${opt.label}</option>`
                    ).join('')
                  : Object.entries(field.options).map(([val, lbl]) => `<option value="${val}">${lbl}</option>`).join('')
                }
              </select>
              <label class="form-float-label">${field.label}${field.required ? '<span class="text-danger">*</span>' : ''}</label>
            </div>
          `;
          break;
      }
      
      html += '</div>';
    });
    
    html += '</form>';
    
    return html;
  }
}

