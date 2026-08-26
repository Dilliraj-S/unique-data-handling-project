/**
 * Migration 005: Create/Sync master_accounts collection in sun database
 * Mirrors the MySQL master_accounts table structure with validation + indexes
 */

const MASTER_ACCOUNTS = 'master_accounts';

const masterAccountValidator = {
  $jsonSchema: {
    bsonType: 'object',
    additionalProperties: true,
    properties: {
      id: { bsonType: ['long', 'int', 'string', 'null'] },
      li_smtp: { bsonType: ['string', 'null'] },
      li_company_name: { bsonType: ['string', 'null'] },
      li_company_employee_size: { bsonType: ['string', 'null'] },
      li_company_industry: { bsonType: ['string', 'null'] },
      li_industry_relavance: { bsonType: ['string', 'null'] },
      li_industry_mapping: { bsonType: ['string', 'null'] },
      li_company_id: { bsonType: ['string', 'null'] },
      li_company_url: { bsonType: ['string', 'null'] },
      li_company_specialties: { bsonType: ['string', 'null'] },
      li_company_description: { bsonType: ['string', 'null'] },
      li_tag_line: { bsonType: ['string', 'null'] },
      employees_on_linked_in: { bsonType: ['int', 'long', 'string', 'null'] },
      li_company_founded: { bsonType: ['int', 'long', 'string', 'null'] },
      li_company_headquarters: { bsonType: ['string', 'null'] },
      li_company_headquarters_country: { bsonType: ['string', 'null'] },
      li_hq_number: { bsonType: ['string', 'null'] },
      li_is_admin: { bsonType: ['string', 'null'] },
      li_logo: { bsonType: ['string', 'null'] },
      li_banner: { bsonType: ['string', 'null'] },
      li_follower_count: { bsonType: ['int', 'long', 'string', 'null'] },
      li_website: { bsonType: ['string', 'null'] },
      li_type: { bsonType: ['string', 'null'] },
      li_hq_address: { bsonType: ['string', 'null'] },
      li_industry_code: { bsonType: ['string', 'null'] },
      li_company_query: { bsonType: ['string', 'null'] },
      li_timestamp: { bsonType: ['string', 'null'] },
      li_is_claimable: { bsonType: ['string', 'null'] },
      li_error: { bsonType: ['string', 'null'] },
      li_location_branch: { bsonType: ['string', 'null'] },
      li_location_sub_branch: { bsonType: ['string', 'null'] },
      li_competitors: { bsonType: ['string', 'null'] },
      li_company_about: { bsonType: ['string', 'null'] },
      lic_company_name: { bsonType: ['string', 'null'] },
      lic_company_id: { bsonType: ['string', 'null'] },
      ap_industry: { bsonType: ['string', 'null'] },
      ap_company_keywords: { bsonType: ['string', 'null'] },
      ap_company_city: { bsonType: ['string', 'null'] },
      ap_company_state: { bsonType: ['string', 'null'] },
      ap_company_country: { bsonType: ['string', 'null'] },
      ap_company_linkedin_url: { bsonType: ['string', 'null'] },
      ap_company_twitter_url: { bsonType: ['string', 'null'] },
      ap_company_facebook_url: { bsonType: ['string', 'null'] },
      ap_company_phone_numbers: { bsonType: ['string', 'null'] },
      ap_company_name: { bsonType: ['string', 'null'] },
      ap_company_website: { bsonType: ['string', 'null'] },
      ap_company_smtp: { bsonType: ['string', 'null'] },
      zm_technologies: { bsonType: ['string', 'null'] },
      zm_revenue_size: { bsonType: ['string', 'null'] },
      zm_company: { bsonType: ['string', 'null'] },
      zm_location: { bsonType: ['string', 'null'] },
      zm_industry: { bsonType: ['string', 'null'] },
      zm_empyoyee_size: { bsonType: ['string', 'null'] },
      zm_website: { bsonType: ['string', 'null'] },
      zm_smtp: { bsonType: ['string', 'null'] },
      zm_country: { bsonType: ['string', 'null'] },
      zm_summary: { bsonType: ['string', 'null'] },
      zm_sic_codes: { bsonType: ['string', 'null'] },
      zm_naics_codes: { bsonType: ['string', 'null'] },
      py_smtp: { bsonType: ['string', 'null'] },
      py_title: { bsonType: ['string', 'null'] },
      py_keywords: { bsonType: ['string', 'null'] },
      py_description: { bsonType: ['string', 'null'] },
      need_to_action: { bsonType: ['int', 'long', 'bool', 'string', 'null'] },
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
      created_at: { bsonType: ['date', 'string', 'null'] },
      updated_at: { bsonType: ['date', 'string', 'null'] },
      created_by: { bsonType: ['string', 'null'] },
      updated_by: { bsonType: ['string', 'null'] },
      deleted_at: { bsonType: ['date', 'string', 'null'] },
    },
  },
};

async function ensureCollection(db) {
  const existing = await db.listCollections({ name: MASTER_ACCOUNTS }).toArray();
  if (existing.length === 0) {
    await db.createCollection(MASTER_ACCOUNTS, { validator: masterAccountValidator });
    console.log('✅ Created master_accounts collection');
  } else {
    await db.command({
      collMod: MASTER_ACCOUNTS,
      validator: masterAccountValidator,
      validationLevel: 'moderate',
    });
    console.log('ℹ️  master_accounts already existed, validator updated');
  }
  return db.collection(MASTER_ACCOUNTS);
}

async function createIndexes(collection) {
  const indexSpecs = [
    [{ id: 1 }, { name: 'id_unique', unique: true, sparse: true }],
    [{ li_smtp: 1 }, { name: 'li_smtp_unique', unique: true, sparse: true }],
    [{ li_company_name: 1 }, { name: 'li_company_name_idx' }],
    [{ ap_company_name: 1 }, { name: 'ap_company_name_idx' }],
    [{ zm_company: 1 }, { name: 'zm_company_idx' }],
    [{ li_company_employee_size: 1 }, { name: 'li_company_employee_size_idx' }],
    [{ li_company_industry: 1 }, { name: 'li_company_industry_idx' }],
    [{ li_industry_relavance: 1 }, { name: 'li_industry_relavance_idx' }],
    [{ li_industry_mapping: 1 }, { name: 'li_industry_mapping_idx' }],
    [{ li_website: 1 }, { name: 'li_website_idx' }],
    [{ lic_company_name: 1 }, { name: 'lic_company_name_idx' }],
    [{ lic_company_id: 1 }, { name: 'lic_company_id_idx' }],
    [{ ap_company_country: 1 }, { name: 'ap_company_country_idx' }],
    [{ ap_company_website: 1 }, { name: 'ap_company_website_idx' }],
    [{ zm_country: 1 }, { name: 'zm_country_idx' }],
    [{ zm_smtp: 1 }, { name: 'zm_smtp_idx' }],
    [{ li_company_id: 1 }, { name: 'li_company_id_idx' }],
  ];

  for (const [keys, options] of indexSpecs) {
    await collection.createIndex(keys, options);
  }
  console.log('✅ master_accounts indexes created/ensured');
}

module.exports = {
  name: '005_sync_master_accounts_collection',
  async up(db) {
    const collection = await ensureCollection(db);
    await createIndexes(collection);
  },
  async down(db) {
    await db.dropCollection(MASTER_ACCOUNTS);
    console.log('🗑️  Dropped master_accounts collection');
  },
};

