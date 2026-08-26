/**
 * Migration: Add Product-Performance Indexes
 * 
 * Creates indexes critical for the Product→Companies page and Contacts tab
 * performance with 15Cr+ master_leads and 10Cr+ master_accounts.
 * 
 * Run: node database/migrate.js 028_add_product_performance_indexes
 */

module.exports = {
  name: '028_add_product_performance_indexes',

  async up(db) {
    console.log('🚀 Adding product-performance indexes...');

    // ── master_leads (15Cr) ─────────────────────────────────
    const leads = db.collection('master_leads');
    try {
      // Standalone li_smtp index — used by $in lookups from companies_products
      // The existing {deleted_at:1, li_smtp:1} compound index can't efficiently
      // serve $in queries that don't filter on deleted_at first
      await leads.createIndex(
        { li_smtp: 1 },
        { name: 'idx_li_smtp', background: true }
      );
      console.log('  ✅ master_leads: idx_li_smtp');

      // li_smtp + _id for cursor pagination on leads streaming
      await leads.createIndex(
        { li_smtp: 1, _id: 1 },
        { name: 'idx_li_smtp_id', background: true }
      );
      console.log('  ✅ master_leads: idx_li_smtp_id');
    } catch (e) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.warn('  ⚠️ master_leads indexes already exist, skipping');
      } else {
        console.error('  ❌ master_leads index error:', e.message);
      }
    }

    // ── master_accounts (10Cr) ──────────────────────────────
    const accounts = db.collection('master_accounts');
    try {
      await accounts.createIndex(
        { li_smtp: 1 },
        { name: 'idx_li_smtp', background: true }
      );
      console.log('  ✅ master_accounts: idx_li_smtp');
    } catch (e) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.warn('  ⚠️ master_accounts idx_li_smtp already exists, skipping');
      } else {
        console.error('  ❌ master_accounts index error:', e.message);
      }
    }

    // ── companies_products (bridge) ─────────────────────────
    const bridge = db.collection('companies_products');
    try {
      await bridge.createIndex(
        { product_id: 1, deleted_at: 1 },
        { name: 'idx_product_deleted', background: true }
      );
      console.log('  ✅ companies_products: idx_product_deleted');

      await bridge.createIndex(
        { product_id: 1, company_li_smtp: 1 },
        { name: 'idx_product_smtp', background: true }
      );
      console.log('  ✅ companies_products: idx_product_smtp');

      // For tab_category classification filtering
      await bridge.createIndex(
        { product_id: 1, tab_category: 1, deleted_at: 1 },
        { name: 'idx_product_tab_category', background: true }
      );
      console.log('  ✅ companies_products: idx_product_tab_category');
    } catch (e) {
      if (e.code === 85 || e.codeName === 'IndexOptionsConflict') {
        console.warn('  ⚠️ companies_products indexes already exist, skipping');
      } else {
        console.error('  ❌ companies_products index error:', e.message);
      }
    }

    console.log('✅ Product-performance indexes migration completed');
  },

  async down(db) {
    console.log('🔄 Dropping product-performance indexes...');
    const drops = {
      master_leads: ['idx_li_smtp', 'idx_li_smtp_id'],
      master_accounts: ['idx_li_smtp'],
      companies_products: ['idx_product_deleted', 'idx_product_smtp', 'idx_product_tab_category']
    };
    for (const [col, names] of Object.entries(drops)) {
      const c = db.collection(col);
      for (const n of names) {
        try { await c.dropIndex(n); console.log(`  ✅ Dropped ${n} from ${col}`); }
        catch { console.warn(`  ⚠️ ${n} not found in ${col}`); }
      }
    }
    console.log('✅ Product-performance indexes dropped');
  }
};
