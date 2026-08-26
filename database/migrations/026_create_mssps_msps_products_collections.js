/**
 * Migration 026: Create MSSPsproduct & MSPsproduct collections
 *
 * Creates two new product collections in the nextjs_stu (central) database:
 *   - MSSPsproduct
 *   - MSPsproduct
 *
 * Both collections use the same schema validator and standard indexes
 * as the main products collection (see migration 017 / 023).
 *
 * Database: nextjs_stu (central connection)
 * Run: node database/migrate.js up
 */

const migration = {
  name: '026_nextjs_stu_create_mssps_msps_products_collections',

  async up(db) {
    console.log('🚀 Creating MSSPsproduct & MSPsproduct collections with products schema...');

    // Reference schema (matches products collection from migration 017 / 023)
    const productsValidator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'product_name'],
        properties: {
          _id:                { bsonType: 'objectId' },
          id:                 { bsonType: ['int', 'long', 'double', 'string'] },
          product_id:         { bsonType: ['string', 'null'] },
          product_name:       { bsonType: ['string', 'null'] },
          description:        { bsonType: ['string', 'null'] },
          source_description: { bsonType: ['string', 'null'] },
          pp_id:              { bsonType: ['int', 'long', 'double', 'string', 'null'] },
          pp_name:            { bsonType: ['string', 'null'] },
          category:           { bsonType: ['string', 'null'] },
          vendor:             { bsonType: ['string', 'null'] },
          companies:          { bsonType: ['string', 'null'] },
          contacts:           { bsonType: ['string', 'null'] },
          companies_count:    { bsonType: ['int', 'long', 'double', 'null'] },
          contacts_count:     { bsonType: ['int', 'long', 'double', 'null'] },
          created_at:         { bsonType: ['date', 'string', 'null'] },
          updated_at:         { bsonType: ['date', 'string', 'null'] },
          deleted_at:         { bsonType: ['date', 'string', 'null'] },
          created_by:         { bsonType: ['string', 'null'] },
          updated_by:         { bsonType: ['string', 'null'] }
        },
        // Keep true so existing / future extra fields are not rejected
        additionalProperties: true
      }
    };

    // Standard indexes (matches products collection from migration 017 / 023)
    const standardIndexes = [
      { keys: { id: 1 },           options: { name: 'pk_id',               unique: true } },
      { keys: { product_name: 1 }, options: { name: 'product_name_index'              } },
      { keys: { product_id: 1 },   options: { name: 'product_id_index'                } },
      { keys: { pp_id: 1 },        options: { name: 'pp_id_index'                     } },
      { keys: { pp_name: 1 },      options: { name: 'pp_name_index'                   } },
      { keys: { category: 1 },     options: { name: 'category_index'                  } },
      { keys: { vendor: 1 },       options: { name: 'vendor_index'                    } },
      { keys: { deleted_at: 1 },   options: { name: 'deleted_at_index', sparse: true  } }
    ];

    const collections = ['MSSPsproduct', 'MSPsproduct'];

    for (const collName of collections) {
      console.log(`\n📋 Processing ${collName}...`);

      const existing = await db.listCollections({ name: collName }).toArray();
      if (existing.length === 0) {
        console.log(`  ⚠️ ${collName} does not exist, creating...`);
        await db.createCollection(collName, { validator: productsValidator });
        console.log(`  ✅ Created ${collName}`);
      } else {
        // If collection already exists, align its validator
        try {
          await db.command({
            collMod: collName,
            validator: productsValidator,
            validationLevel: 'moderate',
            validationAction: 'warn'
          });
          console.log(`  ✅ Updated schema validator for ${collName}`);
        } catch (err) {
          console.warn(`  ⚠️ Could not update validator for ${collName}: ${err.message}`);
        }
      }

      // Ensure all standard indexes exist
      const collection = db.collection(collName);
      for (const idx of standardIndexes) {
        try {
          await collection.createIndex(idx.keys, { ...idx.options, background: true });
          console.log(`  ✅ Index ${idx.options.name}`);
        } catch (err) {
          if (err.code === 85 || err.codeName === 'IndexOptionsConflict') {
            console.log(`  ℹ️ Index ${idx.options.name} already exists with different options, skipping`);
          } else if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
            console.log(`  ℹ️ Index on same keys as ${idx.options.name} already exists, skipping`);
          } else {
            console.warn(`  ⚠️ Failed to create index ${idx.options.name}: ${err.message}`);
          }
        }
      }

      console.log(`  ✅ ${collName} aligned with products schema`);
    }

    console.log('\n✅ MSSPsproduct & MSPsproduct collections are ready');
  },

  async down(db) {
    console.log('🔄 Rolling back MSSPsproduct & MSPsproduct collections (dropping collections)...');

    const collections = ['MSSPsproduct', 'MSPsproduct'];
    for (const collName of collections) {
      const existing = await db.listCollections({ name: collName }).toArray();
      if (existing.length === 0) {
        console.log(`  ℹ️ ${collName} does not exist, skipping`);
        continue;
      }

      try {
        await db.dropCollection(collName);
        console.log(`  ✅ Dropped ${collName}`);
      } catch (err) {
        console.warn(`  ⚠️ Failed to drop ${collName}: ${err.message}`);
      }
    }

    console.log('✅ Rollback complete');
  }
};

module.exports = migration;

