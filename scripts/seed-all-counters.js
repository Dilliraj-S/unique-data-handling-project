/**
 * seed-all-counters.js — Seed ALL atomic counters used by the system
 * 
 * Counters:
 *   1. email_campaign_logs — used by EmailDeliveryService + DispatchCampaignJob
 *   2. campaign_progress   — used by send-email.js + schedule-email.js
 * 
 * USAGE:
 *   node scripts/seed-all-counters.js          # Dry run
 *   node scripts/seed-all-counters.js --apply  # Apply
 */

const { MongoClient, Long } = require('mongodb');

const MONGO_URI = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
const DRY_RUN = !process.argv.includes('--apply');

const COUNTERS = [
  { _id: 'email_campaign_logs', collection: 'email_campaign_logs' },
  { _id: 'campaign_progress',   collection: 'campaign_progress' }
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ATOMIC COUNTER SEEDING — ALL COUNTERS');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ APPLY'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('pluto');

    for (const counter of COUNTERS) {
      console.log(`\n── ${counter._id} ──`);

      const totalDocs = await db.collection(counter.collection).countDocuments();
      const maxDoc = await db.collection(counter.collection).findOne(
        {}, { sort: { id: -1 }, projection: { id: 1 } }
      );

      let maxId = 0;
      if (maxDoc && maxDoc.id) {
        maxId = maxDoc.id instanceof Long ? maxDoc.id.toNumber() : Number(maxDoc.id);
      }

      console.log(`  Total docs: ${totalDocs}`);
      console.log(`  Max ID:     ${maxId}`);

      const correctSeed = maxId;
      const existing = await db.collection('counters').findOne({ _id: counter._id });
      
      if (existing) {
        const existingSeq = existing.seq instanceof Long ? existing.seq.toNumber() : Number(existing.seq);
        console.log(`  Counter:    ${existingSeq}`);
        if (existingSeq >= correctSeed) {
          console.log(`  ✅ OK (counter >= max ID)`);
          continue;
        }
        console.log(`  ❌ Counter behind — needs update to ${correctSeed}`);
      } else {
        console.log(`  📋 No counter found — needs creation at ${correctSeed}`);
      }

      if (!DRY_RUN) {
        await db.collection('counters').updateOne(
          { _id: counter._id },
          { $set: { seq: Long.fromNumber(correctSeed) } },
          { upsert: true }
        );
        console.log(`  ✅ Set to ${correctSeed}`);
      } else {
        console.log(`  🔍 Would set to ${correctSeed}`);
      }
    }

    if (DRY_RUN) {
      console.log(`\n\nTo apply: node scripts/seed-all-counters.js --apply`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
