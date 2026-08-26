/**
 * Migration 008: Create reference collections in moon database
 * Collections:
 *  - countries
 *  - cities
 *  - domain_formats
 *  - email_formats
 *  - fullname_junk
 *  - process_logs
 *  - states
 *
 * NOTE: This migration is intended for the `moon` database.
 * If run against a different database, it will be a no-op.
 */

const TARGET_DATABASE = 'moon';

function ensureMoonDatabase(db) {
  // MongoDB db object has databaseName property
  const dbName = db.databaseName;
  if (dbName && dbName !== TARGET_DATABASE) {
    console.log(`ℹ️  Skipping 008_sync_moon_reference_collections for database: ${dbName}`);
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
    console.log(`✅ Created ${name} collection in moon`);
  } else {
    await db.command({
      collMod: name,
      validator,
      validationLevel: 'moderate',
    });
    console.log(`ℹ️  ${name} already existed in moon, validator updated`);
  }
  return db.collection(name);
}

async function createIndexes(collection, indexSpecs, label) {
  for (const [keys, options] of indexSpecs) {
    await collection.createIndex(keys, options);
  }
  console.log(`✅ ${label} indexes created/ensured`);
}

module.exports = {
  name: '008_sync_moon_reference_collections',

  async up(db) {
    // Always run for moon database (called explicitly)
    // The database check is handled by the migration runner
    console.log(`🌙 Running moon database migration: ${this.name}`);

    /**
     * countries
     */
    const countriesValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['int', 'long', 'string', 'null'] },
          name: { bsonType: ['string', 'null'] },
          capital: { bsonType: ['string', 'null'] },
          iso_2: { bsonType: ['string', 'null'] },
          iso_3: { bsonType: ['string', 'null'] },
          numeric_code: { bsonType: ['int', 'long', 'string', 'null'] },
          phone_code: { bsonType: ['string', 'null'] },
          phone_length: { bsonType: ['string', 'null'] },
          pincode_regex: { bsonType: ['string', 'null'] },
          currency: { bsonType: ['string', 'null'] },
          currency_name: { bsonType: ['string', 'null'] },
          currency_symbol: { bsonType: ['string', 'null'] },
          tld: { bsonType: ['string', 'null'] },
          native: { bsonType: ['string', 'null'] },
          region: { bsonType: ['string', 'null'] },
          region_id: { bsonType: ['int', 'long', 'string', 'null'] },
          subregion: { bsonType: ['string', 'null'] },
          subregion_id: { bsonType: ['int', 'long', 'string', 'null'] },
          nationality: { bsonType: ['string', 'null'] },
          timezones: { bsonType: ['string', 'null'] },
          translations: { bsonType: ['string', 'null'] },
          latitude: { bsonType: ['double', 'string', 'null'] },
          longitude: { bsonType: ['double', 'string', 'null'] },
          emoji: { bsonType: ['string', 'null'] },
          emojiU: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const countries = await ensureCollection(db, 'countries', countriesValidator);
    await createIndexes(
      countries,
      [
        [{ id: 1 }, { name: 'countries_id_unique', unique: true, sparse: true }],
        [{ name: 1 }, { name: 'countries_name_idx' }],
        [{ iso_2: 1 }, { name: 'countries_iso_2_unique', unique: true, sparse: true }],
        [{ iso_3: 1 }, { name: 'countries_iso_3_idx' }],
        [{ numeric_code: 1 }, { name: 'countries_numeric_code_idx' }],
        [{ phone_code: 1 }, { name: 'countries_phone_code_idx' }],
        [{ region: 1, subregion: 1 }, { name: 'countries_region_subregion_idx' }],
      ],
      'countries'
    );

    /**
     * cities
     */
    const citiesValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['int', 'long', 'string', 'null'] },
          name: { bsonType: ['string', 'null'] },
          state_id: { bsonType: ['int', 'long', 'string', 'null'] },
          state_code: { bsonType: ['string', 'null'] },
          country_id: { bsonType: ['int', 'long', 'string', 'null'] },
          country_code: { bsonType: ['string', 'null'] },
          latitude: { bsonType: ['double', 'string', 'null'] },
          longitude: { bsonType: ['double', 'string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const cities = await ensureCollection(db, 'cities', citiesValidator);
    await createIndexes(
      cities,
      [
        [{ id: 1 }, { name: 'cities_id_unique', unique: true, sparse: true }],
        [{ name: 1 }, { name: 'cities_name_idx' }],
        [{ state_id: 1 }, { name: 'cities_state_id_idx' }],
        [{ country_id: 1 }, { name: 'cities_country_id_idx' }],
        [{ state_code: 1 }, { name: 'cities_state_code_idx' }],
        [{ country_code: 1 }, { name: 'cities_country_code_idx' }],
      ],
      'cities'
    );

    /**
     * domain_formats
     */
    const domainFormatsValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['int', 'long', 'string', 'null'] },
          domain: { bsonType: ['string', 'null'] },
          email_format: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const domainFormats = await ensureCollection(db, 'domain_formats', domainFormatsValidator);
    await createIndexes(
      domainFormats,
      [
        [{ id: 1 }, { name: 'domain_formats_id_unique', unique: true, sparse: true }],
        [{ domain: 1 }, { name: 'domain_formats_domain_unique', unique: true, sparse: true }],
      ],
      'domain_formats'
    );

    /**
     * email_formats
     */
    const emailFormatsValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          field_1: { bsonType: ['string', 'null'] },
          field_2: { bsonType: ['string', 'null'] },
          status: { bsonType: ['int', 'long', 'string'] },
          separator: { bsonType: ['string', 'null'] },
        },
        required: ['status'],
      },
    };

    const emailFormats = await ensureCollection(db, 'email_formats', emailFormatsValidator);
    await createIndexes(
      emailFormats,
      [
        [{ status: 1 }, { name: 'email_formats_status_pk', unique: true }],
        [{ field_1: 1 }, { name: 'email_formats_field_1_idx' }],
        [{ field_2: 1 }, { name: 'email_formats_field_2_idx' }],
        [{ separator: 1 }, { name: 'email_formats_separator_idx' }],
      ],
      'email_formats'
    );

    /**
     * fullname_junk
     * (structure inferred from sample rows)
     */
    const fullnameJunkValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          Junk_Id: { bsonType: ['int', 'long', 'string', 'null'] },
          Junk_Keyword: { bsonType: ['string', 'null'] },
          Junk_Type: { bsonType: ['string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const fullnameJunk = await ensureCollection(db, 'fullname_junk', fullnameJunkValidator);
    await createIndexes(
      fullnameJunk,
      [
        [{ Junk_Id: 1 }, { name: 'fullname_junk_id_unique', unique: true, sparse: true }],
        [{ Junk_Keyword: 1 }, { name: 'fullname_junk_keyword_idx' }],
        [{ Junk_Type: 1 }, { name: 'fullname_junk_type_idx' }],
      ],
      'fullname_junk'
    );

    /**
     * process_logs
     */
    const processLogsValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['long', 'int', 'string', 'null'] },
          process_id: { bsonType: ['string'] },
          process_name: { bsonType: ['string', 'null'] },
          process_mode: { bsonType: ['string', 'null'] }, // enum in MySQL
          mode: { bsonType: ['string', 'null'] },
          status: { bsonType: ['string', 'null'] }, // enum in MySQL
          input_location: { bsonType: ['string', 'null'] },
          output_location: { bsonType: ['string', 'null'] },
          total: { bsonType: ['long', 'int', 'string', 'null'] },
          processed: { bsonType: ['long', 'int', 'string', 'null'] },
          rejected: { bsonType: ['long', 'int', 'string', 'null'] },
          skipped: { bsonType: ['long', 'int', 'string', 'null'] },
          trace_details: { bsonType: ['string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          deleted_at: { bsonType: ['date', 'string', 'null'] },
        },
        required: ['process_id'],
      },
    };

    const processLogs = await ensureCollection(db, 'process_logs', processLogsValidator);
    await createIndexes(
      processLogs,
      [
        [{ id: 1 }, { name: 'process_logs_id_unique', unique: true, sparse: true }],
        [{ process_id: 1 }, { name: 'process_logs_process_id_unique', unique: true }],
        [{ process_mode: 1 }, { name: 'process_logs_process_mode_idx' }],
        [{ status: 1 }, { name: 'process_logs_status_idx' }],
        [{ created_at: 1 }, { name: 'process_logs_created_at_idx' }],
      ],
      'process_logs'
    );

    /**
     * states
     */
    const statesValidator = {
      $jsonSchema: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          id: { bsonType: ['int', 'long', 'string', 'null'] },
          name: { bsonType: ['string', 'null'] },
          country_id: { bsonType: ['int', 'long', 'string', 'null'] },
          country_name: { bsonType: ['string', 'null'] },
          country_code: { bsonType: ['string', 'null'] },
          fips_code: { bsonType: ['string', 'null'] },
          iso_2: { bsonType: ['string', 'null'] },
          type: { bsonType: ['string', 'null'] },
          latitude: { bsonType: ['double', 'string', 'null'] },
          longitude: { bsonType: ['double', 'string', 'null'] },
          created_at: { bsonType: ['date', 'string', 'null'] },
          updated_at: { bsonType: ['date', 'string', 'null'] },
          created_by: { bsonType: ['string', 'null'] },
          updated_by: { bsonType: ['string', 'null'] },
        },
      },
    };

    const states = await ensureCollection(db, 'states', statesValidator);
    await createIndexes(
      states,
      [
        [{ id: 1 }, { name: 'states_id_unique', unique: true, sparse: true }],
        [{ country_id: 1 }, { name: 'states_country_id_idx' }],
        [{ name: 1 }, { name: 'states_name_idx' }],
        [{ iso_2: 1 }, { name: 'states_iso_2_idx' }],
      ],
      'states'
    );
  },

  async down(db) {
    if (!ensureMoonDatabase(db)) return;

    const collections = [
      'countries',
      'cities',
      'domain_formats',
      'email_formats',
      'fullname_junk',
      'process_logs',
      'states',
    ];

    for (const name of collections) {
      try {
        await db.dropCollection(name);
        console.log(`🗑️  Dropped ${name} collection from moon`);
      } catch (error) {
        if (error.codeName !== 'NamespaceNotFound') {
          console.warn(`⚠️  Could not drop ${name}: ${error.message}`);
        }
      }
    }
  },
};


