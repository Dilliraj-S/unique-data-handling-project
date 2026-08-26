#!/usr/bin/env node
/**
 * Clear/Reset Bull queue: "CSV Import Processing"
 *
 * Usage:
 *   node scripts/clear-import-queue.js --clean
 *   node scripts/clear-import-queue.js --obliterate
 *
 * Env (optional):
 *   REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
 */
require('dotenv').config();
const Queue = require('bull');

const QUEUE_NAME = 'CSV Import Processing';
const mode = process.argv.includes('--obliterate')
  ? 'obliterate'
  : process.argv.includes('--clean')
    ? 'clean'
    : null;

if (!mode) {
  console.error('Missing mode. Use --clean or --obliterate');
  process.exit(2);
}

const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0,
};

async function main() {
  const q = new Queue(QUEUE_NAME, { redis });
  await q.isReady();

  // Pausing reduces the chance of a worker re-adding locks while you clear.
  await q.pause(true);

  if (mode === 'clean') {
    const graceMs = 0;
    // Remove jobs in every state (Bull v3 supports these states).
    await q.clean(graceMs, 'wait');
    await q.clean(graceMs, 'active');
    await q.clean(graceMs, 'delayed');
    await q.clean(graceMs, 'paused');
    await q.clean(graceMs, 'completed');
    await q.clean(graceMs, 'failed');

    // Also empty the waiting list.
    await q.empty();
    console.log(`✅ Cleaned jobs for queue: ${QUEUE_NAME}`);
  } else {
    // Hard reset. This deletes ALL Redis keys for the queue.
    // force: true required if there might be active jobs.
    await q.obliterate({ force: true });
    console.log(`✅ Obliterated queue: ${QUEUE_NAME}`);
  }

  await q.close();
}

main().catch((err) => {
  console.error('❌ Failed to clear queue:', err);
  process.exit(1);
});


