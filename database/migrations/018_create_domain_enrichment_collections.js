/**
 * Migration: Create Domain Enrichment Collections
 *
 * Creates the collections used by the Domain Enrichment Agent:
 *  - domain_enrichment_jobs
 *  - domain_enrichment_results
 *
 * Database: automation
 *
 * Run:
 *   cd for
 *   node database/migrations/018_create_domain_enrichment_collections.js
 */

import { getDb } from '../../src/lib/mongodb.js';

async function ensureCollection(db, name, options = {}) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, options);
    console.log(`✅ Created collection: ${name}`);
  } else {
    console.log(`ℹ️  Collection already exists: ${name}`);
  }
}

async function runMigration() {
  console.log('🚀 Starting migration: Create Domain Enrichment Collections...');

  const db = await getDb('automation');

  // 1) Jobs collection
  await ensureCollection(db, 'domain_enrichment_jobs');
  const jobs = db.collection('domain_enrichment_jobs');

  await jobs.createIndex({ job_id: 1 }, { unique: true });
  await jobs.createIndex({ batch_id: 1 });
  await jobs.createIndex({ status: 1 });
  await jobs.createIndex({ domain: 1 });
  // CRITICAL: Compound index for findOneAndUpdate with sort
  // This allows efficient queries like: { status: 'queued' } with sort: { created_at: 1 }
  await jobs.createIndex({ status: 1, created_at: 1 });
  // Also create standalone created_at index for fallback queries
  await jobs.createIndex({ created_at: 1 });
  // Index for stale job detection
  await jobs.createIndex({ status: 1, updated_at: 1 });

  console.log('✅ Indexes created for domain_enrichment_jobs');

  // 2) Results collection
  await ensureCollection(db, 'domain_enrichment_results');
  const results = db.collection('domain_enrichment_results');

  await results.createIndex({ job_id: 1 }, { unique: true });
  await results.createIndex({ batch_id: 1 });
  await results.createIndex({ domain: 1 });
  await results.createIndex({ status: 1 });

  console.log('✅ Indexes created for domain_enrichment_results');

  console.log('🎉 Domain enrichment collections migration completed successfully.');
}

runMigration().catch((err) => {
  console.error('❌ Domain enrichment collections migration failed:', err);
  process.exit(1);
});


