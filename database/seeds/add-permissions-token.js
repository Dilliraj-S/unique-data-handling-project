require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

async function addPermissionsToken() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';
    const db = client.db(dbName);
    
    console.log(`📦 Using database: ${dbName}`);
    
    const skeletonTokensCollection = db.collection('skeleton_tokens');
    
    // Check if token already exists
    const existingToken = await skeletonTokensCollection.findOne({ 
      key: 'central_skeleton_permissions' 
    });
    
    if (existingToken) {
      console.log('⚠️  Token already exists: central_skeleton_permissions');
      console.log('Token data:', JSON.stringify(existingToken, null, 2));
      return;
    }
    
    // Create the token entry
    const now = new Date();
    const token = {
      key: 'central_skeleton_permissions',
      module: 'developer',
      system: 'central',
      type: 'data',
      table: 'permissions',
      column: '_id',
      value: '',
      act: '_id',
      actions: 'v,e,d',
      validate: false,
      created_by: 'SYSTEM',
      updated_by: 'SYSTEM',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    
    const result = await skeletonTokensCollection.insertOne(token);
    console.log('✅ Created token: central_skeleton_permissions');
    console.log('Token ID:', result.insertedId);
    console.log('Token data:', JSON.stringify(token, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

addPermissionsToken()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

