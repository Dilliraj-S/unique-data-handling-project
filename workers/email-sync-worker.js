#!/usr/bin/env node

/**
 * Global Email Sync Queue Worker
 * Dedicated worker for processing system-wide email synchronization jobs
 * Processes ALL users' accounts (global sync)
 * Based on BV project's separate email-sync queue worker pattern
 */

require('dotenv').config();
const Queue = require('bull');

console.log('📧 Starting Global Email Sync Queue Worker...');

// Create queue for global sync (system-wide, all users)
const GLOBAL_QUEUE_NAME = 'Global Email Sync';
const emailSyncQueue = new Queue(GLOBAL_QUEUE_NAME, {
  redis: { host: 'localhost', port: 6379 }
});

console.log('📊 Queue Dashboard: http://localhost:3000/admin/queues');
console.log('⏹️  Press Ctrl+C to stop');

// Set up email sync processor
console.log('🔧 Setting up email sync processor...');

emailSyncQueue.process('email-sync', 5, async (job) => {
  console.log(`\n📧 ========== PROCESSING GLOBAL EMAIL SYNC JOB ${job.id} ==========`);
  console.log(`👤 User: ${job.data.user_id || 'N/A'}`);
  console.log(`📧 Account: ${job.data.email}`);
  console.log(`📂 Category: ${job.data.category}`);
  
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  
  try {
    await job.progress(0);
    
    const syncService = new EmailSyncService(job);
    // Pass user_id to syncEmails for validation
    const result = await syncService.syncEmails(
      job.data.email, 
      job.data.category,
      job.data.user_id  // Pass user_id for validation
    );
    
    await job.progress(100);
    
    console.log(`✅ Global email sync completed: ${result.count} new emails`);
    return result;
    
  } catch (error) {
    console.error(`❌ Global email sync failed:`, error);
    throw error;
  }
});

// Event handlers
emailSyncQueue.on('completed', (job, result) => {
  console.log(`🎉 Global email sync job ${job.id} completed:`, {
    user_id: job.data.user_id,
    email: job.data.email,
    category: job.data.category,
    count: result.count || 0
  });
});

emailSyncQueue.on('failed', (job, error) => {
  console.error(`💥 Global email sync job ${job.id} failed:`, {
    user_id: job.data.user_id,
    email: job.data.email,
    category: job.data.category,
    error: error.message
  });
});

emailSyncQueue.on('active', (job) => {
  console.log(`🔄 Global email sync job ${job.id} started processing`);
});

console.log('✅ Email sync processor set up successfully');
console.log('🔄 Waiting for email sync jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down email sync worker...');
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  await EmailSyncService.closeSingletonConnection();
  await emailSyncQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down email sync worker...');
  const EmailSyncService = require('../src/application/Services/EmailSyncService');
  await EmailSyncService.closeSingletonConnection();
  await emailSyncQueue.close();
  process.exit(0);
});

