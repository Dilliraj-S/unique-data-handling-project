/**
 * Create Database Indexes for Drift Email Report Performance
 * 
 * This script creates optimized compound indexes on the emails collection
 * to dramatically improve query performance for bounce and reply detection.
 * 
 * Run: node scripts/create-drift-indexes.js
 */

const { MongoClient } = require('mongodb');

// Get MongoDB connection string from environment or use default
const getMongoUri = () => {
  return process.env.PLUTO_MONGODB_URI || 
         process.env.MONGODB_URI || 
         'mongodb://localhost:27017';
};

async function createIndexes() {
  const uri = getMongoUri();
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('pluto');
    const emailsCol = db.collection('emails');
    const logsCol = db.collection('drift_sequence_logs');
    
    console.log('\n📊 Creating indexes for drift email performance...\n');
    
    // ============================================
    // EMAILS COLLECTION INDEXES
    // ============================================
    
    // Index 1: For bounce detection queries
    // Query pattern: { account_email: X, status: { $in: ['soft_bounce', 'hard_bounce'] }, received_at: { $gte: Y } }
    console.log('Creating index: drift_bounce_detection_idx...');
    await emailsCol.createIndex(
      { 
        account_email: 1, 
        status: 1, 
        received_at: -1 
      },
      { 
        name: 'drift_bounce_detection_idx',
        background: true
      }
    );
    console.log('  ✅ drift_bounce_detection_idx created');
    
    // Index 2: For reply detection queries (replies come FROM subscriber)
    // Query pattern: { from_email regex, status: { $in: ['automatic_reply', 'replied', 'unsubscribed'] }, received_at: { $gte: Y } }
    console.log('Creating index: drift_reply_detection_idx...');
    await emailsCol.createIndex(
      { 
        status: 1,
        received_at: -1,
        from_email: 1
      },
      { 
        name: 'drift_reply_detection_idx',
        background: true
      }
    );
    console.log('  ✅ drift_reply_detection_idx created');
    
    // Index 3: For message_id lookups (thread tracking)
    console.log('Creating index: drift_message_id_idx...');
    await emailsCol.createIndex(
      { 
        message_id: 1 
      },
      { 
        name: 'drift_message_id_idx',
        background: true,
        sparse: true  // Only index documents that have message_id
      }
    );
    console.log('  ✅ drift_message_id_idx created');
    
    // ============================================
    // DRIFT_SEQUENCE_LOGS COLLECTION INDEXES
    // (Verify existing indexes are optimal)
    // ============================================
    
    // Index for per-account aggregation: sequence_id + email_account_id + status
    console.log('Creating index: drift_logs_account_stats_idx...');
    await logsCol.createIndex(
      {
        sequence_id: 1,
        email_account_id: 1,
        status: 1
      },
      {
        name: 'drift_logs_account_stats_idx',
        background: true
      }
    );
    console.log('  ✅ drift_logs_account_stats_idx created');
    
    // Index for subscriber joins: sequence_id + subscriber_id
    console.log('Creating index: drift_logs_subscriber_join_idx...');
    await logsCol.createIndex(
      {
        sequence_id: 1,
        subscriber_id: 1
      },
      {
        name: 'drift_logs_subscriber_join_idx',
        background: true
      }
    );
    console.log('  ✅ drift_logs_subscriber_join_idx created');
    
    // ============================================
    // List all indexes for verification
    // ============================================
    
    console.log('\n📋 Current indexes on emails collection:');
    const emailIndexes = await emailsCol.indexes();
    emailIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n📋 Current indexes on drift_sequence_logs collection:');
    const logIndexes = await logsCol.indexes();
    logIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n✅ All indexes created successfully!');
    console.log('📈 Expected performance improvement: 10x-100x faster queries');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createIndexes().catch(console.error);
