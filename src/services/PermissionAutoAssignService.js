import { getCollection } from '../lib/mongodb';

/**
 * PermissionAutoAssignService - Automatically generates and assigns permissions
 * - When a new module/section is created: generates permissions and assigns view permissions to all users
 * - When a new user is created: assigns all view permissions
 */
class PermissionAutoAssignService {
  /**
   * Generate unique permission_id
   */
  static generatePermissionId(prefix = 'PERM') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Generate permissions for a module
   * @param {string} moduleName - Module name
   * @returns {Promise<Array<string>>} Array of generated permission IDs
   */
  static async generateModulePermissions(moduleName) {
    try {
      const permissionsCollection = await getCollection('permissions');
      const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];
      const generatedPermissionIds = [];
      const now = new Date();

      for (const permType of permissionTypes) {
        const permName = `${permType}:${moduleName}`;
        
        // Check if permission already exists
        const existing = await permissionsCollection.findOne({ name: permName });
        if (existing) {
          console.log(`   ⏭️  Permission already exists: ${permName}`);
          generatedPermissionIds.push(existing.permission_id);
          continue;
        }
        
        const permissionId = this.generatePermissionId('PERM');
        await permissionsCollection.insertOne({
          permission_id: permissionId,
          name: permName,
          is_approved: true,
          is_skeleton: 1,
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          created_at: now,
          updated_at: now,
          deleted_at: null
        });
        
        console.log(`   ✅ Generated permission: ${permName} (${permissionId})`);
        generatedPermissionIds.push(permissionId);
      }

      return generatedPermissionIds;
    } catch (error) {
      console.error('❌ Error generating module permissions:', error);
      throw error;
    }
  }

  /**
   * Generate permissions for a section
   * @param {string} moduleName - Module name
   * @param {string} sectionName - Section name
   * @returns {Promise<Array<string>>} Array of generated permission IDs
   */
  static async generateSectionPermissions(moduleName, sectionName) {
    try {
      const permissionsCollection = await getCollection('permissions');
      const permissionTypes = ['create', 'view', 'edit', 'delete', 'import', 'export'];
      const generatedPermissionIds = [];
      const now = new Date();

      for (const permType of permissionTypes) {
        const permName = `${permType}:${moduleName}::${sectionName}`;
        
        // Check if permission already exists
        const existing = await permissionsCollection.findOne({ name: permName });
        if (existing) {
          console.log(`   ⏭️  Permission already exists: ${permName}`);
          generatedPermissionIds.push(existing.permission_id);
          continue;
        }
        
        const permissionId = this.generatePermissionId('PERM');
        await permissionsCollection.insertOne({
          permission_id: permissionId,
          name: permName,
          is_approved: true,
          is_skeleton: 1,
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          created_at: now,
          updated_at: now,
          deleted_at: null
        });
        
        console.log(`   ✅ Generated permission: ${permName} (${permissionId})`);
        generatedPermissionIds.push(permissionId);
      }

      return generatedPermissionIds;
    } catch (error) {
      console.error('❌ Error generating section permissions:', error);
      throw error;
    }
  }

  /**
   * Assign view permissions to all existing users
   * @param {Array<string>} permissionIds - Array of permission IDs to assign
   * @returns {Promise<Object>} Result with assigned count
   */
  static async assignViewPermissionsToAllUsers(permissionIds) {
    try {
      if (!permissionIds || permissionIds.length === 0) {
        return { success: true, assigned: 0, message: 'No permissions to assign' };
      }

      const usersCollection = await getCollection('users');
      const userPermissionsCollection = await getCollection('user_permissions');
      const permissionsCollection = await getCollection('permissions');

      // Get only view permissions
      const viewPermissions = await permissionsCollection.find({
        permission_id: { $in: permissionIds },
        name: { $regex: /^view:/ },
        is_approved: true
      }).toArray();

      if (viewPermissions.length === 0) {
        console.log('   ⚠️  No view permissions found to assign');
        return { success: true, assigned: 0, message: 'No view permissions to assign' };
      }

      const viewPermissionIds = viewPermissions.map(p => p.permission_id);
      console.log(`   📋 Found ${viewPermissionIds.length} view permissions to assign`);

      // Get all active users
      const allUsers = await usersCollection.find({
        account_status: 'active',
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).toArray();

      if (allUsers.length === 0) {
        console.log('   ⚠️  No active users found');
        return { success: true, assigned: 0, message: 'No active users found' };
      }

      console.log(`   👥 Assigning permissions to ${allUsers.length} users...`);

      const now = new Date();
      const permissionsToInsert = [];

      for (const user of allUsers) {
        const userId = user.user_id || user._id?.toString();
        if (!userId) continue;

        for (const permId of viewPermissionIds) {
          // Check if permission already exists for this user
          const existing = await userPermissionsCollection.findOne({
            user_id: userId,
            permission_id: permId,
            is_active: true
          });

          if (!existing) {
            permissionsToInsert.push({
              user_id: userId,
              permission_id: permId,
              is_restricted: false,
              is_active: true,
              created_by: 'SYSTEM',
              created_at: now,
              updated_at: now
            });
          }
        }
      }

      if (permissionsToInsert.length > 0) {
        await userPermissionsCollection.insertMany(permissionsToInsert, { ordered: false });
        console.log(`   ✅ Assigned ${permissionsToInsert.length} permissions to ${allUsers.length} users`);
      } else {
        console.log(`   ✅ All permissions already assigned to users`);
      }

      return {
        success: true,
        assigned: permissionsToInsert.length,
        users: allUsers.length,
        message: `Assigned ${permissionsToInsert.length} permissions to ${allUsers.length} users`
      };
    } catch (error) {
      console.error('❌ Error assigning permissions to users:', error);
      throw error;
    }
  }

  /**
   * Assign all view permissions to a new user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Result with assigned count
   */
  static async assignAllViewPermissionsToUser(userId) {
    try {
      if (!userId) {
        return { success: false, message: 'User ID is required' };
      }

      const permissionsCollection = await getCollection('permissions');
      const userPermissionsCollection = await getCollection('user_permissions');

      // Get all view permissions
      const allViewPermissions = await permissionsCollection.find({
        name: { $regex: /^view:/ },
        is_approved: true,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      }).toArray();

      if (allViewPermissions.length === 0) {
        console.log(`   ⚠️  No view permissions found in database`);
        return { success: true, assigned: 0, message: 'No view permissions found' };
      }

      console.log(`   📋 Found ${allViewPermissions.length} view permissions to assign`);

      const now = new Date();
      const permissionsToInsert = [];

      for (const permission of allViewPermissions) {
        // Check if permission already exists for this user
        const existing = await userPermissionsCollection.findOne({
          user_id: userId,
          permission_id: permission.permission_id,
          is_active: true
        });

        if (!existing) {
          permissionsToInsert.push({
            user_id: userId,
            permission_id: permission.permission_id,
            is_restricted: false,
            is_active: true,
            created_by: 'SYSTEM',
            created_at: now,
            updated_at: now
          });
        }
      }

      if (permissionsToInsert.length > 0) {
        await userPermissionsCollection.insertMany(permissionsToInsert, { ordered: false });
        console.log(`   ✅ Assigned ${permissionsToInsert.length} view permissions to user ${userId}`);
      } else {
        console.log(`   ✅ All permissions already assigned to user ${userId}`);
      }

      return {
        success: true,
        assigned: permissionsToInsert.length,
        total: allViewPermissions.length,
        message: `Assigned ${permissionsToInsert.length} view permissions to user`
      };
    } catch (error) {
      console.error('❌ Error assigning all permissions to user:', error);
      throw error;
    }
  }
}

export default PermissionAutoAssignService;

