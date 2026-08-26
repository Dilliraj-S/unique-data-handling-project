/**
 * Migration: Create master_copy collection in the moon database
 * Mirrors the MySQL master_copy table structure with equivalent indexes.
 *
 * This collection contains 135 fields including:
 * - Company info (lic_* fields from LinkedIn Company)
 * - Contact info (li_* fields from LinkedIn Contact)
 * - DLS fields (dls_* fields for email/phone data)
 * - Apollo fields (ap_* fields)
 * - Google Search fields (gs_* fields)
 * - ZoomInfo fields (zm_* fields)
 * - Python SMTP fields (py_* fields)
 * - Workflow tracking (status, reason, created_at, updated_at, deleted_at)
 */

const migration = {
  // Include "moon" so migrate.js knows this migration is for the moon database
  name: '015_moon_create_master_copy_collection',

  /**
   * @param {import('mongodb').Db} db - Mongo DB instance (for the selected connection, e.g. moon)
   */
  async up(db) {
    console.log('Creating master_copy collection with schema validation...');

    const collections = await db.listCollections({ name: 'master_copy' }).toArray();
    if (collections.length > 0) {
      console.log('⚠️ master_copy collection already exists, dropping and recreating...');
      await db.dropCollection('master_copy');
    }

    // Define the JSON schema validator for master_copy collection
    // This ensures all 135 fields are properly structured
    const schemaValidator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id'],
        properties: {
          _id: { bsonType: 'objectId' },
          
          // 1. id
          id: { bsonType: ['int', 'long', 'double', 'string'] },
          
          // 2-33. LinkedIn Company fields (lic_*)
          lic_company_name: { bsonType: ['string', 'null'] },
          lic_company_id: { bsonType: ['string', 'null'] },
          lic_smtp: { bsonType: ['string', 'null'] },
          lic_company_about: { bsonType: ['string', 'null'] },
          lic_company_employee_size: { bsonType: ['string', 'null'] },
          lic_company_industry: { bsonType: ['string', 'null'] },
          lic_industry_relavance: { bsonType: ['string', 'null'] },
          lic_industry_mapping: { bsonType: ['string', 'null'] },
          lic_company_url: { bsonType: ['string', 'null'] },
          lic_company_specialties: { bsonType: ['string', 'null'] },
          lic_company_description: { bsonType: ['string', 'null'] },
          lic_tag_line: { bsonType: ['string', 'null'] },
          employees_on_linked_in: { bsonType: ['string', 'null'] },
          lic_company_founded: { bsonType: ['string', 'null'] },
          lic_company_headquarters: { bsonType: ['string', 'null'] },
          lic_company_headquarters_country: { bsonType: ['string', 'null'] },
          lic_hq_number: { bsonType: ['string', 'null'] },
          lic_is_admin: { bsonType: ['string', 'null'] },
          lic_logo: { bsonType: ['string', 'null'] },
          lic_banner: { bsonType: ['string', 'null'] },
          lic_follower_count: { bsonType: ['string', 'null'] },
          lic_website: { bsonType: ['string', 'null'] },
          lic_type: { bsonType: ['string', 'null'] },
          lic_hq_address: { bsonType: ['string', 'null'] },
          lic_industry_code: { bsonType: ['string', 'null'] },
          lic_company_query: { bsonType: ['string', 'null'] },
          lic_timestamp: { bsonType: ['string', 'null'] },
          lic_is_claimable: { bsonType: ['string', 'null'] },
          lic_error: { bsonType: ['string', 'null'] },
          lic_location_branch: { bsonType: ['string', 'null'] },
          lic_location_sub_branch: { bsonType: ['string', 'null'] },
          lic_competitors: { bsonType: ['string', 'null'] },
          
          // 34-58. LinkedIn Contact fields (li_*)
          li_company_name: { bsonType: ['string', 'null'] },
          li_full_name: { bsonType: ['string', 'null'] },
          li_first_name: { bsonType: ['string', 'null'] },
          li_middle_name: { bsonType: ['string', 'null'] },
          li_last_name: { bsonType: ['string', 'null'] },
          li_firstname_initial: { bsonType: ['string', 'null'] },
          li_lastname_initial: { bsonType: ['string', 'null'] },
          li_smtp: { bsonType: ['string', 'null'] },
          li_company_id: { bsonType: ['string', 'null'] },
          li_job_title: { bsonType: ['string', 'null'] },
          dls_designation: { bsonType: ['string', 'null'] },
          dls_management_level: { bsonType: ['string', 'null'] },
          dls_jobfunction: { bsonType: ['string', 'null'] },
          li_summary: { bsonType: ['string', 'null'] },
          li_contatct_industry: { bsonType: ['string', 'null'] },
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
          
          // 59. Email
          email: { bsonType: ['string', 'null'] },
          
          // 60-77. DLS fields (dls_*)
          dls_ooo_status: { bsonType: ['string', 'null'] },
          dls_uns_status: { bsonType: ['string', 'null'] },
          dls_bounce_status: { bsonType: ['string', 'null'] },
          dls_mailsend_status: { bsonType: ['string', 'null'] },
          dls_mailer_status: { bsonType: ['string', 'null'] },
          dls_bounce_reason: { bsonType: ['string', 'null'] },
          dls_leadgenerated_date: { bsonType: ['string', 'null'] },
          dls_lead_reponse: { bsonType: ['string', 'null'] },
          dls_dnd_status: { bsonType: ['string', 'null'] },
          dls_directdial: { bsonType: ['string', 'null'] },
          dls_mobile: { bsonType: ['string', 'null'] },
          dls_cell_phone: { bsonType: ['string', 'null'] },
          dls_phone_telephone: { bsonType: ['string', 'null'] },
          dls_office_number: { bsonType: ['string', 'null'] },
          dls_others_unknown: { bsonType: ['string', 'null'] },
          dls_additional_notes: { bsonType: ['string', 'null'] },
          dls_email_number: { bsonType: ['string', 'null'] },
          dls_fax_number: { bsonType: ['string', 'null'] },
          
          // 78-84. Apollo Contact fields (ap_*)
          ap_linkedin_contact_url: { bsonType: ['string', 'null'] },
          ap_full_name: { bsonType: ['string', 'null'] },
          ap_contact_city: { bsonType: ['string', 'null'] },
          ap_contact_state: { bsonType: ['string', 'null'] },
          ap_contact_country: { bsonType: ['string', 'null'] },
          ap_contact_twitter_url: { bsonType: ['string', 'null'] },
          ap_contact_facebook_url: { bsonType: ['string', 'null'] },
          
          // 85. Last Contact Date
          last_contact_date: { bsonType: ['string', 'null'] },
          
          // 86-101. Google Search fields (gs_*)
          gs_place_url: { bsonType: ['string', 'null'] },
          gs_category: { bsonType: ['string', 'null'] },
          gs_phone_number: { bsonType: ['string', 'null'] },
          gs_company_address: { bsonType: ['string', 'null'] },
          gs_street: { bsonType: ['string', 'null'] },
          gs_city: { bsonType: ['string', 'null'] },
          gs_state: { bsonType: ['string', 'null'] },
          gs_zipcode: { bsonType: ['string', 'null'] },
          gs_country: { bsonType: ['string', 'null'] },
          gs_zone_region: { bsonType: ['string', 'null'] },
          gs_country_code: { bsonType: ['string', 'null'] },
          gs_plus_code: { bsonType: ['string', 'null'] },
          gs_website: { bsonType: ['string', 'null'] },
          gs_smtp: { bsonType: ['string', 'null'] },
          gs_company_name: { bsonType: ['string', 'null'] },
          gs_title: { bsonType: ['string', 'null'] },
          
          // 102-113. Apollo Company fields (ap_*)
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
          
          // 114-125. ZoomInfo fields (zm_*)
          zm_technologies: { bsonType: ['string', 'null'] },
          zm_revenue_size: { bsonType: ['string', 'null'] },
          zm_company: { bsonType: ['string', 'null'] },
          zm_location: { bsonType: ['string', 'null'] },
          zm_industry: { bsonType: ['string', 'null'] },
          zm_employee_size: { bsonType: ['string', 'null'] },
          zm_website: { bsonType: ['string', 'null'] },
          zm_smtp: { bsonType: ['string', 'null'] },
          zm_country: { bsonType: ['string', 'null'] },
          zm_summary: { bsonType: ['string', 'null'] },
          zm_sic_codes: { bsonType: ['string', 'null'] },
          zm_naics_codes: { bsonType: ['string', 'null'] },
          
          // 126-130. Python SMTP fields (py_*)
          py_smtp: { bsonType: ['string', 'null'] },
          py_title: { bsonType: ['string', 'null'] },
          py_keywords: { bsonType: ['string', 'null'] },
          py_description: { bsonType: ['string', 'null'] },
          py_fetched_by: { bsonType: ['string', 'null'] },
          
          // 131-135. Tracking fields
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          status: { bsonType: ['string', 'null'] },
          reason: { bsonType: ['string', 'null'] },
        },
        additionalProperties: true, // Allow extra fields for flexibility
      },
    };

    // Create collection with schema validation
    await db.createCollection('master_copy', { validator: schemaValidator });
    console.log('✅ master_copy collection created with schema validation');

    const collection = db.collection('master_copy');

    // Create indexes roughly equivalent to the MySQL indexes
    // PRIMARY KEY (`id`)
    await collection.createIndex({ id: 1 }, { name: 'pk_id' });

    // ADD KEY `master_copy_lic_company_name_index` (`lic_company_name`)
    await collection.createIndex({ lic_company_name: 1 }, { name: 'master_copy_lic_company_name_index' });

    // ADD KEY `master_copy_li_full_name_index` (`li_full_name`)
    await collection.createIndex({ li_full_name: 1 }, { name: 'master_copy_li_full_name_index' });

    // ADD KEY `lic_company_name` (`lic_company_name`,`lic_company_id`,`lic_smtp`)
    await collection.createIndex(
      { lic_company_name: 1, lic_company_id: 1, lic_smtp: 1 },
      { name: 'lic_company_name_composite' }
    );

    // ADD KEY `li_job_title` (`li_job_title`)
    await collection.createIndex({ li_job_title: 1 }, { name: 'li_job_title_index' });

    // ADD KEY `li_company_name` (`li_company_name`,`li_smtp`,`li_company_id`);
    await collection.createIndex(
      { li_company_name: 1, li_smtp: 1, li_company_id: 1 },
      { name: 'li_company_name_composite' }
    );

    // ADD KEY `idx_status_id` (`status`, `id`)
    await collection.createIndex(
      { status: 1, id: 1 },
      { name: 'idx_status_id' }
    );

    // Helpful extra indexes for master flow processing
    await collection.createIndex({ status: 1 }, { name: 'status_index' });
    await collection.createIndex({ gs_country: 1 }, { name: 'gs_country_index' });
    await collection.createIndex({ zm_smtp: 1 }, { name: 'zm_smtp_index' });
    await collection.createIndex({ ap_company_smtp: 1 }, { name: 'ap_company_smtp_index' });
    await collection.createIndex({ created_at: 1 }, { name: 'created_at_index' });

    console.log('✅ master_copy indexes created/ensured');
  },

  async down(db) {
    console.log('Rolling back: Dropping master_copy collection (if exists)...');
    try {
      const collections = await db.listCollections({ name: 'master_copy' }).toArray();
      if (collections.length > 0) {
        await db.dropCollection('master_copy');
        console.log('✅ master_copy collection dropped');
      } else {
        console.log('ℹ️ master_copy collection does not exist, nothing to drop');
      }
    } catch (error) {
      console.error('⚠️ Error dropping master_copy collection:', error.message);
      // Continue anyway - collection might not exist
    }
  },
};

module.exports = migration;


