const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMoonDb() {
  const uri = process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon';
  console.log(`Connecting to ${uri}...`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('moon');
    console.log('Connected to moon database.');
    
    // List collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('\nCollections in moon DB:', collectionNames);
    
    const hasMasterCopy = collectionNames.includes('master_copy');
    console.log(`\nmaster_copy collection exists: ${hasMasterCopy ? 'YES' : 'NO'}`);
    
    // Check migrations
    if (collectionNames.includes('migrations')) {
      const migrations = await db.collection('migrations').find({}).toArray();
      console.log('\nExecuted Migrations:');
      migrations.forEach(m => {
        console.log(`- ${m.name} (at ${m.executed_at})`);
      });
      
      const is015Executed = migrations.some(m => m.name === '015_moon_create_master_copy_collection');
      console.log(`\nMigration '015_moon_create_master_copy_collection' record exists: ${is015Executed ? 'YES' : 'NO'}`);
    } else {
      console.log('\nNo migrations collection found.');
    }
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkMoonDb();
