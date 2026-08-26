import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

// In-memory cache for approximate totals (per node process)
const approxCache = new Map();
const APPROX_TTL_MS = 5 * 60 * 1000; // 5 minutes

function makeApproxKey(productId, filters) {
  const { email, li_full_name, li_job_title } = filters || {};
  return `${productId}::${email || ''}::${li_full_name || ''}::${li_job_title || ''}`;
}

function encodeCursor(state) {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

function decodeCursor(cursor) {
  try {
    const json = Buffer.from(cursor, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  try {
    const {
      product_id: productId,
      cursor,
      email = '',
      li_full_name = '',
      li_job_title = '',
      limit: limitParam
    } = req.query;

    if (!productId) {
      return res.status(400).json({ status: false, message: 'product_id is required' });
    }

    const limit = Math.max(1, Math.min(parseInt(limitParam, 10) || 50, 100));

    const filters = {
      email: String(email || '').trim(),
      li_full_name: String(li_full_name || '').trim(),
      li_job_title: String(li_job_title || '').trim()
    };

    const companiesCol = await getCollection('companies_products', 'central');
    const leadsCol = await getCollection('master_leads', 'sun');

    // Resolve approximate total from cache or compute lazily
    const approxKey = makeApproxKey(productId, filters);
    let approxEntry = approxCache.get(approxKey);
    const now = Date.now();
    if (!approxEntry || approxEntry.expiresAt < now) {
      // Compute approximate total using a sample
      // 1) Total companies for this product (exact, indexed by product_id)
      const companyFilter = { product_id: productId, deleted_at: null };
      const totalCompanies = await companiesCol.countDocuments(companyFilter);

      let approximateTotal = 0;
      if (totalCompanies > 0) {
        const sampleSize = Math.min(totalCompanies, 5000);
        const sampleDocs = await companiesCol
          .find(companyFilter, { projection: { company_li_smtp: 1 } })
          .sort({ id: 1 })
          .limit(sampleSize)
          .toArray();
        const sampleSmtps = [...new Set(sampleDocs.map(d => d.company_li_smtp).filter(Boolean))];

        if (sampleSmtps.length > 0) {
          const leadFilter = {
            li_smtp: { $in: sampleSmtps },
            deleted_at: null
          };
          if (filters.email) {
            leadFilter.email = { $regex: filters.email, $options: 'i' };
          }
          if (filters.li_full_name) {
            leadFilter.li_full_name = { $regex: filters.li_full_name, $options: 'i' };
          }
          if (filters.li_job_title) {
            leadFilter.li_job_title = { $regex: filters.li_job_title, $options: 'i' };
          }

          const sampleLeads = await leadsCol.countDocuments(leadFilter);
          const avgPerCompany = sampleLeads / sampleSize;
          approximateTotal = Math.round(avgPerCompany * totalCompanies);
        }
      }

      approxEntry = {
        approximateTotal,
        totalCompanies,
        expiresAt: now + APPROX_TTL_MS
      };
      approxCache.set(approxKey, approxEntry);
    }

    // Decode cursor state (stateless, per request)
    let state = {
      companyOffset: 0,
      processedCompanies: 0,
      lastLeadId: null
    };
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (decoded && decoded.product_id === productId) {
        state = {
          companyOffset: decoded.companyOffset || 0,
          processedCompanies: decoded.processedCompanies || 0,
          lastLeadId: decoded.lastLeadId || null
        };
      }
    }

    const BATCH_SIZE = 5000;
    const collected = [];
    let companyOffset = state.companyOffset;
    let processedCompanies = state.processedCompanies;
    let hasMoreCompanies = true;
    let lastLeadId = state.lastLeadId ? new ObjectId(state.lastLeadId) : null;

    while (collected.length < limit && hasMoreCompanies) {
      const companyBatch = await companiesCol
        .find({ product_id: productId, deleted_at: null }, { projection: { company_li_smtp: 1 } })
        .sort({ id: 1 })
        .skip(companyOffset)
        .limit(BATCH_SIZE)
        .toArray();

      if (!companyBatch.length) {
        hasMoreCompanies = false;
        break;
      }

      const smtps = [...new Set(companyBatch.map(d => d.company_li_smtp).filter(Boolean))];

      companyOffset += companyBatch.length;
      processedCompanies += companyBatch.length;

      if (!smtps.length) {
        continue;
      }

      // Build leads filter for this batch
      const leadFilter = {
        li_smtp: { $in: smtps },
        deleted_at: null
      };
      if (filters.email) {
        leadFilter.email = { $regex: filters.email, $options: 'i' };
      }
      if (filters.li_full_name) {
        leadFilter.li_full_name = { $regex: filters.li_full_name, $options: 'i' };
      }
      if (filters.li_job_title) {
        leadFilter.li_job_title = { $regex: filters.li_job_title, $options: 'i' };
      }
      if (lastLeadId) {
        leadFilter._id = { $gt: lastLeadId };
      }

      const leadsCursor = leadsCol
        .find(leadFilter)
        .sort({ _id: 1 })
        .limit(limit - collected.length);

      const leads = await leadsCursor.toArray();
      if (leads.length > 0) {
        collected.push(...leads);
        lastLeadId = leads[leads.length - 1]._id;
      }
    }

    const nextCursor = (hasMoreCompanies && collected.length > 0)
      ? encodeCursor({
          product_id: productId,
          companyOffset,
          processedCompanies,
          lastLeadId: lastLeadId ? lastLeadId.toHexString() : null
        })
      : null;

    return res.status(200).json({
      status: 'success',
      data: collected,
      next_cursor: nextCursor,
      has_more: !!nextCursor,
      approximate_total: approxEntry.approximateTotal,
      processed_companies: processedCompanies
    });
  } catch (error) {
    console.error('❌ product-leads-streaming error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to stream product leads'
    });
  }
}

