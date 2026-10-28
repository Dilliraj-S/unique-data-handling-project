
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function seedBounce() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pluto');

  // get first sequence (trail1)
  const sequences = await db.collection('drift_sequences').find({}).toArray();
  const seq1 = sequences.find(s => s.name.includes('trail1'));
  
  if (!seq1) {
    console.log('trail1 sequence not found');
    return;
  }

  // get a subscriber
  const subscriber = await db.collection('subscribers').findOne({});
  const account = await db.collection('email_accounts').findOne({});
  const template = await db.collection('templates').findOne({});

  if (!subscriber || !account) {
    console.log('Missing data (sub/account)');
    return;
  }

  // Insert a "Hard Bounced" log for seq1
  await db.collection('drift_sequence_logs').insertOne({
    sequence_id: seq1._id,
    set_id: seq1.set_id,
    subscriber_id: subscriber._id,
    email_account_id: account._id,
    template_id: template._id,
    status: 'hardbounce', // <--- THE FILTER TARGET
    batch_size: 10,
    created_at: new Date(),
    updated_at: new Date(),
    sent_at: new Date(),
    message_id: 'seed_bounce_123'
  });

  console.log(`✅ Seeded 1 Hard Bounce for sequence ${seq1.name} (ID: ${seq1._id})`);
  console.log(` Subscriber: ${subscriber.email}`);
  
  client.close();
}

seedBounce().catch(console.error);
