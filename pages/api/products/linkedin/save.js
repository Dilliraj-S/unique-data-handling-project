import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';

/**
 * API: Save LinkedIn Products
 * Saves selected records to linkedinproducts collection
 * Behavior mirrors central_unique_products logic but targets linkedinproducts
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Authentication required' });
  }

  try {
    const {
      productType = 'linkedin',
      mode,
      productId: existingProductId,
      productName,
      description,
      category,
      vendor,
      source_description,
      pp_id,
      pp_name,
      ids: rawIds,
      type
    } = req.body;

    // Parse IDs (same as central_unique_products)
    let ids = [];
    const isQuery = rawIds && (rawIds.startsWith('%7B') || rawIds.startsWith('{'));
    
    if (isQuery) {
      try {
        const decoded = JSON.parse(decodeURIComponent(rawIds));
        if (Array.isArray(decoded)) {
          ids = decoded.map(id => String(id).trim()).filter(id => id.length > 0);
        }
      } catch (parseError) {
        return res.status(400).json({
          status: false,
          title: 'Invalid ID Format',
          message: 'Invalid query format.'
        });
      }
    } else {
      ids = (rawIds || '').split('@')
        .map(id => String(id).trim())
        .filter(id => id.length > 0);
    }

    if (ids.length === 0) {
      return res.status(400).json({
        status: false,
        title: 'No Records',
        message: 'No records selected.'
      });
    }

    // Determine source type (contacts vs companies)
    const isLeads = type === 'sun.master_leads';
    const sourceSystem = isLeads ? 'sun' : 'sun';
    const sourceCollection = isLeads ? 'master_leads' : 'master_accounts';

    let finalContacts = [];
    let finalCompanies = [];

    const { ObjectId } = require('mongodb');

    const numericIds = ids.map(id => {
      const num = parseInt(id);
      return isNaN(num) ? null : num;
    }).filter(id => id !== null);

    const objectIds = ids
      .map(id => {
        try {
          if (ObjectId.isValid(String(id)) && String(id).length === 24) {
            return new ObjectId(String(id));
          }
        } catch (e) {}
        return null;
      })
      .filter(id => id !== null);

    let query = {};
    if (numericIds.length > 0 && objectIds.length > 0) {
      query = { $or: [{ id: { $in: numericIds } }, { _id: { $in: objectIds } }] };
    } else if (numericIds.length > 0) {
      query = { id: { $in: numericIds } };
    } else if (objectIds.length > 0) {
      query = { _id: { $in: objectIds } };
    } else {
      query = { id: { $in: ids } };
    }

    if (isLeads) {
      const leadsCollection = await getCollection(sourceCollection, sourceSystem);
      const selectedLeads = await leadsCollection.find(query).toArray();

      const liSmtps = [...new Set(
        selectedLeads
          .map(lead => lead.li_smtp)
          .filter(smtp => smtp && smtp.trim())
      )];

      if (liSmtps.length > 0) {
        const accountsCollection = await getCollection('master_accounts', 'sun');
        const matchingCompanies = await accountsCollection.find({
          li_smtp: { $in: liSmtps }
        }).toArray();

        finalCompanies = matchingCompanies.map(acc => {
          if (acc._id) return acc._id.toString();
          if (acc.id !== undefined && acc.id !== null) return String(acc.id);
          return null;
        }).filter(Boolean);
      }

      finalContacts = selectedLeads.map(lead => {
        if (lead._id) return lead._id.toString();
        if (lead.id !== undefined && lead.id !== null) return String(lead.id);
        return null;
      }).filter(Boolean);

      if (finalContacts.length === 0 && selectedLeads.length > 0) {
        finalContacts = ids;
      }
    } else {
      const accountsCollection = await getCollection(sourceCollection, sourceSystem);
      const selectedAccounts = await accountsCollection.find(query).toArray();

      const liSmtps = [...new Set(
        selectedAccounts
          .map(acc => acc.li_smtp)
          .filter(smtp => smtp && smtp.trim())
      )];

      if (liSmtps.length > 0) {
        const leadsCollection = await getCollection('master_leads', 'sun');
        const matchingLeads = await leadsCollection.find({
          li_smtp: { $in: liSmtps }
        }).toArray();

        finalContacts = matchingLeads.map(lead => {
          if (lead._id) return lead._id.toString();
          if (lead.id !== undefined && lead.id !== null) return String(lead.id);
          return null;
        }).filter(Boolean);
      }

      finalCompanies = selectedAccounts.map(acc => {
        if (acc.id !== undefined && acc.id !== null) return String(acc.id);
        if (acc._id) return acc._id.toString();
        return null;
      }).filter(Boolean);

      if (finalCompanies.length === 0 && selectedAccounts.length > 0) {
        finalCompanies = ids;
      }
    }

    // Get company info from pp_id
    const accountsCollection = await getCollection('master_accounts', 'sun');
    const ppAccount = await accountsCollection.findOne({ id: parseInt(pp_id) || pp_id });
    const companyName = ppAccount?.li_company_name || ppAccount?.company || pp_name || 'Unknown Company';
    const website = ppAccount?.website || '';
    const headquarters = ppAccount?.li_company_location || '';

    const linkedinCollection = await getCollection('linkedinprodcut', 'central');

    if (mode === 'new') {
      if (!productName || !productName.trim()) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Product name is required for new products.'
        });
      }

      // Generate unique product_id
      const normalize = (str) => str ? str.replace(/\s+/g, '').toLowerCase() : '';
      const inputNameNormalized = normalize(productName);

      const allProducts = await linkedinCollection.find({
        deleted_at: null
      }).toArray();

      for (const product of allProducts) {
        const existingNameNormalized = normalize(product.product_name || product.ProductName);
        if (inputNameNormalized === existingNameNormalized) {
          return res.status(400).json({
            status: false,
            title: 'Duplicate Entry',
            message: 'A product with a similar name already exists.'
          });
        }
      }

      let productIdValue;
      let isUnique = false;
      do {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        productIdValue = `LIPROD${randomPart}`;
        const exists = await linkedinCollection.findOne({ product_id: productIdValue });
        isUnique = !exists;
      } while (!isUnique);

      // Generate numeric id
      let numericId;
      let idUnique = false;
      do {
        const lastProduct = await linkedinCollection.findOne({}, { sort: { id: -1 } });
        if (lastProduct && lastProduct.id) {
          const lastId = typeof lastProduct.id === 'number' ? lastProduct.id : parseInt(lastProduct.id) || 0;
          numericId = lastId + 1;
        } else {
          numericId = 1;
        }
        const exists = await linkedinCollection.findOne({ id: numericId });
        idUnique = !exists;
      } while (!idUnique);

      const now = new Date();

      const newProduct = {
        id: numericId,
        ProductName: productName.trim(),
        TechnologyCategory: category || null,
        UsedBy: description || null,
        LinkedinLink: source_description || null,
        Company: companyName,
        Website: website || null,
        Headquarters: headquarters || null,
        // Extended product fields
        product_id: productIdValue,
        product_name: productName.trim(),
        description: description || null,
        source_description: source_description || null,
        pp_id: pp_id || null,
        pp_name: pp_name || companyName || null,
        category: category || null,
        vendor: vendor || companyName || null,
        contacts: finalContacts.join(','),
        contacts_count: finalContacts.length,
        companies: finalCompanies.join(','),
        companies_count: finalCompanies.length,
        created_at: now,
        updated_at: now,
        created_by: req.user?.username || req.user?.user_id || 'system',
        deleted_at: null
      };

      await linkedinCollection.insertOne(newProduct);

      return res.status(200).json({
        status: true,
        reload_table: true,
        affected: productIdValue,
        title: `LinkedIn Product "${productName}" Created`,
        message: 'successfully'
      });

    } else {
      if (!existingProductId) {
        return res.status(400).json({
          status: false,
          title: 'Validation Error',
          message: 'Please select an existing product.'
        });
      }

      const existingProduct = await linkedinCollection.findOne({
        $or: [
          { product_id: existingProductId },
          { id: parseInt(existingProductId) || existingProductId }
        ],
        deleted_at: null
      });

      if (!existingProduct) {
        return res.status(400).json({
          status: false,
          title: 'Product Not Found',
          message: 'The selected product does not exist.'
        });
      }

      const currentContacts = (existingProduct.contacts || '')
        .split(',')
        .map(id => String(id).trim())
        .filter(id => id.length > 0);

      const currentCompanies = (existingProduct.companies || '')
        .split(',')
        .map(id => String(id).trim())
        .filter(id => id.length > 0);

      const mergedContacts = [...new Set([...currentContacts, ...finalContacts])];
      const mergedCompanies = [...new Set([...currentCompanies, ...finalCompanies])];

      const now = new Date();

      const updateData = {
        LinkedinLink: source_description || existingProduct.LinkedinLink || null,
        TechnologyCategory: category || existingProduct.TechnologyCategory || null,
        UsedBy: description || existingProduct.UsedBy || null,
        description: description || existingProduct.description || null,
        source_description: source_description || existingProduct.source_description || null,
        pp_id: pp_id || existingProduct.pp_id || null,
        pp_name: pp_name || existingProduct.pp_name || null,
        category: category || existingProduct.category || null,
        vendor: vendor || existingProduct.vendor || null,
        contacts: mergedContacts.join(','),
        contacts_count: mergedContacts.length,
        companies: mergedCompanies.join(','),
        companies_count: mergedCompanies.length,
        updated_at: now,
        created_by: existingProduct.created_by || req.user?.username || req.user?.user_id || 'system'
      };

      await linkedinCollection.updateOne(
        { _id: existingProduct._id },
        { $set: updateData }
      );

      return res.status(200).json({
        status: true,
        reload_table: true,
        affected: existingProduct.product_id || existingProduct.id,
        title: `LinkedIn Product Updated`,
        message: 'Added to existing product'
      });
    }

  } catch (error) {
    console.error('❌ LinkedIn products save error:', error);
    return res.status(500).json({
      status: false,
      title: 'Error',
      message: error.message || 'An error occurred while saving the LinkedIn product.'
    });
  }
}

