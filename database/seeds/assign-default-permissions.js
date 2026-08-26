/**
 * MongoDB Seed: Assign Default View Permissions to Users
 * This script assigns "view" permissions to all users so they can see modules/sections in the sidebar
 * 
 * Options:
 * 1. Assign all view permissions to all users (full access)
 * 2. Assign only module-level view permissions (shows all modules)
 * 3. Assign specific module/section view permissions
 * 
 * Run: node database/seeds/assign-default-permissions.js
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

// Configuration
const ASSIGN_ALL_VIEW_PERMISSIONS = false; // If true, assigns ALL view permissions. If false, only module-level
const SPECIFIC_MODULES = []; // If empty, assigns to all modules. Example: ['querychain', 'developer']

async function assignDefaultPermissions() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}\n`);
    
    const usersCollection = db.collection('users');
    const permissionsCollection = db.collection('permissions');
    const userPermissionsCollection = db.collection('user_permissions');
    
    // Get all active users
    const users = await usersCollection.find({
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }],
      account_status: 'active'
    }).toArray();
    
    console.log(`👥 Found ${users.length} active users\n`);
    
    if (users.length === 0) {
      console.log('⚠️ No active users found. Create users first.');
      return;
    }
    
    // Get all view permissions
    let viewPermissionsQuery = {
      is_approved: true,
      name: { $regex: /^view:/ }
    };
    
    // Filter by specific modules if specified
    if (SPECIFIC_MODULES.length > 0) {
      const modulePatterns = SPECIFIC_MODULES.map(m => new RegExp(`^view:${m}(::|$)`));
      viewPermissionsQuery.name = {
        $regex: new RegExp(modulePatterns.map(p => p.source).join('|'))
      };
    }
    
    const allViewPermissions = await permissionsCollection.find(viewPermissionsQuery).toArray();
    console.log(`📋 Found ${allViewPermissions.length} view permissions in database\n`);
    
    if (allViewPermissions.length === 0) {
      console.log('⚠️ No view permissions found in database!');
      console.log('💡 Run: npm run db:generate-permissions first');
      return;
    }
    
    // Filter permissions based on configuration
    let permissionsToAssign = [];
    
    if (ASSIGN_ALL_VIEW_PERMISSIONS) {
      // Assign all view permissions
      permissionsToAssign = allViewPermissions;
      console.log('📝 Mode: Assigning ALL view permissions to all users\n');
    } else {
      // Assign only module-level view permissions (e.g., view:querychain, view:developer)
      // Module-level permissions have format: "view:module" (no :: separator)
      permissionsToAssign = allViewPermissions.filter(p => {
        // Module-level: "view:querychain" (no ::)
        // Section-level: "view:querychain::workflows" (one ::)
        // Item-level: "view:querychain::workflows::item" (two ::)
        const parts = p.name.split('::');
        return parts.length === 1; // Only module-level (no :: separator)
      });
      console.log('📝 Mode: Assigning only MODULE-LEVEL view permissions (shows all modules)\n');
      console.log(`   Will assign ${permissionsToAssign.length} module-level permissions`);
      if (permissionsToAssign.length > 0) {
        console.log(`   Permissions: ${permissionsToAssign.map(p => p.name).join(', ')}\n`);
      } else {
        console.log('   ⚠️ No module-level permissions found!\n');
      }
    }
    
    if (permissionsToAssign.length === 0) {
      console.log('⚠️ No permissions to assign based on current configuration.');
      return;
    }
    
    // Process each user
    let totalAssigned = 0;
    let totalSkipped = 0;
    
    for (const user of users) {
      const userId = user.user_id || user.id;
      console.log(`\n👤 Processing user: ${userId} (${user.username || user.email})`);
      
      // Get existing user permissions
      const existingUserPerms = await userPermissionsCollection.find({
        user_id: userId,
        is_active: true
      }).toArray();
      
      const existingPermissionIds = new Set(existingUserPerms.map(up => up.permission_id));
      console.log(`   📦 Currently has ${existingPermissionIds.size} permissions assigned`);
      
      // Find permissions to add (not already assigned)
      const permissionsToAdd = permissionsToAssign.filter(p => !existingPermissionIds.has(p.permission_id));
      
      if (permissionsToAdd.length === 0) {
        console.log(`   ✅ User already has all required permissions. Skipping.`);
        totalSkipped++;
        continue;
      }
      
      console.log(`   ➕ Will add ${permissionsToAdd.length} new permissions`);
      
      // Insert new permissions
      const newPermissions = permissionsToAdd.map(perm => ({
        user_id: userId,
        permission_id: perm.permission_id,
        is_restricted: false,
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      const result = await userPermissionsCollection.insertMany(newPermissions);
      console.log(`   ✅ Added ${result.insertedCount} permissions`);
      totalAssigned += result.insertedCount;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   - Users processed: ${users.length}`);
    console.log(`   - Permissions assigned: ${totalAssigned}`);
    console.log(`   - Users skipped (already had permissions): ${totalSkipped}`);
    console.log(`   - Permission type: ${ASSIGN_ALL_VIEW_PERMISSIONS ? 'ALL view permissions' : 'Module-level view permissions only'}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

assignDefaultPermissions()
  .then(() => {
    console.log('\n✅ Default permissions assignment completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Check the sidebar - modules should now be visible');
    console.log('   3. To customize permissions, go to Users page → Edit icon → Adjust permissions');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Default permissions assignment failed:', error);
    process.exit(1);
  });

