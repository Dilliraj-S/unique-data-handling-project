#!/usr/bin/env node

/**
 * Initialize Email Sync - Continuous Email Synchronization
 * Similar to BV project's emails:init-sync command
 * Continuously dispatches email sync jobs for all active accounts
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const Queue = require('bull');
const { getLoggedInUser } = require('../get-logged-in-user');

// Configuration
const INTERVAL = parseInt(process.env.EMAIL_SYNC_INTERVAL) || 5; // seconds
const DAEMON_MODE = process.argv.includes('--daemon');
const CLEANUP = process.argv.includes('--cleanup');
// Parse command line arguments
const EMAIL_FILTER = process.argv.find(arg => arg.startsWith('--email='))?.split('=')[1];
const CATEGORY_FILTER = process.argv.find(arg => arg.startsWith('--category='))?.split('=')[1];
// Check for --all-users flag in process.argv
const ALL_USERS_FLAG = process.argv.includes('--all-users');
const USER_FILTER = process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1] || process.env.SYNC_USER_ID || process.env.CURRENT_USER_ID;

// Determine which queue to use based on --all-users flag
// If --all-users flag is set, use "Global Email Sync" queue (all users)
// Otherwise, use "User Email Sync" queue (user-specific)
const GLOBAL_QUEUE_NAME = 'Global Email Sync';
const USER_QUEUE_NAME = 'User Email Sync';
const QUEUE_NAME = ALL_USERS_FLAG ? GLOBAL_QUEUE_NAME : USER_QUEUE_NAME;

console.log('🚀 Starting continuous email sync...');
console.log(`⏱️  Interval: ${INTERVAL} seconds`);
console.log(`📋 Queue: ${QUEUE_NAME}`);
console.log(`🔧 Mode: ${ALL_USERS_FLAG ? 'Global (All Users)' : 'User-Specific'}`);
if (!ALL_USERS_FLAG && USER_FILTER) {
  console.log(`👤 User Filter: ${USER_FILTER}`);
}
if (DAEMON_MODE) {
  console.log('🔄 Running in daemon mode - will restart automatically on errors');
} else {
  console.log('⏹️  Press Ctrl+C to stop');
}

// Create queue
const emailSyncQueue = new Queue(QUEUE_NAME, {
  redis: { host: 'localhost', port: 6379 }
});

// Connect to MongoDB
let mongoClient;
let db;

async function connectToDatabase() {
  if (db) return db;
  
  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  mongoClient = new MongoClient(mongoUrl);
  await mongoClient.connect();
  db = mongoClient.db('pluto');
  return db;
}

async function cleanupOldJobs() {
  console.log('🧹 Cleaning up old email sync jobs...');
  
  try {
    // Note: Bull queue stores jobs in Redis, not MongoDB
    // We can't directly delete from Redis queue here without Bull's API
    // But we can log the current queue status
    const waiting = await emailSyncQueue.getWaiting();
    const active = await emailSyncQueue.getActive();
    const completed = await emailSyncQueue.getCompleted();
    const failed = await emailSyncQueue.getFailed();
    
    console.log(`📊 Current queue status:`);
    console.log(`   - Waiting: ${waiting.length}`);
    console.log(`   - Active: ${active.length}`);
    console.log(`   - Completed: ${completed.length}`);
    console.log(`   - Failed: ${failed.length}`);
    
    // Clean up failed jobs older than 1 hour
    if (failed.length > 0) {
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      for (const job of failed) {
        if (job.timestamp < oneHourAgo) {
          await job.remove();
        }
      }
      console.log(`✅ Cleaned up old failed jobs`);
    }
    
  } catch (error) {
    console.warn('⚠️ Could not cleanup old jobs:', error.message);
  }
}

async function checkAllAccounts() {
  try {
    const database = await connectToDatabase();
    const accountsCollection = database.collection('email_accounts');
    
    // Determine target user_id
    let targetUserId = USER_FILTER;
    
    // If --all-users flag is NOT set, we need a user_id (either from filter or auto-detect)
    if (!ALL_USERS_FLAG) {
      // If no user filter specified, try to auto-detect
      if (!targetUserId) {
      try {
        targetUserId = await getLoggedInUser();
        if (targetUserId) {
          console.log(`✅ Auto-detected user: ${targetUserId}`);
        } else {
            console.warn('⚠️  No user detected. Use --user=USER_ID to specify user or --all-users to sync all users.');
          return;
        }
      } catch (error) {
        console.warn('⚠️  Could not auto-detect user:', error.message);
        console.warn('💡 Use --user=USER_ID to specify user or --all-users to sync all users.');
        return;
        }
      }
    }
    
    // Build query
    const query = { status: 'active' };
    if (EMAIL_FILTER) {
      query.email = EMAIL_FILTER;
    }
    // If --all-users flag is NOT set, only sync the target user's accounts
    // If --all-users flag IS set, sync ALL accounts (don't filter by user_id)
    if (!ALL_USERS_FLAG && targetUserId) {
      query.user_id = targetUserId;
    }
    
    const accounts = await accountsCollection.find(query).toArray();
    
    if (accounts.length === 0) {
      if (ALL_USERS_FLAG) {
        console.warn('⚠️ No active email accounts found.');
      } else if (targetUserId) {
        console.warn(`⚠️ No active email accounts found for user ${targetUserId}.`);
      } else {
      console.warn('⚠️ No active email accounts found.');
      }
      return;
    }
    
    // Group accounts by user_id for proper user-based processing
    const accountsByUser = {};
    for (const account of accounts) {
      const userId = account.user_id || 'unknown';
      if (!accountsByUser[userId]) {
        accountsByUser[userId] = [];
      }
      accountsByUser[userId].push(account);
    }
    
    if (ALL_USERS_FLAG) {
      console.log(`📊 Found ${accounts.length} accounts across ${Object.keys(accountsByUser).length} users (Global Sync)`);
    } else if (targetUserId) {
      console.log(`📊 Found ${accounts.length} accounts for user ${targetUserId} (User-Specific Sync)`);
    } else {
      console.log(`📊 Found ${accounts.length} accounts across ${Object.keys(accountsByUser).length} users`);
    }
    
    const categories = CATEGORY_FILTER ? [CATEGORY_FILTER] : ['inbox', 'spam'];
    let totalJobs = 0;
    
    // Dispatch jobs per user (ensures user-based isolation)
    for (const [userId, userAccounts] of Object.entries(accountsByUser)) {
      console.log(`👤 Processing user ${userId}: ${userAccounts.length} accounts`);
      
      for (const account of userAccounts) {
      for (const category of categories) {
          // Dispatch email sync job with user_id for validation
        await emailSyncQueue.add('email-sync', {
          email: account.email,
            category: category,
            user_id: userId  // Include user_id in job data
        }, {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 10000
          },
          removeOnComplete: true,
          removeOnFail: false
        });
        totalJobs++;
        }
      }
    }
    
    if (totalJobs > 0) {
      if (ALL_USERS_FLAG) {
        console.log(`✅ Dispatched ${totalJobs} email sync jobs (${accounts.length} accounts × ${categories.length} categories across ${Object.keys(accountsByUser).length} users) - Global Sync`);
      } else if (targetUserId) {
        console.log(`✅ Dispatched ${totalJobs} email sync jobs for user ${targetUserId} (${accounts.length} accounts × ${categories.length} categories) - User-Specific Sync`);
      } else {
        console.log(`✅ Dispatched ${totalJobs} email sync jobs (${accounts.length} accounts × ${categories.length} categories across ${Object.keys(accountsByUser).length} users)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking accounts:', error);
    throw error;
  }
}

// Main loop
let runCount = 0;

async function main() {
  if (CLEANUP) {
    await cleanupOldJobs();
  }
  
  while (true) {
    try {
      runCount++;
      const currentTime = new Date().toISOString();
      console.log(`\n[${currentTime}] Run #${runCount} - Checking all accounts...`);
      
      await checkAllAccounts();
      
      // Wait for next interval
      await new Promise(resolve => setTimeout(resolve, INTERVAL * 1000));
      
    } catch (error) {
      console.error('❌ Error in email sync:', error.message);
      
      if (DAEMON_MODE) {
        console.warn('🔄 Restarting in 30 seconds due to error...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.error('Stopping due to error. Use --daemon flag for auto-restart.');
        break;
      }
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down email sync monitor...');
  if (mongoClient) {
    await mongoClient.close();
  }
  await emailSyncQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down email sync monitor...');
  if (mongoClient) {
    await mongoClient.close();
  }
  await emailSyncQueue.close();
  process.exit(0);
});

// Start the main loop
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

