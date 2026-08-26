/**
 * rescue-pending-emails.js
 * 
 * One-time recovery script for emails stuck in 'pending' status
 * after all Bull jobs have been exhausted.
 * 
 * What it does:
 *   1. Finds all email_campaign_logs with status='pending' that are older than 30 minutes
 *   2. Marks them as 'failed' with a descriptive error message
 *   3. Adjusts campaign_progress counters (failed+N, pending-N)
 *   4. Triggers completion check if needed
 * 
 * Usage:
 *   node scripts/rescue-pending-emails.js [progress_id]
 * 
 *   If progress_id is provided, only processes that campaign.
 *   If omitted, processes ALL campaigns with stuck pending emails.
 */

const { MongoClient, Long } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'pluto';
const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

async function main() {
  const progressIdArg = process.argv[2] || null;
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RESCUE PENDING EMAILS');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Threshold: ${STUCK_THRESHOLD_MS / 60000} minutes`);
  console.log(`  Progress ID filter: ${progressIdArg || 'ALL campaigns'}`);
  console.log('');

  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const logsCollection = db.collection('email_campaign_logs');
    const progressCollection = db.collection('campaign_progress');

    // Build query for stuck pending emails
    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const query = {
      status: 'pending',
      updated_at: { $lt: cutoffTime }
    };
    
    if (progressIdArg) {
      query.progress_id = progressIdArg;
    }

    // Count stuck emails
    const stuckCount = await logsCollection.countDocuments(query);
    console.log(`📊 Found ${stuckCount} stuck pending emails`);
    
    if (stuckCount === 0) {
      console.log('✅ No stuck emails found. Nothing to do.');
      return;
    }

    // Group by progress_id to update counters correctly
    const groupedResult = await logsCollection.aggregate([
      { $match: query },
      { $group: { 
        _id: '$progress_id', 
        count: { $sum: 1 },
        campaign_id: { $first: '$campaign_id' },
        emails: { $push: '$to_email' }
      }}
    ]).toArray();

    console.log(`\n📋 Stuck emails by campaign progress:`);
    for (const group of groupedResult) {
      console.log(`   progress_id: ${group._id}`);
      console.log(`   campaign_id: ${group.campaign_id}`);
      console.log(`   stuck count: ${group.count}`);
      console.log(`   sample emails: ${group.emails.slice(0, 5).join(', ')}${group.count > 5 ? '...' : ''}`);
      console.log('');
    }

    // Confirm before proceeding
    console.log(`⚠️  About to mark ${stuckCount} emails as 'failed' and adjust counters.`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mark all stuck emails as failed
    const updateResult = await logsCollection.updateMany(
      query,
      {
        $set: {
          status: 'failed',
          error_message: 'Rescued: stuck in pending after all retries exhausted',
          updated_at: new Date()
        }
      }
    );
    console.log(`✅ Marked ${updateResult.modifiedCount} emails as 'failed'`);

    // Update campaign_progress counters for each group
    for (const group of groupedResult) {
      if (!group._id) continue; // skip if no progress_id
      
      const progressUpdate = await progressCollection.updateOne(
        { progress_id: group._id },
        {
          $inc: { 
            failed_emails: group.count, 
            pending_emails: -group.count 
          },
          $set: { updated_at: new Date() }
        }
      );
      console.log(`✅ Updated campaign_progress for ${group._id}: failed+${group.count}, pending-${group.count} (matched: ${progressUpdate.matchedCount})`);
    }

    // Fix any negative pending_emails by clamping to 0
    console.log('\n🔧 Fixing any negative counters...');
    const negativeProgress = await progressCollection.find({
      pending_emails: { $lt: 0 }
    }).toArray();
    
    for (const doc of negativeProgress) {
      await progressCollection.updateOne(
        { _id: doc._id },
        { $set: { pending_emails: 0, updated_at: new Date() } }
      );
      console.log(`   Fixed pending_emails for progress_id=${doc.progress_id}: ${doc.pending_emails} → 0`);
    }

    // Also fix overcounted failed_emails by recalculating from actual logs
    console.log('\n🔧 Recalculating failed_emails from actual logs...');
    for (const group of groupedResult) {
      if (!group._id) continue;
      
      const actualFailed = await logsCollection.countDocuments({
        progress_id: group._id,
        status: 'failed'
      });
      
      const actualSent = await logsCollection.countDocuments({
        progress_id: group._id,
        status: 'sent'
      });
      
      const actualPending = await logsCollection.countDocuments({
        progress_id: group._id,
        status: 'pending'
      });
      
      const actualSending = await logsCollection.countDocuments({
        progress_id: group._id,
        status: 'sending'
      });
      
      await progressCollection.updateOne(
        { progress_id: group._id },
        {
          $set: {
            sent_emails: actualSent,
            failed_emails: actualFailed,
            pending_emails: actualPending,
            sending_emails: actualSending,
            updated_at: new Date()
          }
        }
      );
      console.log(`   Synced counters for ${group._id}: sent=${actualSent}, failed=${actualFailed}, pending=${actualPending}, sending=${actualSending}`);
    }

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  RESCUE COMPLETE');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Emails rescued: ${updateResult.modifiedCount}`);
    console.log(`  Campaigns fixed: ${groupedResult.length}`);
    console.log(`  Negative counters fixed: ${negativeProgress.length}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
