require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';

async function addUsersToken() {
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
      key: 'central_users_addusers' 
    });
    
    if (existingToken) {
      console.log('⚠️  Token already exists: central_users_addusers');
      console.log('Current token data:', JSON.stringify(existingToken, null, 2));
      
      // Update to ensure correct MongoDB values
      const needsUpdate = 
        existingToken.module !== 'querynest' || 
        existingToken.system !== 'central' ||
        existingToken.column !== '_id' ||
        existingToken.act !== '_id' ||
        existingToken.actions !== 'c,v,e,d';
      
      if (needsUpdate) {
        console.log('🔄 Updating token with correct values...');
        const now = new Date();
        const result = await skeletonTokensCollection.updateOne(
          { key: 'central_users_addusers' },
          {
            $set: {
              module: 'querynest',
              system: 'central',
              table: 'users',
              column: '_id',
              value: '',
              act: '_id',
              actions: 'c,v,e,d',
              validate: false,
              updated_at: now,
              updated_by: 'SYSTEM'
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log('✅ Token updated successfully');
        } else {
          console.log('⚠️  Token was not modified');
        }
      } else {
        console.log('✅ Token already has correct values');
      }
      return;
    }
    
    // Create the token entry
    const now = new Date();
    const token = {
      key: 'central_users_addusers',
      module: 'querynest',
      system: 'central',
      type: 'data',
      table: 'users',
      column: '_id',
      value: '',
      act: '_id',
      actions: 'c,v,e,d',
      validate: false,
      created_by: 'SYSTEM',
      updated_by: 'SYSTEM',
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    
    const result = await skeletonTokensCollection.insertOne(token);
    console.log('✅ Created token: central_users_addusers');
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

addUsersToken()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

