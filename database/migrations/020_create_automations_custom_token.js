/**
 * Migration: Create Automations Custom Token
 *
 * Creates the skeleton_token entry for the automations custom controller
 * so that CustomCtrl can be accessed via token: central_automations_custom
 *
 * This token is used for custom actions like:
 *  - domain_enrichment_upload
 *  - domain_enrichment_start
 *  - domain_enrichment_export
 *
 * Database: central (skeleton_tokens collection)
 *
 * Run:
 *   cd for
 *   node database/migrations/020_create_automations_custom_token.js
 */

import { getDb } from '../../src/lib/mongodb.js';

async function runMigration() {
  console.log('🚀 Starting migration: Create Automations Custom Token...');

  const db = await getDb('central');
  const skeletonTokensCollection = db.collection('skeleton_tokens');

  // Check if token already exists
  const existingToken = await skeletonTokensCollection.findOne({
    key: 'central_automations_custom',
    deleted_at: null
  });

  if (existingToken) {
    console.log('⚠️  Token already exists: central_automations_custom');
    console.log('Token data:', JSON.stringify(existingToken, null, 2));
    return;
  }

  // Create the token entry
  // Note: This is a custom action token, not a table token
  // It doesn't need a specific table, but we reference domain_enrichment_jobs
  // as the related table for context
  const now = new Date();
  const token = {
    key: 'central_automations_custom',
    module: 'automations',
    system: 'central',
    type: 'custom', // Custom action token, not a data table token
    table: 'domain_enrichment_jobs', // Related table for context (optional)
    column: 'job_id', // Related column for context (optional)
    value: '',
    act: 'job_id', // Action identifier
    actions: 'c', // Custom actions only
    validate: false,
    created_by: 'SYSTEM',
    updated_by: 'SYSTEM',
    created_at: now,
    updated_at: now,
    deleted_at: null
  };

  const result = await skeletonTokensCollection.insertOne(token);
  console.log('✅ Created token: central_automations_custom');
  console.log('Token ID:', result.insertedId);
  console.log('Token data:', JSON.stringify(token, null, 2));
  console.log('🎉 Automations custom token migration completed successfully.');
}

runMigration().catch((err) => {
  console.error('❌ Automations custom token migration failed:', err);
  process.exit(1);
});

