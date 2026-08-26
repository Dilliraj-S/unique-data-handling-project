/**
 * seed-counter.js — Verify and seed the atomic counter for email_campaign_logs
 * 
 * WHY: The new atomic counter ($inc on counters collection) needs to start
 *      from the correct value. countDocuments() is WRONG because:
 *      - Deleted rows create gaps (count=900 but max id=1000)
 *      - Non-sequential inserts could leave max id > count
 *      The correct seed = MAX(id), not COUNT(*)
 * 
 * USAGE:
 *   node scripts/seed-counter.js          # Dry run (verify only)
 *   node scripts/seed-counter.js --apply  # Actually seed/update the counter
 */

const { MongoClient, Long } = require('mongodb');

const MONGO_URI = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
const DRY_RUN = !process.argv.includes('--apply');

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  ATOMIC COUNTER SEEDING — email_campaign_logs');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (verify only)' : '⚡ APPLY (will write to DB)'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('pluto');

    // ── Step 1: Get total document count ──
    const totalDocs = await db.collection('email_campaign_logs').countDocuments();
    console.log(`📊 Total documents in email_campaign_logs: ${totalDocs}`);

    // ── Step 2: Get the ACTUAL max ID (this is what matters) ──
    const maxDoc = await db.collection('email_campaign_logs').findOne(
      {},
      { sort: { id: -1 }, projection: { id: 1 } }
    );

    let maxId = 0;
    if (maxDoc && maxDoc.id) {
      maxId = maxDoc.id instanceof Long ? maxDoc.id.toNumber() : Number(maxDoc.id);
    }
    console.log(`🔢 Max ID in email_campaign_logs: ${maxId}`);

    // ── Step 3: Check for gap between count and max ID ──
    const gap = maxId - totalDocs;
    if (gap > 0) {
      console.log(`⚠️  GAP DETECTED: max ID (${maxId}) > count (${totalDocs}) by ${gap}`);
      console.log(`   This means ${gap} rows were deleted. Using max ID as seed.`);
    } else if (gap < 0) {
      console.log(`⚠️  ANOMALY: count (${totalDocs}) > max ID (${maxId}) by ${Math.abs(gap)}`);
      console.log(`   Possible: IDs don't start at 1, or some IDs are duplicated.`);
      console.log(`   Using max ID as seed (safe — always use the highest value).`);
    } else {
      console.log(`✅ No gap: max ID matches document count exactly.`);
    }

    const correctSeed = maxId; // ALWAYS use max ID, never count
    console.log(`\n🎯 Correct seed value: ${correctSeed}`);

    // ── Step 4: Check existing counter ──
    const existingCounter = await db.collection('counters').findOne({ _id: 'email_campaign_logs' });
    
    if (existingCounter) {
      const existingSeq = existingCounter.seq instanceof Long 
        ? existingCounter.seq.toNumber() 
        : Number(existingCounter.seq);
      console.log(`📋 Existing counter value: ${existingSeq}`);
      
      if (existingSeq === correctSeed) {
        console.log(`✅ Counter is already correct! No action needed.`);
        return;
      } else if (existingSeq > correctSeed) {
        console.log(`✅ Counter (${existingSeq}) is AHEAD of max ID (${correctSeed}).`);
        console.log(`   This is safe — new IDs will just skip some numbers. No action needed.`);
        return;
      } else {
        console.log(`❌ Counter (${existingSeq}) is BEHIND max ID (${correctSeed}).`);
        console.log(`   This WILL cause duplicate ID collisions! Must update.`);
      }
    } else {
      console.log(`📋 No existing counter found. Needs to be created.`);
    }

    // ── Step 5: Seed/update the counter ──
    if (DRY_RUN) {
      console.log(`\n🔍 DRY RUN — would set counter to: ${correctSeed}`);
      console.log(`\n   To apply, run:  node scripts/seed-counter.js --apply`);
    } else {
      const result = await db.collection('counters').updateOne(
        { _id: 'email_campaign_logs' },
        { $set: { seq: Long.fromNumber(correctSeed) } },
        { upsert: true }
      );
      
      console.log(`\n✅ Counter ${result.upsertedCount ? 'CREATED' : 'UPDATED'}: seq = ${correctSeed}`);
      
      // Verify
      const verify = await db.collection('counters').findOne({ _id: 'email_campaign_logs' });
      const verifySeq = verify.seq instanceof Long ? verify.seq.toNumber() : Number(verify.seq);
      console.log(`🔍 Verification read: seq = ${verifySeq} ${verifySeq === correctSeed ? '✅' : '❌ MISMATCH!'}`);
    }

    // ── Summary ──
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Collection docs : ${totalDocs}`);
    console.log(`  Max ID          : ${maxId}`);
    console.log(`  Gap             : ${gap > 0 ? `${gap} (deleted rows)` : 'none'}`);
    console.log(`  Correct seed    : ${correctSeed}`);
    console.log(`  Using count     : ❌ WRONG (would be ${totalDocs})`);
    console.log(`  Using max ID    : ✅ CORRECT (${maxId})`);
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
