import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * SaveEditCtrl - Laravel SaveEditCtrl.php equivalent
 * Saves updated records
 */
export default class SaveEditCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 SaveEditCtrl::index() called');

      // Get token from URL params (set by SystemRouteController) or body
      const token = req.params?.token || req.body?.save_token || req.body?.token;
      
      if (!token) {
        console.error('❌ No token found:', { 
          hasParamsToken: !!req.params?.token,
          hasBodySaveToken: !!req.body?.save_token,
          hasBodyToken: !!req.body?.token,
          paramsKeys: Object.keys(req.params || {}),
          bodyKeys: Object.keys(req.body || {})
        });
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }
      
      console.log('🔍 Token extracted:', token);

      // Resolve token - token format is like: central_skeleton_tokens_e_123
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      // Get record ID from body (frontend sends it) or from token resolution
      // Note: Some cases like 'central_skeleton_user_permissions' don't need recordId
      const recordId = req.body.id || req.body.record_id || reqSet.id;
      
      // MongoDB ALWAYS uses _id as primary key, regardless of what reqSet.act says
      // Convert recordId to ObjectId for MongoDB queries (if recordId exists)
      let queryId = recordId;
      if (recordId) {
        try {
          if (ObjectId.isValid(recordId)) {
            queryId = new ObjectId(recordId);
            console.log('✅ ObjectId conversion successful:', { recordId, queryId: queryId.toString() });
          } else {
            console.warn('⚠️ Invalid ObjectId format:', recordId);
            // Keep as string for fallback
            queryId = recordId;
          }
        } catch (e) {
          console.error('❌ ObjectId conversion error:', e);
          // Keep original value if conversion fails
          queryId = recordId;
        }
      }

      console.log('🔍 ID processing:', {
        recordId,
        queryId: queryId instanceof ObjectId ? queryId.toString() : queryId,
        queryIdType: typeof queryId,
        queryIdIsObjectId: queryId instanceof ObjectId,
        reqSetAct: reqSet.act, // For reference, but we always use _id for MongoDB
        reqSetKey: reqSet.key
      });

      let reloadTable = false;
      let reloadCard = false;
      let validated = {};
      let title = 'Success';
      let message = 'Record updated successfully.';

      // Handle different configuration keys
      switch (reqSet.key) {
        // Cases that require recordId - validate it here
        case 'central_skeleton_tokens': {
          if (!recordId) {
            return res.status(400).json({
              status: false,
              title: 'Invalid Data',
              message: 'Record ID is required for update.'
            });
          }
          const { key, module, system, type, table, column, value, act, validate, actions } = req.body;
          
          if (!key || !system || !type || !table) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Missing required fields'
            });
          }

          validated = {
            key: key.trim(),
            module: module?.trim() || null,
            system: system,
            type: type,
            table: table.trim(),
            column: column?.trim() || '',
            value: value?.trim() || '',
            act: act?.trim() || '',
            validate: validate === '1' || validate === true,
            actions: Array.isArray(actions) ? actions.join('') : actions || null,
            updated_by: req.user.user_id,
            updated_at: new Date()
          };

          const tokensCollection = await getCollection('skeleton_tokens');
          await tokensCollection.updateOne(
            { _id: queryId }, // Always use _id for MongoDB
            { $set: validated }
          );
          
          reloadTable = true;
          title = 'Token Updated';
          message = 'Token configuration updated successfully.';
          break;
        }

        case 'central_skeleton_modules': {
          if (!recordId) {
            return res.status(400).json({
              status: false,
              title: 'Invalid Data',
              message: 'Record ID is required for update.'
            });
          }
          const { name: modName, display, icon, order, system: moduleSystem, is_approved, is_navigable, module_id } = req.body;
          
          if (!modName || !moduleSystem) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Missing required fields'
            });
          }

          validated = {
            name: modName.trim(),
            display: display?.trim() || null,
            icon: icon?.trim() || '',
            system: moduleSystem,
            order: parseInt(order) || 0,
            is_approved: is_approved === '1' || is_approved === true,
            is_navigable: is_navigable === '1' || is_navigable === true,
            updated_by: req.user.user_id,
            updated_at: new Date()
          };

          const modulesCollection = await getCollection('skeleton_modules');
          await modulesCollection.updateOne(
            { _id: queryId }, // Always use _id for MongoDB
            { $set: validated }
          );
          
          reloadTable = true;
          title = 'Module Updated';
          message = 'Module configuration updated successfully.';
          break;
        }

        case 'central_skeleton_sections': {
          if (!recordId) {
            return res.status(400).json({
              status: false,
              title: 'Invalid Data',
              message: 'Record ID is required for update.'
            });
          }
          const { name: secName, display: secDisplay, icon: secIcon, order: secOrder, module_id: secModuleId, is_approved: secApproved, is_navigable: secNavigable, section_id } = req.body;
          
          console.log('📋 Section edit request:', {
            recordId,
            queryId,
            queryIdType: typeof queryId,
            queryIdIsObjectId: queryId instanceof ObjectId,
            bodyKeys: Object.keys(req.body),
            secModuleId,
            secName,
            secIcon
          });

          // Validate required fields
          if (!secName || !secName.trim()) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Section name is required.'
            });
          }

          if (!secModuleId || !secModuleId.trim()) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Module ID is required.'
            });
          }

          if (!secIcon || !secIcon.trim()) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'Icon is required.'
            });
          }

          // Validate module_id exists
          const sectionsModulesCollection = await getCollection('skeleton_modules');
          const moduleExists = await sectionsModulesCollection.findOne({ module_id: secModuleId.trim() });
          if (!moduleExists) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: `Module with ID "${secModuleId}" does not exist.`
            });
          }
          
          validated = {
            name: secName.trim(),
            display: secDisplay?.trim() || null,
            icon: secIcon.trim(),
            module_id: secModuleId.trim(), // Preserve module_id
            order: parseInt(secOrder) || 0,
            is_approved: secApproved === '1' || secApproved === true,
            is_navigable: secNavigable === '1' || secNavigable === true,
            updated_by: req.user?.user_id || req.user?.id || 'SYSTEM',
            updated_at: new Date()
          };

          const sectionsCollection = await getCollection('skeleton_sections');
          
          // Check if record exists before updating
          // Ensure queryId is ObjectId for MongoDB query
          let mongoQueryId = queryId;
          if (typeof queryId === 'string' && ObjectId.isValid(queryId)) {
            mongoQueryId = new ObjectId(queryId);
          }
          
          const existingRecord = await sectionsCollection.findOne({ _id: mongoQueryId });
          console.log('🔍 Existing record check:', {
            queryId: queryId instanceof ObjectId ? queryId.toString() : queryId,
            mongoQueryId: mongoQueryId instanceof ObjectId ? mongoQueryId.toString() : mongoQueryId,
            found: !!existingRecord,
            existingId: existingRecord?._id?.toString(),
            existingName: existingRecord?.name
          });

          if (!existingRecord) {
            return res.status(404).json({
              status: false,
              title: 'Record Not Found',
              message: `Section not found with ID: ${recordId}. Please ensure the record exists in the database.`
            });
          }

          const updateResult = await sectionsCollection.updateOne(
            { _id: mongoQueryId }, // Always use _id for MongoDB with ObjectId
            { $set: validated }
          );

          console.log('✅ Update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            queryId: queryId instanceof ObjectId ? queryId.toString() : queryId,
            mongoQueryId: mongoQueryId instanceof ObjectId ? mongoQueryId.toString() : mongoQueryId
          });

          if (updateResult.matchedCount === 0) {
            return res.status(404).json({
              status: false,
              title: 'Record Not Found',
              message: `Section not found with ID: ${recordId}. Update query matched 0 documents.`
            });
          }
          
          reloadTable = true;
          title = 'Section Updated';
          message = 'Section configuration updated successfully.';
          break;
        }

        case 'central_skeleton_custom_permissions': {
          if (!recordId) {
            return res.status(400).json({
              status: false,
              title: 'Invalid Data',
              message: 'Record ID is required for update.'
            });
          }
          const { name: permName, description, is_approved: permApproved } = req.body;
          
          validated = {
            name: permName?.trim() || '',
            description: description?.trim() || null,
            is_approved: permApproved === '1' || permApproved === true,
            updated_by: req.user.user_id,
            updated_at: new Date()
          };

          const customPermissionsCollection = await getCollection('skeleton_custom_permissions');
          await customPermissionsCollection.updateOne(
            { _id: queryId }, // Always use _id for MongoDB
            { $set: validated }
          );
          
          reloadTable = true;
          title = 'Custom Permission Updated';
          message = 'Custom permission configuration updated successfully.';
          break;
        }

        case 'central_skeleton_user_permissions': {
          const { user_id, permission_ids } = req.body;

          if (!user_id) {
            return res.status(400).json({
              status: false,
              title: 'Validation Error',
              message: 'User ID is required.'
            });
          }

          const userPermissionsCollection = await getCollection('user_permissions');

          // Delete existing active permissions for this user
          await userPermissionsCollection.deleteMany({
            user_id: user_id,
            is_active: true
          });

          // Insert new permissions
          const permissionIds = Array.isArray(permission_ids) ? permission_ids : [];
          if (permissionIds.length > 0) {
            const newPermissions = permissionIds.map(permId => ({
              user_id: user_id,
              permission_id: permId,
              is_restricted: false,
              is_active: true,
              created_by: req.user?.user_id || 'SYSTEM',
              created_at: new Date(),
              updated_at: new Date()
            }));

            await userPermissionsCollection.insertMany(newPermissions);
          }

          reloadTable = true;
          title = 'User Permissions Updated';
          message = `User permissions updated successfully. ${permissionIds.length} permission(s) assigned.`;
          break;
        }

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
        affected: 1,
        title: title,
        message: message
      });

    } catch (error) {
      console.error('❌ SaveEditCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while saving the data.'
      });
    }
  }
}
