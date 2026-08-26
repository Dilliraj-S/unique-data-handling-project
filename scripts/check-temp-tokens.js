/**
 * Check and update skeleton_tokens for temp collections
 * Run: node scripts/check-temp-tokens.js
 */
const { MongoClient } = require('mongodb');

const getMongoUri = () => {
  return process.env.PLUTO_MONGODB_URI || 
         process.env.MONGODB_URI || 
         'mongodb://localhost:27017';
};

async function main() {
  const client = new MongoClient(getMongoUri());
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('nextjs_stu');
    const tokensCollection = db.collection('skeleton_tokens');
    
    // Check existing temp tokens
    console.log('\n📋 Checking temp_master_leads tokens...');
    const tempLeadsTokens = await tokensCollection.find({
      key: { $regex: 'temp_master_leads' }
    }).toArray();
    
    console.log(`Found ${tempLeadsTokens.length} tokens:`);
    tempLeadsTokens.forEach(t => {
      console.log(`  - ${t.key}: table=${t.table}, system=${t.system}, module=${t.module}`);
    });
    
    // Check if base token exists
    const baseToken = await tokensCollection.findOne({ key: 'central_filters_temp_master_leads' });
    
    if (!baseToken) {
      console.log('\n⚠️  Base token central_filters_temp_master_leads NOT FOUND!');
      console.log('Creating token...');
      
      // Get the master_leads token as template
      const masterToken = await tokensCollection.findOne({ key: 'central_filters_master_leads' });
      
      if (masterToken) {
        const newToken = {
          ...masterToken,
          _id: undefined, // Will be auto-generated
          key: 'central_filters_temp_master_leads',
          table: 'temp_master_leads',
          created_at: new Date(),
          updated_at: new Date()
        };
        delete newToken._id;
        
        await tokensCollection.insertOne(newToken);
        console.log('✅ Created central_filters_temp_master_leads token');
      } else {
        console.log('❌ Cannot find master_leads token to use as template');
      }
    } else {
      console.log('\n✅ Base token exists:', baseToken.key);
      console.log('   table:', baseToken.table);
      console.log('   system:', baseToken.system);
      console.log('   module:', baseToken.module);
      
      // Update if table is wrong
      if (baseToken.table !== 'temp_master_leads') {
        console.log('\n⚠️  Table is incorrect, updating to temp_master_leads...');
        await tokensCollection.updateOne(
          { key: 'central_filters_temp_master_leads' },
          { $set: { table: 'temp_master_leads', updated_at: new Date() } }
        );
        console.log('✅ Token updated');
      }
    }
    
    // Same for temp_master_accounts
    console.log('\n📋 Checking temp_master_accounts tokens...');
    const tempAccountsTokens = await tokensCollection.find({
      key: { $regex: 'temp_master_accounts' }
    }).toArray();
    
    console.log(`Found ${tempAccountsTokens.length} tokens:`);
    tempAccountsTokens.forEach(t => {
      console.log(`  - ${t.key}: table=${t.table}, system=${t.system}, module=${t.module}`);
    });
    
    const baseAccountsToken = await tokensCollection.findOne({ key: 'central_filters_temp_master_accounts' });
    
    if (!baseAccountsToken) {
      console.log('\n⚠️  Base token central_filters_temp_master_accounts NOT FOUND!');
      console.log('Creating token...');
      
      const masterAccountsToken = await tokensCollection.findOne({ key: 'central_filters_master_accounts' });
      
      if (masterAccountsToken) {
        const newToken = {
          ...masterAccountsToken,
          _id: undefined,
          key: 'central_filters_temp_master_accounts',
          table: 'temp_master_accounts',
          created_at: new Date(),
          updated_at: new Date()
        };
        delete newToken._id;
        
        await tokensCollection.insertOne(newToken);
        console.log('✅ Created central_filters_temp_master_accounts token');
      } else {
        console.log('❌ Cannot find master_accounts token to use as template');
      }
    } else {
      console.log('\n✅ Base token exists:', baseAccountsToken.key);
      
      if (baseAccountsToken.table !== 'temp_master_accounts') {
        console.log('\n⚠️  Table is incorrect, updating...');
        await tokensCollection.updateOne(
          { key: 'central_filters_temp_master_accounts' },
          { $set: { table: 'temp_master_accounts', updated_at: new Date() } }
        );
        console.log('✅ Token updated');
      }
    }
    
    console.log('\n✨ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
