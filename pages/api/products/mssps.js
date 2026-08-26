import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import getOpenSearchService from '../../../src/services/OpenSearchService.js';

/**
 * API: MSSPs Products — Optimized server-side pagination
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST', 'DELETE', 'PATCH'].includes(req.method)) {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  try {
    const collection = await getCollection('MSSPsproduct', 'central');

    // POST: Create a new MSSPs product
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

        // Unique product_id with MSSPSPROD prefix
        let productIdValue;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
          productIdValue = `MSSPSPROD${randomPart}`;
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
          if (osService.isEnabledFor('MSSPsproduct')) {
            osService.upsertDoc('MSSPsproduct', result.insertedId, doc).catch(() => {});
          }
        } catch (_) { /* never block writes */ }

        return res.status(201).json({
          status: true,
          id: result.insertedId,
          product_id: productIdValue
        });
      } catch (err) {
        console.error('❌ MSSPs products POST API error:', err);
        return res.status(500).json({ status: false, message: err.message || 'Failed to create product' });
      }
    }

    // PATCH: Update a single MSSPs product
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
        if (osService.isEnabledFor('MSSPsproduct')) {
          const updatedDoc = await collection.findOne({ deleted_at: null, $or: or });
          if (updatedDoc) osService.upsertDoc('MSSPsproduct', updatedDoc._id, updatedDoc).catch(() => {});
        }
      } catch (_) { /* never block writes */ }

      return res.status(200).json({ status: true, modifiedCount: result.modifiedCount || 0 });
    }

    // DELETE: Permanent delete (single + bulk + selectAll via filters)
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
    }

    // GET: Paginated list
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 24);
    const search = (req.query.search || '').trim();
    const category = (req.query.category || '').trim();
    const vendor = (req.query.vendor || '').trim();
    const exactId = (req.query.exact_id || '').trim();

    // ── OpenSearch path ──
    const osService = getOpenSearchService();
    if (osService.isEnabledFor('MSSPsproduct')) {
      try {
        const osResult = await osService.searchProducts('MSSPsproduct', {
          search, category, vendor, page, limit, exactId,
          sort: { companies_count: -1, id: -1 }
        });
        return res.status(200).json({
          status: true,
          data: osResult.data,
          recordsTotal: osResult.recordsTotal,
          recordsFiltered: osResult.recordsFiltered,
          totalPages: osResult.totalPages
        });
      } catch (osErr) {
        console.warn('⚠️ OpenSearch failed for MSSPsproduct, falling back to MongoDB:', osErr.message);
      }
    }

    // ── MongoDB fallback ──
    const filter = { deleted_at: null };
    if (exactId) {
      filter.product_id = exactId;
    } else if (search) {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [
        { product_name: regex },
        { product_id: regex },
        { description: regex },
        { pp_name: regex },
        { category: regex },
        { vendor: regex }
      ];
    }
    if (category) filter.category = category;
    if (vendor) filter.vendor = vendor;

    const [data, recordsTotal, recordsFiltered] = await Promise.all([
      collection
        .find(filter)
        .sort({ companies_count: -1, id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      collection.estimatedDocumentCount(),
      collection.countDocuments(filter)
    ]);

    const totalPages = Math.max(1, Math.ceil(recordsFiltered / limit));

    return res.status(200).json({
      status: true,
      data,
      recordsTotal,
      recordsFiltered,
      totalPages
    });
  } catch (error) {
    console.error('❌ MSSPs products API error:', error);
    return res.status(500).json({ status: false, message: error.message || 'Internal server error' });
  }
}

