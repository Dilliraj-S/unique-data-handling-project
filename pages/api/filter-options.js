import { authMiddleware } from '../../src/server/Http/Middleware/auth';
import { getCollection } from '../../src/lib/mongodb';

/**
 * Filter Options API
 * GET /api/filter-options?category=li_company_name&q=search_term
 * 
 * Returns predefined filter suggestions from options collection
 * based on category (which matches MongoDB field names).
 * 
 * Flow:
 * 1. Validate category exists in categories collection
 * 2. Query options collection for matching category
 * 3. Apply optional search filter (q parameter)
 * 4. Return formatted suggestions
 * 
 * NO live DB scans - only uses predefined options collection
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed. Only GET requests are supported.'
    });
  }

  // Apply authentication
  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  try {
    const { category, q } = req.query;

    // Validate required parameter
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({
        status: false,
        message: 'Category parameter is required. Category must match a valid category_id from categories collection.'
      });
    }

    const categoryId = category.trim();

    // STEP 1: Validate category exists in categories collection
    // category_id MUST equal MongoDB field name used in filters
    const categoriesCollection = await getCollection('categories', 'central');
    
    const categoryDoc = await categoriesCollection.findOne({
      category_id: categoryId,
      deleted_at: null
    });

    if (!categoryDoc) {
      return res.status(400).json({
        status: false,
        message: `Category "${categoryId}" not found or has been deleted. Please ensure the category exists in categories collection with deleted_at = null.`
      });
    }

    // STEP 2: Query predefined options from options collection
    // category field in options MUST match categories.category_id
    const optionsCollection = await getCollection('options', 'central');
    
    // Build query
    const query = {
      category: categoryId, // Match on category_id
      deleted_at: null
    };

    // Apply optional search filter (case-insensitive regex)
    if (q && typeof q === 'string' && q.trim() !== '') {
      query.option = {
        $regex: q.trim(),
        $options: 'i' // Case-insensitive
      };
    }

    // Query options with projection (only return needed fields)
    const options = await optionsCollection
      .find(query)
      .project({
        _id: 1,
        option_id: 1,
        category: 1,
        option: 1,
        color: 1,
        class: 1,
        description: 1
      })
      .sort({ option: 1 }) // Sort alphabetically by option value
      .limit(50) // Limit to 50 results for performance
      .toArray();

    // STEP 3: Format response
    // Map options.option to value for frontend consumption
    const formattedOptions = options.map(opt => ({
      option_id: opt.option_id,
      category: opt.category,
      value: opt.option, // Map from options.option to value
      color: opt.color || null,
      class: opt.class || null,
      description: opt.description || null
    }));

    return res.status(200).json({
      status: true,
      data: formattedOptions,
      meta: {
        category: categoryId,
        count: formattedOptions.length,
        category_label: categoryDoc.category || categoryId
      },
      message: `Found ${formattedOptions.length} predefined filter option${formattedOptions.length !== 1 ? 's' : ''} for "${categoryId}"`
    });

  } catch (error) {
    console.error('❌ Filter Options API Error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Internal server error while fetching filter options',
      data: [],
      meta: {
        category: req.query.category || null,
        count: 0
      }
    });
  }
}

