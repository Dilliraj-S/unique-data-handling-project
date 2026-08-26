const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

async function createTestUser() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('🔐 Creating test user...\n');

    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [
        { username: 'admin' },
        { email: 'admin@example.com' }
      ]
    });

    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log(`   Username: admin`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   User ID: ${existingUser.user_id}`);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create user
    const userResult = await usersCollection.insertOne({
      user_id: 'USR_ADMIN_001',
      business_id: 'BUS-DEFAULT',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      account_status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log('✅ Test user created successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: password123');
    console.log('   Email: admin@example.com');
    console.log(`   User ID: USR_ADMIN_001\n`);

    // Try to assign developer role if it exists
    try {
      const rolesCollection = db.collection('roles');
      const developerRole = await rolesCollection.findOne({ name: 'Developer' });

      if (developerRole) {
        const userRolesCollection = db.collection('user_roles');
        await userRolesCollection.insertOne({
          user_id: 'USR_ADMIN_001',
          role_id: developerRole.role_id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log('✅ Assigned Developer role to user\n');
      }
    } catch (roleError) {
      console.log('⚠️  Could not assign role:', roleError.message);
    }

    // Try to assign all permissions if they exist
    try {
      const permissionsCollection = db.collection('permissions');
      const allPermissions = await permissionsCollection.find({}).toArray();
      
      if (allPermissions.length > 0) {
        const userPermissionsCollection = db.collection('user_permissions');
        const permissionInserts = allPermissions.map(perm => ({
          user_id: 'USR_ADMIN_001',
          permission_id: perm.permission_id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        }));

        await userPermissionsCollection.insertMany(permissionInserts);
        console.log(`✅ Assigned ${allPermissions.length} permissions to user\n`);
      }
    } catch (permError) {
      console.log('⚠️  Could not assign permissions:', permError.message);
    }

    console.log('🎉 Test user setup complete!\n');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await client.close();
  }
}

createTestUser()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
