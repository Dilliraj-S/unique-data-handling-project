/**
 * Sync Action Worker
 * 
 * Processes post-classification actions (suppression, campaign stats, subscriber updates).
 * Receives jobs from syncActionQueue with classification results and takes appropriate actions.
 * 
 * Job data: {
 *   classification: { type, subType, dsnCode, dsnStatus, diagnostic, originalMessageId, recipient },
 *   recipientEmail: string,
 *   campaignId: number|null,
 *   subscriberId: number|null,
 *   accountEmail: string
 * }
 * 
 * Usage: node sync-action-worker.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const syncActionQueue = require('./queues/syncActionQueue');
const ActionProcessor = require('./src/application/Services/ActionProcessor');

// Singleton connections
let db = null;
let redis = null;
let actionProcessor = null;

async function getConnections() {
  if (db && redis && actionProcessor) return { db, redis, actionProcessor };

  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db('pluto');

  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: 3,
    lazyConnect: true
  });
  await redis.connect();

  actionProcessor = new ActionProcessor(db, redis);

  console.log('✅ Sync Action Worker: DB + Redis connected');
  return { db, redis, actionProcessor };
}

// Process jobs
syncActionQueue.process(5, async (job) => {
  const { classification, recipientEmail, campaignId, subscriberId, accountEmail } = job.data;

  console.log(`[sync-action-worker] Job ${job.id}: type=${classification.type}, email=${recipientEmail}`);

  const { actionProcessor: processor } = await getConnections();

  const result = await processor.process(
    classification,
    recipientEmail,
    campaignId,
    subscriberId,
    accountEmail
  );

  return {
    type: classification.type,
    subType: classification.subType,
    actionsApplied: result.actionsApplied,
    suppressed: result.suppressed,
    campaignPaused: result.campaignPaused
  };
});

// Event handlers
syncActionQueue.on('completed', (job, result) => {
  if (result.suppressed || result.campaignPaused) {
    console.log(`[sync-action-worker] ✅ Job ${job.id} complete: ${result.type}/${result.subType} | suppressed: ${result.suppressed} | campaign_paused: ${result.campaignPaused}`);
  }
});

syncActionQueue.on('failed', (job, err) => {
  console.error(`[sync-action-worker] ❌ Job ${job.id} failed:`, err.message);
});

syncActionQueue.on('error', (error) => {
  console.error('[sync-action-worker] Queue error:', error.message);
});

console.log('🚀 Sync Action Worker started (concurrency: 5)');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[sync-action-worker] Shutting down...');
  await syncActionQueue.close();
  if (redis) await redis.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[sync-action-worker] Shutting down...');
  await syncActionQueue.close();
  if (redis) await redis.disconnect();
  process.exit(0);
});
