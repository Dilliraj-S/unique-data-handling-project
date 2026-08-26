/**
 * Migration 012: Create collections in mercury database
 * Collections:
 *  - smtp_junk
 *  - titles_master
 *  - country_mapping
 *
 * NOTE: This migration is intended for the `mercury` database.
 */

const TARGET_DATABASE = 'mercury';

function ensureMercuryDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 012_sync_mercury_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in mercury`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in mercury, validator updated`);
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
  name: '012_sync_mercury_collections',

  async up(db) {
    if (!ensureMercuryDatabase(db)) return;
    console.log(`☿️  Running mercury database migration: ${this.name}`);

    /**
     * smtp_junk
     */
    const smtpJunkValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          smtp: { bsonType: ['string', 'null'] },
          junk: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const smtpJunk = await ensureCollection(db, 'smtp_junk', smtpJunkValidator);
    await createIndexes(
      smtpJunk,
      [
        [{ id: 1 }, { name: 'smtp_junk_id_pk', unique: true }],
      ],
      'smtp_junk'
    );

    /**
     * titles_master
     */
    const titlesMasterValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          li_job_title: { bsonType: ['string', 'null'] },
          dls_designation: { bsonType: ['string', 'null'] },
          dls_management_level: { bsonType: ['string', 'null'] },
          dls_jobfunction: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const titlesMaster = await ensureCollection(db, 'titles_master', titlesMasterValidator);
    await createIndexes(
      titlesMaster,
      [
        [{ id: 1 }, { name: 'titles_master_id_pk', unique: true }],
        [{ li_job_title: 1 }, { name: 'titles_master_li_job_title_idx' }],
      ],
      'titles_master'
    );

    /**
     * country_mapping
     */
    const countryMappingValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          location: { bsonType: ['string'] },
          country: { bsonType: ['string'] },
          region: { bsonType: ['string'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
        required: ['location', 'country', 'region'],
      },
    };

    const countryMapping = await ensureCollection(db, 'country_mapping', countryMappingValidator);
    await createIndexes(
      countryMapping,
      [
        [{ id: 1 }, { name: 'country_mapping_id_pk', unique: true }],
        [{ location: 1 }, { name: 'country_mapping_location_idx' }],
      ],
      'country_mapping'
    );
  },

  async down(db) {
    if (!ensureMercuryDatabase(db)) return;

    const collections = ['smtp_junk', 'titles_master', 'country_mapping'];

    for (const name of collections) {
      try {
        await db.dropCollection(name);
        console.log(`🗑️  Dropped ${name} collection from mercury`);
      } catch (error) {
        if (error.codeName !== 'NamespaceNotFound') {
          console.warn(`⚠️  Could not drop ${name}: ${error.message}`);
        }
      }
    }
  },
};

