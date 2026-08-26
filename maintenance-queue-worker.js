#!/usr/bin/env node

/**
 * Maintenance Queue Worker
 * Dedicated worker for heavy maintenance operations (duplicate removal, etc.)
 * Optimized for very large datasets (1 crore+ records)
 * Concurrency: 1 (one heavy job at a time to prevent memory issues)
 * Lowest priority - runs when system is less busy
 */

require('dotenv').config();
const Queue = require('bull');

console.log('🚀 Starting Maintenance Queue Worker...');

// Create maintenance queue — FIX RC2: Must match maintenanceQueue.js settings.
// Without these, Bull defaults lockDuration=30s → job marked stalled on long scans.
const maintenanceQueue = new Queue('Maintenance Operations', {
  redis: { host: 'localhost', port: 6379 },
  settings: {
    lockDuration: 600000,       // 10 min — heavy jobs can scan for minutes without progress
    lockRenewTime: 300000,      // Renew lock every 5 min (must be < lockDuration)
    stalledInterval: 600000,    // Check for stalled jobs every 10 min
    maxStalledCount: 0          // Never auto-retry stalled jobs (prevents double processing)
  }
});

console.log('📊 Queue Dashboard: http://localhost:3000/admin/queues');
console.log('⏹️  Press Ctrl+C to stop');

// Set up processor with concurrency 1 for very heavy memory-intensive jobs
console.log('🔧 Setting up maintenance processor...');
console.log('⚙️  Concurrency: 1 (one very heavy job at a time to prevent memory issues)');
console.log('📊 Priority: Lowest (runs when system is less busy)');

// Duplicate Removal Processor
maintenanceQueue.process('duplicate-removal', 1, async (job) => {
  console.log(`\n🔍 ========== PROCESSING DUPLICATE REMOVAL JOB ${job.id} ==========`);
  console.log(`📋 Job ID: ${job.data.jobId}`);
  console.log(`📋 Process ID: ${job.data.processId}`);
  console.log(`📊 Main: ${job.data.mainDatabase}.${job.data.mainCollection}`);
  console.log(`🎯 Target: ${job.data.targetDatabase}.${job.data.targetCollection}`);
  console.log(`🔑 Rule: ${job.data.duplicateRule}`);

  const {
    jobId,
    processId,
    mainDatabase,
    mainCollection,
    targetDatabase,
    targetCollection,
    duplicateRule,
    userId,
    chunkSize
  } = job.data;

  try {
    await job.progress(0);

    const DuplicateRemovalService = require('./services/DuplicateRemovalService');

    const service = new DuplicateRemovalService({
      mainDatabase,
      mainCollection,
      targetDatabase,
      targetCollection,
      duplicateRule,
      processId,
      chunkSize: chunkSize || 50000, // Larger chunk size for maintenance worker
      job
    });

    const result = await service.processDuplicateRemoval();

    // FIX Check 4.2: DuplicateRemovalService already calls updateProgress(100, 'completed').
    // We only need completeProcess() here to set the final status in process_logs.
    const JobService = require('./services/JobService');
    const jobService = new JobService();

    await jobService.completeProcess(processId, {
      total: result.total,
      removed_count: result.removed
    });

    await job.progress(100);
    await jobService.disconnect();

    console.log(`✅ Duplicate removal completed: ${result.removed} duplicates removed out of ${result.total} total records`);
    return result;

  } catch (error) {
    console.error(`❌ Duplicate removal failed:`, error);
    
    // Update job service with failure
    try {
      const JobService = require('./services/JobService');
      const jobService = new JobService();
      await jobService.failProcess(processId, error, {
        total: 0,
        removed_count: 0
      });
      await jobService.disconnect();
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }
    
    throw error;
  }
});

// Event handlers
maintenanceQueue.on('completed', (job, result) => {
  console.log(`🎉 Maintenance job ${job.id} completed:`, {
    processId: job.data.processId,
    removed: result.removed || 0,
    total: result.total || 0
  });
});

maintenanceQueue.on('failed', (job, error) => {
  console.error(`💥 Maintenance job ${job.id} failed:`, {
    processId: job.data.processId,
    error: error.message
  });
});

maintenanceQueue.on('active', (job) => {
  console.log(`🔄 Maintenance job ${job.id} started processing`);
});

console.log('✅ Maintenance queue processor set up successfully');
console.log('🔄 Waiting for maintenance jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down maintenance queue worker...');
  await maintenanceQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down maintenance queue worker...');
  await maintenanceQueue.close();
  process.exit(0);
});

