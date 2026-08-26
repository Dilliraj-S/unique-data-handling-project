import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import getOpenSearchService from '../../../src/services/OpenSearchService.js';

/**
 * API: G2 Products — Optimized server-side pagination
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST', 'DELETE', 'PATCH'].includes(req.method)) return res.status(405).json({ status: false, message: 'Method not allowed' });

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  try {
    const collection = await getCollection('g2product', 'central');

    // ─────────────────────────────────────────────────────────────────────────────
    // POST: Create a new G2 product (manual add from UI)
    // Body: { product_name, category?, vendor?, description?, source_description?, pp_name? }
    // Auto-generates: id (numeric), product_id (G2PRODXXXX), created_at/by, deleted_at
    // ─────────────────────────────────────────────────────────────────────────────
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

        const normalize = (str) => (str ? String(str).replace(/\s+/g, '').toLowerCase() : '');
        const inputNameNorm = normalize(product_name);

        const existing = await collection
          .find({ deleted_at: null, product_name: { $exists: true } })
          .project({ product_name: 1 })
          .toArray();

        for (const doc of existing) {
          const existingNorm = normalize(doc.product_name);
          if (existingNorm && existingNorm === inputNameNorm) {
            return res.status(400).json({
              status: false,
              message: 'A product with a similar name already exists'
            });
          }
        }

        // Unique product_id with G2PROD prefix
        let productIdValue;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
          productIdValue = `G2PROD${randomPart}`;
          const exists = await collection.findOne({ product_id: productIdValue });
          if (!exists) break;
        }

        // Auto-increment numeric id
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
          if (osService.isEnabledFor('g2product')) {
            osService.upsertDoc('g2product', result.insertedId, doc).catch(() => {});
          }
        } catch (_) { /* never block writes */ }

        return res.status(201).json({
          status: true,
          id: result.insertedId,
          product_id: productIdValue
        });
      } catch (err) {
        console.error('❌ G2 products POST API error:', err);
        return res.status(500).json({ status: false, message: err.message || 'Failed to create product' });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // PATCH: Update a single G2 product
    // Body: { id?: string, product_id?: string, updates: { product_name?, category?, vendor?, description?, source_description?, pp_name? } }
    // ─────────────────────────────────────────────────────────────────────────────
    if (req.method === 'PATCH') {
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

      const or = [];
      if (id) {
        const v = String(id).trim();
        if (ObjectId.isValid(v) && v.length === 24) {
          or.push({ _id: new ObjectId(v) });
        }
        const asNum = Number.parseInt(v, 10);
        if (!Number.isNaN(asNum) && String(asNum) === v) {
          or.push({ id: asNum });
        }
      }
      if (product_id) {
        or.push({ product_id: String(product_id).trim() });
      }
      if (!or.length) {
        return res.status(400).json({ status: false, message: 'No valid id/product_id supplied' });
      }

      const result = await collection.updateOne(
        { deleted_at: null, $or: or },
        { $set }
      );
      if (result.matchedCount === 0) {
        return res.status(404).json({ status: false, message: 'Product not found' });
      }

      // Fire-and-forget: sync to OpenSearch
      try {
        const osService = getOpenSearchService();
        if (osService.isEnabledFor('g2product')) {
          const updatedDoc = await collection.findOne({ deleted_at: null, $or: or });
          if (updatedDoc) osService.upsertDoc('g2product', updatedDoc._id, updatedDoc).catch(() => {});
        }
      } catch (_) { /* never block writes */ }

      return res.status(200).json({ status: true, modifiedCount: result.modifiedCount || 0 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // DELETE: Permanent delete (single + bulk + selectAll via filters)
    // Body: { ids?: string[], id?: string, selectAll?: boolean, filters?: { search?, category?, vendor? } }
    // ─────────────────────────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
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
          { product_name: regex }, { product_id: regex }, { description: regex },
          { pp_name: regex }, { category: regex }, { vendor: regex }
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
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 24);
    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim();
    const vendor = (req.query.vendor || '').trim();
    const exactId = (req.query.exact_id || '').trim();

    // ── OpenSearch path ──
    const osService = getOpenSearchService();
    if (osService.isEnabledFor('g2product')) {
      try {
        const osResult = await osService.searchProducts('g2product', {
          search, category, vendor, page, limit, exactId,
          sort: { companies_count: -1, id: -1 }
        });
        const data = osResult.data.map((doc) => ({
          _id: doc._id, id: doc.id,
          product_id: doc.product_id || String(doc.id ?? ''),
          product_name: doc.product_name || doc.Category || doc.Companyname || null,
          description: doc.description || [doc.reference_1, doc.reference_2, doc.reference_3, doc.reference_4, doc.reference_5].filter(Boolean).join(' | ') || null,
          source_description: doc.source_description || doc.LinkedinUrl || null,
          pp_name: doc.pp_name || doc.Category || null, pp_id: doc.pp_id || null,
          category: doc.category || doc.Category || null, vendor: doc.vendor || doc.Companyname || null,
          companies: doc.companies || '', companies_count: typeof doc.companies_count === 'number' ? doc.companies_count : 0,
          contacts_count: typeof doc.contacts_count === 'number' ? doc.contacts_count : 0,
          created_at: doc.created_at || null, created_by: doc.created_by || null
        }));
        return res.status(200).json({ status: true, data, recordsTotal: osResult.recordsTotal, recordsFiltered: osResult.recordsFiltered, page, totalPages: osResult.totalPages });
      } catch (osErr) {
        console.warn('⚠️ OpenSearch failed for g2product, falling back to MongoDB:', osErr.message);
      }
    }

    // ── MongoDB fallback ──
    const filter = { deleted_at: null };
    if (exactId) {
      filter.product_id = exactId;
    } else if (search) {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [
        { product_name: regex }, { product_id: regex }, { description: regex },
        { pp_name: regex }, { category: regex }, { vendor: regex }
      ];
    }
    if (category) filter.category = category;
    if (vendor) filter.vendor = vendor;

    const hasFilters = !!(search || category || vendor);
    const queries = [
      collection.find(filter).sort({ companies_count: -1, id: -1 }).skip((page - 1) * limit).limit(limit)
        .project({ _id: 1, id: 1, product_id: 1, product_name: 1, description: 1, source_description: 1, pp_name: 1, pp_id: 1, category: 1, vendor: 1, companies: 1, companies_count: 1, contacts_count: 1, created_at: 1, created_by: 1, Category: 1, Companyname: 1, LinkedinUrl: 1, reference_1: 1, reference_2: 1, reference_3: 1, reference_4: 1, reference_5: 1 }).toArray(),
      collection.estimatedDocumentCount()
    ];
    if (hasFilters) queries.push(collection.countDocuments(filter));

    const results = await Promise.all(queries);
    const docs = results[0];
    const recordsTotal = results[1];
    const recordsFiltered = hasFilters ? results[2] : recordsTotal;
    const totalPages = Math.max(1, Math.ceil(recordsFiltered / limit));

    const data = docs.map((doc) => ({
      _id: doc._id, id: doc.id,
      product_id: doc.product_id || String(doc.id ?? ''),
      product_name: doc.product_name || doc.Category || doc.Companyname || null,
      description: doc.description || [doc.reference_1, doc.reference_2, doc.reference_3, doc.reference_4, doc.reference_5].filter(Boolean).join(' | ') || null,
      source_description: doc.source_description || doc.LinkedinUrl || null,
      pp_name: doc.pp_name || doc.Category || null, pp_id: doc.pp_id || null,
      category: doc.category || doc.Category || null, vendor: doc.vendor || doc.Companyname || null,
      companies: doc.companies || '', companies_count: typeof doc.companies_count === 'number' ? doc.companies_count : 0,
      contacts_count: typeof doc.contacts_count === 'number' ? doc.contacts_count : 0,
      created_at: doc.created_at || null, created_by: doc.created_by || null
    }));

    return res.status(200).json({ status: true, data, recordsTotal, recordsFiltered, page, totalPages });
  } catch (error) {
    console.error('❌ G2 products API error:', error);
    return res.status(500).json({ status: false, message: error.message || 'Failed to load G2 products', data: [] });
  }
}
