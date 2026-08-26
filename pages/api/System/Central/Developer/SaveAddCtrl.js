import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';
import { generateUniqueId as generateUID } from '../../../../../src/utils/unique-generator';
import ModuleGenerator from '../../../../../src/server/Services/ModuleGenerator';
import SectionGenerator from '../../../../../src/server/Services/SectionGenerator';
import PermissionAutoAssignService from '../../../../../src/services/PermissionAutoAssignService';

/**
 * SaveAddCtrl - Laravel SaveAddCtrl.php equivalent
 * Saves new records
 */
export default class SaveAddCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 SaveAddCtrl::index() called');

      // Token comes from URL params (set by [token].js) or body
      const token = req.params?.token || req.body?.save_token;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      console.log('🔍 Token extracted:', token);

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      let reloadTable = false;
      let reloadCard = false;
      let validated = {};
      let title = 'Success';
      let message = 'Record added successfully.';
      let insertedId = null;

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
          // Extract and validate all required fields
          const { key, module, system, type, table, column, value, act, validate, actions } = req.body;
          
          // Validate all required fields
          const missingFields = [];
          if (!key) missingFields.push('key');
          if (!module) missingFields.push('module');
          if (!system) missingFields.push('system');
          if (!type) missingFields.push('type');
          if (!table) missingFields.push('table');
          if (!column) missingFields.push('column');
          if (!value) missingFields.push('value');
          if (!act) missingFields.push('act');
          if (validate === undefined || validate === null || validate === '') missingFields.push('validate');
          
          if (missingFields.length > 0) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: `Missing required fields: ${missingFields.join(', ')}`
            });
          }

          // Check for duplicate
          const tokensCollection = await getCollection('skeleton_tokens');
          const existing = await tokensCollection.findOne({ key });

          if (existing) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'This key is already registered'
            });
          }

          // Process actions: checkboxgroup returns array, convert to string
          let actionsString = null;
          if (actions) {
            if (Array.isArray(actions)) {
              actionsString = actions.filter(a => a && a.trim()).join('');
            } else if (typeof actions === 'string' && actions.trim()) {
              actionsString = actions.trim();
            }
          }

          validated = {
            key: key.trim(),
            module: module.trim(),
            system: system,
            type: type.trim(),
            table: table.trim(),
            column: column.trim(),
            value: value.trim(),
            validate: validate === '1' || validate === true || validate === 1,
            act: act.trim(),
            actions: actionsString,
            created_by: req.user.user_id,
            updated_by: req.user.user_id,
            created_at: new Date(),
            updated_at: new Date()
          };

          console.log('✅ Validated data:', { ...validated, created_by: '[hidden]', updated_by: '[hidden]' });

          const result = await tokensCollection.insertOne(validated);
          insertedId = result.insertedId.toString();
          
          reloadTable = true;
          title = 'Token Added';
          message = 'Token configuration added successfully.';
          break;

        case 'central_skeleton_modules':
          const { name, display, icon, order, system: moduleSystem, is_approved, is_navigable } = req.body;
          
          if (!name || !moduleSystem) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Missing required fields: name, system'
            });
          }

          // Generate unique module_id
          const modulesCollection = await getCollection('skeleton_modules');
          let module_id = generateUID('MOD', 4);
          
          // Check if it exists and regenerate if needed
          let attempts = 0;
          while (attempts < 15) {
            const existing = await modulesCollection.findOne({ module_id });
            if (!existing) break;
            module_id = generateUID('MOD', 4);
            attempts++;
          }
          
          if (attempts >= 15) {
            throw new Error('Unable to generate unique module_id');
          }

          validated = {
            module_id,
            name: name.trim(),
            display: display?.trim() || null,
            icon: icon?.trim() || '',
            system: moduleSystem,
            order: parseInt(order) || 0,
            is_approved: is_approved === '1' || is_approved === true,
            is_navigable: is_navigable === '1' || is_navigable === true,
            created_by: req.user.user_id,
            updated_by: req.user.user_id,
            created_at: new Date(),
            updated_at: new Date()
          };

          const moduleResult = await modulesCollection.insertOne(validated);
          insertedId = moduleResult.insertedId.toString();
          
          // 🎯 AUTO-GENERATE ALL CONTROLLERS FOR NEW MODULE!
          try {
            const generationResult = await ModuleGenerator.generateModule(moduleSystem, name);
            if (generationResult.success) {
              console.log(`✅ Controllers generated! Files: ${generationResult.files.join(', ')}`);
              message = `Module configuration added successfully. ${generationResult.files.length} controller files generated.`;
            } else {
              console.warn(`⚠️ Module generation warning: ${generationResult.message}`);
              message = 'Module configuration added successfully, but controller generation had issues.';
            }
          } catch (genError) {
            console.error('❌ Module generation error:', genError);
            message = 'Module configuration added successfully, but controller generation failed.';
          }
          
          // 🎯 AUTO-GENERATE PERMISSIONS AND ASSIGN TO ALL USERS
          try {
            console.log(`🔐 Generating permissions for module: ${name}`);
            const permissionIds = await PermissionAutoAssignService.generateModulePermissions(name);
            console.log(`✅ Generated ${permissionIds.length} permissions for module ${name}`);
            
            // Assign view permissions to all existing users
            const assignResult = await PermissionAutoAssignService.assignViewPermissionsToAllUsers(permissionIds);
            console.log(`✅ Permission assignment result:`, assignResult.message);
            
            if (assignResult.assigned > 0) {
              message += ` ${assignResult.assigned} view permissions assigned to ${assignResult.users} users.`;
            }
          } catch (permError) {
            console.error('❌ Error generating/assigning permissions:', permError);
            // Don't fail the module creation if permission assignment fails
            message += ' (Note: Permission assignment encountered an error)';
          }
          
          reloadTable = true;
          title = 'Module Added';
          break;

        case 'central_skeleton_sections':
          const { name: sectionName, display: sectionDisplay, icon: sectionIcon, order: sectionOrder, module_id: sectionModuleId, is_approved: sectionIsApproved, is_navigable: sectionIsNavigable } = req.body;
          
          if (!sectionName || !sectionModuleId || !sectionIcon) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Missing required fields: name, module_id, icon'
            });
          }

          // Generate unique section_id
          const sectionsCollection = await getCollection('skeleton_sections');
          let section_id = generateUID('SEC', 4);
          
          // Check if it exists and regenerate if needed
          let sectionAttempts = 0;
          while (sectionAttempts < 15) {
            const existingSection = await sectionsCollection.findOne({ section_id });
            if (!existingSection) break;
            section_id = generateUID('SEC', 4);
            sectionAttempts++;
          }
          
          if (sectionAttempts >= 15) {
            throw new Error('Unable to generate unique section_id');
          }

          // Validate module_id exists
          const sectionsModulesCollection = await getCollection('skeleton_modules');
          const moduleExists = await sectionsModulesCollection.findOne({ module_id: sectionModuleId });
          if (!moduleExists) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: `Module with ID "${sectionModuleId}" does not exist.`
            });
          }

          validated = {
            section_id,
            module_id: sectionModuleId.trim(),
            name: sectionName.trim(),
            display: sectionDisplay?.trim() || null,
            icon: sectionIcon?.trim() || '',
            order: parseInt(sectionOrder) || 0,
            is_approved: sectionIsApproved === '1' || sectionIsApproved === true,
            is_navigable: sectionIsNavigable === '1' || sectionIsNavigable === true,
            created_by: req.user.user_id,
            updated_by: req.user.user_id,
            created_at: new Date(),
            updated_at: new Date()
          };

          const sectionResult = await sectionsCollection.insertOne(validated);
          insertedId = sectionResult.insertedId.toString();
          
          // Get module info for permission generation
          const moduleInfo = moduleExists;
          const sectionSystem = moduleInfo.system || 'central';
          const moduleName = moduleInfo.name || moduleInfo.module || 'developer';
          
          // 🎯 AUTO-GENERATE PERMISSIONS AND ASSIGN TO ALL USERS
          try {
            console.log(`🔐 Generating permissions for section: ${moduleName}::${sectionName}`);
            const permissionIds = await PermissionAutoAssignService.generateSectionPermissions(moduleName, sectionName);
            console.log(`✅ Generated ${permissionIds.length} permissions for section ${moduleName}::${sectionName}`);
            
            // Assign view permissions to all existing users
            const assignResult = await PermissionAutoAssignService.assignViewPermissionsToAllUsers(permissionIds);
            console.log(`✅ Permission assignment result:`, assignResult.message);
            
            if (assignResult.assigned > 0) {
              message = `Section configuration added successfully. ${assignResult.assigned} view permissions assigned to ${assignResult.users} users.`;
            } else {
              message = 'Section configuration added successfully.';
            }
          } catch (permError) {
            console.error('❌ Error generating/assigning permissions:', permError);
            message = 'Section configuration added successfully. (Note: Permission assignment encountered an error)';
          }
          
          // Generate page and route for this section
          try {
            console.log('🎨 Generating page and route for new section...');
            
            // Build section URL: /{system}/{module}/{section}
            // Convert names to kebab-case for URL
            const toKebabCase = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            const sectionSlug = toKebabCase(sectionName);
            const moduleSlug = toKebabCase(moduleName);
            const sectionUrl = `/${sectionSystem}/${moduleSlug}/${sectionSlug}`;
            
            console.log(`📝 Generating section page: ${sectionUrl}`);
            
            // Generate the page using SectionGenerator
            const sectionGenerator = new SectionGenerator();
            const pageResult = await sectionGenerator.generateSectionPage(
              sectionSystem,
              moduleSlug,
              sectionName,
              sectionUrl,
              sectionIcon
            );
            
            if (pageResult.success) {
              console.log(`✅ Page generated: ${pageResult.fullPath}`);
              message += ` Page created at ${pageResult.fullPath}`;
              
              if (pageResult.routeGenerated) {
                console.log(`✅ Route generated automatically`);
                message += ' Route added to navigation.';
              }
            } else {
              console.warn(`⚠️ Page generation failed: ${pageResult.message}`);
              message += ` (Page generation failed: ${pageResult.message})`;
            }
          } catch (genError) {
            console.error('❌ Error generating section page:', genError);
            // Don't fail the save operation if page generation fails
            message += ' (Page generation encountered an error)';
          }
          
          reloadTable = true;
          title = 'Section Added';
          break;

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      return res.status(200).json({
        status: true,
        reload_table: reloadTable,
        reload_card: reloadCard,
        token: reqSet.key,
        affected: insertedId || '-',
        title: title,
        message: message
      });

    } catch (error) {
      console.error('❌ SaveAddCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while saving the data.'
      });
    }
  }
}
