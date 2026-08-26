/**
 * Migration 013: Create collections in saturn database
 * Collections:
 *  - zm_data
 *
 * NOTE: This migration is intended for the `saturn` database.
 */

const TARGET_DATABASE = 'saturn';

function ensureSaturnDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 013_sync_saturn_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in saturn`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in saturn, validator updated`);
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
  name: '013_sync_saturn_collections',

  async up(db) {
    if (!ensureSaturnDatabase(db)) return;
    console.log(`🪐 Running saturn database migration: ${this.name}`);

    /**
     * zm_data
     */
    const zmDataValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
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
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const zmData = await ensureCollection(db, 'zm_data', zmDataValidator);
    // No indexes specified for zm_data, so we'll just create the collection
    console.log(`✅ zm_data collection created/ensured (no indexes specified)`);
  },

  async down(db) {
    if (!ensureSaturnDatabase(db)) return;

    try {
      await db.dropCollection('zm_data');
      console.log(`🗑️  Dropped zm_data collection from saturn`);
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        console.warn(`⚠️  Could not drop zm_data: ${error.message}`);
      }
    }
  },
};

