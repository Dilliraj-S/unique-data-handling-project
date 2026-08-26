import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';

/**
 * TableCtrl - Laravel TableCtrl.php equivalent
 * Handles AJAX table data requests
 */
export default class TableCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 TableCtrl::index() called');

      // Extract and validate token from params (set by SystemRouteController)
      const token = req.params?.token || req.body?.skeleton_token;
      
      if (!token) {
        console.warn('⚠️ TableCtrl: No token provided');
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      console.log(`📋 Resolving token: ${token}`);

      // Resolve token configuration
      const reqSet = await SkeletonService.resolveToken(token);

      if (!reqSet || !reqSet.status || !reqSet.key || !reqSet.table) {
        console.error('❌ TableCtrl: Invalid token configuration', reqSet);
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or lacks required configuration.'
        });
      }

      console.log('✅ Token resolved:', { key: reqSet.key, table: reqSet.table });

      // Set view to table and parse filters
      const draw = parseInt(req.body.draw || 1);
      const filters = req.body.skeleton_filters || {};
      
      const page = parseInt(filters.pagination?.page || 1);
      const limit = parseInt(filters.pagination?.limit || 10);
      const skip = (page - 1) * limit;
      const searchValue = filters.search?.value || '';

      // Initialize configuration arrays
      let columns = [];
      let title = '';
      let message = '';

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
          columns = [
            'id', 'key', 'module', 'system', 'type', 'table', 
            'column', 'value', 'act', 'actions', 'updated_at'
          ];
          title = 'Tokens Retrieved';
          message = 'Token configuration data retrieved successfully.';
          break;

        case 'central_skeleton_modules':
          columns = [
            'id', 'module_id', 'system', 'name', 'display', 'icon', 
            'order', 'is_approved', 'is_navigable', 'created_at'
          ];
          title = 'Modules Retrieved';
          message = 'Module configuration data retrieved successfully.';
          break;

        case 'central_skeleton_sections':
          columns = [
            'id', 'section_id', 'module_id', 'name', 'display', 'icon', 
            'order', 'is_approved', 'is_navigable', 'created_at'
          ];
          title = 'Sections Retrieved';
          message = 'Section configuration data retrieved successfully.';
          break;

        case 'central_skeleton_items':
          columns = [
            'id', 'item_id', 'section_id', 'name', 'display', 'icon', 
            'order', 'is_approved', 'is_navigable', 'created_at'
          ];
          title = 'Items Retrieved';
          message = 'Item configuration data retrieved successfully.';
          break;

        case 'central_skeleton_permissions':
          columns = [
            'id', 'permission_id', 'name', 'description', 'is_approved', 
            'is_skeleton', 'created_by', 'updated_by', 'created_at', 'updated_at'
          ];
          title = 'Permissions Retrieved';
          message = 'Permission data retrieved successfully.';
          break;

        case 'central_skeleton_users':
          columns = [
            'id', 'user_id', 'username', 'email', 'first_name', 'last_name', 
            'phone', 'business_id', 'role', 'account_status', 'created_at', 'updated_at'
          ];
          title = 'Users Retrieved';
          message = 'User data retrieved successfully.';
          break;

        case 'central_skeleton_user_permissions':
          columns = [
            'id', 'user_id', 'permission_id', 'is_restricted', 'scope_id', 
            'valid_from', 'valid_until', 'is_active', 'created_at', 'updated_at'
          ];
          title = 'User Permissions Retrieved';
          message = 'User permission data retrieved successfully.';
          break;

        default:
          console.warn(`⚠️ Unsupported table key: "${reqSet.key}"`);
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      // Execute query based on table
      let data = [];
      let recordsTotal = 0;
      let recordsFiltered = 0;

      // Build MongoDB query
      const collectionName = reqSet.table;
      const collection = await getCollection(collectionName);

      // Build where clause
      // Base filter: exclude soft-deleted records (deleted_at is null OR doesn't exist)
      const baseFilter = { 
        $or: [
          { deleted_at: null },
          { deleted_at: { $exists: false } }
        ]
      };

      // Build search conditions if searchValue is provided
      let searchFilter = {};
      if (searchValue) {
        const searchRegex = { $regex: searchValue, $options: 'i' };
        const searchConditions = [];

      switch (reqSet.key) {
        case 'central_skeleton_tokens':
            searchConditions.push(
              { key: searchRegex },
              { module: searchRegex },
              { type: searchRegex }
            );
            break;
          case 'central_skeleton_modules':
            searchConditions.push(
              { name: searchRegex },
              { display: searchRegex },
              { system: searchRegex }
            );
            break;
          case 'central_skeleton_sections':
          case 'central_skeleton_items':
            searchConditions.push(
              { name: searchRegex },
              { display: searchRegex }
            );
            break;
          case 'central_skeleton_permissions':
            searchConditions.push(
              { permission_id: searchRegex },
              { name: searchRegex },
              { description: searchRegex }
            );
            break;
          case 'central_skeleton_users':
            searchConditions.push(
              { user_id: searchRegex },
              { username: searchRegex },
              { email: searchRegex },
              { first_name: searchRegex },
              { last_name: searchRegex },
              { phone: searchRegex }
            );
            break;
          case 'central_skeleton_user_permissions':
            searchConditions.push(
              { user_id: searchRegex },
              { permission_id: searchRegex },
              { scope_id: searchRegex }
            );
            break;
        }

        if (searchConditions.length > 0) {
          searchFilter = { $or: searchConditions };
        }
      }

      // Combine base filter with search filter using $and
      let whereClause = {};
      if (Object.keys(searchFilter).length > 0) {
        whereClause = {
          $and: [
            baseFilter,
            searchFilter
          ]
        };
      } else {
        whereClause = baseFilter;
      }

      // Get total count (without pagination)
      // Match documents where deleted_at is null OR doesn't exist
      recordsTotal = await collection.countDocuments({ 
        $or: [
          { deleted_at: null },
          { deleted_at: { $exists: false } }
        ]
      });
      
      // Get filtered count
      recordsFiltered = searchValue 
        ? await collection.countDocuments(whereClause)
        : recordsTotal;

      // Fetch data with pagination
      const cursor = collection.find(whereClause)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);

      const results = await cursor.toArray();

      // Transform data based on collection type
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
           data = results.map(token => ({
            id: token._id.toString(),
            key: token.key,
            module: token.module,
            system: token.system,
            type: token.type,
            table: token.table,
            column: token.column,
            value: token.value,
            act: token.act,
            actions: token.actions || ''
          }));
          break;

        case 'central_skeleton_modules':
          data = results.map(module => ({
            id: module._id.toString(),
            module_id: module.module_id,
            name: module.name,
            display: module.display,
            system: module.system,
            icon: module.icon,
            order: module.order,
            is_approved: module.is_approved,
            is_navigable: module.is_navigable
          }));
          break;

        case 'central_skeleton_sections':
          // Optionally fetch modules for reference
          const modulesCollection = await getCollection('skeleton_modules');
          const allModules = await modulesCollection.find({}).toArray();
          const moduleMap = {};
          allModules.forEach(m => {
            moduleMap[m.module_id] = m;
          });

          data = results.map(section => ({
            id: section._id.toString(),
            section_id: section.section_id,
            module_id: section.module_id,
            name: section.name,
            display: section.display,
            icon: section.icon,
            order: section.order,
            is_approved: section.is_approved,
            is_navigable: section.is_navigable
          }));
          break;

        case 'central_skeleton_items':
          data = results.map(item => ({
            id: item._id.toString(),
            item_id: item.item_id,
            section_id: item.section_id,
            name: item.name,
            display: item.display,
            icon: item.icon,
            order: item.order,
            is_approved: item.is_approved,
            is_navigable: item.is_navigable
          }));
          break;

        case 'central_skeleton_permissions':
          data = results.map(permission => ({
            id: permission._id.toString(),
            permission_id: permission.permission_id || '',
            name: permission.name || '',
            description: permission.description || '',
            is_approved: permission.is_approved || false,
            is_skeleton: permission.is_skeleton || false,
            created_by: permission.created_by || '',
            updated_by: permission.updated_by || '',
            created_at: permission.created_at ? new Date(permission.created_at).toLocaleString() : '',
            updated_at: permission.updated_at ? new Date(permission.updated_at).toLocaleString() : ''
          }));
          break;

        case 'central_skeleton_users':
          data = results.map(user => ({
            id: user._id.toString(),
            user_id: user.user_id || '',
            username: user.username || '',
            email: user.email || '',
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            phone: user.phone || '',
            business_id: user.business_id || '',
            role: user.role || 'user',
            account_status: user.account_status || 'active',
            created_at: user.created_at ? new Date(user.created_at).toLocaleString() : '',
            updated_at: user.updated_at ? new Date(user.updated_at).toLocaleString() : ''
          }));
          break;

        case 'central_skeleton_user_permissions':
          data = results.map(userPerm => ({
            id: userPerm._id.toString(),
            user_id: userPerm.user_id || '',
            permission_id: userPerm.permission_id || '',
            is_restricted: userPerm.is_restricted || false,
            scope_id: userPerm.scope_id || '',
            valid_from: userPerm.valid_from ? new Date(userPerm.valid_from).toLocaleString() : '',
            valid_until: userPerm.valid_until ? new Date(userPerm.valid_until).toLocaleString() : '',
            is_active: userPerm.is_active !== undefined ? userPerm.is_active : true,
            created_at: userPerm.created_at ? new Date(userPerm.created_at).toLocaleString() : '',
            updated_at: userPerm.updated_at ? new Date(userPerm.updated_at).toLocaleString() : ''
          }));
          break;
      }

      // Generate column definitions
      const columnDefs = {};
      if (data.length > 0) {
        columns.forEach(col => {
          columnDefs[col] = {
            title: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            searchable: true,
            orderable: true
          };
        });
      }

      return res.status(200).json({
        status: true,
        draw: draw,
        data: data,
        recordsTotal: Number(recordsTotal),
        recordsFiltered: Number(recordsFiltered),
        title: title,
        message: message,
        columns: columnDefs
      });

    } catch (error) {
      console.error('❌ TableCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'Failed to retrieve table data.',
        error: error.message
      });
    }
  }
}
