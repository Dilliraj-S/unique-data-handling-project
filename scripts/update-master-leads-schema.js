/**
 * Update Master Leads & Apollo Collection Indexes
 * 
 * This script:
 * 1. DROPS unique indexes on id and email (email_unique, id_unique, email_unique_idx)
 * 2. CREATES regular (non-unique) index on id (id_idx) for queries
 * 3. Keeps idx_email (already regular, non-unique) for email queries
 * 4. Updates schema validator to warn mode
 * 
 * This enables fast insertMany without E11000 errors.
 * Duplicates are handled after import via the Deduplicate tab.
 * 
 * Run: node scripts/update-master-leads-schema.js
 * 
 * Supports multiple collections — pass collection name as argument:
 *   node scripts/update-master-leads-schema.js apollo
 *   node scripts/update-master-leads-schema.js master_leads
 *   node scripts/update-master-leads-schema.js        (defaults to both)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const DB_NAME = 'sun';

// Collections to update (default: both)
const DEFAULT_COLLECTIONS = ['master_leads', 'apollo'];

// Unique indexes to DROP (these cause E11000 and slow inserts)
const INDEXES_TO_DROP = [
  'email_unique',     // unique sparse on email (from migration 006)
  'id_unique',        // unique sparse on id (from migration 006)
  'email_unique_idx', // unique sparse on email (from old schema script)
];

// Regular indexes to ENSURE exist (non-unique, for queries)
const INDEXES_TO_ENSURE = [
  { key: { id: 1 }, name: 'id_idx' },           // non-unique, for id lookups
  { key: { email: 1 }, name: 'idx_email' },      // non-unique, for email lookups
];

// MongoDB JSON Schema for validation (flexible - allows nulls for all fields)
const COLLECTION_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    properties: {
      _id: { bsonType: 'objectId' },
      li_company_name: { bsonType: ['string', 'null'] },
      li_full_name: { bsonType: ['string', 'null'] },
      li_first_name: { bsonType: ['string', 'null'] },
      li_middle_name: { bsonType: ['string', 'null'] },
      li_last_name: { bsonType: ['string', 'null'] },
      li_first_name_initial: { bsonType: ['string', 'null'] },
      li_last_name_initial: { bsonType: ['string', 'null'] },
      li_smtp: { bsonType: ['string', 'null'] },
      revenue: { bsonType: ['string', 'null'] },
      employee_size: { bsonType: ['string', 'null'] },
      industry: { bsonType: ['string', 'null'] },
      li_company_id: { bsonType: ['string', 'int', 'null'] },
      li_job_title: { bsonType: ['string', 'null'] },
      dls_designation: { bsonType: ['string', 'null'] },
      dls_managementlevel: { bsonType: ['string', 'null'] },
      dls_jobfunction: { bsonType: ['string', 'null'] },
      li_Contact_summary: { bsonType: ['string', 'null'] },
      li_contact_industry: { bsonType: ['string', 'null'] },
      li_duration_in_role: { bsonType: ['string', 'null'] },
      li_profile_url: { bsonType: ['string', 'null'] },
      li_salesnav_profile_url: { bsonType: ['string', 'null'] },
      li_contact_location: { bsonType: ['string', 'null'] },
      li_contact_country: { bsonType: ['string', 'null'] },
      li_contact_query: { bsonType: ['string', 'null'] },
      li_title_description: { bsonType: ['string', 'null'] },
      li_skills: { bsonType: ['string', 'null'] },
      li_certifications: { bsonType: ['string', 'null'] },
      li_company_location: { bsonType: ['string', 'null'] },
      li_contact_url: { bsonType: ['string', 'null'] },
      email: { bsonType: ['string', 'null'] },
      dls_ooo_status: { bsonType: ['string', 'null'] },
      dls_uns_status: { bsonType: ['string', 'null'] },
      dls_bounce_status: { bsonType: ['string', 'null'] },
      dls_mail_send_status: { bsonType: ['string', 'null'] },
      dls_mailer_status: { bsonType: ['string', 'null'] },
      dls_bounce_reason: { bsonType: ['string', 'null'] },
      dls_lead_generated_date: { bsonType: ['string', 'null'] },
      dls_lead_response: { bsonType: ['string', 'null'] },
      dls_dnd_status: { bsonType: ['string', 'null'] },
      dls_direct_dial: { bsonType: ['string', 'null'] },
      dls_mobile: { bsonType: ['string', 'null'] },
      dls_cell_phone: { bsonType: ['string', 'null'] },
      dls_phone_telephone: { bsonType: ['string', 'null'] },
      dls_office_number: { bsonType: ['string', 'null'] },
      dls_others_unknown: { bsonType: ['string', 'null'] },
      dls_additional_notes: { bsonType: ['string', 'null'] },
      dls_email_number: { bsonType: ['string', 'int', 'null'] },
      dls_fax_number: { bsonType: ['string', 'null'] },
      gs_company_address: { bsonType: ['string', 'null'] },
      gs_street: { bsonType: ['string', 'null'] },
      gs_city: { bsonType: ['string', 'null'] },
      gs_state: { bsonType: ['string', 'null'] },
      gs_zipcode: { bsonType: ['string', 'int', 'null'] },
      gs_country: { bsonType: ['string', 'null'] },
      gs_zone_region: { bsonType: ['string', 'null'] },
      gs_company_name: { bsonType: ['string', 'null'] },
      gs_phone_number: { bsonType: ['string', 'null'] },
      gs_country_code: { bsonType: ['string', 'int', 'null'] },
      gs_plus_code: { bsonType: ['string', 'null'] },
      gs_category: { bsonType: ['string', 'null'] },
      gs_place_url: { bsonType: ['string', 'null'] },
      gs_smtp: { bsonType: ['string', 'null'] },
      gs_title: { bsonType: ['string', 'int', 'null'] },
      gs_website: { bsonType: ['string', 'null'] },
      ap_linkedin_contact_url: { bsonType: ['string', 'null'] },
      ap_full_name: { bsonType: ['string', 'null'] },
      ap_contact_city: { bsonType: ['string', 'null'] },
      ap_contact_state: { bsonType: ['string', 'null'] },
      ap_contact_country: { bsonType: ['string', 'null'] },
      ap_contact_twitter_url: { bsonType: ['string', 'null'] },
      ap_contact_facebook_url: { bsonType: ['string', 'null'] },
      need_to_action: { bsonType: ['int', 'bool', 'null'] },
      last_contact_date: { bsonType: ['string', 'date', 'null'] },
      reference_1: { bsonType: ['string', 'null'] },
      reference_2: { bsonType: ['string', 'null'] },
      reference_3: { bsonType: ['string', 'null'] },
      reference_4: { bsonType: ['string', 'null'] },
      reference_5: { bsonType: ['string', 'null'] },
      reference_6: { bsonType: ['string', 'null'] },
      reference_7: { bsonType: ['string', 'null'] },
      reference_8: { bsonType: ['string', 'null'] },
      reference_9: { bsonType: ['string', 'null'] },
      reference_10: { bsonType: ['string', 'null'] },
      created_by: { bsonType: ['string', 'null'] },
      updated_by: { bsonType: ['string', 'null'] },
      created_at: { bsonType: ['date', 'string', 'null'] },
      updated_at: { bsonType: ['date', 'string', 'null'] },
      deleted_at: { bsonType: ['date', 'string', 'null'] },
      // Allow id to be any type (int, string, null) for flexibility
      id: { bsonType: ['int', 'long', 'string', 'null'] },
    }
  }
};

async function updateCollection(db, collectionName) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  📋 Processing: ${collectionName}`);
  console.log(`${'═'.repeat(60)}`);

  const collection = db.collection(collectionName);

  // Check if collection exists
  const cols = await db.listCollections({ name: collectionName }).toArray();
  if (cols.length === 0) {
    console.log(`  ⚠️ Collection ${collectionName} does not exist — skipping`);
    return;
  }

  const docCount = await collection.countDocuments();
  console.log(`  📊 Documents: ${docCount.toLocaleString()}`);

  // ─── Step 1: Drop unique indexes ───
  console.log(`\n  🗑️ Step 1: Dropping unique indexes...`);
  const existingIndexes = await collection.indexes();
  const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));

  for (const indexName of INDEXES_TO_DROP) {
    if (existingIndexNames.has(indexName)) {
      try {
        await collection.dropIndex(indexName);
        console.log(`    ✅ Dropped: ${indexName}`);
      } catch (err) {
        console.log(`    ⚠️ Failed to drop ${indexName}: ${err.message}`);
      }
    } else {
      console.log(`    ⏭️ ${indexName} does not exist — already clean`);
    }
  }

  // ─── Step 2: Ensure regular (non-unique) indexes exist ───
  console.log(`\n  🔑 Step 2: Ensuring regular indexes...`);
  // Refresh index list after drops
  const refreshedIndexes = await collection.indexes();
  const refreshedNames = new Set(refreshedIndexes.map(idx => idx.name));

  for (const indexDef of INDEXES_TO_ENSURE) {
    if (refreshedNames.has(indexDef.name)) {
      // Check if this existing index is unique — if so, it needs to be recreated as non-unique
      const existingIdx = refreshedIndexes.find(idx => idx.name === indexDef.name);
      if (existingIdx && existingIdx.unique) {
        console.log(`    🔄 ${indexDef.name} exists as UNIQUE — dropping and recreating as regular`);
        try {
          await collection.dropIndex(indexDef.name);
          await collection.createIndex(indexDef.key, { name: indexDef.name, background: true });
          console.log(`    ✅ Recreated: ${indexDef.name} (non-unique)`);
        } catch (err) {
          console.log(`    ⚠️ Failed to recreate ${indexDef.name}: ${err.message}`);
        }
      } else {
        console.log(`    ⏭️ ${indexDef.name} already exists (non-unique) — OK`);
      }
    } else {
      try {
        await collection.createIndex(indexDef.key, { name: indexDef.name, background: true });
        console.log(`    ✅ Created: ${indexDef.name} (non-unique)`);
      } catch (err) {
        console.log(`    ⚠️ Failed to create ${indexDef.name}: ${err.message}`);
      }
    }
  }

  // ─── Step 3: Update schema validator ───
  console.log(`\n  📝 Step 3: Updating schema validator...`);
  try {
    await db.command({
      collMod: collectionName,
      validator: COLLECTION_SCHEMA,
      validationLevel: 'moderate',
      validationAction: 'warn'
    });
    console.log(`    ✅ Schema validator updated (validationAction: warn)`);
  } catch (err) {
    console.log(`    ⚠️ Could not update validator: ${err.message}`);
  }

  // ─── Step 4: Verify final state ───
  console.log(`\n  🔍 Step 4: Verifying indexes...`);
  const finalIndexes = await collection.indexes();
  let hasUniqueOnEmail = false;
  let hasUniqueOnId = false;

  for (const idx of finalIndexes) {
    const isUnique = idx.unique ? '🔒 UNIQUE' : '   ';
    const keys = JSON.stringify(idx.key);
    console.log(`    ${isUnique} ${idx.name.padEnd(35)} ${keys}`);

    if (idx.unique && Object.keys(idx.key).includes('email')) hasUniqueOnEmail = true;
    if (idx.unique && Object.keys(idx.key).includes('id') && idx.name !== '_id_') hasUniqueOnId = true;
  }

  console.log(`\n  📊 Final: ${finalIndexes.length} indexes`);
  console.log(`  ${hasUniqueOnEmail ? '❌ WARNING: email still has unique index!' : '✅ email: no unique index'}`);
  console.log(`  ${hasUniqueOnId ? '❌ WARNING: id still has unique index!' : '✅ id: no unique index'}`);
}

async function main() {
  const targetCollections = process.argv[2]
    ? [process.argv[2]]
    : DEFAULT_COLLECTIONS;

  console.log(`\n🔧 Index Update Script`);
  console.log(`📦 Database: ${DB_NAME}`);
  console.log(`📋 Collections: ${targetCollections.join(', ')}`);
  console.log(`\nActions:`);
  console.log(`  1. DROP unique indexes: ${INDEXES_TO_DROP.join(', ')}`);
  console.log(`  2. ENSURE regular indexes: ${INDEXES_TO_ENSURE.map(i => i.name).join(', ')}`);
  console.log(`  3. UPDATE schema validator to warn mode`);

  const mongoUrl = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log(`\n✅ Connected to MongoDB`);

    const db = client.db(DB_NAME);

    for (const colName of targetCollections) {
      await updateCollection(db, colName);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ✨ All done! Unique indexes removed, regular indexes in place.`);
    console.log(`  → Import will now use fast insertMany (no E11000 risk)`);
    console.log(`  → Use Deduplicate tab to clean duplicates after import`);
    console.log(`${'═'.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('👋 Disconnected');
  }
}

main().catch(console.error);
