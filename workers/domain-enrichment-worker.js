#!/usr/bin/env node

/**
 * Domain Enrichment Worker (ESM)
 * ------------------------------------------------------
 * Polls the automation database for queued jobs and runs
 * DomainEnrichmentAgent.enrichDomain(domain), then writes
 * results back to domain_enrichment_jobs and
 * domain_enrichment_results collections in the `automation` DB.
 *
 * Run:
 *   cd for
 *   node domain-enrichment-worker.js
 */

import 'dotenv/config';
import { getDb, getCollection } from './src/lib/mongodb.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DomainEnrichmentAgent = require('../src/services/DomainEnrichmentAgent.js');
const HeadlessScraperService = require('../src/services/HeadlessScraperService.js');

// Verify the module loaded correctly
if (!DomainEnrichmentAgent || !DomainEnrichmentAgent.enrichDomain) {
  console.error('❌ DomainEnrichmentAgent module not loaded correctly!');
  console.error('Available exports:', Object.keys(DomainEnrichmentAgent || {}));
  process.exit(1);
}

const POLL_INTERVAL_MS = 5000;
// Concurrency set to 1 for FREE tier (rate limits are very low ~10 req/min)
// Set DOMAIN_ENRICHMENT_WORKER_CONCURRENCY=2 or higher with paid API key
const MAX_CONCURRENT_JOBS = parseInt(
  process.env.DOMAIN_ENRICHMENT_WORKER_CONCURRENCY || '1',
  10,
);

// Reset jobs stuck in processing for more than 1 minute (test). Use 5 * 60 * 1000 for prod.
const PROCESSING_TIMEOUT_MS = 1 * 60 * 1000;

let activeJobs = 0;
let shuttingDown = false;


/**
 * Reset stuck 'processing' jobs back to 'queued'
 * Handles: stale timestamps, null timestamps, or timestamps in the future (clock skew)
 */
async function resetStuckJobs() {
  const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');
  const now = Date.now();
  const timeoutThreshold = new Date(now - PROCESSING_TIMEOUT_MS);
  // If updated_at is in the future by more than 1 minute, treat as invalid and reset
  const futureThreshold = new Date(now + 60 * 1000);

  // Check how many stuck jobs exist
  const stuckCount = await jobsCollection.countDocuments({
    status: 'processing',
    $or: [
      { updated_at: { $lt: timeoutThreshold } },
      { updated_at: { $gt: futureThreshold } },
      { updated_at: { $exists: false } },
      { updated_at: null },
    ],
  });

  if (stuckCount > 0) {
    console.log(`🔄 Found ${stuckCount} stuck 'processing' job(s) (older than ${PROCESSING_TIMEOUT_MS / 1000 / 60} minutes), resetting...`);
  }

  const result = await jobsCollection.updateMany(
    {
      status: 'processing',
      $or: [
        { updated_at: { $lt: timeoutThreshold } }, // older than timeout
        { updated_at: { $gt: futureThreshold } }, // invalid future timestamp
        { updated_at: { $exists: false } },
        { updated_at: null },
      ],
    },
    {
      $set: {
        status: 'queued',
        updated_at: new Date(),
      },
      $inc: { attempts: 0 }, // Don't increment attempts, just reset status
    },
  );

  if (result.modifiedCount > 0) {
    console.log(`✅ Reset ${result.modifiedCount} stuck 'processing' jobs back to 'queued'`);
  } else if (stuckCount > 0) {
    console.log(`⚠️  Expected to reset ${stuckCount} jobs but modified ${result.modifiedCount}`);
  }
}

/**
 * Promote pending jobs to queued when there are no queued jobs.
 * This handles the case where jobs were uploaded but Start Processing was not called.
 */
async function promotePendingJobs() {
  const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');
  const pendingCount = await jobsCollection.countDocuments({ status: 'pending' });
  if (pendingCount === 0) return;

  const result = await jobsCollection.updateMany(
    { status: 'pending' },
    {
      $set: {
        status: 'queued',
        updated_at: new Date(),
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(`🚚 Promoted ${result.modifiedCount} pending job(s) to queued.`);
  }
}

async function processOneJob() {
  if (shuttingDown) return;
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    console.log(`⏸️  Max concurrent jobs reached (${activeJobs}/${MAX_CONCURRENT_JOBS}), skipping...`);
    return;
  }

  try {
    const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');
    const resultsCollection = await getCollection('domain_enrichment_results', 'automation');

    // First, reset any stuck 'processing' jobs
    await resetStuckJobs();

    // If there are no queued jobs but there are pending ones, promote them
    const queuedCountBefore = await jobsCollection.countDocuments({ status: 'queued' });
    if (queuedCountBefore === 0) {
      await promotePendingJobs();
    }

    // Check current job counts for debugging
    const queuedCount = await jobsCollection.countDocuments({ status: 'queued' });
    const processingCount = await jobsCollection.countDocuments({ status: 'processing' });
    const pendingCount = await jobsCollection.countDocuments({ status: 'pending' });
    const totalCount = await jobsCollection.countDocuments({});
    
    if (totalCount > 0 && queuedCount === 0 && processingCount > 0) {
      // All jobs are stuck in processing - log details
      const stuckJobs = await jobsCollection.find({ status: 'processing' }).limit(3).toArray();
      console.log(`⚠️  All ${processingCount} jobs are stuck in 'processing' status:`);
      stuckJobs.forEach(job => {
        const ageMinutes = Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 1000 / 60);
        console.log(`   - ${job.job_id} (${job.domain}): processing for ${ageMinutes} minutes`);
      });
    }

    // Use atomic findOneAndUpdate - try queued jobs first, then stale processing jobs
    // MongoDB's findOneAndUpdate with sort doesn't work reliably with $or queries
    const timeoutThreshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);
    const now = new Date();
    
    if (queuedCount > 0 || processingCount > 0 || pendingCount > 0) {
      console.log(
        `🔍 Searching for jobs: Queued=${queuedCount}, Processing=${processingCount}, Pending=${pendingCount}, Timeout threshold=${timeoutThreshold.toISOString()}`,
      );
    }
    
    // Step 1: Try to lock a 'queued' job first (most common case)
    // DEBUG: Check what jobs actually exist
    if (queuedCount > 0) {
      const sampleQueued = await jobsCollection.findOne({ status: 'queued' }, { sort: { created_at: 1 } });
      if (sampleQueued) {
        console.log(`🔍 DEBUG: Sample queued job found:`, {
          job_id: sampleQueued.job_id,
          domain: sampleQueued.domain,
          status: sampleQueued.status,
          created_at: sampleQueued.created_at,
          updated_at: sampleQueued.updated_at,
          has_created_at: 'created_at' in sampleQueued,
        });
      } else {
        console.log(`⚠️  DEBUG: countDocuments says ${queuedCount} queued, but findOne returned null!`);
      }
    }
    
    let jobDoc = await jobsCollection.findOneAndUpdate(
      { status: 'queued' },
      {
        $set: { 
          status: 'processing', 
          updated_at: now,
        },
        $inc: { attempts: 1 },
      },
      {
        returnDocument: 'after',
        sort: { created_at: 1 }, // Process oldest first - requires index on created_at
      },
    );
    
    if (!jobDoc) {
      console.log(`⚠️  DEBUG: findOneAndUpdate for 'queued' returned null. Trying without sort...`);
      // Fallback: Try without sort (in case created_at index is missing)
      jobDoc = await jobsCollection.findOneAndUpdate(
        { status: 'queued' },
        {
          $set: { 
            status: 'processing', 
            updated_at: now,
          },
          $inc: { attempts: 1 },
        },
        {
          returnDocument: 'after',
        },
      );
    }

    // Step 2: If no queued jobs, try to lock a stale 'processing' job
    if (!jobDoc) {
      if (processingCount > 0) {
        const sampleProcessing = await jobsCollection.findOne(
          { status: 'processing', updated_at: { $lt: timeoutThreshold } },
          { sort: { created_at: 1 } }
        );
        if (sampleProcessing) {
          console.log(`🔍 DEBUG: Sample stale processing job:`, {
            job_id: sampleProcessing.job_id,
            domain: sampleProcessing.domain,
            updated_at: sampleProcessing.updated_at,
            age_ms: Date.now() - new Date(sampleProcessing.updated_at).getTime(),
          });
        }
      }
      
      jobDoc = await jobsCollection.findOneAndUpdate(
        {
          status: 'processing',
          updated_at: { $lt: timeoutThreshold },
        },
        {
          $set: { 
            status: 'processing', // Keep as processing but update timestamp
            updated_at: now,
          },
          $inc: { attempts: 1 },
        },
        {
          returnDocument: 'after',
          sort: { created_at: 1 },
        },
      );
      
      if (!jobDoc) {
        // Fallback: Try without sort
        jobDoc = await jobsCollection.findOneAndUpdate(
          {
            status: 'processing',
            updated_at: { $lt: timeoutThreshold },
          },
          {
            $set: { 
              status: 'processing',
              updated_at: now,
            },
            $inc: { attempts: 1 },
          },
          {
            returnDocument: 'after',
          },
        );
      }
    }

    // If still no job found, return
    if (!jobDoc) {
      if (queuedCount > 0 || processingCount > 0 || pendingCount > 0) {
        console.log(`⚠️  No jobs matched query (all jobs may have been grabbed by other workers)`);
      }
      return;
    }
    
    const job = jobDoc;
    console.log(`🔒 Successfully locked job ${job.job_id} (${job.domain}) for processing`);
    activeJobs += 1;

    console.log(`🌐 Processing domain enrichment job`, {
      job_id: job.job_id,
      batch_id: job.batch_id,
      domain: job.domain,
      attempts: job.attempts,
    });

    try {
      console.log(`🔄 Calling DomainEnrichmentAgent.enrichDomain for ${job.domain}...`);
      const result = await DomainEnrichmentAgent.enrichDomain(job.domain, {
        // Tuned for high-throughput: lower timeout + fewer deep pages
        timeoutMs: 8000,
        maxContactPages: 2,
        earlyExitScore: 8,
        // Confidence threshold: score >= 6 means high confidence (skip headless scraper)
        // Lower scores trigger headless scraper fallback
        confidenceThreshold: parseInt(process.env.DOMAIN_ENRICHMENT_CONFIDENCE_THRESHOLD || '6', 10),
        // Enable/disable headless scraper (default: enabled)
        enableHeadlessScraper: process.env.DOMAIN_ENRICHMENT_ENABLE_HEADLESS !== 'false',
        // Headless scraper timeout (default: 15 seconds)
        headlessTimeoutMs: parseInt(process.env.DOMAIN_ENRICHMENT_HEADLESS_TIMEOUT_MS || '15000', 10),
        // Enable/disable LLM disambiguation (default: enabled if OpenRouter API key is set)
        enableLLM: process.env.DOMAIN_ENRICHMENT_ENABLE_LLM !== 'false',
      });
      console.log(`✅ DomainEnrichmentAgent returned result:`, {
        domain: result.domain,
        company_name: result.company_name ? 'found' : 'empty',
        address: result.address ? 'found' : 'empty',
        phone: result.phone ? 'found' : 'empty',
        score: result.score,
      });

      // Optional deep debug for a specific domain (set via ENV)
      // Example: DOMAIN_ENRICHMENT_DEBUG_DOMAIN=cleanearthinc.com
      if (
        process.env.DOMAIN_ENRICHMENT_DEBUG_DOMAIN &&
        String(job.domain).toLowerCase() ===
          String(process.env.DOMAIN_ENRICHMENT_DEBUG_DOMAIN).toLowerCase()
      ) {
        try {
          console.log('🧪 DEBUG PIPELINE SNAPSHOT FOR DOMAIN:', job.domain);
          console.log(
            JSON.stringify(
              {
                staticExtractionScore: result.debug?.staticExtractionScore,
                staticExtractionResult: result.debug?.staticExtractionResult,
                headlessScraperTriggered: result.debug?.headlessScraperTriggered || false,
                popupTextExtracted: result.debug?.popupTextExtracted || false,
                afterPopupScore: result.debug?.afterPopupScore,
                fallbackToFullPage: result.debug?.fallbackToFullPage || false,
                afterFallbackScore: result.debug?.afterFallbackScore,
                llmDisambiguationTriggered: result.debug?.llmDisambiguationTriggered || false,
                llmResult: result.debug?.llmResult || null,
                afterLLMScore: result.debug?.afterLLMScore,
              },
              null,
              2,
            ),
          );
        } catch (e) {
          console.warn('⚠️ Failed to log deep debug snapshot:', e.message || e);
        }
      }

      const now = new Date();

      if (result.status === 'failed') {
          console.warn(`⚠️ Domain enrichment result status is 'failed' for ${job.domain}`);
          
          await resultsCollection.updateOne(
            { job_id: job.job_id },
            {
              $set: {
                job_id: job.job_id,
                batch_id: job.batch_id,
                domain: job.domain,
                company_name: '',
                address: '',
                phone: '',
                status: 'failed',
                error: 'No valid data found after enrichment',
                updated_at: now,
              },
              $setOnInsert: { created_at: now },
            },
            { upsert: true },
          );

          await jobsCollection.updateOne(
            { job_id: job.job_id },
            { $set: { status: 'failed', error: 'No valid data found', updated_at: now } },
          );
      } else {
        // Get all addresses (supports multi-branch extraction)
        const allAddresses = result.allAddresses || [result.address].filter(Boolean);

        await resultsCollection.updateOne(
          { job_id: job.job_id },
          {
            $set: {
              job_id: job.job_id,
              batch_id: job.batch_id,
              domain: result.domain,
              company_name: result.company_name,
              address: result.address,
              all_addresses: allAddresses, // NEW: Store all branch addresses
              phone: result.phone,
              score: result.score,
              status: 'completed',
              error: null,
              raw_sources: result.debug || null,
              updated_at: now,
            },
            $setOnInsert: { created_at: now },
          },
          { upsert: true },
        );

        await jobsCollection.updateOne(
          { job_id: job.job_id },
          { $set: { status: 'completed', error: null, updated_at: now } },
        );

        console.log(`✅ Domain enrichment completed`, {
          domain: result.domain,
          company_name: result.company_name,
          address: result.address,
          branches: allAddresses.length, // NEW: Log branch count
          phone: result.phone,
          score: result.score,
        });
      }
    } catch (err) {
      console.error(`❌ Domain enrichment failed for ${job.domain}:`, err.message || err);
      console.error(`❌ Error stack:`, err.stack);
      console.error(`❌ Error details:`, {
        name: err.name,
        code: err.code,
        cause: err.cause,
      });

      const now = new Date();

      await resultsCollection.updateOne(
        { job_id: job.job_id },
        {
          $set: {
            job_id: job.job_id,
            batch_id: job.batch_id,
            domain: job.domain,
            company_name: '',
            address: '',
            phone: '',
            score: 0,
            status: 'failed',
            error: err.message || String(err),
            updated_at: now,
          },
          $setOnInsert: {
            created_at: now,
          },
        },
        { upsert: true },
      );

      await jobsCollection.updateOne(
        { job_id: job.job_id },
        {
          $set: {
            status: 'failed',
            error: err.message || String(err),
            updated_at: now,
          },
        },
      );
    } finally {
      activeJobs -= 1;
    }
  } catch (err) {
    console.error('❌ Error in processOneJob:', err);
    console.error('Stack:', err.stack);
    // Make sure we decrement activeJobs even on error
    if (activeJobs > 0) {
      activeJobs -= 1;
    }
  }
}

async function main() {
  console.log('🌐 Starting Domain Enrichment Worker (automation DB)...');
  
  // Show connection info for debugging
  try {
    const { getConnectionConfig } = await import('./src/config/database.js');
    const config = getConnectionConfig('automation');
    console.log(`📡 Connecting to: ${config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials
    console.log(`📦 Database: ${config.database}`);
  } catch (err) {
    console.warn('⚠️  Could not load connection config:', err.message);
  }
  
  try {
    const db = await getDb('automation');
    console.log('✅ Worker initialized. Starting polling loop...\n');
  
  // Verify collection exists and show stats
  try {
    const jobsCollection = await getCollection('domain_enrichment_jobs', 'automation');
    const stats = await jobsCollection.countDocuments({});
    const queuedStats = await jobsCollection.countDocuments({ status: 'queued' });
    const processingStats = await jobsCollection.countDocuments({ status: 'processing' });
    const pendingStats = await jobsCollection.countDocuments({ status: 'pending' });
    const completedStats = await jobsCollection.countDocuments({ status: 'completed' });
    const failedStats = await jobsCollection.countDocuments({ status: 'failed' });
    
    console.log(`📊 Collection stats:`);
    console.log(`   Total: ${stats}`);
    console.log(`   Queued: ${queuedStats}`);
    console.log(`   Processing: ${processingStats}`);
    console.log(`   Pending: ${pendingStats}`);
    console.log(`   Completed: ${completedStats}`);
    console.log(`   Failed: ${failedStats}\n`);
    
    // Ensure indexes exist for optimal query performance
    try {
      console.log('📇 Ensuring database indexes...');
      await jobsCollection.createIndex({ created_at: 1 }, { background: true });
      await jobsCollection.createIndex({ status: 1, created_at: 1 }, { background: true });
      await jobsCollection.createIndex({ batch_id: 1, status: 1 }, { background: true });
      await jobsCollection.createIndex({ job_id: 1 }, { unique: true, background: true });
      console.log('✅ Database indexes verified\n');
    } catch (indexErr) {
      console.warn('⚠️ Index creation warning:', indexErr.message);
    }
    
    // If there are stuck processing jobs, show them
    if (processingStats > 0) {
      const stuckJobs = await jobsCollection.find({ status: 'processing' }).limit(5).toArray();
      console.log(`⚠️  Found ${processingStats} job(s) stuck in 'processing':`);
      stuckJobs.forEach(job => {
        const ageMs = Date.now() - new Date(job.updated_at).getTime();
        const ageMinutes = Math.floor(ageMs / 1000 / 60);
        const ageSeconds = Math.floor((ageMs % 60000) / 1000);
        console.log(`   - ${job.job_id} (${job.domain}): processing for ${ageMinutes}m ${ageSeconds}s`);
      });
      console.log(`   (Will reset if older than ${PROCESSING_TIMEOUT_MS / 1000 / 60} minutes)\n`);
    }
  } catch (err) {
    console.error('❌ Error checking collection:', err.message);
    throw err; // Re-throw to stop worker if DB connection fails
  }


    let pollCount = 0;
    const loop = async () => {
      if (shuttingDown) return;
      pollCount++;
      
      // Log every 12 polls (1 minute) to show worker is alive
      if (pollCount % 12 === 0) {
        console.log(`💓 Worker alive - Poll #${pollCount} (${Math.floor(pollCount * POLL_INTERVAL_MS / 1000)}s elapsed)`);
      }
      
      try {
        // Launch up to MAX_CONCURRENT_JOBS in parallel.
        // We do NOT await here so multiple jobs can be in-flight at once.
        const availableSlots = Math.max(1, MAX_CONCURRENT_JOBS - activeJobs);
        for (let i = 0; i < availableSlots; i += 1) {
          processOneJob().catch((e) => {
            console.error('❌ Worker loop error (processOneJob):', e.message || e);
            console.error('Stack:', e.stack);
          });
        }
      } catch (e) {
        console.error('❌ Worker loop error:', e.message || e);
        console.error('Stack:', e.stack);
      } finally {
        if (!shuttingDown) {
          setTimeout(loop, POLL_INTERVAL_MS);
        }
      }
    };

    loop();

    const graceful = async (signal) => {
      console.log(`\n🛑 Shutting down domain enrichment worker (${signal})...`);
      shuttingDown = true;
      
      // Wait for active jobs to complete
      const check = setInterval(async () => {
        if (activeJobs === 0) {
          clearInterval(check);
          
          // Close browser pool before exit
          if (HeadlessScraperService && HeadlessScraperService.closeBrowserPool) {
            console.log('🧹 Closing browser pool...');
            await HeadlessScraperService.closeBrowserPool();
          }
          
          console.log('✅ Worker shutdown complete');
          process.exit(0);
        }
      }, 500);
    };


    process.on('SIGINT', () => graceful('SIGINT'));
    process.on('SIGTERM', () => graceful('SIGTERM'));
  } catch (err) {
    // This catch handles DB connection errors
    throw err; // Re-throw to be caught by main().catch()
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal worker error:', err.message);
  
  // Provide helpful error messages for common issues
  if (err.message && err.message.includes('ENOTFOUND')) {
    console.error('\n🔧 CONNECTION ERROR DETECTED:');
    console.error('The MongoDB hostname cannot be resolved.');
    console.error('\n📝 SOLUTION:');
    console.error('1. Check your .env file for AUTOMATION_MONGODB_URI');
    console.error('2. Make sure it points to a valid MongoDB server');
    console.error('3. For local MongoDB, use: mongodb://localhost:27017/automation');
    console.error('4. Or remove AUTOMATION_MONGODB_URI from .env to use default');
    console.error('\n💡 Example .env entry:');
    console.error('   AUTOMATION_MONGODB_URI=mongodb://localhost:27017/automation');
    console.error('   # OR if using MONGODB_URI:');
    console.error('   MONGODB_URI=mongodb://localhost:27017/nextjs_stu');
    console.error('   # (automation DB will be derived automatically)\n');
  } else if (err.message && err.message.includes('authentication')) {
    console.error('\n🔧 AUTHENTICATION ERROR:');
    console.error('MongoDB authentication failed. Check your credentials in .env\n');
  } else if (err.message && err.message.includes('ECONNREFUSED')) {
    console.error('\n🔧 CONNECTION REFUSED:');
    console.error('MongoDB server is not running or not accessible.');
    console.error('Make sure MongoDB is running on the specified host/port.\n');
  }
  
  console.error('Full error:', err);
  process.exit(1);
});


