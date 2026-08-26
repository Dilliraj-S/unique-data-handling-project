/**
 * MongoDB Seed: Create sample users
 * This script creates 4 sample user records with role "user"
 * Default password for all users: "password" (hashed with bcrypt)
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

async function seedUsers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}\n`);
    
    const usersCollection = db.collection('users');
    
    // Hash the default password "password" for all users
    const defaultPassword = 'password';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
    console.log('🔐 Password hashed successfully (default password: "password")\n');
    
    // Sample users data
    const usersToInsert = [
      {
        _id: new ObjectId(),
        user_id: 'USR_USER_001',
        username: 'john.doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890',
        business_id: 'BIZ_001',
        role: 'user',
        account_status: 'active',
        two_factor: false,
        failed_login_attempts: 0,
        email_verified_at: new Date(),
        last_login_at: null,
        locked_at: null,
        verification_token: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      },
      {
        _id: new ObjectId(),
        user_id: 'USR_USER_002',
        username: 'jane.smith',
        email: 'jane.smith@example.com',
        password: hashedPassword,
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+1234567891',
        business_id: 'BIZ_001',
        role: 'user',
        account_status: 'active',
        two_factor: false,
        failed_login_attempts: 0,
        email_verified_at: new Date(),
        last_login_at: null,
        locked_at: null,
        verification_token: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      },
      {
        _id: new ObjectId(),
        user_id: 'USR_USER_003',
        username: 'bob.wilson',
        email: 'bob.wilson@example.com',
        password: hashedPassword,
        first_name: 'Bob',
        last_name: 'Wilson',
        phone: '+1234567892',
        business_id: 'BIZ_002',
        role: 'user',
        account_status: 'active',
        two_factor: false,
        failed_login_attempts: 0,
        email_verified_at: new Date(),
        last_login_at: null,
        locked_at: null,
        verification_token: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      },
      {
        _id: new ObjectId(),
        user_id: 'USR_USER_004',
        username: 'alice.brown',
        email: 'alice.brown@example.com',
        password: hashedPassword,
        first_name: 'Alice',
        last_name: 'Brown',
        phone: '+1234567893',
        business_id: 'BIZ_002',
        role: 'user',
        account_status: 'active',
        two_factor: false,
        failed_login_attempts: 0,
        email_verified_at: new Date(),
        last_login_at: null,
        locked_at: null,
        verification_token: null,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null
      }
    ];
    
    // Check which users already exist and filter them out
    const existingUsernames = new Set();
    const existingEmails = new Set();
    const existingUserIds = new Set();
    
    // Check for existing users by username, email, or user_id
    for (const user of usersToInsert) {
      const existingByUsername = await usersCollection.findOne({ username: user.username });
      const existingByEmail = await usersCollection.findOne({ email: user.email });
      const existingByUserId = await usersCollection.findOne({ user_id: user.user_id });
      
      if (existingByUsername) {
        existingUsernames.add(user.username);
      }
      if (existingByEmail) {
        existingEmails.add(user.email);
      }
      if (existingByUserId) {
        existingUserIds.add(user.user_id);
      }
    }
    
    // Filter out users that already exist
    const users = usersToInsert.filter(user => {
      const exists = existingUsernames.has(user.username) || 
                    existingEmails.has(user.email) || 
                    existingUserIds.has(user.user_id);
      if (exists) {
        console.log(`⚠️  Skipping ${user.username} - already exists in database`);
      }
      return !exists;
    });
    
    if (users.length === 0) {
      console.log('\n⚠️  All users already exist in the database. No new users to insert.\n');
      return;
    }
    
    console.log(`\n📝 Inserting ${users.length} new user(s)...\n`);
    
    // Insert only new users
    const result = await usersCollection.insertMany(users);
    
    console.log(`✅ Successfully inserted ${result.insertedCount} user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.user_id})`);
      console.log(`      Name: ${user.first_name} ${user.last_name}`);
      console.log(`      Email: ${user.email}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Business: ${user.business_id}`);
      console.log(`      Status: ${user.account_status}\n`);
    });
    
    console.log('📊 Summary:');
    console.log(`   - New users created: ${result.insertedCount}`);
    console.log(`   - Users skipped (already exist): ${usersToInsert.length - users.length}`);
    console.log(`   - All new users have role: "user"`);
    console.log(`   - All new users have status: "active"`);
    console.log(`   - All new users have verified emails`);
    console.log(`   - Default password for all users: "password" (hashed with bcrypt)`);
    console.log(`   - Users distributed across 2 businesses (BIZ_001, BIZ_002)`);
    
  } catch (error) {
    console.error('❌ Seed error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

seedUsers()
  .then(() => {
    console.log('\n✅ User seed script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ User seed script failed:', error);
    process.exit(1);
  });

