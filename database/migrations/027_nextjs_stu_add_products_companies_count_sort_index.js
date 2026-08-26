/**
 * Migration: Add default sort index for products by companies_count
 *
 * Goal: support default sort { companies_count: -1, id: -1 } with deleted_at filter.
 * Applied to all product source collections used by the UI.
 */

const migration = {
  name: '027_nextjs_stu_add_products_companies_count_sort_index',

  /**
   * @param {import('mongodb').Db} db - Mongo DB instance
   */
  async up(db) {
    const collections = [
      'products',
      'apolloproduct',
      'g2product',
      'linkedinprodcut',
      'MSPsproduct',
      'MSSPsproduct',
    ];

    const indexSpec = { deleted_at: 1, companies_count: -1, id: -1 };
    const indexName = 'idx_deleted_companiesCount_id_desc';

    for (const colName of collections) {
      try {
        const exists = await db.listCollections({ name: colName }).toArray();
        if (!exists || exists.length === 0) {
          console.log(`ℹ️  ${colName}: collection missing, skipping index`);
          continue;
        }

        const col = db.collection(colName);
        await col.createIndex(indexSpec, { name: indexName });
        console.log(`✅ ${colName}: ensured index ${indexName}`);
      } catch (err) {
        console.error(`⚠️  ${colName}: failed to create index ${indexName}:`, err.message);
      }
    }
  },

  /**
   * @param {import('mongodb').Db} db - Mongo DB instance
   */
  async down(db) {
    const collections = [
      'products',
      'apolloproduct',
      'g2product',
      'linkedinprodcut',
      'MSPsproduct',
      'MSSPsproduct',
    ];

    const indexName = 'idx_deleted_companiesCount_id_desc';

    for (const colName of collections) {
      try {
        const exists = await db.listCollections({ name: colName }).toArray();
        if (!exists || exists.length === 0) continue;

        const col = db.collection(colName);
        await col.dropIndex(indexName);
        console.log(`✅ ${colName}: dropped index ${indexName}`);
      } catch (err) {
        // Index might not exist; ignore
        console.log(`ℹ️  ${colName}: drop index ${indexName} skipped (${err.message})`);
      }
    }
  },
};

module.exports = migration;

