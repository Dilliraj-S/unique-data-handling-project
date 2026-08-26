import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import getOpenSearchService from '../../../src/services/OpenSearchService.js';

/**
 * API: Companies-Products Bridge Collection
 * 
 * GET  /api/products/companies-products?product_id=X          → List companies for a product
 * GET  /api/products/companies-products?company_li_smtp=X     → List products for a company
 * POST /api/products/companies-products                       → Add companies to a product
 * DELETE /api/products/companies-products?id=X                → Remove a company-product link
 * 
 * Collection: companies_products (in central/nextjs_stu database)
 * Bridge: product_id + product_source ↔ company_li_smtp
 * Company info: joined from master_accounts via li_smtp
 */

// All product collections that may contain the product document
const PRODUCT_COLLECTIONS = [
  'products',
  'apolloproduct',
  'g2product',
  'linkedinprodcut',
  'MSPsproduct',
  'MSSPsproduct'
];

// ── In-memory classification cache (5-min TTL) ──
// Prevents repeated scans of 15Cr master_leads + 10Cr master_accounts
// on every tab switch. Cache is per product_id.
const classificationCache = new Map();
const CLASSIFICATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getClassificationSummary(productId) {
  const now = Date.now();
  const cached = classificationCache.get(productId);
  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  // Compute classification from scratch
  const bridgeCol = await getCollection('companies_products', 'central');
  const baseFilter = { product_id: productId, deleted_at: null };
  const allSmtps = await bridgeCol.distinct('company_li_smtp', baseFilter);

  if (allSmtps.length === 0) {
    const empty = {
      totalCompanies: 0, withInfoAndLeads: 0,
      withInfoNoLeads: 0, noInfoNoLeads: 0,
      smtpsByTab: { companies: [], noLeads: [], noInfo: [] }
    };
    classificationCache.set(productId, { data: empty, expiresAt: now + CLASSIFICATION_TTL_MS });
    return empty;
  }

  let infoSet, leadsSet;

  // ── OpenSearch path: instant termsExists() instead of $in scans ──
  const osService = getOpenSearchService();
  if (osService.isEnabledFor('master_accounts') && osService.isEnabledFor('master_leads')) {
    try {
      const [accountSmtps, leadsSmtps] = await Promise.all([
        osService.termsExists('master_accounts', 'li_smtp.keyword', allSmtps),
        osService.termsExists('master_leads', 'li_smtp.keyword', allSmtps)
      ]);
      infoSet = accountSmtps;
      leadsSet = leadsSmtps;
      console.log(`✅ Classification via OpenSearch: ${allSmtps.length} SMTPs, ${infoSet.size} with info, ${leadsSet.size} with leads`);
    } catch (osErr) {
      console.warn('⚠️ OpenSearch classification failed, falling back to MongoDB:', osErr.message);
      infoSet = null; // trigger MongoDB fallback below
    }
  }

  // ── MongoDB fallback ──
  if (!infoSet) {
    const accountsCol = await getCollection('master_accounts', 'sun');
    const leadsCol = await getCollection('master_leads', 'sun');

    const [allAccounts, leadsAgg] = await Promise.all([
      accountsCol.find({ li_smtp: { $in: allSmtps } })
        .project({ li_smtp: 1 }).toArray(),
      leadsCol.aggregate([
        { $match: { li_smtp: { $in: allSmtps } } },
        { $group: { _id: '$li_smtp' } }
      ]).toArray()
    ]);

    infoSet = new Set(allAccounts.map(a => a.li_smtp).filter(Boolean));
    leadsSet = new Set(leadsAgg.map(r => r._id).filter(Boolean));
  }

  const smtpsByTab = { companies: [], noLeads: [], noInfo: [] };
  allSmtps.forEach(smtp => {
    const hasInfo = infoSet.has(smtp);
    const hasLeads = leadsSet.has(smtp);
    if (hasInfo && hasLeads) smtpsByTab.companies.push(smtp);
    else if (hasInfo && !hasLeads) smtpsByTab.noLeads.push(smtp);
    else smtpsByTab.noInfo.push(smtp);
  });

  const result = {
    totalCompanies: allSmtps.length,
    withInfoAndLeads: smtpsByTab.companies.length,
    withInfoNoLeads: smtpsByTab.noLeads.length,
    noInfoNoLeads: smtpsByTab.noInfo.length,
    smtpsByTab
  };

  classificationCache.set(productId, { data: result, expiresAt: now + CLASSIFICATION_TTL_MS });
  return result;
}

/**
 * Re-count companies_products for a product_id and update companies_count
 * on the product document (whichever collection it lives in).
 * Called after every POST (add) and DELETE (remove) to keep the count accurate.
 */
async function updateProductCompaniesCount(productId) {
  if (!productId) return;

  try {
    const bridgeCollection = await getCollection('companies_products', 'central');
    const realCount = await bridgeCollection.countDocuments({
      product_id: productId,
      deleted_at: null
    });

    // Update across all 6 product collections (only one will match)
    const updatePromises = PRODUCT_COLLECTIONS.map(async (collName) => {
      const coll = await getCollection(collName, 'central');
      return coll.updateOne(
        { product_id: productId, deleted_at: null },
        { $set: { companies_count: realCount, updated_at: new Date() } }
      );
    });

    await Promise.all(updatePromises);
  } catch (err) {
    // Log but don't fail the main request — count sync is best-effort
    console.error(`⚠️ Failed to sync companies_count for ${productId}:`, err.message);
  }
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  const collection = await getCollection('companies_products', 'central');

  // ── GET: List companies for a product OR products for a company ──
  if (req.method === 'GET') {
    try {
      const { product_id, company_li_smtp, product_source, page = 1, limit = 30, tab = 'technology', export_all } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const requestedLimit = Math.max(1, parseInt(limit) || 30);
      const isExportAll = export_all === 'true';
      // PERF: Reduced from 500 → 30 default (only 9 cards shown per page)
      const limitNum = isExportAll ? requestedLimit : Math.min(30, requestedLimit);

      const baseFilter = { deleted_at: null };
      if (product_id) baseFilter.product_id = product_id;
      if (company_li_smtp) baseFilter.company_li_smtp = company_li_smtp;
      if (product_source) baseFilter.product_source = product_source;

      if (!product_id && !company_li_smtp) {
        return res.status(400).json({ status: false, message: 'product_id or company_li_smtp is required' });
      }

      // ── Fast path: return only SMTP list (for Contacts tab DynamicTable filter) ──
      const { smtps_only } = req.query;
      if (smtps_only === 'true' && product_id) {
        const allSmtps = await collection.distinct('company_li_smtp', baseFilter);
        return res.status(200).json({ status: true, smtps: allSmtps });
      }

      // ── PERF: Use cached classification (5-min TTL) ──
      // Eliminates repeated 15Cr + 10Cr scans on every tab switch
      let summary = null;
      let tabFilteredSmtps = null;

      if (product_id) {
        const classification = await getClassificationSummary(product_id);
        summary = {
          totalCompanies: classification.totalCompanies,
          withInfoAndLeads: classification.withInfoAndLeads,
          withInfoNoLeads: classification.withInfoNoLeads,
          noInfoNoLeads: classification.noInfoNoLeads
        };

        // Apply tab filter (technology = all, others = filtered)
        if (tab === 'companies') tabFilteredSmtps = classification.smtpsByTab.companies;
        else if (tab === 'noLeads') tabFilteredSmtps = classification.smtpsByTab.noLeads;
        else if (tab === 'noInfo') tabFilteredSmtps = classification.smtpsByTab.noInfo;
        // tab === 'technology' → tabFilteredSmtps stays null (no filter)
      }

      // Build the actual query filter
      const queryFilter = { ...baseFilter };
      if (tabFilteredSmtps !== null) {
        queryFilter.company_li_smtp = { $in: tabFilteredSmtps };
      }

      const [docs, total] = await Promise.all([
        collection.find(queryFilter)
          .sort({ id: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .toArray(),
        collection.countDocuments(queryFilter)
      ]);

      // Enrich page docs with master_accounts data + contacts counts
      // PERF: Only enrich the current page (max 30 docs), not all 500
      let enrichedDocs = docs;
      if (product_id && docs.length > 0) {
        const smtpsForPage = [...new Set(docs.map(d => d.company_li_smtp).filter(Boolean))];

        if (smtpsForPage.length > 0) {
          const accountsCollection = await getCollection('master_accounts', 'sun');
          const leadsCollection = await getCollection('master_leads', 'sun');

          const [pageAccounts, pageCountResults] = await Promise.all([
            // PERF: Reduced projection from 25+ fields to only what CompanyCard needs
            accountsCollection.find({
              li_smtp: { $in: smtpsForPage }
            }).project({
              li_smtp: 1, li_company_name: 1, li_company_industry: 1,
              li_company_headquarters: 1, li_company_headquarters_country: 1,
              li_logo: 1, employees_on_linked_in: 1, li_website: 1,
              li_tag_line: 1, li_company_description: 1,
              li_company_specialties: 1, li_company_employee_size: 1,
              id: 1
            }).toArray(),
            leadsCollection.aggregate([
              { $match: { li_smtp: { $in: smtpsForPage } } },
              { $group: { _id: '$li_smtp', count: { $sum: 1 } } }
            ]).toArray()
          ]);

          const accountMap = {};
          pageAccounts.forEach(acc => {
            if (acc.li_smtp) accountMap[acc.li_smtp] = acc;
          });

          const countsMap = {};
          pageCountResults.forEach(r => { countsMap[r._id] = r.count; });

          enrichedDocs = docs.map(doc => ({
            ...doc,
            company_info: accountMap[doc.company_li_smtp] || null,
            contacts_count: countsMap[doc.company_li_smtp] || 0
          }));
        }
      }

      return res.status(200).json({
        status: true,
        data: enrichedDocs,
        total,
        summary,
        page: pageNum,
        totalPages: Math.max(1, Math.ceil(total / limitNum))
      });

    } catch (error) {
      console.error('❌ companies-products GET error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to fetch' });
    }
  }

  // ── POST: Add companies to a product ──
  if (req.method === 'POST') {
    try {
      const {
        product_id,
        product_source = 'products',
        product_name = '',
        product_pp_name = '',
        company_li_smtps = [] // Array of li_smtp strings
      } = req.body;

      if (!product_id) {
        return res.status(400).json({ status: false, message: 'product_id is required' });
      }
      if (!company_li_smtps || company_li_smtps.length === 0) {
        return res.status(400).json({ status: false, message: 'company_li_smtps array is required' });
      }

      // Deduplicate and clean
      const cleanSmtps = [...new Set(
        company_li_smtps.map(s => String(s).trim().toLowerCase()).filter(s => s.length > 0)
      )];

      // Lookup company names from master_accounts
      const accountsCollection = await getCollection('master_accounts', 'sun');
      const accounts = await accountsCollection.find({
        li_smtp: { $in: cleanSmtps }
      }).project({ li_smtp: 1, li_company_name: 1 }).toArray();

      const nameMap = {};
      accounts.forEach(acc => {
        if (acc.li_smtp) nameMap[acc.li_smtp] = acc.li_company_name || acc.li_smtp;
      });

      // Check existing to avoid duplicates
      const existing = await collection.find({
        product_id,
        company_li_smtp: { $in: cleanSmtps },
        deleted_at: null
      }).project({ company_li_smtp: 1 }).toArray();

      const existingSmtps = new Set(existing.map(e => e.company_li_smtp));
      const newSmtps = cleanSmtps.filter(s => !existingSmtps.has(s));

      if (newSmtps.length === 0) {
        return res.status(200).json({
          status: true,
          message: 'All companies already linked to this product',
          inserted: 0,
          skipped: cleanSmtps.length
        });
      }

      // Get next auto-increment id
      const lastDoc = await collection.findOne({}, { sort: { id: -1 } });
      let nextId = (lastDoc?.id || 0) + 1;

      const now = new Date();
      const docsToInsert = newSmtps.map(smtp => ({
        id: nextId++,
        product_id,
        product_source,
        product_name,
        product_pp_name,
        company_li_smtp: smtp,
        company_name: nameMap[smtp] || smtp,
        created_at: now,
        created_by: req.user?.username || req.user?.user_id || 'system',
        deleted_at: null
      }));

      await collection.insertMany(docsToInsert);

      // Sync companies_count on the product document
      await updateProductCompaniesCount(product_id);

      // Ensure indexes exist
      try {
        await collection.createIndex({ product_id: 1, deleted_at: 1 });
        await collection.createIndex({ company_li_smtp: 1, deleted_at: 1 });
        await collection.createIndex({ product_id: 1, company_li_smtp: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
      } catch (indexErr) {
        // Indexes may already exist, that's fine
        console.log('Index creation note:', indexErr.message);
      }

      return res.status(200).json({
        status: true,
        message: `Added ${docsToInsert.length} companies to product`,
        inserted: docsToInsert.length,
        skipped: cleanSmtps.length - newSmtps.length
      });

    } catch (error) {
      console.error('❌ companies-products POST error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to add companies' });
    }
  }

  // ── DELETE: Remove a company-product link ──
  if (req.method === 'DELETE') {
    try {
      const { id, product_id, company_li_smtp } = req.query;
      let affectedProductId = product_id || null;

      if (id) {
        // Look up the product_id before soft-deleting (for count sync)
        if (!affectedProductId) {
          const doc = await collection.findOne({ id: parseInt(id) }, { projection: { product_id: 1 } });
          if (doc) affectedProductId = doc.product_id;
        }
        // Soft delete by id
        await collection.updateOne(
          { id: parseInt(id) },
          { $set: { deleted_at: new Date() } }
        );
      } else if (product_id && company_li_smtp) {
        // Soft delete by product_id + company_li_smtp
        await collection.updateOne(
          { product_id, company_li_smtp, deleted_at: null },
          { $set: { deleted_at: new Date() } }
        );
      } else {
        return res.status(400).json({ status: false, message: 'id or (product_id + company_li_smtp) required' });
      }

      // Sync companies_count on the product document
      if (affectedProductId) {
        await updateProductCompaniesCount(affectedProductId);
      }

      return res.status(200).json({ status: true, message: 'Company removed from product' });

    } catch (error) {
      console.error('❌ companies-products DELETE error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to remove' });
    }
  }

  // ── PATCH: Update a company-product link (inline CSV fields only) ──
  if (req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const { id } = body;

      if (!id) {
        return res.status(400).json({ status: false, message: 'id is required' });
      }

      const allowedFields = [
        'company_name',
        'company_li_smtp',
        'location',
        'industry',
        'employee_size',
        'revenue',
        'website',
        'country',
        'summary',
        'source'
      ];

      const $set = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          $set[field] = body[field];
        }
      }

      if (Object.keys($set).length === 0) {
        return res.status(400).json({ status: false, message: 'No valid fields to update' });
      }

      $set.updated_at = new Date();
      $set.updated_by = req.user?.username || req.user?.user_id || 'system';

      const result = await collection.updateOne(
        { id: parseInt(id), deleted_at: null },
        { $set }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ status: false, message: 'Company link not found' });
      }

      return res.status(200).json({ status: true, modifiedCount: result.modifiedCount || 0 });
    } catch (error) {
      console.error('❌ companies-products PATCH error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Failed to update company' });
    }
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
}
