
const { MongoClient, ObjectId, Long } = require('mongodb');
require('dotenv').config();

async function checkPlutoData() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pluto');
  
  console.log('--- Checking Email Accounts in PLUTO ---');
  const accounts = await db.collection('email_accounts').find({}).limit(5).toArray();
  if (accounts.length > 0) {
      console.log(`Found ${accounts.length} accounts. Sample email: ${accounts[0].email}`);
      console.log('Sample account:', JSON.stringify(accounts[0], null, 2));
      const activeCount = await db.collection('email_accounts').countDocuments({ status: 'active' });
      console.log(`Total Active Accounts: ${activeCount}`);
  } else {
      console.log('No email accounts found in pluto.');
  }

  console.log('--- Checking Templates in PLUTO ---');
  // Check if template 9 exists
  const t9 = await db.collection('templates').findOne({ id: 9 });
  const t9Long = await db.collection('templates').findOne({ id: Long.fromNumber(9) });
  const t9Obj = await db.collection('templates').findOne({ _id: new ObjectId("000000000000000000000009") }).catch(e=>null);

  if (t9) console.log('Found Template 9 (Number search):', t9._id);
  if (t9Long) console.log('Found Template 9 (Long search):', t9Long._id);
  
  const sampleTemplate = await db.collection('templates').findOne({});
  if (sampleTemplate) {
      console.log('Sample Template ID Type:', typeof sampleTemplate._id);
      console.log('Sample Template ID:', sampleTemplate._id);
  }

  client.close();
}

checkPlutoData().catch(console.error);
