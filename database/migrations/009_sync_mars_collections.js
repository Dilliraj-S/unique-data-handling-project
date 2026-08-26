/**
 * Migration 009: Create collections in mars database
 * Collections:
 *  - gmse_company_info
 *  - li_company_info
 *
 * NOTE: This migration is intended for the `mars` database.
 */

const TARGET_DATABASE = 'mars';

function ensureMarsDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 009_sync_mars_collections for database: ${dbName}`);
    return false;
  }
  if (!dbName) {
    console.warn(`⚠️  Could not determine database name, proceeding anyway...`);
  }
  return true;
}

async function ensureCollection(db, name, validator) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, { validator });
    console.log(`✅ Created ${name} collection in mars`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in mars, validator updated`);
  }
  return db.collection(name);
}

async function createIndexes(collection, indexSpecs, label) {
  for (const [keys, options] of indexSpecs) {
    try {
      await collection.createIndex(keys, options);
    } catch (error) {
      if (error.codeName === 'IndexOptionsConflict' || error.codeName === 'IndexKeySpecsConflict') {
        console.log(`ℹ️  Index ${options.name || JSON.stringify(keys)} already exists, skipping`);
      } else {
        throw error;
      }
    }
  }
  console.log(`✅ ${label} indexes created/ensured`);
}

module.exports = {
  name: '009_sync_mars_collections',

  async up(db) {
    if (!ensureMarsDatabase(db)) return;
    console.log(`🔴 Running mars database migration: ${this.name}`);

    /**
     * gmse_company_info
     */
    const gmseCompanyInfoValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
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
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const gmseCompanyInfo = await ensureCollection(db, 'gmse_company_info', gmseCompanyInfoValidator);
    await createIndexes(
      gmseCompanyInfo,
      [
        [{ id: 1 }, { name: 'gmse_company_info_id_pk', unique: true }],
        [{ gs_country: 1, gs_zone_region: 1, gs_smtp: 1, gs_company_name: 1 }, { name: 'gmse_company_info_gs_country_idx' }],
        [{ id: 1 }, { name: 'gmse_company_info_id_idx' }],
        [{ gs_smtp: 1, gs_country: 1 }, { name: 'idx_gs_smtp_country' }],
        [{ gs_smtp: 1, gs_country: 1, gs_company_name: 1, gs_website: 1 }, { name: 'idx_gs_smtp_country_cover' }],
      ],
      'gmse_company_info'
    );

    /**
     * li_company_info
     */
    const liCompanyInfoValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          lic_smtp: { bsonType: ['string', 'null'] },
          lic_company_id: { bsonType: ['string', 'null'] },
          lic_company_name: { bsonType: ['string', 'null'] },
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
          lic_companyheadquarters_country: { bsonType: ['string', 'null'] },
          lic_hq_number: { bsonType: ['string', 'null'] },
          lic_is_admin: { bsonType: ['string', 'null'] },
          lic_logo: { bsonType: ['string', 'null'] },
          lic_banner: { bsonType: ['string', 'null'] },
          lic_follower_count: { bsonType: ['int', 'long', 'string', 'null'] },
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
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const liCompanyInfo = await ensureCollection(db, 'li_company_info', liCompanyInfoValidator);
    await createIndexes(
      liCompanyInfo,
      [
        [{ id: 1 }, { name: 'li_company_info_id_pk', unique: true }],
        [{ lic_smtp: 1, lic_company_industry: 1, lic_company_id: 1, lic_company_name: 1 }, { name: 'li_smtp' }],
        [{ lic_company_id: 1 }, { name: 'idx_lic_company_id' }],
        [{ lic_smtp: 1, lic_company_id: 1 }, { name: 'idx_lic_smtp_companyid' }],
      ],
      'li_company_info'
    );
  },

  async down(db) {
    if (!ensureMarsDatabase(db)) return;

    const collections = ['gmse_company_info', 'li_company_info'];

    for (const name of collections) {
      try {
        await db.dropCollection(name);
        console.log(`🗑️  Dropped ${name} collection from mars`);
      } catch (error) {
        if (error.codeName !== 'NamespaceNotFound') {
          console.warn(`⚠️  Could not drop ${name}: ${error.message}`);
        }
      }
    }
  },
};

