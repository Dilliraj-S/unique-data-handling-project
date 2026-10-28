#!/usr/bin/env node

/**
 * Gmail Photo Scraper Worker — DOM-Based Batch Processing
 * ──────────────────────────────────────────────────────────────────────
 * A session monitor watches for running sessions in MongoDB.
 * For each session, it spawns N browser workers (session.browser_count).
 * Each browser processes emails in BATCHES of 20 via DOM extraction.
 *
 * Architecture:
 *   main() → sessionMonitor()
 *     → for each running session, spawn workerLoop(1..N, sessionId, cookiesPath)
 *     → each workerLoop manages its own browser as LOCAL variables
 *     → grabBatch(sessionId) atomically grabs up to BATCH_SIZE jobs
 *     → saveBatchResults() handles bulk DB writes + session completion
 *
 * Scraping Method:
 *   - PRIMARY: getPhotoBatchViaDOM() — DOM-based extraction (fast, reliable)
 *   - Types all emails into To field, waits for avatar render, queries DOM
 *   - ~120-150 emails/min per browser vs ~12/min with old interception
 *
 * Multi-user:
 *   - Each session has a user_id + browser_count
 *   - Cookies stored per-user: data/gmail-session/cookies_{user_id}.json
 *   - Worker 1 of each session saves cookies, others read-only
 *
 * Run:
 *   node gmail-photo-scraper-worker.js
 *   npm run queue:gmail-scraper
 */

import 'dotenv/config';
import { getDb, getCollection } from './src/lib/mongodb.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const GmailPhotoScraper = require('../src/services/GmailPhotoScraper.js');

// ─── Configuration ─────────────────────────────────────────────────
const MAX_TOTAL_BROWSERS      = parseInt(process.env.GMAIL_MAX_BROWSERS || '120', 10);
const BATCH_SIZE              = parseInt(process.env.GMAIL_BATCH_SIZE || '20', 10);
const POLL_INTERVAL_MS        = 200;
const SESSION_CHECK_INTERVAL  = 5000;   // check for new/stopped sessions every 5s
const COOKIES_DIR             = process.env.GMAIL_SCRAPER_COOKIES_DIR
                                || './data/gmail-session';
const PROCESSING_TIMEOUT_MS   = 5 * 60 * 1000; // 5 min stuck detection
const REOPEN_COMPOSE_EVERY    = 10;     // reopen compose every N batches (~750 emails)
const HEALTH_CHECK_EVERY      = 7;      // session health check every N batches (~525 emails)

// ─── Module-level state ────────────────────────────────────────────
let shuttingDown = false;
let totalBrowsersActive = 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function isPageClosedError(err) {
  const msg = String(err?.message || err);
  return msg.includes('Target page, context or browser has been closed') ||
    msg.includes('Target closed') ||
    msg.includes('has been closed') ||
    msg.includes('browser has been closed');
}

// ─── Per-user cookie path ──────────────────────────────────────────
function getCookiesPath(userId) {
  const fs = require('fs');
  const path = require('path');
  const dir = path.resolve(COOKIES_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, `cookies_${userId || 'default'}.json`);
}

// ─── Stuck Job Reset (called ONCE at startup) ──────────────────────
async function resetStuckJobs() {
  const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
  const threshold = new Date(Date.now() - PROCESSING_TIMEOUT_MS);

  const result = await jobsCol.updateMany(
    { status: 'processing', updated_at: { $lt: threshold } },
    { $set: { status: 'queued', updated_at: new Date() } }
  );

  if (result.modifiedCount > 0) {
    console.log(`🔄 Reset ${result.modifiedCount} stuck jobs back to 'queued'`);
  }
}

// ─── Atomic Batch Job Grabber ──────────────────────────────────────
/**
 * Atomically grab up to `batchSize` queued jobs for a session.
 * Uses find + bulkWrite to prevent double-processing.
 * 
 * @param {string} sessionId
 * @param {number} batchSize - max jobs to grab (default: BATCH_SIZE)
 * @returns {Array} Array of job documents (may be empty)
 */
async function grabBatch(sessionId, batchSize = BATCH_SIZE) {
  const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
  
  // Find candidate jobs
  const candidates = await jobsCol.find({
    session_id: sessionId,
    status: 'queued',
  })
    .sort({ email_index: 1 })
    .limit(batchSize)
    .toArray();

  if (candidates.length === 0) return [];

  const jobIds = candidates.map(j => j.job_id);
  const now = new Date();

  // Atomically mark them as processing
  // Only updates jobs that are still 'queued' — safe against race conditions
  const result = await jobsCol.updateMany(
    { job_id: { $in: jobIds }, status: 'queued' },
    { $set: { status: 'processing', updated_at: now } }
  );

  if (result.modifiedCount === 0) return [];

  // Re-fetch the ones we actually grabbed (in case some were taken by another worker)
  const grabbed = await jobsCol.find({
    job_id: { $in: jobIds },
    status: 'processing',
    updated_at: now,
  }).toArray();

  return grabbed;
}

// ─── Batch Result Writer + Session Completion ──────────────────────
/**
 * Save results for a batch of jobs using bulk operations.
 * Inserts results, updates job statuses, increments session counters,
 * and detects session completion.
 * 
 * @param {Array} jobs - Array of job documents
 * @param {Map<string, string>} resultsMap - Map of email → imageUrl
 */
async function saveBatchResults(jobs, resultsMap) {
  const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
  const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
  const resultsCol = await getCollection('gmail_scrape_results', 'automation');

  const now = new Date();
  const resultDocs = [];
  let withImage = 0;
  let noImage = 0;
  let failed = 0;

  for (const job of jobs) {
    const emailKey = job.email.toLowerCase().trim();
    const imageUrl = resultsMap.get(emailKey) || '';
    const hasImage = imageUrl
      ? !imageUrl.includes('default-user') && imageUrl.length > 0
      : false;

    resultDocs.push({
      session_id: job.session_id,
      user_id: job.user_id || 'default',
      email: job.email,
      image_url: imageUrl,
      has_image: hasImage,
      scraped_at: now,
    });

    if (hasImage) withImage++;
    else if (imageUrl === '') failed++;
    else noImage++;
  }

  // Bulk insert results
  if (resultDocs.length > 0) {
    await resultsCol.insertMany(resultDocs, { ordered: false });
  }

  // Mark all jobs completed
  const jobIds = jobs.map(j => j.job_id);
  await jobsCol.updateMany(
    { job_id: { $in: jobIds } },
    { $set: { status: 'completed', updated_at: now } }
  );

  // Increment session counters atomically
  const sessionId = jobs[0].session_id;
  const inc = { processed: jobs.length };
  if (withImage > 0) inc.with_image = withImage;
  if (noImage > 0) inc.no_image = noImage;
  if (failed > 0) inc.failed = failed;

  await sessionsCol.updateOne(
    { session_id: sessionId },
    { $inc: inc, $set: { updated_at: now } }
  );

  // Check if session is complete
  const remainingJobs = await jobsCol.countDocuments({
    session_id: sessionId,
    // Consider 'processing' as still in-flight. Otherwise session can flip to completed
    // while other workers are mid-batch, which causes worker pools to exit early.
    status: { $in: ['pending', 'queued', 'processing'] },
  });

  if (remainingJobs === 0) {
    // Idempotent — safe if multiple workers detect this simultaneously
    await sessionsCol.updateOne(
      { session_id: sessionId },
      { $set: { status: 'completed', login_status: 'waiting', updated_at: now } }
    );
    console.log(`\n✅ Session ${sessionId} complete!`);
  }

  return { total: jobs.length, withImage, noImage, failed };
}

// ─── Independent Worker Loop (one per browser per session) ─────────
async function workerLoop(workerId, sessionId, cookiesPath) {
  const tag = `[${sessionId.substring(0, 12)}·W${String(workerId).padStart(2, '0')}]`;

  // LOCAL variables — each worker manages its own browser
  let browser = null;
  let context = null;
  let page = null;
  let batchCount = 0;       // batches processed since last browser launch
  let totalEmails = 0;      // total emails processed by this worker
  let consecutiveErrors = 0;
  let emptyPollCount = 0;   // for exponential backoff on empty queue

  totalBrowsersActive++;
  console.log(`${tag} 🚀 Starting (total active: ${totalBrowsersActive})`);

  while (!shuttingDown) {
    try {
      // Check if our session is still running
      const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
      const session = await sessionsCol.findOne({ session_id: sessionId });
      if (!session || (session.status !== 'running' && session.status !== 'paused')) {
        console.log(`${tag} 📭 Session ${sessionId} no longer running — exiting`);
        break;
      }
      if (session.status === 'paused') {
        await sleep(2000);
        continue;
      }

      // ── Browser launch + Login block ────────────────────────────
      if (!browser) {
        console.log(`${tag} 🚀 Launching browser...`);

        const b = await GmailPhotoScraper.createBrowser(cookiesPath);
        browser = b.browser;
        context = b.context;
        page = b.page;

        // Manual login — wait for user to login in browser window
        console.log(`${tag} 🔐 Waiting for manual Gmail login...`);
        console.log(`${tag}    Please login in the Chrome window that just opened.`);

        const loggedIn = await GmailPhotoScraper.waitForGmailLogin(
          page, context,
          workerId === 1 ? cookiesPath : null // Only W01 saves cookies
        );
        if (!loggedIn) {
          console.error(`${tag} ❌ Login failed — retrying in 30s`);
          try { await browser.close(); } catch {}
          browser = context = page = null;
          await sleep(30000);
          continue;
        }

        // Update login status for UI
        await sessionsCol.updateOne(
          { session_id: sessionId, login_status: 'waiting' },
          { $set: { login_status: 'logged_in', updated_at: new Date() } }
        );

        // Open compose window — scraping starts automatically after login
        console.log(`${tag} ✅ Logged in! Opening compose window...`);
        const opened = await GmailPhotoScraper.openCompose(page);
        if (!opened) {
          console.error(`${tag} ❌ Compose failed — retrying in 5s`);
          try { await browser.close(); } catch {}
          browser = context = page = null;
          await sleep(5000);
          continue;
        }

        console.log(`${tag} ✅ Browser ready — auto-starting batch scraping`);
        batchCount = 0;
        consecutiveErrors = 0;
      }

      // ── Grab batch of jobs ──────────────────────────────────────
      const jobs = await grabBatch(sessionId, BATCH_SIZE);
      if (jobs.length === 0) {
        emptyPollCount++;
        const backoff = Math.min(POLL_INTERVAL_MS * Math.pow(1.5, emptyPollCount), 5000);
        await sleep(backoff);
        continue;
      }
      emptyPollCount = 0; // Reset on successful grab

      const emails = jobs.map(j => j.email);

      // ── Reopen compose periodically ─────────────────────────────
      if (batchCount > 0 && batchCount % REOPEN_COMPOSE_EVERY === 0) {
        console.log(`${tag} 🔄 Reopening compose (batch #${batchCount})...`);
        await GmailPhotoScraper.closeCompose(page);
        await page.waitForTimeout(1500);
        await GmailPhotoScraper.openCompose(page);
      }

      // ── Session health check ────────────────────────────────────
      if (batchCount > 0 && batchCount % HEALTH_CHECK_EVERY === 0) {
        const alive = await GmailPhotoScraper.isStillLoggedIn(page);
        if (!alive) {
          console.warn(`${tag} ⚠️ Session expired — re-queuing batch and restarting browser`);
          // Re-queue the grabbed jobs
          const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
          await jobsCol.updateMany(
            { job_id: { $in: jobs.map(j => j.job_id) } },
            { $set: { status: 'queued', updated_at: new Date() } }
          );
          try { await browser.close(); } catch {}
          browser = context = page = null;
          continue;
        }
      }

      // ── Process batch — DOM-based extraction ────────────────────
      console.log(`${tag} 📦 Batch #${batchCount + 1}: ${jobs.length} emails`);
      let resultsMap;

      try {
        console.log(`${tag} 🧩 [Batch] DOM extraction start`);
        resultsMap = await GmailPhotoScraper.getPhotoBatchViaDOM(page, emails);

        const nonEmpty = [...resultsMap.values()].filter(v => typeof v === 'string' && v.length > 0 && !v.includes('default-user')).length;
        console.log(`${tag} 🧩 [Batch] DOM extraction done. nonEmpty=${nonEmpty}/${emails.length}`);

        // If DOM extraction found nothing, fall back to network interception once.
        // This helps when Gmail doesn't render avatars into the DOM reliably.
        if (nonEmpty === 0 && process.env.GMAIL_SCRAPER_FALLBACK_INTERCEPTION === 'true') {
          console.warn(`${tag} ⚠️ DOM extraction returned 0 images — falling back to interception method`);
          await GmailPhotoScraper.clearToField(page);
          resultsMap = await GmailPhotoScraper.getPhotoBatchViaInterception(page, emails);
          const nonEmpty2 = [...resultsMap.values()].filter(v => typeof v === 'string' && v.length > 0 && !v.includes('default-user')).length;
          console.log(`${tag} 🧩 [Batch] Interception extraction done. nonEmpty=${nonEmpty2}/${emails.length}`);
        }

        await GmailPhotoScraper.clearToField(page);
      } catch (err) {
        console.error(`${tag} ❌ Batch DOM error: ${err.message}`);

        // Critical: if the Playwright page/browser died, do not mark jobs completed with empty results.
        // Re-queue them and restart the browser so batch #2+ can continue.
        if (isPageClosedError(err)) {
          console.warn(`${tag} ♻️ Detected closed page/browser. Re-queuing batch jobs and restarting browser...`);
          const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
          const jobIds = jobs.map(j => j.job_id);
          await jobsCol.updateMany(
            { job_id: { $in: jobIds } },
            { $set: { status: 'queued', updated_at: new Date() } }
          );

          consecutiveErrors++;
          try { if (browser) await browser.close(); } catch {}
          browser = context = page = null;

          // Backoff before continuing with the next poll.
          // If we're repeatedly crashing, slow down to allow Gmail/UI to settle.
          if (consecutiveErrors >= 3) {
            console.warn(`${tag} 🔥 Repeated page crashes (${consecutiveErrors}). Backing off 30s...`);
            await sleep(30000);
          } else {
            await sleep(5000);
          }
          continue;
        }

        try { await GmailPhotoScraper.clearToField(page); } catch {}

        // Non-fatal DOM extraction error: mark all as empty to unblock session.
        resultsMap = new Map();
        for (const email of emails) {
          resultsMap.set(email.toLowerCase().trim(), '');
        }
      }

      // ── Save batch results ──────────────────────────────────────
      const stats = await saveBatchResults(jobs, resultsMap);
      batchCount++;
      totalEmails += jobs.length;
      consecutiveErrors = 0;

      console.log(
        `${tag} ✅ Batch #${batchCount}: ${stats.withImage}📷 ${stats.noImage}👤 ${stats.failed}❌ ` +
        `(total: ${totalEmails} emails)`
      );

      // ── Adaptive delay (once per batch, not per email) ──────────
      const delay = GmailPhotoScraper.getAdaptiveDelay(totalEmails);
      await sleep(delay);

      // ── Full pause at milestones ────────────────────────────────
      const pauseMs = GmailPhotoScraper.shouldTakeFullPause(totalEmails);
      if (pauseMs > 0) {
        console.log(`${tag} ⏸️  Full pause: ${pauseMs / 1000}s (${totalEmails} emails processed)`);
        await sleep(pauseMs);
      }

    } catch (err) {
      consecutiveErrors++;
      console.error(`${tag} ❌ Error #${consecutiveErrors}: ${err.message}`);

      if (consecutiveErrors >= 3) {
        console.warn(`${tag} 🔄 3 errors — restarting browser in 5s`);
        if (browser) { try { await browser.close(); } catch {} }
        browser = context = page = null;
        consecutiveErrors = 0;
        await sleep(5000);
      } else {
        await sleep(2000);
      }
    }
  }

  // ── Shutdown: close this worker's browser ─────────────────────
  if (browser) {
    try { await browser.close(); } catch {}
  }
  totalBrowsersActive--;
  console.log(`${tag} 🛑 Stopped (total active: ${totalBrowsersActive})`);
}

// ─── Session Monitor (watches for new/stopped sessions) ────────────
async function sessionMonitor() {
  // Map: session_id → { workers: Promise[], userId, browserCount }
  const activePools = new Map();

  console.log(`👁️ Session monitor started (checking every ${SESSION_CHECK_INTERVAL / 1000}s)\n`);

  while (!shuttingDown) {
    try {
      const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
      const runningSessions = await sessionsCol.find({ status: 'running' }).toArray();

      // ── Spawn browsers for NEW sessions ────────────────────────
      for (const session of runningSessions) {
        if (activePools.has(session.session_id)) continue; // Already managed

        // Use planned active pools for capacity math.
        // totalBrowsersActive is updated inside each workerLoop asynchronously,
        // which can momentarily lag and cause under-allocation (browser count mismatch).
        const plannedActiveBrowsers = Array.from(activePools.values())
          .reduce((sum, p) => sum + (p.browserCount || 0), 0);

        let count = Math.min(
          session.browser_count || 3,
          40, // per-session hard cap — prevents one session monopolizing all global slots
          MAX_TOTAL_BROWSERS - plannedActiveBrowsers // Don't exceed system-wide cap
        );
        
        // Memory guard: on Linux, check available memory before spawning
        if (process.platform === 'linux') {
          try {
            const { execSync } = require('child_process');
            const memInfo = execSync('cat /proc/meminfo').toString();
            const availMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
            const availMB = availMatch ? parseInt(availMatch[1]) / 1024 : 99999;
            // Each Chromium instance needs ~350MB RAM
            const maxByMemory = Math.floor(availMB / 350);
            if (maxByMemory < count) {
              console.warn(`⚠️ Memory limit: capping at ${maxByMemory} browsers (${Math.round(availMB)}MB free)`);
              count = Math.min(count, maxByMemory);
            }
          } catch { /* ignore on platforms without /proc/meminfo */ }
        }

        if (count <= 0) {
          console.warn(`⚠️ Cannot start session ${session.session_id}: ${totalBrowsersActive}/${MAX_TOTAL_BROWSERS} browsers active`);
          continue;
        }

        const userId = session.user_id || 'default';
        const cookiesPath = getCookiesPath(userId);

        console.log(`\n🚀 Spawning ${count} browser(s) for session ${session.session_id} (user: ${userId})`);
        console.log(`   📝 Batch size: ${BATCH_SIZE} emails/batch | DOM-based extraction`);

        const workers = [];
        for (let i = 1; i <= count; i++) {
          workers.push(workerLoop(i, session.session_id, cookiesPath));
          if (i < count) {
            await sleep(1000); // 1s stagger between each browser
          }
        }

        activePools.set(session.session_id, { workers, userId, browserCount: count });
      }

      // ── Cleanup finished sessions ──────────────────────────────
      const runningIds = new Set(runningSessions.map(s => s.session_id));
      for (const [sid] of activePools) {
        if (!runningIds.has(sid)) {
          console.log(`📭 Session ${sid} no longer running — pool will exit naturally`);
          activePools.delete(sid);
        }
      }

    } catch (err) {
      console.error('❌ Session monitor error:', err.message);
    }

    await sleep(SESSION_CHECK_INTERVAL);
  }

  // Wait for all worker pools to finish
  const allWorkers = [];
  for (const [, pool] of activePools) {
    allWorkers.push(...pool.workers);
  }
  if (allWorkers.length > 0) {
    console.log(`⏳ Waiting for ${allWorkers.length} workers to stop...`);
    await Promise.allSettled(allWorkers);
  }
}

// ─── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('📧 Gmail Photo Scraper Worker — DOM Batch Mode');
  console.log(`   Max browsers: ${MAX_TOTAL_BROWSERS}`);
  console.log(`   Batch size: ${BATCH_SIZE} emails`);
  console.log(`   Cookies dir: ${COOKIES_DIR}`);
  console.log(`   Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`   Session check: every ${SESSION_CHECK_INTERVAL / 1000}s`);
  console.log(`   Reopen compose: every ${REOPEN_COMPOSE_EVERY} batches (~${REOPEN_COMPOSE_EVERY * BATCH_SIZE} emails)`);
  console.log(`   Health check: every ${HEALTH_CHECK_EVERY} batches (~${HEALTH_CHECK_EVERY * BATCH_SIZE} emails)\n`);

  // ── DB connection + startup tasks ──────────────────────────────
  try {
    await getDb('automation');
    console.log('✅ Connected to automation database');

    // Reset stuck jobs — ONCE only
    await resetStuckJobs();

    // Cleanup orphaned jobs from completed/failed sessions
    const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
    const nonRunningSessions = await sessionsCol
      .find({ status: { $in: ['failed', 'completed'] } })
      .project({ session_id: 1 })
      .toArray();

    if (nonRunningSessions.length > 0) {
      const orphanIds = nonRunningSessions.map(s => s.session_id);
      const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
      const cleanup = await jobsCol.updateMany(
        { session_id: { $in: orphanIds }, status: { $in: ['queued', 'pending'] } },
        { $set: { status: 'cancelled', updated_at: new Date() } }
      );
      if (cleanup.modifiedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanup.modifiedCount} orphaned jobs from ${nonRunningSessions.length} old sessions`);
      }
    }

    // Ensure indexes
    const resultsCol = await getCollection('gmail_scrape_results', 'automation');
    await resultsCol.createIndex({ session_id: 1, scraped_at: -1 }, { background: true });
    await resultsCol.createIndex({ user_id: 1 }, { background: true });

    // Show stats
    const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
    const total = await jobsCol.countDocuments({});
    const queued = await jobsCol.countDocuments({ status: 'queued' });
    const processing = await jobsCol.countDocuments({ status: 'processing' });
    console.log(`📊 Jobs: Total=${total}, Queued=${queued}, Processing=${processing}\n`);
  } catch (err) {
    console.error('❌ Failed to connect to automation DB:', err.message);
    process.exit(1);
  }

  // ── Start session monitor (replaces fixed workerLoop launch) ───
  await sessionMonitor();
  console.log('\n✅ Session monitor stopped — all workers exited');
}

// ─── Graceful Shutdown ─────────────────────────────────────────────
const graceful = async (signal) => {
  console.log(`\n🛑 Shutting down (${signal})...`);
  shuttingDown = true;
  // All workerLoops check shuttingDown and exit naturally.
  // Give them 15s to finish current batch and close browsers.
  await sleep(15000);
  process.exit(0);
};

process.on('SIGINT', () => graceful('SIGINT'));
process.on('SIGTERM', () => graceful('SIGTERM'));

main().catch((err) => {
  console.error('\n❌ Fatal worker error:', err.message);
  if (err.message && err.message.includes('ENOTFOUND')) {
    console.error('\n🔧 Cannot reach MongoDB. Check AUTOMATION_MONGODB_URI in .env');
  }
  console.error('Full error:', err);
  process.exit(1);
});
