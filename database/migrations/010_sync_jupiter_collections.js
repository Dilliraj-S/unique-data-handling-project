/**
 * Migration 010: Create collections in jupiter database
 * Collections:
 *  - apollo_data
 *
 * NOTE: This migration is intended for the `jupiter` database.
 */

const TARGET_DATABASE = 'jupiter';

function ensureJupiterDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 010_sync_jupiter_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in jupiter`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in jupiter, validator updated`);
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
  name: '010_sync_jupiter_collections',

  async up(db) {
    if (!ensureJupiterDatabase(db)) return;
    console.log(`🪐 Running jupiter database migration: ${this.name}`);

    /**
     * apollo_data
     */
    const apolloDataValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          ap_company_name: { bsonType: ['string'] },
          ap_job_title: { bsonType: ['string', 'null'] },
          ap_linkedin_contact_url: { bsonType: ['string', 'null'] },
          ap_full_name: { bsonType: ['string', 'null'] },
          ap_contact_city: { bsonType: ['string', 'null'] },
          ap_contact_country: { bsonType: ['string', 'null'] },
          ap_contact_twitter_url: { bsonType: ['string', 'null'] },
          ap_contact_facebook_url: { bsonType: ['string', 'null'] },
          last_contact_date: { bsonType: ['string', 'null'] },
          ap_industry: { bsonType: ['string', 'null'] },
          ap_company_keywords: { bsonType: ['string', 'null'] },
          ap_company_city: { bsonType: ['string', 'null'] },
          ap_company_state: { bsonType: ['string', 'null'] },
          ap_company_country: { bsonType: ['string', 'null'] },
          ap_company_linkedin_url: { bsonType: ['string', 'null'] },
          ap_company_twitter_url: { bsonType: ['string', 'null'] },
          ap_company_facebook_url: { bsonType: ['string', 'null'] },
          ap_company_phone_numbers: { bsonType: ['string', 'null'] },
          ap_company_website: { bsonType: ['string', 'null'] },
          ap_company_smtp: { bsonType: ['string'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
        required: ['ap_company_name', 'ap_company_smtp'],
      },
    };

    const apolloData = await ensureCollection(db, 'apollo_data', apolloDataValidator);
    await createIndexes(
      apolloData,
      [
        [{ ap_company_smtp: 1 }, { name: 'idx_ap_company_smtp' }],
        [{ ap_company_name: 'text' }, { name: 'ft_ap_company_name' }],
      ],
      'apollo_data'
    );
  },

  async down(db) {
    if (!ensureJupiterDatabase(db)) return;

    try {
      await db.dropCollection('apollo_data');
      console.log(`🗑️  Dropped apollo_data collection from jupiter`);
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        console.warn(`⚠️  Could not drop apollo_data: ${error.message}`);
      }
    }
  },
};

