/**
 * Migration 023: Align product source collection schemas & indexes
 *
 * Updates linkedinproducts, apolloproducts, g2products to match the
 * products collection schema (migration 017).
 *
 * - Uses collMod to update validators (non-destructive)
 * - Uses createIndex which is idempotent (safe to re-run)
 * - Keeps additionalProperties: true so legacy fields are preserved
 *
 * Database: nextjs_stu (central connection)
 * Run: node database/migrate.js up
 */

const migration = {
  name: '023_nextjs_stu_align_product_sources_schema',

  async up(db) {
    console.log('🚀 Aligning product source collection schemas with products...');

    // ── Reference schema (matches products collection from migration 017) ──
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
        // Keep true so existing legacy fields (Companyname, ProductName, etc.) are not rejected
        additionalProperties: true
      }
    };

    // ── Reference indexes (matches products collection from migration 017) ──
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

    const collections = ['linkedinproducts', 'apolloproducts', 'g2products'];

    for (const collName of collections) {
      console.log(`\n📋 Processing ${collName}...`);

      // 1. Check if collection exists
      const existing = await db.listCollections({ name: collName }).toArray();
      if (existing.length === 0) {
        console.log(`  ⚠️ ${collName} does not exist, creating...`);
        await db.createCollection(collName, { validator: productsValidator });
        console.log(`  ✅ Created ${collName}`);
      } else {
        // 2. Update validator via collMod (non-destructive, does not touch data)
        try {
          await db.command({
            collMod: collName,
            validator: productsValidator,
            validationLevel: 'moderate',   // Only validates inserts & updates, not existing docs
            validationAction: 'warn'       // Log validation failures, don't reject
          });
          console.log(`  ✅ Updated schema validator for ${collName}`);
        } catch (err) {
          console.warn(`  ⚠️ Could not update validator for ${collName}: ${err.message}`);
        }
      }

      // 3. Ensure all standard indexes exist
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

    console.log('\n✅ All product source collections aligned successfully');
  },

  async down(db) {
    console.log('🔄 Rolling back product source schema alignment...');

    // Indexes added by this migration (excluding pk_id which existed before)
    const addedIndexNames = [
      'product_name_index',
      'product_id_index',
      'pp_id_index',
      'pp_name_index',
      'category_index',
      'vendor_index',
      'deleted_at_index'
    ];

    const collections = ['linkedinproducts', 'apolloproducts', 'g2products'];

    for (const collName of collections) {
      const existing = await db.listCollections({ name: collName }).toArray();
      if (existing.length === 0) continue;

      const collection = db.collection(collName);

      // Remove indexes we added
      for (const indexName of addedIndexNames) {
        try {
          await collection.dropIndex(indexName);
          console.log(`  ✅ Dropped ${indexName} from ${collName}`);
        } catch (err) {
          console.log(`  ℹ️ ${indexName} not found in ${collName}, skipping`);
        }
      }

      // Remove the strict validator (set to empty)
      try {
        await db.command({ collMod: collName, validator: {} });
        console.log(`  ✅ Cleared validator for ${collName}`);
      } catch (err) {
        console.warn(`  ⚠️ Could not clear validator for ${collName}: ${err.message}`);
      }
    }

    console.log('✅ Rollback complete');
  }
};

module.exports = migration;
