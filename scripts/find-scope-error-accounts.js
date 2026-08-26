/**
 * find-scope-error-accounts.js
 * 
 * Finds which email accounts got "insufficient authentication scopes" errors
 * and need to be re-authenticated through Google OAuth.
 * 
 * Usage: node scripts/find-scope-error-accounts.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'pluto';

async function main() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ACCOUNTS WITH AUTH SCOPE ERRORS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Find all failed logs with auth scope error, grouped by from_email
    const results = await db.collection('email_campaign_logs').aggregate([
      {
        $match: {
          status: 'failed',
          error_message: { $regex: 'insufficient authentication scopes|Insufficient Permission', $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$from_email',
          count: { $sum: 1 },
          campaign_ids: { $addToSet: '$campaign_id' },
          sample_error: { $first: '$error_message' },
          latest_failure: { $max: '$updated_at' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    if (results.length === 0) {
      console.log('✅ No accounts with auth scope errors found.');
      return;
    }

    console.log(`Found ${results.length} account(s) with auth scope errors:\n`);
    
    let totalFailed = 0;
    for (const account of results) {
      totalFailed += account.count;
      console.log(`  📧 ${account._id}`);
      console.log(`     Failed emails: ${account.count}`);
      console.log(`     Last failure:  ${account.latest_failure}`);
      console.log(`     Campaigns:     ${account.campaign_ids.length}`);
      console.log('');
    }

    console.log('───────────────────────────────────────────────────────');
    console.log(`  Total failed emails from scope errors: ${totalFailed}`);
    console.log(`  Total accounts to re-authenticate:     ${results.length}`);
    console.log('───────────────────────────────────────────────────────\n');

    // Also check current status of these accounts in email_accounts
    console.log('Account status in email_accounts collection:\n');
    for (const account of results) {
      const acct = await db.collection('email_accounts').findOne({ email: account._id });
      if (acct) {
        console.log(`  📧 ${account._id}`);
        console.log(`     Status:     ${acct.status}`);
        console.log(`     Type:       ${acct.type}`);
        console.log(`     Has refresh_token: ${!!acct.refresh_token}`);
        console.log(`     Token expiry:      ${acct.token_expiry || 'N/A'}`);
        console.log('');
      } else {
        console.log(`  📧 ${account._id} — NOT FOUND in email_accounts`);
      }
    }

    console.log('\n⚠️  ACTION REQUIRED:');
    console.log('   Go to your mailconfig page and re-authenticate these accounts.');
    console.log('   The OAuth flow now includes gmail.send scope.');
    console.log('   After re-auth, the refresh token will have the correct scopes.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
