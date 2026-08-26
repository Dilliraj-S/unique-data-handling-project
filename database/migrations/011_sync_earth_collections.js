/**
 * Migration 011: Create collections in earth database
 * Collections:
 *  - lic_company_extr
 *
 * NOTE: This migration is intended for the `earth` database.
 */

const TARGET_DATABASE = 'earth';

function ensureEarthDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 011_sync_earth_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in earth`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in earth, validator updated`);
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
  name: '011_sync_earth_collections',

  async up(db) {
    if (!ensureEarthDatabase(db)) return;
    console.log(`🌍 Running earth database migration: ${this.name}`);

    /**
     * lic_company_extr
     */
    const licCompanyExtrValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          lic_company_about: { bsonType: ['string', 'null'] },
          lic_company_name: { bsonType: ['string', 'null'] },
          lic_company_id: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
        },
      },
    };

    const licCompanyExtr = await ensureCollection(db, 'lic_company_extr', licCompanyExtrValidator);
    await createIndexes(
      licCompanyExtr,
      [
        [{ lic_company_id: 1 }, { name: 'idx_lic_company_id' }],
        [{ lic_company_name: 'text' }, { name: 'ft_lic_company_name' }],
        [{ lic_company_about: 'text' }, { name: 'ft_lic_company_about' }],
      ],
      'lic_company_extr'
    );
  },

  async down(db) {
    if (!ensureEarthDatabase(db)) return;

    try {
      await db.dropCollection('lic_company_extr');
      console.log(`🗑️  Dropped lic_company_extr collection from earth`);
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        console.warn(`⚠️  Could not drop lic_company_extr: ${error.message}`);
      }
    }
  },
};

