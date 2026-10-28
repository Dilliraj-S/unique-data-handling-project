#!/usr/bin/env node

/**
 * User-Specific Email Sync Queue Worker
 * Dedicated worker for processing specific user's email synchronization jobs
 * Spawned by user-email-sync-auto.js
 */

require('dotenv').config();
const Queue = require('bull');

// Get target user mainly for context/logging
const targetUserId = process.env.SYNC_USER_ID;

console.log(`📧 Starting User Email Sync Worker for: ${targetUserId || 'Auto-Detected'}...`);

// Create queue for user sync
const userSyncQueue = new Queue('User Email Sync', {
  redis: { host: 'localhost', port: 6379 }
});

console.log('📊 Queue Dashboard: http://localhost:3000/admin/queues');
console.log('⏹️  Press Ctrl+C to stop');

// Set up email sync processor
console.log('🔧 Setting up user email sync processor...');

userSyncQueue.process('email-sync', 5, async (job) => {
  // Strictly enforce user isolation - only process jobs for the target user
  if (targetUserId && job.data.user_id !== targetUserId) {
    console.log(`⚠️  Skipping job ${job.id} - belongs to user ${job.data.user_id}, but worker is configured for user ${targetUserId}`);
    return { skipped: true, reason: `Job belongs to different user (${job.data.user_id})` };
  }
  
  console.log(`\n📧 ========== PROCESSING USER EMAIL SYNC JOB ${job.id} ==========`);
  console.log(`👤 User: ${job.data.user_id}`);
  console.log(`📧 Account: ${job.data.email}`);
  console.log(`📂 Category: ${job.data.category}`);
  
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  
  try {
    await job.progress(0);
    
    const syncService = new EmailSyncService(job);
    const result = await syncService.syncEmails(
      job.data.email, 
      job.data.category,
      job.data.user_id
    );
    
    await job.progress(100);
    
    console.log(`✅ User email sync completed: ${result.count} new emails`);
    return result;
    
  } catch (error) {
    console.error(`❌ User email sync failed:`, error);
    throw error;
  }
});

// Event handlers
userSyncQueue.on('completed', (job, result) => {
  console.log(`🎉 User email sync job ${job.id} completed:`, {
    user_id: job.data.user_id,
    email: job.data.email,
    count: result.count || 0
  });
});

userSyncQueue.on('failed', (job, error) => {
  console.error(`💥 User email sync job ${job.id} failed:`, {
    user_id: job.data.user_id,
    error: error.message
  });
});

userSyncQueue.on('active', (job) => {
  console.log(`🔄 User email sync job ${job.id} started processing`);
});

console.log('✅ User sync processor set up successfully');
console.log('🔄 Waiting for jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down user email sync worker...');
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  await EmailSyncService.closeSingletonConnection();
  await userSyncQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down user email sync worker...');
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  await EmailSyncService.closeSingletonConnection();
  await userSyncQueue.close();
  process.exit(0);
});
