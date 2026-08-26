/**
 * Migration: Create duplicate_rules collection
 * Purpose: Store dynamic duplicate matching rules for the Validate tab
 * Database: sun
 * Collection: duplicate_rules
 */

const { MongoClient } = require('mongodb');

async function run() {
  const uri = process.env.MONGODB_SUN_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('sun');
    const collection = db.collection('duplicate_rules');

    // Create indexes
    await collection.createIndex({ rule_id: 1 }, { unique: true });
    await collection.createIndex({ active: 1 });
    await collection.createIndex({ created_at: -1 });

    console.log('✅ Indexes created for duplicate_rules collection');

    // Migrate existing hard-coded rules
    const existingRules = [
      {
        rule_id: 'li_full_name+li_company_name',
        rule_name: 'li_full_name + li_company_name',
        columns: ['li_full_name', 'li_company_name'],
        match_type: 'composite', // 'single' or 'composite'
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_id: 'li_full_name+li_smtp',
        rule_name: 'li_full_name + li_smtp',
        columns: ['li_full_name', 'li_smtp'],
        match_type: 'composite',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        rule_id: 'email',
        rule_name: 'email',
        columns: ['email'],
        match_type: 'single',
        active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Insert rules (use updateOne with upsert to avoid duplicates)
    for (const rule of existingRules) {
      await collection.updateOne(
        { rule_id: rule.rule_id },
        { $setOnInsert: rule },
        { upsert: true }
      );
    }

    console.log(`✅ Migrated ${existingRules.length} duplicate rules to database`);

    // Verify
    const count = await collection.countDocuments({ active: true });
    console.log(`✅ Total active duplicate rules: ${count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Migration completed');
  }
}

// Run migration if called directly
if (require.main === module) {
  run().catch(console.error);
}

module.exports = { run };

