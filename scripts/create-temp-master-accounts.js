/**
 * Create master_accounts Collection in Sun Database
 * 
 * Creates a new 'master_accounts' collection in the 'sun' database
 * with the same schema validator and indexes as 'temp_master_accounts'.
 * Does NOT touch temp_master_accounts.
 * 
 * Run: node scripts/create-temp-master-accounts.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const DB_NAME = 'sun';
const SOURCE = 'temp_master_accounts';  // Copy indexes FROM this
const TARGET = 'master_accounts';       // Create THIS new collection

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

async function main() {
  const uri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    console.log(`📦 Database: ${DB_NAME}`);

    // 1. Count indexes on temp_master_accounts (source)
    console.log(`\n📋 Checking indexes on ${SOURCE}...`);
    const sourceCol = db.collection(SOURCE);
    const sourceIndexes = await sourceCol.indexes();
    console.log(`   📊 ${SOURCE} has ${sourceIndexes.length} indexes:`);
    for (const idx of sourceIndexes) {
      console.log(`      - ${idx.name}: ${JSON.stringify(idx.key)}`);
    }

    // 2. Check if master_accounts already exists
    const existing = await db.listCollections({ name: TARGET }).toArray();
    if (existing.length > 0) {
      console.log(`\n⚠️  ${TARGET} already exists! Aborting to prevent data loss.`);
      console.log(`   If you want to recreate it, drop it manually first.`);
      return;
    }

    // 3. Create master_accounts with schema validator
    console.log(`\n📝 Creating ${TARGET} with schema validator...`);
    await db.createCollection(TARGET, {
      validator: MASTER_ACCOUNTS_SCHEMA
    });
    console.log(`   ✅ Collection ${TARGET} created.`);

    // 4. Copy indexes from temp_master_accounts
    console.log(`\n📋 Copying ${sourceIndexes.length - 1} indexes from ${SOURCE} to ${TARGET}...`);
    const targetCol = db.collection(TARGET);
    let copiedCount = 0;

    for (const idx of sourceIndexes) {
      if (idx.name === '_id_') continue;

      const options = { ...idx };
      delete options.ns;
      delete options.v;
      delete options.key;
      options.background = true;

      try {
        await targetCol.createIndex(idx.key, options);
        copiedCount++;
        console.log(`   ✅ Copied: ${idx.name} → ${JSON.stringify(idx.key)}`);
      } catch (idxErr) {
        console.warn(`   ⚠️ Failed: ${idx.name}: ${idxErr.message}`);
      }
    }

    // 5. Verify
    const newIndexes = await targetCol.indexes();
    console.log(`\n🎉 Done!`);
    console.log(`   ${TARGET} created with ${newIndexes.length} indexes (${copiedCount} copied + _id_)`);
    console.log(`   ${SOURCE} is untouched.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Connection closed.');
  }
}

main().catch(console.error);
