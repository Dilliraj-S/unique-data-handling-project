const { MongoClient } = require('mongodb');
require('dotenv').config();

async function forceReset() {
  const uri = process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon';
  console.log(`Connecting to ${uri}...`);
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('moon');
    console.log('Connected to moon database.');
    
    const migrationName = '015_moon_create_master_copy_collection';
    
    // 1. Delete migration record
    const result = await db.collection('migrations').deleteOne({ name: migrationName });
    console.log(`Deleted migration record for '${migrationName}': ${result.deletedCount} document(s) deleted.`);
    
    // 2. Drop collection if exists (to be clean)
    const collections = await db.listCollections({ name: 'master_copy' }).toArray();
    if (collections.length > 0) {
      await db.dropCollection('master_copy');
      console.log('Dropped existing master_copy collection.');
    } else {
      console.log('master_copy collection does not exist.');
    }
    
    console.log('READY to re-migrate.');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

forceReset();
