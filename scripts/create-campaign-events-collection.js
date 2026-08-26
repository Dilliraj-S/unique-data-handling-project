#!/usr/bin/env node

/**
 * Migration: Create campaign_email_events collection
 * 
 * This collection stores an append-only event log for all email delivery events
 * (sent, failed, bounce, open) per campaign. It follows the same event-stream
 * pattern used by SendGrid, SES, and Mailgun.
 * 
 * Usage: node scripts/create-campaign-events-collection.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017';

async function createCampaignEmailEventsCollection() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db('pluto');

    console.log('🚀 Creating campaign_email_events collection...\n');

    // Check if collection already exists
    const collections = await db.listCollections({ name: 'campaign_email_events' }).toArray();
    if (collections.length > 0) {
      console.log('⚠️  Collection "campaign_email_events" already exists. Ensuring indexes...');
    } else {
      // Create collection with schema validation
      await db.createCollection('campaign_email_events', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['campaign_id', 'email', 'event_type', 'event_timestamp', 'created_at'],
            properties: {
              campaign_id: {
                bsonType: ['int', 'long', 'double'],
                description: 'FK to campaigns.id'
              },
              email: {
                bsonType: 'string',
                description: 'Lowercase, trimmed recipient email'
              },
              source_database: {
                bsonType: ['string', 'null'],
                description: 'Target database name (e.g. dlslinkedin)'
              },
              source_collection: {
                bsonType: ['string', 'null'],
                description: 'Target collection name (e.g. contacts)'
              },
              event_type: {
                bsonType: 'string',
                enum: ['sent', 'failed', 'bounce', 'open'],
                description: 'Type of email event'
              },
              event_subtype: {
                bsonType: ['string', 'null'],
                description: 'Subtype: hard_bounce, soft_bounce, unsubscribe, etc.'
              },
              provider_message_id: {
                bsonType: ['string', 'null'],
                description: 'message_id from email_campaign_logs'
              },
              event_timestamp: {
                bsonType: 'date',
                description: 'When the event occurred'
              },
              metadata: {
                bsonType: ['object', 'null'],
                description: 'Extra data (error_message, bounce_reason, etc.)'
              },
              created_at: {
                bsonType: 'date',
                description: 'When this record was created'
              }
            }
          }
        },
        validationLevel: 'moderate',
        validationAction: 'warn'
      });
      console.log('✅ Collection "campaign_email_events" created with schema validation');
    }

    // Create indexes
    console.log('\n📊 Creating indexes...');

    // 1. Unique compound index — prevents duplicate events per campaign+email+event_type
    try {
      await db.collection('campaign_email_events').createIndex(
        { campaign_id: 1, email: 1, event_type: 1 },
        { name: 'idx_campaign_email_event_unique', unique: true, background: true }
      );
      console.log('  ✅ idx_campaign_email_event_unique (unique compound)');
    } catch (e) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.log('  ⚠️  idx_campaign_email_event_unique already exists');
      } else {
        throw e;
      }
    }

    // 2. Fast lookup by email across all campaigns
    try {
      await db.collection('campaign_email_events').createIndex(
        { email: 1, event_type: 1 },
        { name: 'idx_email_event_type', background: true }
      );
      console.log('  ✅ idx_email_event_type (email lookup)');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ⚠️  idx_email_event_type already exists');
      } else {
        throw e;
      }
    }

    // 3. Campaign-level analytics (count sent/bounced/opened per campaign)
    try {
      await db.collection('campaign_email_events').createIndex(
        { campaign_id: 1, event_type: 1 },
        { name: 'idx_campaign_event_analytics', background: true }
      );
      console.log('  ✅ idx_campaign_event_analytics (campaign analytics)');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ⚠️  idx_campaign_event_analytics already exists');
      } else {
        throw e;
      }
    }

    // 4. Time-range queries
    try {
      await db.collection('campaign_email_events').createIndex(
        { event_timestamp: 1 },
        { name: 'idx_event_timestamp', background: true }
      );
      console.log('  ✅ idx_event_timestamp (time-range queries)');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ⚠️  idx_event_timestamp already exists');
      } else {
        throw e;
      }
    }

    console.log('\n🎉 Migration complete! campaign_email_events is ready.\n');

    // Print summary
    const count = await db.collection('campaign_email_events').countDocuments();
    const indexes = await db.collection('campaign_email_events').indexes();
    console.log(`📊 Summary:`);
    console.log(`   Documents: ${count}`);
    console.log(`   Indexes: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`     - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (UNIQUE)' : ''}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

createCampaignEmailEventsCollection();
