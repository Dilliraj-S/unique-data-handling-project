/**
 * Fix apolloproducts Collection Schema
 *
 * Removes any existing schema validator and applies the correct schema
 * aligned with the products collection (migration 017 / 023).
 *
 * Run: node scripts/fix-apolloproducts-schema.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';

async function fixSchema() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB: ${dbName}`);

    const db = client.db(dbName);
    const collection = db.collection('apolloproducts');

    // Check if collection exists
    const collections = await db.listCollections({ name: 'apolloproducts' }).toArray();

    if (collections.length === 0) {
      console.log('⚠️ Collection apolloproducts does not exist. Creating it...');
      await createCollectionWithSchema(db);
    } else {
      console.log('📋 Collection apolloproducts exists. Updating validator...');

      // Update validator via collMod (non-destructive, does not touch data)
      try {
        await db.command({
          collMod: 'apolloproducts',
          validator: getProductsValidator(),
          validationLevel: 'moderate',
          validationAction: 'warn'
        });
        console.log('✅ Updated schema validator');
      } catch (error) {
        console.log(`⚠️ Could not update validator: ${error.message}`);
        // Fallback: remove validator completely then re-apply
        try {
          await db.command({ collMod: 'apolloproducts', validator: {} });
          await db.command({
            collMod: 'apolloproducts',
            validator: getProductsValidator(),
            validationLevel: 'moderate',
            validationAction: 'warn'
          });
          console.log('✅ Cleared and re-applied validator');
        } catch (err) {
          console.warn(`⚠️ Fallback also failed: ${err.message}`);
        }
      }

      // Ensure indexes
      await ensureIndexes(db.collection('apolloproducts'));
    }

    console.log('✅ Schema fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Returns the products-aligned validator
 */
function getProductsValidator() {
  return {
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
      additionalProperties: true
    }
  };
}

async function createCollectionWithSchema(db) {
  await db.createCollection('apolloproducts', { validator: getProductsValidator() });
  console.log('✅ Created apolloproducts collection with correct schema');
  await ensureIndexes(db.collection('apolloproducts'));
}

async function ensureIndexes(collection) {
  const indexes = [
    { keys: { id: 1 },           options: { name: 'pk_id',               unique: true } },
    { keys: { product_name: 1 }, options: { name: 'product_name_index'              } },
    { keys: { product_id: 1 },   options: { name: 'product_id_index'                } },
    { keys: { pp_id: 1 },        options: { name: 'pp_id_index'                     } },
    { keys: { pp_name: 1 },      options: { name: 'pp_name_index'                   } },
    { keys: { category: 1 },     options: { name: 'category_index'                  } },
    { keys: { vendor: 1 },       options: { name: 'vendor_index'                    } },
    { keys: { deleted_at: 1 },   options: { name: 'deleted_at_index', sparse: true  } }
  ];

  for (const idx of indexes) {
    try {
      await collection.createIndex(idx.keys, { ...idx.options, background: true });
      console.log(`  ✅ Index ${idx.options.name}`);
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log(`  ℹ️ Index ${idx.options.name} already exists, skipping`);
      } else {
        console.warn(`  ⚠️ Failed to create ${idx.options.name}: ${err.message}`);
      }
    }
  }
  console.log('✅ All indexes ensured');
}

// Run the fix
if (require.main === module) {
  fixSchema()
    .then(() => {
      console.log('\n🎉 Schema fix completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Schema fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixSchema };
