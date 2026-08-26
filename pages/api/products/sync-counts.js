import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * API: Sync Product Counts
 * POST /api/products/sync-counts
 * 
 * Resolves live company IDs and contact IDs for a product via pp_name → li_smtp,
 * stores them back into the product document, and returns the counts.
 * 
 * Body: { product_id, source, pp_name }
 * 
 * Architecture (mirrors PHP NavCtrl + save.js):
 *   product.pp_name = master_accounts.li_smtp  → company IDs
 *   product.pp_name = master_leads.li_smtp     → contact IDs
 *   Stores as CSV in product.companies / product.contacts
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
    const { product_id, source = 'products', pp_name } = req.body;

    if (!product_id || !pp_name) {
      return res.status(400).json({ status: false, message: 'product_id and pp_name are required' });
    }

    // Determine product collection
    const collectionMap = {
      products: 'products',
      apollo: 'apolloproduct',
      g2: 'g2product',
      linkedin: 'linkedinprodcut',
    };
    const collectionName = collectionMap[source] || 'products';

    // 1. Find the product
    const productCollection = await getCollection(collectionName, 'central');
    const product = await productCollection.findOne({
      $or: [
        { product_id: product_id },
        { id: parseInt(product_id) || product_id }
      ],
      deleted_at: null
    });

    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found' });
    }

    // 2. Resolve companies via pp_name → master_accounts.li_smtp
    const accountsCollection = await getCollection('master_accounts', 'sun');
    const matchingCompanies = await accountsCollection.find({
      li_smtp: pp_name
    }).project({ id: 1, _id: 1 }).toArray();

    const companyIds = matchingCompanies.map(acc => {
      if (acc.id !== undefined && acc.id !== null) return String(acc.id);
      if (acc._id) return acc._id.toString();
      return null;
    }).filter(Boolean);

    // 3. Resolve contacts via pp_name → master_leads.li_smtp
    const leadsCollection = await getCollection('master_leads', 'sun');
    const contactsCount = await leadsCollection.countDocuments({ li_smtp: pp_name });

    // For storing IDs: only fetch IDs (not full docs) — limit to 10000 to avoid memory issues
    let contactIds = [];
    if (contactsCount <= 10000) {
      const matchingLeads = await leadsCollection.find({
        li_smtp: pp_name
      }).project({ id: 1, _id: 1 }).toArray();

      contactIds = matchingLeads.map(lead => {
        if (lead.id !== undefined && lead.id !== null) return String(lead.id);
        if (lead._id) return lead._id.toString();
        return null;
      }).filter(Boolean);
    }

    // 4. Merge with existing IDs (preserve any manually-added IDs from save.js)
    const existingCompanies = (product.companies || '')
      .split(/[,@]/)
      .map(id => String(id).trim())
      .filter(id => id.length > 0);
    const existingContacts = (product.contacts || '')
      .split(/[,@]/)
      .map(id => String(id).trim())
      .filter(id => id.length > 0);

    const mergedCompanies = [...new Set([...existingCompanies, ...companyIds])];
    const mergedContacts = contactIds.length > 0
      ? [...new Set([...existingContacts, ...contactIds])]
      : existingContacts; // Don't overwrite if we skipped fetching (>10k)

    const finalCompaniesCount = mergedCompanies.length;
    const finalContactsCount = contactIds.length > 0 ? mergedContacts.length : contactsCount;

    // 5. Update the product document
    await productCollection.updateOne(
      { _id: product._id },
      {
        $set: {
          companies: mergedCompanies.join(','),
          companies_count: finalCompaniesCount,
          contacts: mergedContacts.join(','),
          contacts_count: finalContactsCount,
          updated_at: new Date()
        }
      }
    );

    return res.status(200).json({
      status: true,
      companies_count: finalCompaniesCount,
      contacts_count: finalContactsCount,
      message: `Synced: ${finalCompaniesCount} companies, ${finalContactsCount} contacts`
    });

  } catch (error) {
    console.error('❌ sync-counts API error:', error);
    return res.status(500).json({ status: false, message: error.message || 'Failed to sync counts' });
  }
}
