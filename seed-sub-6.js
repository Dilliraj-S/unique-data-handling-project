
const { MongoClient, Long } = require('mongodb');
require('dotenv').config();

async function seedSubscriber() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(); // Default DB

  const audienceId = Long.fromNumber(6);

  await db.collection('subscribers').insertOne({
    email: 'test_audience_6@example.com',
    first_name: 'Test',
    last_name: 'User',
    audience_id: audienceId,
    status: 'subscribed',
    created_at: new Date(),
    updated_at: new Date()
  });

  console.log('✅ Seeded subscriber for Audience 6 matches Long(6)');
  client.close();
}

seedSubscriber().catch(console.error);
