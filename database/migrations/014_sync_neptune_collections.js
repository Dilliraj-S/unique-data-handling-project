/**
 * Migration 014: Create collections in neptune database
 * Collections:
 *  - py_smtp
 *
 * NOTE: This migration is intended for the `neptune` database.
 */

const TARGET_DATABASE = 'neptune';

function ensureNeptuneDatabase(db) {
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 014_sync_neptune_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in neptune`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in neptune, validator updated`);
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
  name: '014_sync_neptune_collections',

  async up(db) {
    if (!ensureNeptuneDatabase(db)) return;
    console.log(`🔵 Running neptune database migration: ${this.name}`);

    /**
     * py_smtp
     */
    const pySmtpValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          py_smtp: { bsonType: ['string', 'null'] },
          py_title: { bsonType: ['string', 'null'] },
          py_keywords: { bsonType: ['string', 'null'] },
          py_description: { bsonType: ['string', 'null'] },
          py_fetched_by: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const pySmtp = await ensureCollection(db, 'py_smtp', pySmtpValidator);
    await createIndexes(
      pySmtp,
      [
        [{ id: 1 }, { name: 'py_smtp_id_pk', unique: true }],
        [{ py_smtp: 1 }, { name: 'py_smtp_py_smtp_idx' }],
        [{ id: 1 }, { name: 'py_smtp_id_idx' }],
      ],
      'py_smtp'
    );
  },

  async down(db) {
    if (!ensureNeptuneDatabase(db)) return;

    try {
      await db.dropCollection('py_smtp');
      console.log(`🗑️  Dropped py_smtp collection from neptune`);
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        console.warn(`⚠️  Could not drop py_smtp: ${error.message}`);
      }
    }
  },
};

