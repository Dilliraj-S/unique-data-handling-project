import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import getOpenSearchService from '../../../src/services/OpenSearchService.js';

/**
 * API: Products (base products collection)
 *
 * POST   /api/products/products
 *   Body: { product_name, category?, vendor?, description?, source_description?, pp_name? }
 *
 * DELETE /api/products/products
 *   Body: { ids?: string[], id?: string, selectAll?: boolean, filters?: { search?, category?, vendor? } }
 *
 * PATCH /api/products/products
 *   Body: { id?: string, product_id?: string, updates: { product_name?, category?, vendor?, description?, source_description?, pp_name? } }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['POST', 'DELETE', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  const collection = await getCollection('products', 'central');

  // ── POST: Create a new base product ────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const {
        product_name,
        category = null,
        vendor = null,
        description = null,
        source_description = null,
        pp_name = null
      } = body;

      if (!product_name || !String(product_name).trim()) {
        return res.status(400).json({ status: false, message: 'product_name is required' });
      }

      const normalizedName = String(product_name).replace(/\s+/g, '').toLowerCase();

      // Prevent exact duplicate product_name (case-insensitive, ignore spaces)
      const existing = await collection
        .find({ deleted_at: null, product_name: { $exists: true } })
        .project({ product_name: 1 })
        .toArray();

      for (const doc of existing) {
        const existingName = (doc.product_name || '').replace(/\s+/g, '').toLowerCase();
        if (existingName && existingName === normalizedName) {
          return res.status(400).json({
            status: false,
            message: 'A product with a similar name already exists'
          });
        }
      }

      // Generate unique product_id with PROD prefix
      let productIdValue;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        productIdValue = `PROD${randomPart}`;
        const exists = await collection.findOne({ product_id: productIdValue });
        if (!exists) break;
      }

      // Generate numeric id (auto-increment style)
      let numericId = 1;
      const last = await collection.findOne({}, { sort: { id: -1 }, projection: { id: 1 } });
      if (last && last.id !== undefined && last.id !== null) {
        const lastId = typeof last.id === 'number' ? last.id : parseInt(last.id, 10) || 0;
        numericId = lastId + 1;
      }

      const now = new Date();

      const doc = {
        id: numericId,
        product_id: productIdValue,
        product_name: String(product_name).trim(),
        category: category || null,
        vendor: vendor || null,
        description: description || null,
        source_description: source_description || null,
        pp_id: null,
        pp_name: pp_name || null,
        companies: '',
        companies_count: 0,
        contacts_count: 0,
        created_at: now,
        updated_at: now,
        created_by: req.user?.username || req.user?.user_id || 'system',
        updated_by: req.user?.username || req.user?.user_id || 'system',
        deleted_at: null
      };

      const result = await collection.insertOne(doc);

      // Fire-and-forget: sync to OpenSearch
      try {
        const osService = getOpenSearchService();
        if (osService.isEnabledFor('products')) {
          osService.upsertDoc('products', result.insertedId, doc).catch(() => {});
        }
      } catch (_) { /* never block writes */ }

      return res.status(201).json({
        status: true,
        id: result.insertedId,
        product_id: productIdValue
      });
    } catch (error) {
      console.error('❌ products POST API error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to create product' });
    }
  }

  // ── PATCH: Update single product ──────────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const { id, product_id } = body;
      const updates = body.updates && typeof body.updates === 'object' ? body.updates : {};

      if (!id && !product_id) {
        return res.status(400).json({ status: false, message: 'id or product_id is required' });
      }

      const allowedFields = [
        'product_name',
        'category',
        'vendor',
        'description',
        'source_description',
        'pp_name'
      ];

      const $set = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          $set[key] = updates[key];
        }
      }

      if (Object.keys($set).length === 0) {
        return res.status(400).json({ status: false, message: 'No valid fields to update' });
      }

      $set.updated_at = new Date();
      $set.updated_by = req.user?.username || req.user?.user_id || 'system';

      const filterOr = [];
      if (id) {
        const v = String(id).trim();
        if (ObjectId.isValid(v) && v.length === 24) {
          filterOr.push({ _id: new ObjectId(v) });
        }
        const asNum = Number.parseInt(v, 10);
        if (!Number.isNaN(asNum) && String(asNum) === v) {
          filterOr.push({ id: asNum });
        }
      }
      if (product_id) {
        filterOr.push({ product_id: String(product_id).trim() });
      }

      if (!filterOr.length) {
        return res.status(400).json({ status: false, message: 'No valid id/product_id supplied' });
      }

      const result = await collection.updateOne(
        { deleted_at: null, $or: filterOr },
        { $set }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ status: false, message: 'Product not found' });
      }

      // Fire-and-forget: sync to OpenSearch
      try {
        const osService = getOpenSearchService();
        if (osService.isEnabledFor('products')) {
          const updatedDoc = await collection.findOne({ deleted_at: null, $or: filterOr });
          if (updatedDoc) osService.upsertDoc('products', updatedDoc._id, updatedDoc).catch(() => {});
        }
      } catch (_) { /* never block writes */ }

      return res.status(200).json({ status: true, modifiedCount: result.modifiedCount || 0 });
    } catch (error) {
      console.error('❌ products PATCH API error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to update product' });
    }
  }

  // ── DELETE: Bulk / selectAll delete ──────────────────────────────────────────
  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const selectAll = !!body.selectAll;
    const filters = (body.filters && typeof body.filters === 'object') ? body.filters : {};
    const ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);

    const search = String(filters.search || '').trim();
    const category = String(filters.category || '').trim();
    const vendor = String(filters.vendor || '').trim();

    const baseFilter = { deleted_at: null };
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      baseFilter.$or = [
        { product_name: regex },
        { product_id: regex },
        { description: regex },
        { pp_name: regex },
        { category: regex },
        { vendor: regex }
      ];
    }
    if (category) baseFilter.category = category;
    if (vendor) baseFilter.vendor = vendor;

    if (selectAll) {
      const result = await collection.deleteMany(baseFilter);
      return res.status(200).json({ status: true, deletedCount: result.deletedCount || 0 });
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ status: false, message: 'No ids provided' });
    }

    const objectIds = [];
    const numericIds = [];
    const productIds = [];

    for (const raw of ids) {
      const v = String(raw).trim();
      if (!v) continue;
      if (ObjectId.isValid(v) && v.length === 24) {
        objectIds.push(new ObjectId(v));
        continue;
      }
      const asNum = Number.parseInt(v, 10);
      if (!Number.isNaN(asNum) && String(asNum) === v) {
        numericIds.push(asNum);
        continue;
      }
      productIds.push(v);
    }

    const or = [];
    if (objectIds.length) or.push({ _id: { $in: objectIds } });
    if (numericIds.length) or.push({ id: { $in: numericIds } });
    if (productIds.length) or.push({ product_id: { $in: productIds } });

    if (!or.length) {
      return res.status(400).json({ status: false, message: 'No valid ids provided' });
    }

    const result = await collection.deleteMany({ deleted_at: null, $or: or });
    return res.status(200).json({ status: true, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('❌ products delete API error:', error);
    return res.status(500).json({ status: false, message: error.message || 'Failed to delete products' });
  }
}

