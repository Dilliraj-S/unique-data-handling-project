
const COLLECTION_NAME = 'karurwithoutemail';

// ═══════════════════════════════════════════════════════════════
// SCHEMA VALIDATOR — exact copy from master_leads
// ═══════════════════════════════════════════════════════════════
const schemaValidator = {
  $jsonSchema: {
    bsonType: 'object',
    additionalProperties: true,
    properties: {
      id: { bsonType: ['long', 'int', 'string', 'null'] },
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
      li_company_id: { bsonType: ['string', 'null'] },
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
      dls_email_number: { bsonType: ['string', 'null'] },
      dls_fax_number: { bsonType: ['string', 'null'] },
      gs_company_address: { bsonType: ['string', 'null'] },
      gs_street: { bsonType: ['string', 'null'] },
      gs_city: { bsonType: ['string', 'null'] },
      gs_state: { bsonType: ['string', 'null'] },
      gs_zipcode: { bsonType: ['string', 'null'] },
      gs_country: { bsonType: ['string', 'null'] },
      gs_zone_region: { bsonType: ['string', 'null'] },
      gs_company_name: { bsonType: ['string', 'null'] },
      gs_phone_number: { bsonType: ['string', 'null'] },
      gs_country_code: { bsonType: ['string', 'null'] },
      gs_plus_code: { bsonType: ['string', 'null'] },
      gs_category: { bsonType: ['string', 'null'] },
      gs_place_url: { bsonType: ['string', 'null'] },
      gs_smtp: { bsonType: ['string', 'null'] },
      gs_title: { bsonType: ['string', 'null'] },
      gs_website: { bsonType: ['string', 'null'] },
      ap_linkedin_contact_url: { bsonType: ['string', 'null'] },
      ap_full_name: { bsonType: ['string', 'null'] },
      ap_contact_city: { bsonType: ['string', 'null'] },
      ap_contact_state: { bsonType: ['string', 'null'] },
      ap_contact_country: { bsonType: ['string', 'null'] },
      ap_contact_twitter_url: { bsonType: ['string', 'null'] },
      ap_contact_facebook_url: { bsonType: ['string', 'null'] },
      need_to_action: { bsonType: ['int', 'long', 'bool', 'string', 'null'] },
      last_contact_date: { bsonType: ['string', 'date', 'null'] },
      source: { bsonType: ['string', 'null'] },
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
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// ALL 39 INDEXES (+ _id_ auto = 40 total)
// Matches master_leads exactly — same names, keys, options
// ═══════════════════════════════════════════════════════════════
const allIndexes = [
  // ── SINGLE-FIELD INDEXES (23) ───────────────────────────────
  /*  1 */ [{ id: 1 },                    { name: 'id_idx' }],
  /*  2 */ [{ email: 1 },                 { name: 'idx_email' }],
  /*  3 */ [{ li_company_name: 1 },       { name: 'li_company_name_idx' }],
  /*  4 */ [{ li_full_name: 1 },          { name: 'li_full_name_idx' }],
  /*  5 */ [{ li_smtp: 1 },               { name: 'li_smtp_idx' }],
  /*  6 */ [{ created_at: 1 },            { name: 'created_at_idx' }],
  /*  7 */ [{ li_middle_name: 1 },        { name: 'li_middle_name_idx' }],
  /*  8 */ [{ li_last_name: 1 },          { name: 'li_last_name_idx' }],
  /*  9 */ [{ dls_designation: 1 },       { name: 'dls_designation_idx' }],
  /* 10 */ [{ li_company_id: 1 },         { name: 'li_company_id_idx' }],
  /* 11 */ [{ need_to_action: 1 },        { name: 'need_to_action_idx' }],
  /* 12 */ [{ li_job_title: 1 },          { name: 'li_job_title_idx' }],
  /* 13 */ [{ li_contact_country: 1 },    { name: 'li_contact_country_idx' }],
  /* 14 */ [{ li_first_name: 1 },         { name: 'li_first_name_idx' }],
  /* 15 */ [{ li_first_name_initial: 1 }, { name: 'li_first_name_initial_idx' }],
  /* 16 */ [{ li_last_name_initial: 1 },  { name: 'li_last_name_initial_idx' }],
  /* 17 */ [{ dls_managementlevel: 1 },   { name: 'dls_managementlevel_idx' }],
  /* 18 */ [{ dls_jobfunction: 1 },       { name: 'dls_jobfunction_idx' }],
  /* 19 */ [{ li_contact_location: 1 },   { name: 'li_contact_location_idx' }],
  /* 20 */ [{ ap_full_name: 1 },          { name: 'ap_full_name_idx' }],
  /* 21 */ [{ ap_contact_country: 1 },    { name: 'ap_contact_country_idx' }],
  /* 22 */ [{ last_contact_date: 1 },     { name: 'last_contact_date_idx' }],
  /* 23 */ [{ deleted_at: 1 },            { name: 'deleted_at_idx', sparse: true }],

  // ── COMPOUND INDEXES (15) ──────────────────────────────────
  /* 24 */ [{ deleted_at: 1, email: 1 },                              { name: 'idx_deleted_email',              sparse: true }],
  /* 25 */ [{ deleted_at: 1, li_company_name: 1 },                    { name: 'idx_deleted_company_name',       sparse: true }],
  /* 26 */ [{ deleted_at: 1, li_full_name: 1 },                       { name: 'idx_deleted_full_name',          sparse: true }],
  /* 27 */ [{ deleted_at: 1, li_job_title: 1 },                       { name: 'idx_deleted_job_title',          sparse: true }],
  /* 28 */ [{ deleted_at: 1, dls_designation: 1 },                    { name: 'idx_deleted_designation',        sparse: true }],
  /* 29 */ [{ deleted_at: 1, created_at: -1 },                        { name: 'idx_deleted_created',            sparse: true }],
  /* 30 */ [{ deleted_at: 1, _id: -1 },                               { name: 'idx_deleted_id_desc',            sparse: true }],
  /* 31 */ [{ deleted_at: 1, li_company_name: 1, created_at: -1 },    { name: 'idx_deleted_company_created',    sparse: true }],
  /* 32 */ [{ deleted_at: 1, email: 1, _id: -1 },                     { name: 'idx_deleted_email_id',           sparse: true }],
  /* 33 */ [{ deleted_at: 1, li_smtp: 1, _id: -1 },                   { name: 'idx_deleted_smtp_id',            sparse: true }],
  /* 34 */ [{ deleted_at: 1, li_job_title: 1, created_at: -1 },       { name: 'idx_deleted_jobtitle_created',   sparse: true }],
  /* 35 */ [{ deleted_at: 1, industry: 1, created_at: -1 },           { name: 'idx_deleted_industry_created',   sparse: true }],
  /* 36 */ [{ deleted_at: 1, dls_mailer_status: 1, _id: -1 },         { name: 'idx_deleted_status_id',          sparse: true }],
  /* 37 */ [{ deleted_at: 1, created_at: -1, _id: -1 },               { name: 'idx_deleted_created_id',         sparse: true }],
  /* 38 */ [{ deleted_at: 1, updated_at: -1, _id: -1 },               { name: 'idx_deleted_updated_id',         sparse: true }],

  // ── TEXT SEARCH INDEX (1) ──────────────────────────────────
  /* 39 */ [
    { li_full_name: 'text', li_company_name: 'text', email: 'text', li_job_title: 'text', dls_designation: 'text' },
    { name: 'idx_text_search', default_language: 'none' }
  ],
];
// TOTAL: 39 explicit indexes above + 1 auto _id_ = 40 shown in Compass

// ═══════════════════════════════════════════════════════════════

const migration = {
  name: '025_create_karurwithoutemail_collection',

  async up(db) {
    console.log(`Creating ${COLLECTION_NAME} collection (same as master_leads)...`);

    // 1. Create or update collection
    const existing = await db.listCollections({ name: COLLECTION_NAME }).toArray();
    if (existing.length > 0) {
      console.log('Collection already exists, updating validator...');
      try {
        await db.command({
          collMod: COLLECTION_NAME,
          validator: schemaValidator,
          validationLevel: 'moderate',
          validationAction: 'warn'
        });
        console.log('Updated validator');
      } catch (err) {
        console.warn('Could not update validator:', err.message);
      }
    } else {
      await db.createCollection(COLLECTION_NAME, { validator: schemaValidator });
      console.log(`Created ${COLLECTION_NAME} collection`);
    }

    const collection = db.collection(COLLECTION_NAME);

    // 2. Create all 39 indexes
    let created = 0;
    const total = allIndexes.length; // 39
    for (let i = 0; i < total; i++) {
      const [keys, options] = allIndexes[i];
      try {
        await collection.createIndex(keys, { ...options, background: true });
        created++;
        console.log(`  [${i + 1}/${total}] OK: ${options.name}`);
      } catch (err) {
        if (err.code === 85 || err.code === 86) {
          created++;
          console.log(`  [${i + 1}/${total}] SKIP: ${options.name} (already exists)`);
        } else {
          console.warn(`  [${i + 1}/${total}] FAIL: ${options.name}: ${err.message}`);
        }
      }
    }

    console.log(`\nDone! ${created}/39 indexes created/verified (+ _id_ auto = 40 total)`);
  },

  async down(db) {
    console.log(`Dropping ${COLLECTION_NAME} collection...`);
    try {
      const existing = await db.listCollections({ name: COLLECTION_NAME }).toArray();
      if (existing.length > 0) {
        await db.dropCollection(COLLECTION_NAME);
        console.log(`Dropped ${COLLECTION_NAME}`);
      } else {
        console.log('Collection does not exist, nothing to drop');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
};

/**
 * Standalone runner — run this migration directly:
 *   node database/migrations/025_create_karurwithoutemail_collection.js
 */
if (require.main === module) {
  const { MongoClient } = require('mongodb');
  require('dotenv').config();

  const uri = process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun';
  const client = new MongoClient(uri);

  (async () => {
    try {
      await client.connect();
      console.log('Connected to sun database');
      await migration.up(client.db('sun'));
    } catch (err) {
      console.error('Migration failed:', err);
      process.exit(1);
    } finally {
      await client.close();
      console.log('Disconnected');
    }
  })();
}

module.exports = migration;
