/**
 * Test script: Register Gmail watch for ONE account
 * Usage: node test-single-watch.js
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');
const GmailWatcherService = require('./src/application/Services/GmailWatcherService');

async function test() {
  const client = new MongoClient(process.env.PLUTO_MONGODB_URI);
  await client.connect();
  const db = client.db('pluto');

  const watcher = new GmailWatcherService(db);

  // Pick ONE GSuite account to test
  const account = await db.collection('email_accounts').findOne({
    type: 'google',
    status: { $in: ['active', 'connected'] }
  });

  if (!account) {
    console.log('❌ No active Google account found in email_accounts collection');
    await client.close();
    return;
  }

  console.log(`Testing watch for: ${account.email}`);

  try {
    const result = await watcher.startWatch(account);
    console.log('✅ Watch registered successfully!');
    console.log(`   historyId: ${result.historyId}`);
    console.log(`   expiration: ${new Date(parseInt(result.expiration, 10)).toISOString()}`);
    console.log('');
    console.log('Now send a test email to this account.');
    console.log('The gmail-pubsub-worker should detect it within seconds!');
  } catch (err) {
    console.error('❌ Watch failed:', err.message);
  }

  await client.close();
}

test().catch(console.error);
