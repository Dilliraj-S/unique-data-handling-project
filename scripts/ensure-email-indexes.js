#!/usr/bin/env node

/**
 * Ensure Email Delivery Performance Indexes
 * Run once to create all indexes needed for high-speed email delivery.
 * Safe to run multiple times (createIndex is idempotent).
 * 
 * Usage: node scripts/ensure-email-indexes.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function ensureIndexes() {
  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    const db = client.db('pluto');
    console.log('✅ Connected to MongoDB');

    // ─── email_campaign_logs ───
    console.log('\n📊 Creating email_campaign_logs indexes...');

    // Daily send count query (countDocuments at EmailDeliveryService:128)
    await db.collection('email_campaign_logs').createIndex(
      { from_email: 1, status: 1, sent_at: -1 },
      { name: 'idx_daily_send_count', background: true }
    );
    console.log('  ✅ idx_daily_send_count (from_email + status + sent_at)');

    // Batch size count query (countDocuments at EmailDeliveryService:142)
    await db.collection('email_campaign_logs').createIndex(
      { from_email: 1, campaign_id: 1, progress_id: 1, status: 1 },
      { name: 'idx_batch_size_count', background: true }
    );
    console.log('  ✅ idx_batch_size_count (from_email + campaign_id + progress_id + status)');

    // Log lookup (findOne at EmailDeliveryService:239)
    await db.collection('email_campaign_logs').createIndex(
      { campaign_id: 1, subscriber_id: 1, progress_id: 1 },
      { name: 'idx_log_lookup', background: true }
    );
    console.log('  ✅ idx_log_lookup (campaign_id + subscriber_id + progress_id)');

    // Max ID lookup (findOne sort at EmailDeliveryService:298)
    await db.collection('email_campaign_logs').createIndex(
      { id: -1 },
      { name: 'idx_log_id_desc', background: true }
    );
    console.log('  ✅ idx_log_id_desc (id descending)');

    // ─── campaigns ───
    console.log('\n📊 Creating campaigns indexes...');
    await db.collection('campaigns').createIndex(
      { id: 1 },
      { name: 'idx_campaign_id', background: true }
    );
    console.log('  ✅ idx_campaign_id');

    // ─── subscribers ───
    console.log('\n📊 Creating subscribers indexes...');
    await db.collection('subscribers').createIndex(
      { id: 1 },
      { name: 'idx_subscriber_id', background: true }
    );
    console.log('  ✅ idx_subscriber_id');

    // ─── campaign_progress ───
    console.log('\n📊 Creating campaign_progress indexes...');
    await db.collection('campaign_progress').createIndex(
      { progress_id: 1 },
      { name: 'idx_progress_id', background: true }
    );
    console.log('  ✅ idx_progress_id');

    await db.collection('campaign_progress').createIndex(
      { campaign_id: 1 },
      { name: 'idx_campaign_progress_campaign_id', background: true }
    );
    console.log('  ✅ idx_campaign_progress_campaign_id');

    // ─── email_accounts ───
    console.log('\n📊 Creating email_accounts indexes...');
    await db.collection('email_accounts').createIndex(
      { email: 1, status: 1 },
      { name: 'idx_email_account_lookup', background: true }
    );
    console.log('  ✅ idx_email_account_lookup');

    console.log('\n🎉 All indexes created successfully!');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

ensureIndexes();
