const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI_SUN || 'mongodb://localhost:27017';
  const client = await MongoClient.connect(uri);
  const db = client.db('sun');
  const collection = db.collection('master_leads');
  
  console.log('Total Documents:', await collection.countDocuments({}));
  console.log('Documents where deleted_at exists:', await collection.countDocuments({deleted_at: {$exists: true}}));
  console.log('Documents where deleted_at does NOT exist:', await collection.countDocuments({deleted_at: {$exists: false}}));
  console.log('Documents where deleted_at is null:', await collection.countDocuments({deleted_at: null}));
  console.log('Documents where deleted_at is NOT null:', await collection.countDocuments({deleted_at: {$ne: null}}));
  
  process.exit(0);
}

run().catch(console.error);
