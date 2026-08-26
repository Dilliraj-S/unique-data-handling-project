import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * API: Related Products
 * GET /api/products/related?pp_id=123&source=products
 * 
 * Mirrors PHP NavCtrl "search.related_products" flow:
 * 1. Resolve pp_id → master_accounts → li_smtp
 * 2. Query products where pp_name = li_smtp
 * 3. Return all related products
 *
 * Also supports:
 * GET /api/products/related?li_company_id=456 (company-centric)
 * GET /api/products/related?product_id=PRODXXX (product-centric - fetch company details)
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

  try {
    const { pp_id, li_company_id, product_id, source = 'products' } = req.query;

    // Determine which product collection to query
    const collectionMap = {
      products: 'products',
      apollo: 'apolloproduct',
      g2: 'g2product',
      linkedin: 'linkedinprodcut',
    };
    const collectionName = collectionMap[source] || 'products';

    const accountsCollection = await getCollection('master_accounts', 'sun');
    let company = null;
    let liSmtp = null;

    // ── Mode 1: pp_id → resolve company ──
    if (pp_id) {
      company = await accountsCollection.findOne({
        $or: [
          { id: parseInt(pp_id) || pp_id },
          { _id: pp_id }
        ]
      });
      if (company) {
        liSmtp = company.li_smtp;
      }
    }

    // ── Mode 2: li_company_id → resolve company ──
    if (li_company_id && !company) {
      company = await accountsCollection.findOne({ li_company_id: li_company_id });
      if (company) {
        liSmtp = company.li_smtp;
      }
    }

    // ── Mode 3: product_id → resolve company via pp_name ──
    if (product_id && !company) {
      const productCollection = await getCollection(collectionName, 'central');
      const product = await productCollection.findOne({
        $or: [
          { product_id: product_id },
          { id: parseInt(product_id) || product_id }
        ],
        deleted_at: null
      });

      if (product) {
        const ppName = product.pp_name;
        if (ppName) {
          // pp_name = li_smtp in the PHP architecture
          company = await accountsCollection.findOne({ li_smtp: ppName });
          if (company) {
            liSmtp = company.li_smtp;
          } else {
            liSmtp = ppName; // Use pp_name directly as fallback
          }
        }
      }
    }

    if (!liSmtp) {
      return res.status(200).json({
        status: true,
        data: [],
        company: company ? formatCompany(company) : null,
        message: 'No SMTP domain found to search related products'
      });
    }

    // ── Fetch related products where pp_name = li_smtp ──
    const productCollection = await getCollection(collectionName, 'central');
    const relatedProducts = await productCollection
      .find({ pp_name: liSmtp, deleted_at: null })
      .sort({ id: 1 })
      .limit(500)
      .toArray();

    const data = relatedProducts.map(doc => ({
      _id: doc._id,
      id: doc.id,
      product_id: doc.product_id || String(doc.id ?? ''),
      product_name: doc.product_name || doc.Category || doc.Companyname || null,
      description: doc.description || null,
      source_description: doc.source_description || null,
      pp_name: doc.pp_name || null,
      pp_id: doc.pp_id || null,
      category: doc.category || doc.Category || null,
      vendor: doc.vendor || doc.Companyname || null,
      companies: doc.companies || '',
      companies_count: typeof doc.companies_count === 'number' ? doc.companies_count : 0,
      contacts_count: typeof doc.contacts_count === 'number' ? doc.contacts_count : 0,
      created_at: doc.created_at || null,
      created_by: doc.created_by || null
    }));

    return res.status(200).json({
      status: true,
      data,
      company: company ? formatCompany(company) : null,
      message: `Found ${data.length} related products`
    });

  } catch (error) {
    console.error('❌ Related products API error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to load related products',
      data: []
    });
  }
}

/**
 * Format master_accounts document into a clean company object
 * Mirrors PHP NavCtrl company data assembly
 */
function formatCompany(doc) {
  return {
    id: doc.id,
    _id: doc._id,
    li_company_id: doc.li_company_id || null,
    li_company_name: doc.li_company_name || doc.company || null,
    li_smtp: doc.li_smtp || null,
    li_logo: doc.li_logo || null,
    li_banner: doc.li_banner || null,
    li_tag_line: doc.li_tag_line || null,
    li_company_industry: doc.li_company_industry || null,
    li_company_headquarters: doc.li_company_headquarters || doc.li_company_location || null,
    li_company_founded: doc.li_company_founded || null,
    li_type: doc.li_type || null,
    li_company_specialties: doc.li_company_specialties || null,
    li_website: doc.li_website || doc.website || null,
    li_company_description: doc.li_company_description || null,
    employees_on_linked_in: doc.employees_on_linked_in || null,
  };
}
