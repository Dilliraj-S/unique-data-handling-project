import { getCollection } from '../lib/mongodb';

/**
 * PermissionService - Handles permission loading and saving
 * Based on Hello Kuppam's SkeletonService::loadPermissions
 */
class PermissionService {
  /**
   * Load permissions structure for a user
   * Returns hierarchical structure: Module -> Section -> Item -> Permissions
   * 
   * @param {string} userId - User ID
   * @param {string} businessId - Business ID (for scope, default: 'CENTRAL')
   * @returns {Promise<Object>} Permission structure
   */
  static async loadUserPermissions(userId, businessId = 'CENTRAL') {
    try {
      // 1. Fetch all modules, sections, items
      const modulesCollection = await getCollection('skeleton_modules');
      const sectionsCollection = await getCollection('skeleton_sections');
      const itemsCollection = await getCollection('skeleton_items');
      const permissionsCollection = await getCollection('permissions');
      const userPermissionsCollection = await getCollection('user_permissions');

      const allModules = await modulesCollection.find({
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).toArray();

      const allSections = await sectionsCollection.find({
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).toArray();

      const allItems = await itemsCollection.find({
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).toArray();

      // 2. Fetch user's existing permissions
      const existingUserPerms = await userPermissionsCollection.find({
        user_id: userId,
        is_active: true
      }).toArray();

      const existingPermissionIds = new Set(
        existingUserPerms.map(up => up.permission_id).filter(Boolean)
      );

      // 3. Build permission structure
      const viewPermissions = {};
      const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];

      for (const module of allModules) {
        const moduleName = module.name;
        if (!viewPermissions[moduleName]) {
          viewPermissions[moduleName] = { permissions: {} };
        }

        // Module-level permissions
        for (const permType of permissionTypes) {
          const permName = `${permType}:${moduleName}`;
          const permission = await permissionsCollection.findOne({
            name: permName,
            is_approved: true
          });

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
          if (!viewPermissions[moduleName][sectionName]) {
            viewPermissions[moduleName][sectionName] = { permissions: {} };
          }

          for (const permType of permissionTypes) {
            const permName = `${permType}:${moduleName}::${sectionName}`;
            const permission = await permissionsCollection.findOne({
              name: permName,
              is_approved: true
            });

            if (permission) {
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
            if (!viewPermissions[moduleName][sectionName][itemName]) {
              viewPermissions[moduleName][sectionName][itemName] = { permissions: {} };
            }

            for (const permType of permissionTypes) {
              const permName = `${permType}:${moduleName}::${sectionName}::${itemName}`;
              const permission = await permissionsCollection.findOne({
                name: permName,
                is_approved: true
              });

              if (permission) {
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

      return {
        viewPermissions,
        existingPermissions: Array.from(existingPermissionIds),
        userId: userId
      };
    } catch (error) {
      console.error('❌ Error loading user permissions:', error);
      throw error;
    }
  }

  /**
   * Save user permissions
   * 
   * @param {string} userId - User ID
   * @param {Array<string>} permissionIds - Array of permission IDs to assign
   * @param {string} createdBy - User who created the permissions
   * @returns {Promise<Object>} Save result
   */
  static async saveUserPermissions(userId, permissionIds, createdBy = 'SYSTEM') {
    try {
      const userPermissionsCollection = await getCollection('user_permissions');

      // Delete existing active permissions for this user
      await userPermissionsCollection.deleteMany({
        user_id: userId,
        is_active: true
      });

      // Insert new permissions
      if (permissionIds.length > 0) {
        const newPermissions = permissionIds.map(permId => ({
          user_id: userId,
          permission_id: permId,
          is_restricted: false,
          is_active: true,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await userPermissionsCollection.insertMany(newPermissions);
      }

      return {
        success: true,
        message: `User permissions updated successfully. ${permissionIds.length} permission(s) assigned.`
      };
    } catch (error) {
      console.error('❌ Error saving user permissions:', error);
      throw error;
    }
  }

  /**
   * Get user's view permissions (for navigation filtering)
   * Returns a Set of permission names that user has view access to
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Set<string>>} Set of view permission names
   */
  static async getUserViewPermissions(userId) {
    try {
      console.log(`🔍 Fetching view permissions for user: ${userId}`);
      
      const userPermissionsCollection = await getCollection('user_permissions');
      const permissionsCollection = await getCollection('permissions');
      
      const userPerms = await userPermissionsCollection.find({
        user_id: userId,
        is_active: true
      }).toArray();

      console.log(`📦 Found ${userPerms.length} user_permissions records for user ${userId}`);

      const permissionIds = new Set(userPerms.map(up => up.permission_id));
      
      if (permissionIds.size === 0) {
        console.log(`⚠️ User ${userId} has no permissions assigned in user_permissions collection`);
        console.log('💡 To fix: Go to Users page → Click Edit icon → Assign permissions');
        return new Set();
      }

      console.log(`🔍 Looking up ${permissionIds.size} permission IDs in permissions collection`);

      const permissions = await permissionsCollection.find({
        permission_id: { $in: Array.from(permissionIds) },
        is_approved: true,
        name: { $regex: /^view:/ }
      }).toArray();

      console.log(`✅ Found ${permissions.length} view permissions for user ${userId}`);
      
      const viewPermNames = new Set(permissions.map(p => p.name));
      console.log(`📋 View permission names:`, Array.from(viewPermNames));

      return viewPermNames;
    } catch (error) {
      console.error('❌ Error getting user view permissions:', error);
      return new Set();
    }
  }
}

export default PermissionService;

