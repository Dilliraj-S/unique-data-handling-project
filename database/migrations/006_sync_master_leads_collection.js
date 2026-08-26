/**
 * Migration 006: Create/Sync master_leads collection in sun database
 * Mirrors the MySQL master_leads table structure with validation + indexes
 */

const MASTER_LEADS = 'master_leads';

const masterLeadsValidator = {
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
    },
  },
};

async function ensureCollection(db) {
  const existing = await db.listCollections({ name: MASTER_LEADS }).toArray();
  if (existing.length === 0) {
    await db.createCollection(MASTER_LEADS, { validator: masterLeadsValidator });
    console.log('✅ Created master_leads collection');
  } else {
    await db.command({
      collMod: MASTER_LEADS,
      validator: masterLeadsValidator,
      validationLevel: 'moderate',
    });
    console.log('ℹ️  master_leads already existed, validator updated');
  }
  return db.collection(MASTER_LEADS);
}

async function createIndexes(collection) {
  const indexSpecs = [
    [{ id: 1 }, { name: 'id_idx' }],
    [{ email: 1 }, { name: 'idx_email' }],
    [{ li_company_name: 1 }, { name: 'li_company_name_idx' }],
    [{ li_full_name: 1 }, { name: 'li_full_name_idx' }],
    [{ li_smtp: 1 }, { name: 'li_smtp_idx' }],
    [{ created_at: 1 }, { name: 'created_at_idx' }],
    [{ li_middle_name: 1 }, { name: 'li_middle_name_idx' }],
    [{ li_last_name: 1 }, { name: 'li_last_name_idx' }],
    [{ dls_designation: 1 }, { name: 'dls_designation_idx' }],
    [{ li_company_id: 1 }, { name: 'li_company_id_idx' }],
    [{ need_to_action: 1 }, { name: 'need_to_action_idx' }],
    [{ li_job_title: 1 }, { name: 'li_job_title_idx' }],
    [{ li_contact_country: 1 }, { name: 'li_contact_country_idx' }],
    [{ li_first_name: 1 }, { name: 'li_first_name_idx' }],
    [{ li_first_name_initial: 1 }, { name: 'li_first_name_initial_idx' }],
    [{ li_last_name_initial: 1 }, { name: 'li_last_name_initial_idx' }],
    [{ dls_managementlevel: 1 }, { name: 'dls_managementlevel_idx' }],
    [{ dls_jobfunction: 1 }, { name: 'dls_jobfunction_idx' }],
    [{ li_contact_location: 1 }, { name: 'li_contact_location_idx' }],
    [{ ap_full_name: 1 }, { name: 'ap_full_name_idx' }],
    [{ dls_email_number: 1 }, { name: 'dls_email_number_idx' }],
    [{ ap_contact_country: 1 }, { name: 'ap_contact_country_idx' }],
    [{ last_contact_date: 1 }, { name: 'last_contact_date_idx' }],
  ];

  for (const [keys, options] of indexSpecs) {
    await collection.createIndex(keys, options);
  }
  console.log('✅ master_leads indexes created/ensured');
}

module.exports = {
  name: '006_sync_master_leads_collection',
  async up(db) {
    const collection = await ensureCollection(db);
    await createIndexes(collection);
  },
  async down(db) {
    await db.dropCollection(MASTER_LEADS);
    console.log('🗑️  Dropped master_leads collection');
  },
};

