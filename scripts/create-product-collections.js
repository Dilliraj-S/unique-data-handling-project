/**
 * Create Product Collections Script
 *
 * Creates 3 new collections in the nextjs_stu database with the same
 * schema (validator) and indexes as the existing `products` collection:
 *   1. apolloproduct
 *   2. g2product
 *   3. linkedinprodcut
 *
 * Safe to run multiple times — skips collections that already exist.
 *
 * Run: node scripts/create-product-collections.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';

// Collections to create (same schema + indexes as `products`)
const NEW_COLLECTIONS = ['apolloproduct', 'g2product', 'linkedinprodcut'];

/**
 * Products collection validator (aligned with migration 017 / 023)
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

/**
 * Products collection indexes
 */
function getProductsIndexes() {
  return [
    { keys: { id: 1 },           options: { name: 'pk_id',               unique: true } },
    { keys: { product_name: 1 }, options: { name: 'product_name_index'              } },
    { keys: { product_id: 1 },   options: { name: 'product_id_index'                } },
    { keys: { pp_id: 1 },        options: { name: 'pp_id_index'                     } },
    { keys: { pp_name: 1 },      options: { name: 'pp_name_index'                   } },
    { keys: { category: 1 },     options: { name: 'category_index'                  } },
    { keys: { vendor: 1 },       options: { name: 'vendor_index'                    } },
    { keys: { deleted_at: 1 },   options: { name: 'deleted_at_index', sparse: true  } }
  ];
}

async function createProductCollections() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB: ${dbName}`);

    const db = client.db(dbName);

    // First, list existing products collection indexes for reference
    console.log(`\n📋 Checking existing 'products' collection for reference...`);
    const existingCollections = await db.listCollections({ name: 'products' }).toArray();
    if (existingCollections.length > 0) {
      const productsIndexes = await db.collection('products').indexes();
      console.log(`  📊 products has ${productsIndexes.length} indexes:`);
      productsIndexes.forEach(idx => {
        console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (unique)' : ''}${idx.sparse ? ' (sparse)' : ''}`);
      });
    } else {
      console.log(`  ⚠️ products collection not found (will create new collections from schema definition)`);
    }

    // Create each new collection
    for (const collName of NEW_COLLECTIONS) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔧 Processing: ${collName}`);
      console.log(`${'='.repeat(60)}`);

      // Check if collection already exists
      const existing = await db.listCollections({ name: collName }).toArray();

      if (existing.length > 0) {
        console.log(`  ⚠️ Collection '${collName}' already exists.`);

        // Show current document count
        const count = await db.collection(collName).countDocuments();
        console.log(`  📊 Current document count: ${count}`);

        // Show current indexes
        const currentIndexes = await db.collection(collName).indexes();
        console.log(`  📊 Current indexes: ${currentIndexes.length}`);
        currentIndexes.forEach(idx => {
          console.log(`    - ${idx.name}: ${JSON.stringify(idx.key)}`);
        });

        // Update validator (non-destructive)
        console.log(`  🔄 Updating validator to match products schema...`);
        try {
          await db.command({
            collMod: collName,
            validator: getProductsValidator(),
            validationLevel: 'moderate',
            validationAction: 'warn'
          });
          console.log(`  ✅ Validator updated`);
        } catch (err) {
          console.warn(`  ⚠️ Could not update validator: ${err.message}`);
        }
      } else {
        // Create new collection with validator
        console.log(`  📦 Creating collection '${collName}' with products schema...`);
        await db.createCollection(collName, {
          validator: getProductsValidator(),
          validationLevel: 'moderate',
          validationAction: 'warn'
        });
        console.log(`  ✅ Collection created`);
      }

      // Ensure all indexes
      console.log(`  🔗 Creating indexes...`);
      const indexes = getProductsIndexes();
      let createdCount = 0;
      let skippedCount = 0;

      for (const idx of indexes) {
        try {
          await db.collection(collName).createIndex(idx.keys, { ...idx.options, background: true });
          console.log(`    ✅ ${idx.options.name}`);
          createdCount++;
        } catch (err) {
          if (err.code === 85 || err.code === 86) {
            console.log(`    ℹ️  ${idx.options.name} (already exists)`);
            skippedCount++;
          } else {
            console.warn(`    ⚠️ Failed: ${idx.options.name} — ${err.message}`);
          }
        }
      }

      console.log(`  ✅ Indexes: ${createdCount} created, ${skippedCount} already existed`);
    }

    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    for (const collName of NEW_COLLECTIONS) {
      const count = await db.collection(collName).countDocuments();
      const indexes = await db.collection(collName).indexes();
      console.log(`  ${collName}: ${count} documents, ${indexes.length} indexes`);
    }
    console.log(`\n🎉 All product collections created successfully!`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run
if (require.main === module) {
  createProductCollections()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createProductCollections };
