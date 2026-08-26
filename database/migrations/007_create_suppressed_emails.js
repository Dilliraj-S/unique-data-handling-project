/**
 * Migration: Create suppressed_emails collection with indexes
 * 
 * This migration sets up the email suppression infrastructure
 * for the real-time email sync system.
 * 
 * Run: node database/migrations/007_create_suppressed_emails.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function migrate() {
  const uri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('pluto');
    console.log('🔧 Running migration: 007_create_suppressed_emails');

    // ─── 1. Create suppressed_emails collection ──────────────────────
    const collections = await db.listCollections({ name: 'suppressed_emails' }).toArray();
    if (collections.length === 0) {
      await db.createCollection('suppressed_emails');
      console.log('✅ Created collection: suppressed_emails');
    } else {
      console.log('ℹ️  Collection already exists: suppressed_emails');
    }

    const suppressedCol = db.collection('suppressed_emails');

    // ─── 2. Create indexes on suppressed_emails ──────────────────────

    // Primary lookup: is this email suppressed?
    await suppressedCol.createIndex(
      { email: 1, active: 1 },
      { unique: true, name: 'idx_email_active' }
    );
    console.log('✅ Index created: suppressed_emails.idx_email_active (unique)');

    // Filter by reason + sort by date
    await suppressedCol.createIndex(
      { reason: 1, suppressed_at: -1 },
      { name: 'idx_reason_date' }
    );
    console.log('✅ Index created: suppressed_emails.idx_reason_date');

    // ─── 3. Add indexes on existing collections ──────────────────────

    // subscribers: fast skip of suppressed during dispatch
    const subscribersCol = db.collection('subscribers');
    await subscribersCol.createIndex(
      { suppressed: 1 },
      { name: 'idx_suppressed', partialFilterExpression: { suppressed: true } }
    );
    console.log('✅ Index created: subscribers.idx_suppressed (partial)');

    // subscribers: lookup by email + audience for bounce attribution
    await subscribersCol.createIndex(
      { email: 1, audience_id: 1 },
      { name: 'idx_email_audience' }
    );
    console.log('✅ Index created: subscribers.idx_email_audience');

    // email_campaign_logs: link bounce DSN back to campaign log via Message-ID
    const logsCol = db.collection('email_campaign_logs');
    await logsCol.createIndex(
      { original_message_id: 1 },
      { name: 'idx_original_message_id', sparse: true }
    );
    console.log('✅ Index created: email_campaign_logs.idx_original_message_id (sparse)');

    // email_campaign_logs: query by classification type
    await logsCol.createIndex(
      { classification: 1, classified_at: -1 },
      { name: 'idx_classification_date', sparse: true }
    );
    console.log('✅ Index created: email_campaign_logs.idx_classification_date (sparse)');

    // emails: fast inbox fetch by account + date
    const emailsCol = db.collection('emails');
    const emailIndexExists = await emailsCol.indexExists('idx_account_received');
    if (!emailIndexExists) {
      await emailsCol.createIndex(
        { account_email: 1, received_at: -1 },
        { name: 'idx_account_received' }
      );
      console.log('✅ Index created: emails.idx_account_received');
    } else {
      console.log('ℹ️  Index already exists: emails.idx_account_received');
    }

    console.log('\n🎉 Migration 007_create_suppressed_emails completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration
migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
