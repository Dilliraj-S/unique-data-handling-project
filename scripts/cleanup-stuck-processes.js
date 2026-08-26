#!/usr/bin/env node
/**
 * Cleanup Stuck Processes
 * 
 * The UI monitors imports by checking the 'process_logs' collection in MongoDB.
 * When the Redis queue is cleared separately, these MongoDB records remain in 
 * 'processing' state, causing "ghost" imports to appear in the UI.
 * 
 * This script finds all 'processing' or 'pending' logs and marks them as 'cancelled'.
 * 
 * Usage:
 *   node scripts/cleanup-stuck-processes.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Configuration
const MONGO_URI = process.env.SUN_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sun';
const DB_NAME = 'sun';
const COLLECTION = 'process_logs';

async function main() {
  console.log('🧹 Starting cleanup of stuck process logs...');
  console.log(`📡 Connecting to ${MONGO_URI}...`);

  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);
    
    // Find stuck jobs
    const query = { 
      status: { $in: ['processing', 'pending'] } 
    };
    
    const stuckJobs = await collection.find(query).toArray();
    
    if (stuckJobs.length === 0) {
      console.log('✨ No stuck processes found. The UI should be clean.');
    } else {
      console.log(`found ${stuckJobs.length} stuck processes:`);
      stuckJobs.forEach(job => {
        console.log(`   - ID: ${job.process_id} | Type: ${job.type} | Started: ${job.created_at}`);
      });
      
      // Update them to cancelled
      const result = await collection.updateMany(
        query,
        { 
          $set: { 
            status: 'cancelled',
            updated_at: new Date(),
            'progress.message': 'Manually cancelled by cleanup script',
            'progress.status': 'cancelled'
          } 
        }
      );
      
      console.log(`\n✅ Successfully cancelled ${result.modifiedCount} processes.`);
      console.log('🔄 The UI should now update to show these as cancelled or disappear.');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('👋 Connection closed');
    }
  }
}

main();
