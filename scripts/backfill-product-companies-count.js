/**
 * Backfill Product companies_count Script
 *
 * Scans all 6 product collections and updates companies_count on each product
 * document with the real count from the companies_products bridge collection.
 *
 * This fixes the issue where companies_count stays at 0 because
 * companies-products.js POST/DELETE never updates the denormalized field.
 *
 * Run: node scripts/backfill-product-companies-count.js
 *
 * Safe to run multiple times — only updates documents where the count differs.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu';
const dbName = uri.split('/').pop().split('?')[0] || 'nextjs_stu';

// All 6 product collections
const PRODUCT_COLLECTIONS = [
  'products',
  'apolloproduct',
  'g2product',
  'linkedinprodcut',
  'MSPsproduct',
  'MSSPsproduct'
];

const BATCH_SIZE = 500;

async function backfillCompanyCounts() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`✅ Connected to MongoDB: ${dbName}`);
    console.log(`📅 Started at: ${new Date().toISOString()}\n`);

    const db = client.db(dbName);
    const bridgeCollection = db.collection('companies_products');

    // Pre-aggregate all counts from companies_products in one pass
    console.log('📊 Aggregating company counts from companies_products bridge...');
    const countsPipeline = [
      { $match: { deleted_at: null } },
      { $group: { _id: '$product_id', count: { $sum: 1 } } }
    ];
    const countsResult = await bridgeCollection.aggregate(countsPipeline, { allowDiskUse: true }).toArray();

    const countsMap = {};
    for (const row of countsResult) {
      if (row._id) {
        countsMap[row._id] = row.count;
      }
    }
    console.log(`✅ Found ${Object.keys(countsMap).length} unique product_ids with company relationships\n`);

    let grandTotalProcessed = 0;
    let grandTotalUpdated = 0;
    let grandTotalSkipped = 0;

    for (const collName of PRODUCT_COLLECTIONS) {
      console.log(`${'═'.repeat(60)}`);
      console.log(`🔧 Processing collection: ${collName}`);
      console.log(`${'═'.repeat(60)}`);

      const productCollection = db.collection(collName);

      // Check if collection exists and has documents
      const totalProducts = await productCollection.countDocuments({ deleted_at: null });
      if (totalProducts === 0) {
        console.log(`  ⚠️  No products found (or collection empty). Skipping.\n`);
        continue;
      }
      console.log(`  📊 Total products (non-deleted): ${totalProducts.toLocaleString()}`);

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      let batchNum = 0;

      while (processed < totalProducts) {
        batchNum++;
        const products = await productCollection
          .find({ deleted_at: null })
          .project({ _id: 1, product_id: 1, companies_count: 1 })
          .skip(processed)
          .limit(BATCH_SIZE)
          .toArray();

        if (products.length === 0) break;

        // Build bulk update operations for this batch
        const bulkOps = [];

        for (const product of products) {
          const pid = product.product_id;
          if (!pid) {
            skipped++;
            continue;
          }

          const realCount = countsMap[pid] || 0;
          const currentCount = typeof product.companies_count === 'number' ? product.companies_count : 0;

          if (realCount !== currentCount) {
            bulkOps.push({
              updateOne: {
                filter: { _id: product._id },
                update: {
                  $set: {
                    companies_count: realCount,
                    updated_at: new Date()
                  }
                }
              }
            });
          }
        }

        // Execute bulk write if there are updates
        if (bulkOps.length > 0) {
          const result = await productCollection.bulkWrite(bulkOps, { ordered: false });
          updated += result.modifiedCount;
        }

        skipped += products.length - bulkOps.length;
        processed += products.length;

        // Log progress every batch
        console.log(
          `  Batch ${batchNum}: processed ${processed.toLocaleString()}/${totalProducts.toLocaleString()} ` +
          `| updated ${bulkOps.length} | skipped ${products.length - bulkOps.length}`
        );
      }

      console.log(`  ✅ Done: ${updated} updated, ${skipped} already correct, ${processed} total\n`);

      grandTotalProcessed += processed;
      grandTotalUpdated += updated;
      grandTotalSkipped += skipped;
    }

    // Final summary
    console.log(`${'═'.repeat(60)}`);
    console.log(`📊 FINAL SUMMARY`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`  Collections scanned: ${PRODUCT_COLLECTIONS.length}`);
    console.log(`  Total products processed: ${grandTotalProcessed.toLocaleString()}`);
    console.log(`  Total updated: ${grandTotalUpdated.toLocaleString()}`);
    console.log(`  Total already correct: ${grandTotalSkipped.toLocaleString()}`);
    console.log(`  Bridge product_ids with companies: ${Object.keys(countsMap).length.toLocaleString()}`);
    console.log(`\n🎉 Backfill complete!`);
    console.log(`📅 Finished at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('❌ Backfill error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run
if (require.main === module) {
  backfillCompanyCounts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillCompanyCounts };
