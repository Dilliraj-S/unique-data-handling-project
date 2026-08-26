/**
 * Create New Collections in Sun Database
 * 
 * This script creates the following collections in the 'sun' database:
 * - zoom
 * - apollo
 * - outsourcing
 * - dlslinkedin
 * - karur
 * - other
 * 
 * It uses the 'master_leads' schema (provided below) and copies all indexes 
 * from the 'master_leads' collection to these new collections.
 * 
 * Run: node scripts/create-new-collections.js
 */

const { MongoClient } = require('mongodb');

// Configuration
const DB_NAME = 'sun';
const SOURCE_COLLECTION = 'master_leads';
const TARGET_COLLECTIONS = [
  'zoom',
  'apollo',
  'outsourcing',
  'dlslinkedin',
  'karur',
  'other'
];

// Master Leads Schema (Provided by user)
const MASTER_LEADS_SCHEMA = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      "_id", "ap_contact_city", "ap_contact_country", "ap_contact_facebook_url", "ap_contact_state", 
      "ap_contact_twitter_url", "ap_full_name", "ap_linkedin_contact_url", "created_at", "created_by", 
      "deleted_at", "dls_additional_notes", "dls_bounce_reason", "dls_bounce_status", "dls_cell_phone", 
      "dls_designation", "dls_direct_dial", "dls_dnd_status", "dls_email_number", "dls_fax_number", 
      "dls_jobfunction", "dls_lead_generated_date", "dls_lead_response", "dls_mail_send_status", 
      "dls_mailer_status", "dls_managementlevel", "dls_mobile", "dls_office_number", "dls_ooo_status", 
      "dls_others_unknown", "dls_phone_telephone", "dls_uns_status", "email", "employee_size", 
      "gs_category", "gs_city", "gs_company_address", "gs_company_name", "gs_country", "gs_country_code", 
      "gs_phone_number", "gs_place_url", "gs_plus_code", "gs_smtp", "gs_state", "gs_street", "gs_title", 
      "gs_website", "gs_zipcode", "gs_zone_region", "id", "industry", "last_contact_date", 
      "li_certifications", "li_company_id", "li_company_location", "li_company_name", "li_contact_country", 
      "li_contact_industry", "li_contact_location", "li_contact_query", "li_Contact_summary", 
      "li_contact_url", "li_duration_in_role", "li_first_name", "li_first_name_initial", "li_full_name", 
      "li_job_title", "li_last_name", "li_last_name_initial", "li_middle_name", "li_profile_url", 
      "li_salesnav_profile_url", "li_skills", "li_title_description", "reference_1", "reference_10", 
      "reference_2", "reference_3", "reference_4", "reference_5", "reference_6", "reference_7", 
      "reference_8", "reference_9", "revenue", "updated_at", "updated_by"
    ],
    properties: {
      _id: { bsonType: "objectId" },
      ap_contact_city: { bsonType: ["string", "null"] },
      ap_contact_country: { bsonType: ["string", "null"] },
      ap_contact_facebook_url: { bsonType: ["string", "null"] },
      ap_contact_state: { bsonType: ["string", "null"] },
      ap_contact_twitter_url: { bsonType: ["string", "null"] },
      ap_full_name: { bsonType: ["string", "null"] },
      ap_linkedin_contact_url: { bsonType: ["string", "null"] },
      created_at: { bsonType: ["date", "string", "null"] },
      created_by: { bsonType: ["string", "null"] },
      deleted_at: { bsonType: ["date", "string", "null"] },
      dls_additional_notes: { bsonType: ["string", "null"] },
      dls_bounce_reason: { bsonType: ["string", "null"] },
      dls_bounce_status: { bsonType: ["string", "null"] },
      dls_cell_phone: { bsonType: ["string", "null"] },
      dls_designation: { bsonType: ["string", "null"] },
      dls_direct_dial: { bsonType: ["string", "null"] },
      dls_dnd_status: { bsonType: ["string", "null"] },
      dls_email_number: { bsonType: ["string", "int", "null"] },
      dls_fax_number: { bsonType: ["string", "null"] },
      dls_jobfunction: { bsonType: ["string", "null"] },
      dls_lead_generated_date: { bsonType: ["string", "date", "null"] },
      dls_lead_response: { bsonType: ["string", "null"] },
      dls_mail_send_status: { bsonType: ["string", "null"] },
      dls_mailer_status: { bsonType: ["string", "null"] },
      dls_managementlevel: { bsonType: ["string", "null"] },
      dls_mobile: { bsonType: ["string", "null"] },
      dls_office_number: { bsonType: ["string", "null"] },
      dls_ooo_status: { bsonType: ["string", "null"] },
      dls_others_unknown: { bsonType: ["string", "null"] },
      dls_phone_telephone: { bsonType: ["string", "null"] },
      dls_uns_status: { bsonType: ["string", "null"] },
      email: { bsonType: ["string", "null"] },
      employee_size: { bsonType: ["string", "null"] },
      gs_category: { bsonType: ["string", "null"] },
      gs_city: { bsonType: ["string", "null"] },
      gs_company_address: { bsonType: ["string", "null"] },
      gs_company_name: { bsonType: ["string", "null"] },
      gs_country: { bsonType: ["string", "null"] },
      gs_country_code: { bsonType: ["string", "int", "null"] },
      gs_phone_number: { bsonType: ["string", "null"] },
      gs_place_url: { bsonType: ["string", "null"] },
      gs_plus_code: { bsonType: ["string", "null"] },
      gs_smtp: { bsonType: ["string", "null"] },
      gs_state: { bsonType: ["string", "null"] },
      gs_street: { bsonType: ["string", "null"] },
      gs_title: { bsonType: ["string", "int", "null"] },
      gs_website: { bsonType: ["string", "null"] },
      gs_zipcode: { bsonType: ["string", "int", "null"] },
      gs_zone_region: { bsonType: ["string", "null"] },
      id: { bsonType: ["int", "long"] }, // Adjusted to accept both int/long
      industry: { bsonType: ["string", "null"] },
      last_contact_date: { bsonType: ["string", "date", "null"] },
      li_certifications: { bsonType: ["string", "null"] },
      li_company_id: { bsonType: ["string", "int", "null"] },
      li_company_location: { bsonType: ["string", "null"] },
      li_company_name: { bsonType: ["string", "null"] },
      li_contact_country: { bsonType: ["string", "null"] },
      li_contact_industry: { bsonType: ["string", "null"] },
      li_contact_location: { bsonType: ["string", "null"] },
      li_contact_query: { bsonType: ["string", "null"] },
      li_Contact_summary: { bsonType: ["string", "null"] },
      li_contact_url: { bsonType: ["string", "null"] },
      li_duration_in_role: { bsonType: ["string", "null"] },
      li_first_name: { bsonType: ["string", "null"] },
      li_first_name_initial: { bsonType: ["string", "null"] },
      li_full_name: { bsonType: ["string", "null"] },
      li_job_title: { bsonType: ["string", "null"] },
      li_last_name: { bsonType: ["string", "null"] },
      li_last_name_initial: { bsonType: ["string", "null"] },
      li_middle_name: { bsonType: ["string", "null"] },
      li_profile_url: { bsonType: ["string", "null"] },
      li_salesnav_profile_url: { bsonType: ["string", "null"] },
      li_skills: { bsonType: ["string", "null"] },
      li_title_description: { bsonType: ["string", "null"] },
      reference_1: { bsonType: ["string", "null"] },
      reference_10: { bsonType: ["string", "null"] },
      reference_2: { bsonType: ["string", "null"] },
      reference_3: { bsonType: ["string", "null"] },
      reference_4: { bsonType: ["string", "null"] },
      reference_5: { bsonType: ["string", "null"] },
      reference_6: { bsonType: ["string", "null"] },
      reference_7: { bsonType: ["string", "null"] },
      reference_8: { bsonType: ["string", "null"] },
      reference_9: { bsonType: ["string", "null"] },
      revenue: { bsonType: ["string", "null"] },
      updated_at: { bsonType: ["date", "string", "null"] },
      updated_by: { bsonType: ["string", "null"] }
    }
  }
};

const getMongoUri = () => {
    return process.env.SUN_MONGODB_URI || 
           process.env.MONGODB_URI || 
           'mongodb://localhost:27017/sun';
};

async function processCollection(db, sourceName, targetName, schema) {
    console.log(`\n🔹 Processing: ${sourceName} -> ${targetName}`);
    
    // 1. Drop target if exists (optional - uncomment if you want to recreate)
    // For safety, we'll check creation first
    try {
        const collections = await db.listCollections({ name: targetName }).toArray();
        if (collections.length > 0) {
            console.log(`   Colletion ${targetName} already exists. Skipping creation.`);
        } else {
             // 2. Create collection with Schema Validator
            console.log(`   Creating ${targetName} with schema validator...`);
            await db.createCollection(targetName, {
                validator: schema
            });
            console.log(`   ✅ Collection created successfully.`);
        }
    } catch (e) {
        console.error(`   Error check/create ${targetName}:`, e.message);
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
            
            // console.log(`   - Copying index: ${idx.name}`);
            
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
                // Ignore if index already exists
                if (idxErr.code !== 85) { // 85 = IndexOptionsConflict
                    console.warn(`     ⚠️ Failed to copy index ${idx.name}: ${idxErr.message}`);
                }
            }
        }
        console.log(`   ✅ Copied/Verified ${copiedCount} indexes.`);
        
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

        // Process all target collections
        for (const targetName of TARGET_COLLECTIONS) {
          await processCollection(
            db, 
            SOURCE_COLLECTION, 
            targetName, 
            MASTER_LEADS_SCHEMA
          );
        }

        console.log('\n✨ All operations complete!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
