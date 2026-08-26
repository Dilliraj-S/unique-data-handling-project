
const { MongoClient, Long } = require('mongodb');
require('dotenv').config();

async function checkSubscribers() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  // Subscribers are in default DB usually, not Pluto? 
  // Code says: const subscribersCollection = await getCollection('subscribers'); 
  // getCollection defaults to PLUTO_MONGODB_URI if second arg is 'pluto', else MONGODB_URI?
  // Actually getCollection implementation:
  // export const getCollection = async (collectionName, dbName = 'test') => { ... }
  // Wait, commonly 'test' or default.
  // In send.js: const subscribersCollection = await getCollection('subscribers'); -> dbName defaults.
  
  // Let's check default DB first.
  const db = client.db(); 
  
  console.log('--- Checking Subscribers for Audience 6 ---');
  
  // Check exact value 6 (number)
  const countNum = await db.collection('subscribers').countDocuments({ audience_id: 6 });
  console.log(`audience_id (Number 6): ${countNum}`);

  // Check String "6"
  const countStr = await db.collection('subscribers').countDocuments({ audience_id: "6" });
  console.log(`audience_id (String "6"): ${countStr}`);

  // Check Long 6
  const countLong = await db.collection('subscribers').countDocuments({ audience_id: Long.fromNumber(6) });
  console.log(`audience_id (Long 6): ${countLong}`);

  // Sample a subscriber to see structure
  const sample = await db.collection('subscribers').findOne({ audience_id: { $in: [6, "6", Long.fromNumber(6)] } });
  if (sample) {
      console.log('Sample Subscriber:', JSON.stringify(sample, null, 2));
      console.log('Type of audience_id:', typeof sample.audience_id);
      if (sample.audience_id && sample.audience_id._bsontype) {
          console.log('BSON Type:', sample.audience_id._bsontype);
      }
  } else {
      console.log('No subscribers found matching 6/"6"/Long(6)');
      // Dump one random subscriber
      const random = await db.collection('subscribers').findOne({});
      console.log('Random Subscriber:', random ? JSON.stringify(random, null, 2) : 'Collection empty');
  }

  client.close();
}

checkSubscribers().catch(console.error);
