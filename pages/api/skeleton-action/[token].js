import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import SystemRouteController from '../System/SystemRouteController';

// Increase body size limit for large filter payloads (e.g., 111K+ SMTP domains on Contacts tab)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

/**
 * Entry point for skeleton-action routes
 * Matches: /api/skeleton-action/{token}
 * 
 * This is the Next.js equivalent of Laravel's route:
 * Route::any('/skeleton-action/{token}', [SystemRouteController::class, 'dispatch'])
 * 
 * Token examples:
 * - central_skeleton_tokens_t (table view)
 * - central_skeleton_tokens_a (add form)
 * - central_skeleton_tokens_as (save add)
 * - central_skeleton_tokens_e (edit form)
 * - central_skeleton_tokens_es (save edit)
 * - central_skeleton_tokens_d (delete)
 * - central_skeleton_tokens_db (bulk delete)
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

  // Extract token from Next.js query params (dynamic route parameter)
  // In Next.js, [token].js puts the parameter in req.query.token
  const token = req.query?.token;
  
  if (!token) {
    console.error('❌ No token found in request:', { 
      query: req.query, 
      url: req.url,
      method: req.method 
    });
    return res.status(400).json({
      status: false,
      message: 'Token parameter is required'
    });
  }

  // Set token in params for SystemRouteController (for consistency)
  req.params = req.params || {};
  req.params.token = token;
  
  console.log('🎯 skeleton-action entry point - Token:', token);
  console.log('📋 Request details:', { 
    method: req.method,
    url: req.url,
    query: req.query 
  });
  
  // Call SystemRouteController dispatch
  return await SystemRouteController.dispatch(req, res);
}

