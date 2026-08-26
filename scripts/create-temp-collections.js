/**
 * Create Temp Collections in Sun Database
 * 
 * This script creates 'temp_master_leads' and 'temp_master_accounts' in the 'sun' database.
 * It applies the specific JSON schemas provided and copies all indexes from the original collections.
 * 
 * Run: node scripts/create-temp-collections.js
 */

const { MongoClient } = require('mongodb');

// Configuration
const DB_NAME = 'sun';
const SOURCE_LEADS = 'master_leads';
const TARGET_LEADS = 'temp_master_leads';
const SOURCE_ACCOUNTS = 'master_accounts';
const TARGET_ACCOUNTS = 'temp_master_accounts';

// Schemas provided by user
const MASTER_ACCOUNTS_SCHEMA = {
  "$jsonSchema": {
    "bsonType": "object",
    "required": [
      "_id", "ap_company_city", "ap_company_country", "ap_company_facebook_url", "ap_company_keywords", 
      "ap_company_linkedin_url", "ap_company_name", "ap_company_phone_numbers", "ap_company_smtp", 
      "ap_company_state", "ap_company_twitter_url", "ap_company_website", "ap_industry", "created_at", 
      "created_by", "deleted_at", "employees_on_linked_in", "id", "li_banner", "li_company_about", 
      "li_company_description", "li_company_employee_size", "li_company_founded", "li_company_headquarters", 
      "li_company_headquarters_country", "li_company_id", "li_company_industry", "li_company_name", 
      "li_company_query", "li_company_specialties", "li_company_url", "li_competitors", "li_error", 
      "li_follower_count", "li_hq_address", "li_hq_number", "li_industry_code", "li_industry_mapping", 
      "li_industry_relavance", "li_is_admin", "li_is_claimable", "li_location_branch", "li_location_sub_branch", 
      "li_logo", "li_smtp", "li_tag_line", "li_timestamp", "li_type", "li_website", "lic_company_id", 
      "lic_company_name", "need_to_action", "py_description", "py_keywords", "py_smtp", "py_title", 
      "reference_1", "reference_10", "reference_2", "reference_3", "reference_4", "reference_5", 
      "reference_6", "reference_7", "reference_8", "reference_9", "updated_at", "updated_by", 
      "zm_company", "zm_country", "zm_empyoyee_size", "zm_industry", "zm_location", "zm_naics_codes", 
      "zm_revenue_size", "zm_sic_codes", "zm_smtp", "zm_summary", "zm_technologies", "zm_website"
    ],
    "properties": {
      "_id": { "bsonType": "objectId" },
      "ap_company_city": { "bsonType": "null" },
      "ap_company_country": { "bsonType": "null" },
      "ap_company_facebook_url": { "bsonType": "null" },
      "ap_company_keywords": { "bsonType": "null" },
      "ap_company_linkedin_url": { "bsonType": "null" },
      "ap_company_name": { "bsonType": "null" },
      "ap_company_phone_numbers": { "bsonType": "null" },
      "ap_company_smtp": { "bsonType": "null" },
      "ap_company_state": { "bsonType": "null" },
      "ap_company_twitter_url": { "bsonType": "null" },
      "ap_company_website": { "bsonType": "null" },
      "ap_industry": { "bsonType": "null" },
      "created_at": { "bsonType": "string" },
      "created_by": { "bsonType": "null" },
      "deleted_at": { "bsonType": "null" },
      "employees_on_linked_in": { "bsonType": ["int", "null"] },
      "id": { "bsonType": "int" },
      "li_banner": { "bsonType": ["null", "string"] },
      "li_company_about": { "bsonType": ["string", "null", "int"] },
      "li_company_description": { "bsonType": ["string", "null", "int"] },
      "li_company_employee_size": { "bsonType": "string" },
      "li_company_founded": { "bsonType": ["int", "null"] },
      "li_company_headquarters": { "bsonType": ["string", "null"] },
      "li_company_headquarters_country": { "bsonType": ["string", "null"] },
      "li_company_id": { "bsonType": "int" },
      "li_company_industry": { "bsonType": "string" },
      "li_company_name": { "bsonType": ["string", "null"] },
      "li_company_query": { "bsonType": "string" },
      "li_company_specialties": { "bsonType": ["string", "null"] },
      "li_company_url": { "bsonType": ["string", "null"] },
      "li_competitors": { "bsonType": "null" },
      "li_error": { "bsonType": "null" },
      "li_follower_count": { "bsonType": ["int", "null"] },
      "li_hq_address": { "bsonType": ["string", "null"] },
      "li_hq_number": { "bsonType": ["null", "string"] },
      "li_industry_code": { "bsonType": ["int", "null"] },
      "li_industry_mapping": { "bsonType": "string" },
      "li_industry_relavance": { "bsonType": "string" },
      "li_is_admin": { "bsonType": ["null", "bool"] },
      "li_is_claimable": { "bsonType": ["null", "bool"] },
      "li_location_branch": { "bsonType": ["null", "string"] },
      "li_location_sub_branch": { "bsonType": "null" },
      "li_logo": { "bsonType": ["string", "null"] },
      "li_smtp": { "bsonType": "string" },
      "li_tag_line": { "bsonType": ["string", "null", "int"] },
      "li_timestamp": { "bsonType": ["date", "null"] },
      "li_type": { "bsonType": ["null", "string"] },
      "li_website": { "bsonType": ["string", "null"] },
      "lic_company_id": { "bsonType": "int" },
      "lic_company_name": { "bsonType": ["string", "null"] },
      "need_to_action": { "bsonType": ["null", "int"] },
      "py_description": { "bsonType": ["string", "null", "int"] },
      "py_keywords": { "bsonType": ["null", "int", "string"] },
      "py_smtp": { "bsonType": ["string", "null"] },
      "py_title": { "bsonType": ["string", "null"] },
      "reference_1": { "bsonType": ["string", "null"] },
      "reference_10": { "bsonType": "null" },
      "reference_2": { "bsonType": ["null", "string"] },
      "reference_3": { "bsonType": "null" },
      "reference_4": { "bsonType": "null" },
      "reference_5": { "bsonType": "null" },
      "reference_6": { "bsonType": "null" },
      "reference_7": { "bsonType": "null" },
      "reference_8": { "bsonType": "null" },
      "reference_9": { "bsonType": "null" },
      "updated_at": { "bsonType": "null" },
      "updated_by": { "bsonType": "null" },
      "zm_company": { "bsonType": ["null", "string"] },
      "zm_country": { "bsonType": ["null", "string"] },
      "zm_empyoyee_size": { "bsonType": ["null", "string"] },
      "zm_industry": { "bsonType": ["null", "string"] },
      "zm_location": { "bsonType": ["null", "string"] },
      "zm_naics_codes": { "bsonType": "null" },
      "zm_revenue_size": { "bsonType": ["null", "string", "int"] },
      "zm_sic_codes": { "bsonType": ["null", "int"] },
      "zm_smtp": { "bsonType": ["null", "string"] },
      "zm_summary": { "bsonType": ["null", "string"] },
      "zm_technologies": { "bsonType": ["null", "string"] },
      "zm_website": { "bsonType": ["null", "string"] }
    }
  }
};

const MASTER_LEADS_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    properties: {
      _id: { bsonType: 'objectId' },
      // String fields (varchar/text in MySQL)
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
      deleted_at: { bsonType: ['date', 'string', 'null'] }
    }
  }
};

const getMongoUri = () => {
    return process.env.PLUTO_MONGODB_URI || 
           process.env.MONGODB_URI || 
           'mongodb://localhost:27017';
};

async function processCollection(db, sourceName, targetName, schema) {
    console.log(`\n🔹 Processing: ${sourceName} -> ${targetName}`);
    
    // 1. Drop target if exists
    try {
        const collections = await db.listCollections({ name: targetName }).toArray();
        if (collections.length > 0) {
            console.log(`   Dropping existing ${targetName}...`);
            await db.collection(targetName).drop();
        }
    } catch (e) {
        console.error(`   Error dropping ${targetName}:`, e.message);
    }

    // 2. Create collection with Schema Validator
    console.log(`   Creating ${targetName} with schema validator...`);
    try {
        await db.createCollection(targetName, {
            validator: schema
        });
        console.log(`   ✅ Collection created successfully.`);
    } catch(e) {
        console.error(`   ❌ Failed to create collection:`, e.message);
        return;
    }

    // 3. Copy Indexes from Source
    try {
        const sourceCol = db.collection(sourceName);
        const targetCol = db.collection(targetName);
        
        const indexes = await sourceCol.indexes();
        console.log(`   Found ${indexes.length} indexes on ${sourceName}. Copying...`);
        
        let copiedCount = 0;
        for (const idx of indexes) {
            if (idx.name === '_id_') continue; // Skip default index
            
            console.log(`   - Copying index: ${idx.name}`);
            
            // Prepare index options: Copy ALL properties from source index
            // Then remove system-managed fields
            const options = { ...idx };
            delete options.ns;  // Namespace
            delete options.v;   // Version
            delete options.key; // Key (passed as first arg)
            
            // Ensure background creation
            options.background = true;
            
            try {
                await targetCol.createIndex(idx.key, options);
                copiedCount++;
            } catch (idxErr) {
                console.warn(`     ⚠️ Failed to copy index ${idx.name}: ${idxErr.message}`);
                // Continue with other indexes
            }
        }
        console.log(`   ✅ Copied ${copiedCount} indexes.`);
        
        // 4. Verify Indexes
        const newIndexes = await targetCol.indexes();
        console.log(`   🔍 Verification: ${targetName} now has ${newIndexes.length} indexes.`);
        
    } catch(e) {
        console.error(`   ⚠️ Error copying indexes (Source collection might not exist):`, e.message);
    }
}

async function main() {
    const uri = getMongoUri();
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db(DB_NAME);
        console.log(`Using database: ${DB_NAME}`);

        // Process Leads
        await processCollection(
            db, 
            SOURCE_LEADS, 
            TARGET_LEADS, 
            MASTER_LEADS_SCHEMA
        );

        // Process Accounts
        await processCollection(
            db, 
            SOURCE_ACCOUNTS, 
            TARGET_ACCOUNTS, 
            MASTER_ACCOUNTS_SCHEMA
        );

        console.log('\n✨ All operations complete!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
