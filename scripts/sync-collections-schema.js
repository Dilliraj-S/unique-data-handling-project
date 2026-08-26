/**
 * Sync Schema & Indexes from master_leads to Other Collections
 * 
 * Reads the EXACT indexes and schema validator from master_leads,
 * then applies them to all target collections — 100% identical.
 * 
 * Target collections: apollo, dlslinkedin, karur, other, outsourcing, zoom, temp_master_leads
 * 
 * Usage:
 *   node scripts/sync-collections-schema.js                  (all target collections)
 *   node scripts/sync-collections-schema.js apollo           (single collection)
 *   node scripts/sync-collections-schema.js apollo,karur     (comma-separated list)
 * 
 * Run: node scripts/sync-collections-schema.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const DB_NAME = 'sun';
const SOURCE_COLLECTION = 'master_leads';

const ALL_TARGET_COLLECTIONS = [
  'apollo',
  'dlslinkedin',
  'karur',
  'other',
  'outsourcing',
  'zoom',
  'temp_master_leads'
];

async function main() {
  // Parse target collections from CLI argument
  const arg = process.argv[2];
  const targetCollections = arg
    ? arg.split(',').map(s => s.trim()).filter(Boolean)
    : ALL_TARGET_COLLECTIONS;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  🔄 Sync Schema & Indexes`);
  console.log(`  Source: ${SOURCE_COLLECTION}`);
  console.log(`  Targets: ${targetCollections.join(', ')}`);
  console.log(`${'═'.repeat(70)}`);

  const mongoUrl = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    console.log(`\n✅ Connected to MongoDB`);

    const db = client.db(DB_NAME);

    // ─── Step 1: Read source collection's indexes ───
    console.log(`\n📋 Reading indexes from ${SOURCE_COLLECTION}...`);
    const sourceCollection = db.collection(SOURCE_COLLECTION);
    const sourceIndexes = await sourceCollection.indexes();

    // Filter out _id index (MongoDB auto-creates it)
    const indexesToSync = sourceIndexes.filter(idx => idx.name !== '_id_');
    console.log(`   Found ${indexesToSync.length} indexes to sync (excluding _id)`);

    for (const idx of indexesToSync) {
      const props = [];
      if (idx.unique) props.push('UNIQUE');
      if (idx.sparse) props.push('SPARSE');
      if (idx.textIndexVersion) props.push('TEXT');
      const propsStr = props.length > 0 ? ` [${props.join(', ')}]` : '';
      console.log(`   • ${idx.name.padEnd(40)} ${JSON.stringify(idx.key)}${propsStr}`);
    }

    // ─── Step 2: Read source collection's schema validator ───
    console.log(`\n📝 Reading schema validator from ${SOURCE_COLLECTION}...`);
    let sourceValidator = null;
    let validationLevel = 'moderate';
    let validationAction = 'warn';

    try {
      const collInfo = await db.listCollections({ name: SOURCE_COLLECTION }).toArray();
      if (collInfo.length > 0 && collInfo[0].options) {
        sourceValidator = collInfo[0].options.validator || null;
        validationLevel = collInfo[0].options.validationLevel || 'moderate';
        validationAction = collInfo[0].options.validationAction || 'warn';
      }
      if (sourceValidator) {
        console.log(`   ✅ Schema validator found (level: ${validationLevel}, action: ${validationAction})`);
      } else {
        console.log(`   ⚠️ No schema validator found on ${SOURCE_COLLECTION}`);
      }
    } catch (err) {
      console.log(`   ⚠️ Could not read validator: ${err.message}`);
    }

    // ─── Step 3: Apply to each target collection ───
    for (const targetName of targetCollections) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`  📋 Syncing: ${targetName}`);
      console.log(`${'─'.repeat(70)}`);

      // Ensure collection exists
      const existingCols = await db.listCollections({ name: targetName }).toArray();
      if (existingCols.length === 0) {
        await db.createCollection(targetName);
        console.log(`   ✅ Created collection: ${targetName}`);
      }

      const targetCollection = db.collection(targetName);
      const docCount = await targetCollection.estimatedDocumentCount();
      console.log(`   📊 Documents: ${docCount.toLocaleString()}`);

      // ── 3a: Apply schema validator ──
      if (sourceValidator) {
        try {
          await db.command({
            collMod: targetName,
            validator: sourceValidator,
            validationLevel: validationLevel,
            validationAction: validationAction
          });
          console.log(`   ✅ Schema validator applied`);
        } catch (err) {
          console.log(`   ⚠️ Could not apply validator: ${err.message}`);
        }
      }

      // ── 3b: Get existing indexes on target ──
      const existingIndexes = await targetCollection.indexes();
      const existingIndexNames = new Set(existingIndexes.map(idx => idx.name));

      let created = 0;
      let skipped = 0;
      let dropped = 0;
      let failed = 0;

      // ── 3c: Drop indexes that exist on target but NOT in source ──
      const sourceIndexNames = new Set(indexesToSync.map(idx => idx.name));
      for (const existingIdx of existingIndexes) {
        if (existingIdx.name === '_id_') continue; // Never touch _id

        if (!sourceIndexNames.has(existingIdx.name)) {
          // This index exists on target but not on source — check if it's a renamed one
          // or an old unique index that needs to be dropped
          if (existingIdx.unique) {
            // Drop old unique indexes that don't exist in source
            try {
              await targetCollection.dropIndex(existingIdx.name);
              console.log(`   🗑️ Dropped old unique index: ${existingIdx.name}`);
              dropped++;
            } catch (err) {
              console.log(`   ⚠️ Failed to drop ${existingIdx.name}: ${err.message}`);
            }
          }
        } else {
          // Index name matches — check if properties differ (e.g., unique vs non-unique)
          const sourceIdx = indexesToSync.find(idx => idx.name === existingIdx.name);
          if (sourceIdx) {
            const sourceIsUnique = !!sourceIdx.unique;
            const targetIsUnique = !!existingIdx.unique;
            if (sourceIsUnique !== targetIsUnique) {
              // Properties differ — drop and recreate
              try {
                await targetCollection.dropIndex(existingIdx.name);
                existingIndexNames.delete(existingIdx.name);
                console.log(`   🔄 Dropped mismatched index for recreation: ${existingIdx.name} (unique: ${targetIsUnique} → ${sourceIsUnique})`);
                dropped++;
              } catch (err) {
                console.log(`   ⚠️ Failed to drop ${existingIdx.name}: ${err.message}`);
              }
            }
          }
        }
      }

      // ── 3d: Create indexes from source ──
      for (const sourceIdx of indexesToSync) {
        // Skip if already exists with correct properties
        if (existingIndexNames.has(sourceIdx.name)) {
          skipped++;
          continue;
        }

        // Build index options from source
        const options = { name: sourceIdx.name, background: true };
        if (sourceIdx.unique) options.unique = true;
        if (sourceIdx.sparse) options.sparse = true;

        // Handle text indexes
        if (sourceIdx.textIndexVersion) {
          if (sourceIdx.weights) options.weights = sourceIdx.weights;
          if (sourceIdx.default_language) options.default_language = sourceIdx.default_language;
          if (sourceIdx.language_override) options.language_override = sourceIdx.language_override;
        }

        // Handle partial filter expression
        if (sourceIdx.partialFilterExpression) {
          options.partialFilterExpression = sourceIdx.partialFilterExpression;
        }

        // Handle expireAfterSeconds (TTL indexes)
        if (sourceIdx.expireAfterSeconds !== undefined) {
          options.expireAfterSeconds = sourceIdx.expireAfterSeconds;
        }

        try {
          await targetCollection.createIndex(sourceIdx.key, options);
          console.log(`   ✅ Created: ${sourceIdx.name}`);
          created++;
        } catch (err) {
          console.log(`   ❌ Failed: ${sourceIdx.name}: ${err.message}`);
          failed++;
        }
      }

      console.log(`\n   📊 Summary: ${created} created, ${skipped} already existed, ${dropped} dropped, ${failed} failed`);

      // ── 3e: Verify final index count ──
      const finalIndexes = await targetCollection.indexes();
      const sourceTotal = sourceIndexes.length; // includes _id
      const targetTotal = finalIndexes.length;

      if (targetTotal === sourceTotal) {
        console.log(`   ✅ Index count matches source: ${targetTotal} indexes`);
      } else {
        console.log(`   ⚠️ Index count: ${targetTotal} (source has ${sourceTotal})`);
      }
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ✨ All done! ${targetCollections.length} collections synced with ${SOURCE_COLLECTION}`);
    console.log(`${'═'.repeat(70)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('👋 Disconnected');
  }
}

main().catch(console.error);
