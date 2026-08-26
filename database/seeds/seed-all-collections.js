/**
 * MongoDB Seed: Populate all collections with initial data
 * This script seeds all collections based on Prisma schema
 * Run after migration: npm run db:seed-all
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

async function seedAllCollections() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}\n`);
    
    const now = new Date();
    
    // ============================================
    // 1. ROLES - Create basic roles first
    // ============================================
    console.log('📝 Seeding roles...');
    const rolesCollection = db.collection('roles');
    
    const roles = [
      {
        role_id: 'ROL_DEV_001',
        name: 'Developer',
        description: 'System developer with full access',
        parent_role_id: null,
        is_system_role: true,
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        role_id: 'ROL_ADMIN_001',
        name: 'Administrator',
        description: 'System administrator',
        parent_role_id: null,
        is_system_role: true,
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        role_id: 'ROL_USER_001',
        name: 'User',
        description: 'Regular user',
        parent_role_id: null,
        is_system_role: false,
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const role of roles) {
      const existing = await rolesCollection.findOne({ role_id: role.role_id });
      if (!existing) {
        await rolesCollection.insertOne(role);
        console.log(`   ✅ Created role: ${role.name}`);
      } else {
        console.log(`   ⏭️  Role already exists: ${role.name}`);
      }
    }
    
    // ============================================
    // 2. PERMISSIONS - Create basic permissions
    // ============================================
    console.log('\n📝 Seeding permissions...');
    const permissionsCollection = db.collection('permissions');
    
    const permissions = [
      {
        permission_id: 'PERM_DEV_001',
        name: 'developer.access',
        description: 'Access to developer tools',
        is_approved: true,
        is_skeleton: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        permission_id: 'PERM_ADMIN_001',
        name: 'admin.access',
        description: 'Access to admin panel',
        is_approved: true,
        is_skeleton: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        permission_id: 'PERM_USER_001',
        name: 'user.access',
        description: 'Basic user access',
        is_approved: true,
        is_skeleton: false,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        permission_id: 'PERM_TOKEN_CREATE',
        name: 'token.create',
        description: 'Create tokens',
        is_approved: true,
        is_skeleton: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        permission_id: 'PERM_TOKEN_VIEW',
        name: 'token.view',
        description: 'View tokens',
        is_approved: true,
        is_skeleton: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const permission of permissions) {
      const existing = await permissionsCollection.findOne({ permission_id: permission.permission_id });
      if (!existing) {
        await permissionsCollection.insertOne(permission);
        console.log(`   ✅ Created permission: ${permission.name}`);
      } else {
        console.log(`   ⏭️  Permission already exists: ${permission.name}`);
      }
    }
    
    // ============================================
    // 3. ROLE_PERMISSIONS - Assign permissions to roles
    // ============================================
    console.log('\n📝 Seeding role_permissions...');
    const rolePermissionsCollection = db.collection('role_permissions');
    
    const rolePermissions = [
      { role_id: 'ROL_DEV_001', permission_id: 'PERM_DEV_001' },
      { role_id: 'ROL_DEV_001', permission_id: 'PERM_TOKEN_CREATE' },
      { role_id: 'ROL_DEV_001', permission_id: 'PERM_TOKEN_VIEW' },
      { role_id: 'ROL_ADMIN_001', permission_id: 'PERM_ADMIN_001' },
      { role_id: 'ROL_ADMIN_001', permission_id: 'PERM_TOKEN_VIEW' },
      { role_id: 'ROL_USER_001', permission_id: 'PERM_USER_001' }
    ];
    
    for (const rp of rolePermissions) {
      const existing = await rolePermissionsCollection.findOne({
        role_id: rp.role_id,
        permission_id: rp.permission_id
      });
      if (!existing) {
        await rolePermissionsCollection.insertOne({
          ...rp,
          is_active: true,
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          created_at: now,
          updated_at: now
        });
        console.log(`   ✅ Assigned permission to role`);
      } else {
        console.log(`   ⏭️  Role permission already exists`);
      }
    }
    
    // ============================================
    // 4. SYSTEMS - Create systems
    // ============================================
    console.log('\n📝 Seeding systems...');
    const systemsCollection = db.collection('systems');
    
    // Define systems to seed
    const systems = [
      {
        business_id: 'CENTRAL',
        system: 'central',
        name: 'Central Management System',
        database: 'nextjs_stu',
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now,
        deleted_at: null
      },
      {
        business_id: 'BIZ0001',
        system: 'business',
        name: 'Tata Tech ERP',
        database: 'tatadb',
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now,
        deleted_at: null
      },
      {
        business_id: 'BIZ0002',
        system: 'business',
        name: 'Infosys Core System',
        database: 'infosys',
        is_active: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    ];
    
    // Insert systems (skip if already exists)
    for (const system of systems) {
      const existingSystem = await systemsCollection.findOne({ 
        business_id: system.business_id 
      });
      
      if (!existingSystem) {
        await systemsCollection.insertOne(system);
        console.log(`   ✅ Created system: ${system.name} (${system.business_id})`);
      } else {
        console.log(`   ⏭️  System already exists: ${system.name} (${system.business_id})`);
      }
    }
    
    // ============================================
    // 5. USERS - Create admin user
    // ============================================
    console.log('\n📝 Seeding users...');
    const usersCollection = db.collection('users');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const adminUser = {
      user_id: 'USR_ADMIN_001',
      business_id: 'CENTRAL',
      username: 'admin',
      email: 'admin@example.com',
      phone: null,
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      profile: null,
      cover: null,
      settings: null,
      role: 'admin',
      fcm_device_token: null,
      verification_token: null,
      verification_token_expires_at: null,
      email_verified_at: now,
      two_factor: 'disabled',
      max_logins: null,
      two_factor_via: null,
      two_factor_secret: null,
      two_factor_recovery_codes: null,
      two_factor_confirmed_at: null,
      failed_login_attempts: 0,
      locked_at: null,
      last_password_changed_at: now,
      session_token: null,
      remember_token: null,
      last_login_at: null,
      is_online: null,
      account_status: 'active',
      created_by: 'SYSTEM',
      updated_by: 'SYSTEM',
      deleted_at: null,
      created_at: now,
      updated_at: now
    };
    
    const existingUser = await usersCollection.findOne({
      $or: [
        { username: 'admin' },
        { email: 'admin@example.com' }
      ]
    });
    
    if (!existingUser) {
      await usersCollection.insertOne(adminUser);
      console.log(`   ✅ Created admin user: ${adminUser.username}`);
      console.log(`   📧 Email: ${adminUser.email}`);
      console.log(`   🔑 Password: password123`);
    } else {
      console.log(`   ⏭️  Admin user already exists`);
    }
    
    // ============================================
    // 6. USER_ROLES - Assign roles to admin user
    // ============================================
    console.log('\n📝 Seeding user_roles...');
    const userRolesCollection = db.collection('user_roles');
    
    const userRoles = [
      {
        user_id: 'USR_ADMIN_001',
        role_id: 'ROL_DEV_001',
        assigned_by: 'SYSTEM',
        is_active: true,
        scope_id: null,
        notes: 'System assigned developer role',
        valid_from: now,
        valid_until: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        user_id: 'USR_ADMIN_001',
        role_id: 'ROL_ADMIN_001',
        assigned_by: 'SYSTEM',
        is_active: true,
        scope_id: null,
        notes: 'System assigned admin role',
        valid_from: now,
        valid_until: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const ur of userRoles) {
      const existing = await userRolesCollection.findOne({
        user_id: ur.user_id,
        role_id: ur.role_id
      });
      if (!existing) {
        await userRolesCollection.insertOne(ur);
        console.log(`   ✅ Assigned role to user`);
      } else {
        console.log(`   ⏭️  User role already exists`);
      }
    }
    
    // ============================================
    // 7. USER_PERMISSIONS - Assign all permissions to admin
    // ============================================
    console.log('\n📝 Seeding user_permissions...');
    const userPermissionsCollection = db.collection('user_permissions');
    
    const allPermissions = await permissionsCollection.find({}).toArray();
    for (const permission of allPermissions) {
      const existing = await userPermissionsCollection.findOne({
        user_id: 'USR_ADMIN_001',
        permission_id: permission.permission_id
      });
      if (!existing) {
        await userPermissionsCollection.insertOne({
          user_id: 'USR_ADMIN_001',
          permission_id: permission.permission_id,
          is_active: true,
          is_restricted: false,
          scope_id: null,
          valid_from: null,
          valid_until: null,
          created_by: 'SYSTEM',
          updated_by: 'SYSTEM',
          created_at: now,
          updated_at: now
        });
      }
    }
    console.log(`   ✅ Assigned ${allPermissions.length} permissions to admin user`);
    
    // ============================================
    // 8. SKELETON_MODULES - Create default modules
    // ============================================
    console.log('\n📝 Seeding skeleton_modules...');
    const skeletonModulesCollection = db.collection('skeleton_modules');
    
    const modules = [
      {
        module_id: 'MOD_DEV_001',
        name: 'developer',
        display: 'Developer Mode',
        system: 'central',
        icon: 'cil-code',
        order: 1,
        is_navigable: true,
        is_approved: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        module_id: 'MOD_ADMIN_001',
        name: 'administration',
        display: 'Administration',
        system: 'central',
        icon: 'cil-settings',
        order: 2,
        is_navigable: true,
        is_approved: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const module of modules) {
      const existing = await skeletonModulesCollection.findOne({ module_id: module.module_id });
      if (!existing) {
        await skeletonModulesCollection.insertOne(module);
        console.log(`   ✅ Created module: ${module.display}`);
      } else {
        console.log(`   ⏭️  Module already exists: ${module.display}`);
      }
    }
    
    // ============================================
    // 9. SKELETON_SECTIONS - Create sections for modules
    // ============================================
    console.log('\n📝 Seeding skeleton_sections...');
    const skeletonSectionsCollection = db.collection('skeleton_sections');
    
    const sections = [
      {
        section_id: 'SEC_TOKENS_001',
        module_id: 'MOD_DEV_001',
        name: 'tokens',
        display: 'Token Management',
        icon: 'cil-list',
        order: 1,
        is_navigable: true,
        is_approved: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        section_id: 'SEC_MODULES_001',
        module_id: 'MOD_DEV_001',
        name: 'modules',
        display: 'Module Management',
        icon: 'cil-puzzle',
        order: 2,
        is_navigable: true,
        is_approved: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        section_id: 'SEC_SECTIONS_001',
        module_id: 'MOD_DEV_001',
        name: 'sections',
        display: 'Section Management',
        icon: 'cil-folder',
        order: 3,
        is_navigable: true,
        is_approved: true,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const section of sections) {
      const existing = await skeletonSectionsCollection.findOne({ section_id: section.section_id });
      if (!existing) {
        await skeletonSectionsCollection.insertOne(section);
        console.log(`   ✅ Created section: ${section.display}`);
      } else {
        console.log(`   ⏭️  Section already exists: ${section.display}`);
      }
    }
    
    // ============================================
    // 10. SKELETON_TOKENS - Create default tokens
    // ============================================
    console.log('\n📝 Seeding skeleton_tokens...');
    const skeletonTokensCollection = db.collection('skeleton_tokens');
    
    const tokens = [
      {
        key: 'central_skeleton_tokens',
        module: 'developer',
        system: 'central',
        type: 'data',
        table: 'skeleton_tokens',
        column: 'id',
        value: '',
        validate: false,
        act: 'id',
        actions: 'cved',
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        key: 'central_skeleton_modules',
        module: 'developer',
        system: 'central',
        type: 'data',
        table: 'skeleton_modules',
        column: 'module_id',
        value: '',
        validate: false,
        act: 'module_id',
        actions: 'cved',
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        key: 'central_skeleton_sections',
        module: 'developer',
        system: 'central',
        type: 'data',
        table: 'skeleton_sections',
        column: 'section_id',
        value: '',
        validate: false,
        act: 'section_id',
        actions: 'cved',
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      },
      {
        key: 'central_skeleton_items',
        module: 'developer',
        system: 'central',
        type: 'data',
        table: 'skeleton_items',
        column: 'item_id',
        value: '',
        validate: false,
        act: 'item_id',
        actions: 'cved',
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: now,
        updated_at: now
      }
    ];
    
    for (const token of tokens) {
      const existing = await skeletonTokensCollection.findOne({ key: token.key });
      if (!existing) {
        await skeletonTokensCollection.insertOne(token);
        console.log(`   ✅ Created token: ${token.key}`);
      } else {
        console.log(`   ⏭️  Token already exists: ${token.key}`);
      }
    }
    
    // ============================================
    // Summary
    // ============================================
    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Roles: 3 created');
    console.log('   ✅ Permissions: 5 created');
    console.log('   ✅ Role Permissions: Assigned');
    console.log('   ✅ Systems: 3 created (CENTRAL, BIZ0001, BIZ0002)');
    console.log('   ✅ Users: 1 admin user created');
    console.log('   ✅ User Roles: Assigned');
    console.log('   ✅ User Permissions: All assigned to admin');
    console.log('   ✅ Skeleton Modules: 2 created');
    console.log('   ✅ Skeleton Sections: 3 created');
    console.log('   ✅ Skeleton Tokens: 4 created');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('   Username: admin');
    console.log('   Email: admin@example.com');
    console.log('   Password: password123');
    console.log('\n✨ Your database is now seeded and ready to use!');
    
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

seedAllCollections()
  .then(() => {
    console.log('✅ Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

