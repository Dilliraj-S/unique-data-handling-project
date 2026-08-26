#!/usr/bin/env node

/**
 * Manual trigger for post-campaign jobs
 * 
 * Usage: node trigger-post-campaign.js [campaignId] [progressId]
 * Default: campaign 19, progress b4ea355f-5252-4aff-b60e-3a9cebf85e3a
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const CAMPAIGN_ID = process.argv[2] || '19';
const PROGRESS_ID = process.argv[3] || 'b4ea355f-5252-4aff-b60e-3a9cebf85e3a';

async function main() {
  console.log(`\n🔧 Manual Post-Campaign Trigger`);
  console.log(`   Campaign ID:  ${CAMPAIGN_ID}`);
  console.log(`   Progress ID:  ${PROGRESS_ID}`);
  console.log(`   Time:         ${new Date().toISOString()}\n`);

  // 1. Connect to MongoDB
  const mongoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('pluto');
  console.log('✅ MongoDB connected');

  // 2. Trigger AutoPostCampaign
  try {
    const AutoPostCampaignService = require('./services/AutoPostCampaignService');
    await AutoPostCampaignService.triggerPostCampaignJobs(db, CAMPAIGN_ID, PROGRESS_ID);
    console.log('\n✅ AutoPostCampaign completed successfully');
  } catch (err) {
    console.error('\n❌ AutoPostCampaign failed:', err.message);
    console.error(err.stack);
  }

  // 4. Wait and disconnect
  console.log('\n⏳ Waiting 2s for queue connections to flush...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await client.close();
  console.log('✅ MongoDB disconnected');
  console.log('🏁 Done\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
