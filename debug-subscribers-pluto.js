
const { MongoClient, Long } = require('mongodb');
require('dotenv').config();

async function checkSubscribers() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  
  // CHECK PLUTO DB explicitly
  const db = client.db('pluto'); 
  
  console.log('--- Checking Subscribers in PLUTO DB for Audience 6 ---');
  
  const countNum = await db.collection('subscribers').countDocuments({ audience_id: 6 });
  console.log(`audience_id (Number 6): ${countNum}`);

  const countStr = await db.collection('subscribers').countDocuments({ audience_id: "6" });
  console.log(`audience_id (String "6"): ${countStr}`);

  // Check Long 6
  const countLong = await db.collection('subscribers').countDocuments({ audience_id: Long.fromNumber(6) });
  console.log(`audience_id (Long 6): ${countLong}`);

  client.close();
}

checkSubscribers().catch(console.error);
