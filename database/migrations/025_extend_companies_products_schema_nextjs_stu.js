/**
 * Migration 025: Extend companies_products schema with additional company fields
 *
 * Adds 8 new optional fields to the companies_products collection:
 *   location, industry, employee_size, revenue, website, country, summary, source
 *
 * All new fields are optional (string | null).
 * Existing documents get these fields set to null via backfill.
 *
 * Database: nextjs_stu (central connection)
 * Run: node database/migrate.js up
 */

const migration = {
  name: '025_nextjs_stu_extend_companies_products_schema',

  async up(db) {
    console.log('🚀 Extending companies_products schema with additional fields...');

    const collName = 'companies_products';

    // 1. Check if collection exists
    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length === 0) {
      console.log(`  ⚠️ ${collName} does not exist. Skipping migration.`);
      return;
    }

    // 2. Update validator via collMod to allow new fields
    const updatedValidator = {
      $jsonSchema: {
        bsonType: 'object',
        required: ['id', 'company_li_smtp', 'product_id'],
        properties: {
          _id:              { bsonType: 'objectId' },
          id:               { bsonType: ['int', 'long', 'double'] },
          product_id:       { bsonType: 'string' },
          product_name:     { bsonType: ['string', 'null'] },
          product_pp_name:  { bsonType: ['string', 'null'] },
          product_source:   { bsonType: ['string', 'null'] },
          company_li_smtp:  { bsonType: 'string' },
          company_name:     { bsonType: ['string', 'null'] },
          // ── New fields (all optional, string | null) ──
          location:         { bsonType: ['string', 'null'] },
          industry:         { bsonType: ['string', 'null'] },
          employee_size:    { bsonType: ['string', 'null'] },
          revenue:          { bsonType: ['string', 'null'] },
          website:          { bsonType: ['string', 'null'] },
          country:          { bsonType: ['string', 'null'] },
          summary:          { bsonType: ['string', 'null'] },
          source:           { bsonType: ['string', 'null'] },
          // ── Existing meta fields ──
          created_at:       { bsonType: ['date', 'string', 'null'] },
          created_by:       { bsonType: ['string', 'null'] },
          deleted_at:       { bsonType: ['date', 'string', 'null'] }
        },
        additionalProperties: true
      }
    };

    try {
      await db.command({
        collMod: collName,
        validator: updatedValidator,
        validationLevel: 'moderate',
        validationAction: 'warn'
      });
      console.log('  ✅ Updated schema validator with 8 new fields');
    } catch (err) {
      console.warn(`  ⚠️ Could not update validator: ${err.message}`);
    }

    // 3. Backfill existing documents — set new fields to null where they don't exist
    const collection = db.collection(collName);
    const backfillResult = await collection.updateMany(
      {
        $or: [
          { location: { $exists: false } },
          { industry: { $exists: false } },
          { employee_size: { $exists: false } },
          { revenue: { $exists: false } },
          { website: { $exists: false } },
          { country: { $exists: false } },
          { summary: { $exists: false } },
          { source: { $exists: false } }
        ]
      },
      {
        $set: {
          location: null,
          industry: null,
          employee_size: null,
          revenue: null,
          website: null,
          country: null,
          summary: null,
          source: null
        }
      }
    );
    console.log(`  ✅ Backfilled ${backfillResult.modifiedCount} existing documents with null defaults`);

    // 4. Add index on source field for filtering
    try {
      await collection.createIndex({ source: 1 }, { name: 'source_index', sparse: true, background: true });
      console.log('  ✅ Created source_index');
    } catch (err) {
      console.log(`  ℹ️ source_index: ${err.message}`);
    }

    console.log('✅ companies_products schema extension complete');
  },

  async down(db) {
    console.log('🔄 Rolling back companies_products schema extension...');

    const collName = 'companies_products';
    const existing = await db.listCollections({ name: collName }).toArray();
    if (existing.length === 0) return;

    const collection = db.collection(collName);

    // Remove the new fields from all documents
    await collection.updateMany({}, {
      $unset: {
        location: '',
        industry: '',
        employee_size: '',
        revenue: '',
        website: '',
        country: '',
        summary: '',
        source: ''
      }
    });
    console.log('  ✅ Removed new fields from all documents');

    // Drop source index
    try {
      await collection.dropIndex('source_index');
      console.log('  ✅ Dropped source_index');
    } catch (err) {
      console.log(`  ℹ️ source_index not found, skipping`);
    }

    // Reset validator to original (without new fields)
    try {
      await db.command({ collMod: collName, validator: {} });
      console.log('  ✅ Cleared validator');
    } catch (err) {
      console.warn(`  ⚠️ Could not clear validator: ${err.message}`);
    }

    console.log('✅ Rollback complete');
  }
};

module.exports = migration;
