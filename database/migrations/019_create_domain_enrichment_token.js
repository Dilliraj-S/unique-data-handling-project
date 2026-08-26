/**
 * Migration: Create Domain Enrichment Token
 *
 * Creates the skeleton_token entry for the domain enrichment jobs table
 * so that DynamicTable can display it using token: central_automations_domain_jobs
 *
 * Database: central (skeleton_tokens collection)
 *
 * Run:
 *   cd for
 *   node database/migrations/019_create_domain_enrichment_token.js
 */

import { getDb } from '../../src/lib/mongodb.js';

async function runMigration() {
  console.log('🚀 Starting migration: Create Domain Enrichment Token...');

  const db = await getDb('central');
  const skeletonTokensCollection = db.collection('skeleton_tokens');

  // Check if token already exists
  const existingToken = await skeletonTokensCollection.findOne({
    key: 'central_automations_domain_jobs',
    deleted_at: null
  });

  if (existingToken) {
    console.log('⚠️  Token already exists: central_automations_domain_jobs');
    console.log('Token data:', JSON.stringify(existingToken, null, 2));
    return;
  }

  // Create the token entry
  const now = new Date();
  const token = {
    key: 'central_automations_domain_jobs',
    module: 'automations',
    system: 'central',
    type: 'data',
    table: 'domain_enrichment_jobs',
    column: 'job_id',
    value: '',
    act: 'job_id',
    actions: 'c,v,e,d',
    validate: false,
    created_by: 'SYSTEM',
    updated_by: 'SYSTEM',
    created_at: now,
    updated_at: now,
    deleted_at: null
  };

  const result = await skeletonTokensCollection.insertOne(token);
  console.log('✅ Created token: central_automations_domain_jobs');
  console.log('Token ID:', result.insertedId);
  console.log('Token data:', JSON.stringify(token, null, 2));
  console.log('🎉 Domain enrichment token migration completed successfully.');
}

runMigration().catch((err) => {
  console.error('❌ Domain enrichment token migration failed:', err);
  process.exit(1);
});

