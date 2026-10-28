#!/usr/bin/env node

/**
 * Email Delivery Queue Worker
 * Dedicated worker for processing email sending jobs
 * Based on BV project's separate email delivery queue worker pattern
 */

require('dotenv').config();
const Queue = require('bull');
const EmailDeliveryService = require('../src/application/Services/EmailDeliveryService');

const WORKER_ID = process.env.pm_id || '0';
const WORKER_TAG = `[Worker #${WORKER_ID} | PID ${process.pid}]`;
console.log(`📧 ${WORKER_TAG} Starting Email Delivery Queue Worker...`);

// Create queue with same name as used in API endpoints
const emailDeliveryQueue = new Queue('Email Delivery', {
  redis: { host: 'localhost', port: 6379 },
  // Explicitly set default job options to prevent processing unknown job types
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    timeout: 120000  // 2 minutes max per email — prevents hung jobs from consuming slots forever
  },
  // Settings to prevent processing jobs without handlers
  settings: {
    stalledInterval: 30 * 1000,
    maxStalledCount: 1
  }
});

console.log(`📊 ${WORKER_TAG} Queue Dashboard: http://localhost:3000/admin/queues`);
console.log(`⏹️  ${WORKER_TAG} Press Ctrl+C to stop`);

// Set up email delivery processor
console.log(`🔧 ${WORKER_TAG} Setting up email delivery processor...`);

// High-performance: Process dispatch-campaign jobs (producer)
const DispatchCampaignJob = require('../services/DispatchCampaignJob');

emailDeliveryQueue.process('dispatch-campaign', 1, async (job) => {
  console.log(`\n🚀 ========== PROCESSING CAMPAIGN DISPATCH JOB ${job.id} ==========`);
  console.log(`📋 Campaign ID: ${job.data.campaign_id}`);
  console.log(`📧 Progress ID: ${job.data.progress_id}`);
  
  const dispatcher = new DispatchCampaignJob();
  
  try {
    await job.progress(0);
    const result = await dispatcher.dispatchCampaign(job.data);
    await job.progress(100);
    
    console.log(`✅ Campaign dispatch completed:`, result);
    return result;
  } catch (error) {
    console.error(`❌ Campaign dispatch failed:`, error);
    throw error;
  } finally {
    await dispatcher.closeConnections();
  }
});

// High-performance: Process send-email jobs (consumers)
// IMPORTANT: With Redis rate limiter, we can run multiple workers safely
// Concurrency per worker process.
// Default: 50 jobs in parallel. With 3 workers this gives ~150 in-flight jobs,
// while RedisRateLimiter still caps each individual account at MAX_CONCURRENT_PER_ACCOUNT.
const CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY, 10) || 50;
console.log(`🚀 Email Worker Concurrency (per process): ${CONCURRENCY}`);
console.log(`📊 Redis rate limiter caps per-account concurrency at ${process.env.MAX_CONCURRENT_PER_ACCOUNT || 10} and ${process.env.MAX_REQUESTS_PER_SECOND || 3} req/s per account.`);

emailDeliveryQueue.process('send-email', CONCURRENCY, async (job) => {
  const DEBUG = process.env.EMAIL_DEBUG === 'true';
  if (DEBUG) {
    console.log(`\n📧 ========== PROCESSING EMAIL DELIVERY JOB ${job.id} ==========`);
    console.log(`📋 Campaign ID: ${job.data.campaignId}`);
    console.log(`👤 Subscriber ID: ${job.data.subscriberId}`);
    console.log(`📮 From: ${job.data.fromEmail}`);
    console.log(`📬 To: ${job.data.toEmail || 'N/A'}`);
  }
  
  const emailDeliveryService = new EmailDeliveryService(job);
  
  try {
    await job.progress(0);
    
    const result = await emailDeliveryService.sendEmail(job.data);
    
    await job.progress(100);
    
    // CRITICAL FIX: When daily limit is hit, re-add job to queue with delay.
    // Previously, returning { retry: true } just completed the Bull job — the email
    // was silently dropped and never sent.
    if (result.retry) {
      const requeueCount = (job.data._requeueCount || 0) + 1;
      const MAX_REQUEUES = 3;
      if (requeueCount > MAX_REQUEUES) {
        console.warn(`⛔ Max requeue limit (${MAX_REQUEUES}) reached for ${job.data.fromEmail}. Marking as failed.`);
        // Mark email as failed so it doesn't stay stuck as 'pending' forever
        try {
          const EmailDeliveryService = require('../src/application/Services/EmailDeliveryService');
          const db = await EmailDeliveryService.getDatabase();
          const { Long } = require('mongodb');
          
          await db.collection('email_campaign_logs').updateOne(
            {
              campaign_id: Long.fromNumber(Number(job.data.campaignId)),
              subscriber_id: Long.fromNumber(Number(job.data.subscriberId)),
              progress_id: job.data.progressId || { $exists: false }
            },
            {
              $set: { status: 'failed', error_message: 'Daily send limit: max requeues exhausted', updated_at: new Date() }
            }
          );
          
          if (job.data.progressId) {
            await db.collection('campaign_progress').updateOne(
              { progress_id: job.data.progressId },
              {
                $inc: { failed_emails: 1, pending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            );
          }
        } catch (cleanupErr) {
          console.error(`❌ Failed to mark email as failed after daily limit exhaustion:`, cleanupErr.message);
        }
        return { dropped: true, reason: 'max_requeues_exceeded', markedFailed: true };
      }
      const delay = Math.min(result.delay || 60000, 24 * 60 * 60 * 1000); // Cap at 24 hours
      const delayMinutes = Math.round(delay / 60000);
      console.log(`⏳ Daily limit hit for ${job.data.fromEmail}. Re-queuing (${requeueCount}/${MAX_REQUEUES}) with ${delayMinutes}min delay.`);
      
      // Re-add as a NEW job with delay (current job completes, new one waits)
      await emailDeliveryQueue.add('send-email', { ...job.data, _requeueCount: requeueCount }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        delay: delay
      });
      return { requeued: true, delay, requeueCount };
    }
    
    // Handle batch_limit_reached — job is done, no re-queue needed
    // (batch_size enforcement at send-time is a safety net; dispatch already caps it)
    if (result.skipped && result.status === 'batch_limit_reached') {
      if (DEBUG) console.log(`⏭️ Batch limit reached for ${job.data.fromEmail}. Email skipped.`);
      return result;
    }
    
    if (DEBUG) console.log(`✅ Email sent successfully: ${result.messageId || 'N/A'}`);
    return result;
    
  } catch (error) {
    const isLockTimeout = error.message && error.message.includes('Local concurrency lock timeout');
    
    // ═══════════════════════════════════════════════════════════════
    // LOCK TIMEOUT SAFETY NET: After Bull exhausts all 3 retry attempts,
    // instead of permanently failing the email, requeue with a progressive
    // delay. The concurrency lock will free up as other emails for that
    // account complete, and this email will eventually be sent.
    //
    // Flow: 3 Bull attempts (2s, 4s backoff) → requeue with 30s delay
    //       → 3 more Bull attempts → requeue with 60s delay → ... up to 5×
    // Total: up to 15 Bull attempts + 5 requeues = many chances to send
    // ═══════════════════════════════════════════════════════════════
    if (isLockTimeout && job.attemptsMade >= 2) {
      // This is the FINAL Bull attempt (attemptsMade is 0-indexed, attempts:3 = max index 2)
      const lockRetryCount = (job.data._lockRetryCount || 0) + 1;
      const MAX_LOCK_REQUEUES = 5;
      
      if (lockRetryCount <= MAX_LOCK_REQUEUES) {
        const requeueDelay = 30000 * lockRetryCount; // 30s, 60s, 90s, 120s, 150s
        const delaySeconds = Math.round(requeueDelay / 1000);
        console.warn(`⏳ Lock timeout persists for ${job.data.fromEmail} after ${job.attemptsMade + 1} Bull attempts. Re-queuing (${lockRetryCount}/${MAX_LOCK_REQUEUES}) with ${delaySeconds}s delay.`);
        
        await emailDeliveryQueue.add('send-email', { ...job.data, _lockRetryCount: lockRetryCount }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          delay: requeueDelay
        });
        
        // Return success to Bull (this job is done, new job handles the retry)
        return { requeued: true, reason: 'lock_timeout_retry', lockRetryCount, nextDelaySeconds: delaySeconds };
      } else {
        // ═══════════════════════════════════════════════════════════════
        // MAX REQUEUES EXHAUSTED: Mark email as permanently failed.
        // Without this, the log stays as 'pending' forever (657 stuck emails bug).
        // The sendEmail catch block already set log='pending' and sending_emails-1,
        // so we need to: mark log='failed', failed+1, pending-1.
        // ═══════════════════════════════════════════════════════════════
        console.error(`⛔ Lock timeout: max requeues (${MAX_LOCK_REQUEUES}) exhausted for ${job.data.fromEmail}, subscriber ${job.data.subscriberId}. Marking as permanently failed.`);
        try {
          const EmailDeliveryService = require('../src/application/Services/EmailDeliveryService');
          const db = await EmailDeliveryService.getDatabase();
          const { Long } = require('mongodb');
          
          // Mark log as failed
          await db.collection('email_campaign_logs').updateOne(
            {
              campaign_id: Long.fromNumber(Number(job.data.campaignId)),
              subscriber_id: Long.fromNumber(Number(job.data.subscriberId)),
              progress_id: job.data.progressId || { $exists: false }
            },
            {
              $set: { status: 'failed', error_message: 'Lock timeout: max retries exhausted', updated_at: new Date() },
              $inc: { retry_attempts: 1 }
            }
          );
          
          // Adjust counters: failed+1, pending-1 (sending was already reverted by sendEmail catch)
          if (job.data.progressId) {
            await db.collection('campaign_progress').updateOne(
              { progress_id: job.data.progressId },
              {
                $inc: { failed_emails: 1, pending_emails: -1 },
                $set: { updated_at: new Date() }
              }
            );
          }
          console.log(`✅ Marked subscriber ${job.data.subscriberId} as failed after lock timeout exhaustion.`);
          
          // Return success — email is now properly marked as failed
          return { dropped: true, reason: 'lock_timeout_max_requeues_exhausted', markedFailed: true };
        } catch (cleanupErr) {
          console.error(`❌ Failed to mark email as failed after lock exhaustion:`, cleanupErr.message);
          // Fall through to throw — Bull will mark job as failed
        }
      }
    }
    
    console.error(`❌ Email delivery failed:`, error);
    throw error;
  } finally {
    // Singleton DB connection + SMTP pool are shared across all jobs.
    // They are closed on worker shutdown (SIGINT/SIGTERM) — NOT per-job.
    // CRITICAL FIX: Previous closeConnection() call did not exist as a method,
    // throwing TypeError on EVERY job, causing Bull to mark all emails as FAILED
    // and retry 3 times (with 2s/4s exponential backoff) — tripling execution time.
  }
});

// Explicitly handle email-sync jobs to prevent "Missing process handler" errors
// These jobs should be processed by email-sync-worker.js, but if they end up here, we'll skip them
emailDeliveryQueue.process('email-sync', 1, async (job) => {
  console.warn(`⚠️  Email-sync job ${job.id} received in Email Delivery queue - this is unexpected!`);
  console.warn(`⚠️  Email-sync jobs should be in 'CSV Import Processing' queue and processed by email-sync-worker.js`);
  console.warn(`⚠️  Skipping this job. Please ensure email-sync-worker.js is running.`);
  
  // Return success to remove job from queue (since it's in the wrong place)
  return { 
    skipped: true, 
    reason: 'Wrong queue - email-sync jobs should be processed by email-sync-worker.js',
    note: 'This job should be in CSV Import Processing queue'
  };
});

// Event handlers
const EVENT_DEBUG = process.env.EMAIL_DEBUG === 'true';

emailDeliveryQueue.on('completed', (job, result) => {
  if (EVENT_DEBUG) {
    console.log(`🎉 Job ${job.id} done:`, {
      campaignId: job.data.campaignId,
      subscriberId: job.data.subscriberId,
      messageId: result?.messageId || 'N/A'
    });
  }
});

emailDeliveryQueue.on('failed', (job, error) => {
  // Only log if it's a job type we handle
  if (job.name === 'send-email' || job.name === 'dispatch-campaign') {
    console.error(`💥 Email delivery job ${job.id} failed:`, {
      jobType: job.name,
      campaignId: job.data.campaignId,
      subscriberId: job.data.subscriberId,
      error: error.message
    });
  } else {
    // Ignore failures for job types we don't handle (like email-sync)
    console.warn(`⚠️  Job ${job.id} of type '${job.name}' failed in Email Delivery queue - this job type should be processed by a different worker`);
  }
});

emailDeliveryQueue.on('active', (job) => {
  if (EVENT_DEBUG) console.log(`🔄 Job ${job.id} active`);
});

console.log('✅ Email delivery processor set up successfully');
console.log('🔄 Waiting for email delivery jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down email delivery worker (draining active jobs)...');
  
  // Stop accepting new jobs and wait for in-flight jobs to finish
  try {
    await emailDeliveryQueue.pause(true, true); // local pause, wait for active jobs
  } catch (e) {
    console.warn('⚠️ Queue pause failed, proceeding with shutdown:', e.message);
  }
  
  // Close singleton DB connection
  const EmailDeliveryService = require('../src/application/Services/EmailDeliveryService');
  await EmailDeliveryService.closeSingletonConnection();
  await EmailDeliveryService.closeSmtpTransporters();
  
  await emailDeliveryQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down email delivery worker (draining active jobs)...');
  
  // Stop accepting new jobs and wait for in-flight jobs to finish
  try {
    await emailDeliveryQueue.pause(true, true); // local pause, wait for active jobs
  } catch (e) {
    console.warn('⚠️ Queue pause failed, proceeding with shutdown:', e.message);
  }
  
  // Close singleton DB connection
  const EmailDeliveryService = require('../src/application/Services/EmailDeliveryService');
  await EmailDeliveryService.closeSingletonConnection();
  await EmailDeliveryService.closeSmtpTransporters();
  
  await emailDeliveryQueue.close();
  process.exit(0);
});

