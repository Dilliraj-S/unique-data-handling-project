import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * API: Resolve live companies & contacts counts for products
 * 
 * NEW DESIGN: Counts come from companies_products bridge collection
 * 
 * POST body: { product_ids: ["PRODQI5A2J", "PROD2VSL8", ...] }
 *   OR (legacy fallback): { pp_names: ["jamf.com", "salesforce.com", ...] }
 * 
 * For each product:
 *   - companies_count = rows in companies_products WHERE product_id = X
 *   - contacts_count = 0 (contacts are per-company, shown on click)
 *
 * Response: { status, counts: { "PRODQI5A2J": { companies: 5, contacts: 0 }, ... } }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ status: false, message: 'Method not allowed' });

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  try {
    const { product_ids, pp_names } = req.body;

    // Support both new (product_ids) and legacy (pp_names) format
    const ids = product_ids || [];
    const ppNames = pp_names || [];

    if (ids.length === 0 && ppNames.length === 0) {
      return res.status(200).json({ status: true, counts: {} });
    }

    const bridgeCollection = await getCollection('companies_products', 'central');

    // Query BOTH product_id AND product_pp_name simultaneously
    // FIX: Previously exclusive if/else meant pp_name matches were ignored when product_ids existed
    const uniqueIds = [...new Set(ids.filter(Boolean))].slice(0, 200);
    const uniquePpNames = [...new Set(ppNames.filter(n => n && n.trim()))].slice(0, 200);

    // Build $or match for both lookup paths
    const orConditions = [];
    if (uniqueIds.length > 0) {
      orConditions.push({ product_id: { $in: uniqueIds } });
    }
    if (uniquePpNames.length > 0) {
      orConditions.push({ product_pp_name: { $in: uniquePpNames } });
    }

    if (orConditions.length === 0) {
      return res.status(200).json({ status: true, counts: {} });
    }

    // Single aggregation: group by product_id AND product_pp_name
    const companyCounts = await bridgeCollection.aggregate([
      { $match: { $or: orConditions, deleted_at: null } },
      {
        $group: {
          _id: { product_id: '$product_id', product_pp_name: '$product_pp_name' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Build counts map keyed by BOTH product_id and pp_name
    const counts = {};

    // Initialize all requested keys to 0
    for (const id of uniqueIds) {
      counts[id] = { companies: 0, contacts: 0 };
    }
    for (const name of uniquePpNames) {
      if (!counts[name]) counts[name] = { companies: 0, contacts: 0 };
    }

    // Accumulate counts from aggregation results
    for (const row of companyCounts) {
      const pid = row._id.product_id;
      const ppName = row._id.product_pp_name;

      // Add count to product_id key
      if (pid && counts[pid]) {
        counts[pid].companies += row.count;
      }
      // Also add count to pp_name key (for frontend fallback lookup)
      if (ppName && counts[ppName]) {
        // Only add if pp_name key is different from product_id key
        // to avoid double-counting when both point to same product
        if (ppName !== pid) {
          counts[ppName].companies += row.count;
        }
      }
    }

    return res.status(200).json({ status: true, counts });
  } catch (error) {
    console.error('❌ resolve-counts API error:', error);
    return res.status(500).json({ status: false, message: error.message || 'Failed to resolve counts' });
  }
}
