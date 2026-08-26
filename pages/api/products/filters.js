import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * API: Product Filters (categories + vendors)
 *
 * GET /api/products/filters?source=products|apollo|g2|linkedin|mssps|msps
 *
 * Returns distinct category and vendor values for the specified product source.
 * Uses OpenSearch terms aggregation when available (instant), falls back to MongoDB distinct().
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  const source = (req.query.source || '').toString().trim() || 'products';

  const sourceMap = {
    products: 'products',
    apollo: 'apolloproduct',
    g2: 'g2product',
    linkedin: 'linkedinprodcut',
    mssps: 'MSSPsproduct',
    msps: 'MSPsproduct'
  };

  const collectionName = sourceMap[source];

  if (!collectionName) {
    return res.status(400).json({
      status: false,
      message: 'Invalid source. Use one of: products, apollo, g2, linkedin, mssps, msps'
    });
  }

  try {
    const normalizeList = (values) => {
      const set = new Set();
      for (const raw of values || []) {
        if (typeof raw !== 'string') continue;
        const v = raw.trim();
        if (!v) continue;
        set.add(v);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    };

    // ── OpenSearch path: single aggregation instead of 4x distinct() ──
    const { default: getOpenSearchService } = await import('../../../src/services/OpenSearchService.js');
    const osService = getOpenSearchService();

    if (osService.isEnabledFor(collectionName)) {
      try {
        const aggs = await osService.getFilterAggregations(collectionName, {
          categories: { terms: { field: 'category.keyword', size: 1000 } },
          categories_legacy: { terms: { field: 'Category.keyword', size: 1000 } },
          vendors: { terms: { field: 'vendor.keyword', size: 1000 } },
          vendors_legacy: { terms: { field: 'Companyname.keyword', size: 1000 } }
        });

        const catBuckets = [...(aggs.categories?.buckets || []), ...(aggs.categories_legacy?.buckets || [])];
        const venBuckets = [...(aggs.vendors?.buckets || []), ...(aggs.vendors_legacy?.buckets || [])];

        return res.status(200).json({
          status: true,
          source,
          categories: normalizeList(catBuckets.map(b => b.key)),
          vendors: normalizeList(venBuckets.map(b => b.key))
        });
      } catch (osErr) {
        console.warn('⚠️ OpenSearch filters failed, falling back to MongoDB:', osErr.message);
      }
    }

    // ── MongoDB fallback ──
    const collection = await getCollection(collectionName, 'central');
    const baseFilter = { deleted_at: null };

    const [catNew, catLegacy, venNew, venLegacy] = await Promise.all([
      collection.distinct('category', baseFilter),
      collection.distinct('Category', baseFilter),
      collection.distinct('vendor', baseFilter),
      collection.distinct('Companyname', baseFilter)
    ]);

    const categories = normalizeList([...(catNew || []), ...(catLegacy || [])]);
    const vendors = normalizeList([...(venNew || []), ...(venLegacy || [])]);

    return res.status(200).json({
      status: true,
      source,
      categories,
      vendors
    });
  } catch (error) {
    console.error('❌ Product filters API error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to load product filters',
      categories: [],
      vendors: []
    });
  }
}
