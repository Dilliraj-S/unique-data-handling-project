#!/usr/bin/env node

/**
 * DIAGNOSTIC SCRIPT: Why did 2 accounts hit daily limit?
 * 
 * Run on server: node diagnose-daily-limit.js
 * 
 * This script checks:
 * 1. daily_send_limit field on the 2 broken accounts vs working accounts
 * 2. How many emails each account sent in the last 24 hours (rolling window)
 * 3. Cross-campaign send history for the broken accounts
 */

require('dotenv').config();
const { MongoClient, Long } = require('mongodb');

const CAMPAIGN_ID = 1;
const PROGRESS_ID = '5475a554-1cf5-461d-afcf-2d2839de314b';
const BROKEN_ACCOUNTS = [
  'walter.bailey@innodatabase.com',
  'roy.bennett@theemaildata.com'
];
const DEFAULT_DAILY_SEND_LIMIT = parseInt(process.env.DEFAULT_DAILY_SEND_LIMIT, 10) || 500;

async function diagnose() {
  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = await MongoClient.connect(mongoUrl);
  const db = client.db('pluto');

  console.log('═══════════════════════════════════════════════════════');
  console.log('  DIAGNOSTIC: Daily Limit Root Cause Analysis');
  console.log('═══════════════════════════════════════════════════════\n');

  // ─── CHECK 1: daily_send_limit field on broken accounts ───
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CHECK 1: daily_send_limit FIELD ON ACCOUNTS         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const brokenAccounts = await db.collection('email_accounts').find({
    email: { $in: BROKEN_ACCOUNTS }
  }, {
    projection: { email: 1, daily_send_limit: 1, status: 1, _id: 0 }
  }).toArray();

  for (const acc of brokenAccounts) {
    const effectiveLimit = acc.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;
    const hasField = acc.daily_send_limit !== null && acc.daily_send_limit !== undefined;
    console.log(`  🔴 ${acc.email}`);
    console.log(`     daily_send_limit in DB:  ${hasField ? acc.daily_send_limit : 'NOT SET (null/missing)'}`);
    console.log(`     Effective daily limit:   ${effectiveLimit} ${!hasField ? '← USING DEFAULT!' : ''}`);
    console.log(`     Status:                  ${acc.status}`);
    console.log('');
  }

  // Get a sample of working accounts for comparison
  const workingAccounts = await db.collection('email_accounts').find({
    email: { $nin: BROKEN_ACCOUNTS },
    status: 'active'
  }, {
    projection: { email: 1, daily_send_limit: 1, _id: 0 }
  }).limit(5).toArray();

  console.log('  Sample WORKING accounts for comparison:');
  for (const acc of workingAccounts) {
    const hasField = acc.daily_send_limit !== null && acc.daily_send_limit !== undefined;
    console.log(`  🟢 ${acc.email} → daily_send_limit: ${hasField ? acc.daily_send_limit : 'NOT SET'}`);
  }

  // Count accounts with and without daily_send_limit set
  const withLimit = await db.collection('email_accounts').countDocuments({
    status: 'active',
    daily_send_limit: { $exists: true, $ne: null, $gt: 0 }
  });
  const withoutLimit = await db.collection('email_accounts').countDocuments({
    status: 'active',
    $or: [
      { daily_send_limit: { $exists: false } },
      { daily_send_limit: null },
      { daily_send_limit: 0 }
    ]
  });
  console.log(`\n  📊 Active accounts WITH daily_send_limit set:    ${withLimit}`);
  console.log(`  📊 Active accounts WITHOUT daily_send_limit set: ${withoutLimit}`);

  // ─── CHECK 2: 24-hour rolling window count ───
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  CHECK 2: 24-HOUR ROLLING WINDOW SEND COUNT          ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Use the campaign's scheduled time as reference point
  const campaignScheduledAt = new Date('2026-04-09T13:30:00.000Z'); // 19:00 IST = 13:30 UTC
  const twentyFourHoursBefore = new Date(campaignScheduledAt.getTime() - 24 * 60 * 60 * 1000);

  console.log(`  Reference time (campaign start): ${campaignScheduledAt.toISOString()} (19:00 IST)`);
  console.log(`  24h window start:                ${twentyFourHoursBefore.toISOString()}\n`);

  for (const email of BROKEN_ACCOUNTS) {
    // Count sent in 24h window BEFORE campaign start
    const sentBefore = await db.collection('email_campaign_logs').countDocuments({
      from_email: email,
      status: 'sent',
      sent_at: { $gte: twentyFourHoursBefore, $lte: campaignScheduledAt }
    });

    // Count sent AFTER campaign start (in this campaign)
    const sentAfter = await db.collection('email_campaign_logs').countDocuments({
      from_email: email,
      status: 'sent',
      sent_at: { $gt: campaignScheduledAt }
    });

    // Total in 24h rolling window at the time of the block
    const totalIn24h = sentBefore + sentAfter;

    // Get the account's daily_send_limit
    const acc = brokenAccounts.find(a => a.email === email);
    const effectiveLimit = acc?.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;

    console.log(`  🔴 ${email}:`);
    console.log(`     Sent BEFORE this campaign (in 24h window): ${sentBefore}`);
    console.log(`     Sent IN this campaign:                     ${sentAfter}`);
    console.log(`     Total in 24h window:                       ${totalIn24h}`);
    console.log(`     Effective daily limit:                     ${effectiveLimit}`);
    console.log(`     Remaining capacity at campaign start:      ${Math.max(0, effectiveLimit - sentBefore)}`);
    console.log(`     MATH CHECK: ${effectiveLimit} - ${sentBefore} = ${effectiveLimit - sentBefore} → sent ${sentAfter}`);
    console.log('');
  }

  // Same check for a sample working account
  const sampleWorking = workingAccounts[0];
  if (sampleWorking) {
    const sentBefore = await db.collection('email_campaign_logs').countDocuments({
      from_email: sampleWorking.email,
      status: 'sent',
      sent_at: { $gte: twentyFourHoursBefore, $lte: campaignScheduledAt }
    });
    const sentAfter = await db.collection('email_campaign_logs').countDocuments({
      from_email: sampleWorking.email,
      status: 'sent',
      sent_at: { $gt: campaignScheduledAt }
    });
    const effectiveLimit = sampleWorking.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;
    console.log(`  🟢 ${sampleWorking.email} (working account):`);
    console.log(`     Sent BEFORE this campaign (in 24h window): ${sentBefore}`);
    console.log(`     Sent IN this campaign:                     ${sentAfter}`);
    console.log(`     Effective daily limit:                     ${effectiveLimit}`);
    console.log(`     Remaining capacity at campaign start:      ${Math.max(0, effectiveLimit - sentBefore)}`);
    console.log('');
  }

  // ─── CHECK 3: Cross-campaign history for broken accounts ───
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CHECK 3: CROSS-CAMPAIGN SEND HISTORY (48 HOURS)     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const fortyEightHoursAgo = new Date(campaignScheduledAt.getTime() - 48 * 60 * 60 * 1000);

  for (const email of BROKEN_ACCOUNTS) {
    const history = await db.collection('email_campaign_logs').aggregate([
      {
        $match: {
          from_email: email,
          status: 'sent',
          sent_at: { $gte: fortyEightHoursAgo }
        }
      },
      {
        $group: {
          _id: {
            campaign_id: '$campaign_id',
            progress_id: '$progress_id'
          },
          count: { $sum: 1 },
          earliest: { $min: '$sent_at' },
          latest: { $max: '$sent_at' }
        }
      },
      { $sort: { earliest: -1 } }
    ]).toArray();

    console.log(`  🔴 ${email} — send history (last 48h):`);
    if (history.length === 0) {
      console.log('     No sent emails found in last 48 hours');
    }
    for (const h of history) {
      const isThisCampaign = h._id.progress_id === PROGRESS_ID;
      console.log(`     ${isThisCampaign ? '→ THIS' : '  prev'} campaign_id=${h._id.campaign_id} progress_id=${h._id.progress_id?.substring(0, 8)}...`);
      console.log(`       Sent: ${h.count} | From: ${h.earliest?.toISOString()} | To: ${h.latest?.toISOString()}`);
    }
    console.log('');
  }

  // ─── CHECK 4: Pending emails for broken accounts ───
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CHECK 4: CURRENT PENDING STATUS FOR BROKEN ACCOUNTS ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  for (const email of BROKEN_ACCOUNTS) {
    const pending = await db.collection('email_campaign_logs').countDocuments({
      from_email: email,
      campaign_id: Long.fromNumber(CAMPAIGN_ID),
      progress_id: PROGRESS_ID,
      status: 'pending'
    });
    const sent = await db.collection('email_campaign_logs').countDocuments({
      from_email: email,
      campaign_id: Long.fromNumber(CAMPAIGN_ID),
      progress_id: PROGRESS_ID,
      status: 'sent'
    });
    const failed = await db.collection('email_campaign_logs').countDocuments({
      from_email: email,
      campaign_id: Long.fromNumber(CAMPAIGN_ID),
      progress_id: PROGRESS_ID,
      status: 'failed'
    });
    const samplePending = await db.collection('email_campaign_logs').findOne({
      from_email: email,
      campaign_id: Long.fromNumber(CAMPAIGN_ID),
      progress_id: PROGRESS_ID,
      status: 'pending'
    }, { projection: { error_message: 1, updated_at: 1, _id: 0 } });

    console.log(`  🔴 ${email}:`);
    console.log(`     Sent:    ${sent}`);
    console.log(`     Pending: ${pending}`);
    console.log(`     Failed:  ${failed}`);
    console.log(`     Error:   ${samplePending?.error_message || 'N/A'}`);
    console.log(`     Last update: ${samplePending?.updated_at?.toISOString() || 'N/A'}`);
    console.log('');
  }

  // ─── CHECK 5: Redis daily counter (if accessible) ───
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CHECK 5: REDIS CACHED DAILY COUNT (if available)    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    const Redis = require('ioredis');
    const redis = new Redis({ host: 'localhost', port: 6379 });
    
    for (const email of BROKEN_ACCOUNTS) {
      const dailyKey = `perf:daily_sent:${email}`;
      const batchKey = `batch:atomic:${email}:${CAMPAIGN_ID}:${PROGRESS_ID}`;
      
      const dailyVal = await redis.get(dailyKey);
      const batchVal = await redis.get(batchKey);
      const dailyTTL = await redis.ttl(dailyKey);
      const batchTTL = await redis.ttl(batchKey);
      
      console.log(`  🔴 ${email}:`);
      console.log(`     Redis daily count:  ${dailyVal || 'expired/not set'} (TTL: ${dailyTTL}s)`);
      console.log(`     Redis batch count:  ${batchVal || 'expired/not set'} (TTL: ${batchTTL}s)`);
    }
    
    await redis.disconnect();
  } catch (e) {
    console.log(`  ⚠️ Redis not available: ${e.message}`);
  }

  // ─── SUMMARY ───
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DIAGNOSIS SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('  Look at CHECK 1 results:');
  console.log('  → If daily_send_limit is NULL/missing on the 2 broken accounts,');
  console.log('    they default to 500 instead of 1450. That is the root cause.\n');
  console.log('  Look at CHECK 2 results:');
  console.log('  → If "Sent BEFORE this campaign" > 0 for broken accounts,');
  console.log('    previous campaign sends consumed their daily capacity.\n');
  console.log('  Look at CHECK 3 results:');
  console.log('  → Shows exactly which previous campaigns consumed the quota.\n');

  await client.close();
  console.log('Done.');
}

diagnose().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
