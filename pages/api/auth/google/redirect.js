import GoogleAuthCtrl from '../../System/Central/emailsystem/GoogleAuthCtrl';
import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';

/**
 * API Route: Google OAuth Redirect
 * GET /api/auth/google/redirect
 * Initiates Google OAuth flow
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      title: 'Method Not Allowed',
      message: 'Only GET method is allowed.'
    });
  }

  try {
    // Verify authentication
    // Note: This endpoint can be called via axios (with auth header) or browser redirect (without)
    // For browser redirects, we'll check for a token in query params or cookie as fallback
    let user = null;
    
    try {
      user = await authMiddleware(req);
      req.user = user;
    } catch (authError) {
      // If auth fails, check if token is in query params (for browser redirects)
      const token = req.query.token || req.cookies?.auth_token;
      if (token) {
        // Try to verify token from query/cookie
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
          const { getCollection } = require('../../../../src/lib/mongodb');
          const usersCollection = await getCollection('users');
          user = await usersCollection.findOne({
            user_id: decoded.userId,
            deleted_at: null
          }, {
            projection: {
              user_id: 1,
              username: 1,
              email: 1,
              role: 1,
              account_status: 1
            }
          });
          
          if (user && user.account_status === 'active') {
            req.user = {
              user_id: user.user_id,
              username: user.username,
              email: user.email,
              role: user.role
            };
          } else {
            throw new Error('User not found or inactive');
          }
        } catch (tokenError) {
          console.error('Token verification failed:', tokenError);
          return res.status(401).json({
            status: false,
            title: 'Unauthorized',
            message: 'Authentication required.'
          });
        }
      } else {
        return res.status(401).json({
          status: false,
          title: 'Unauthorized',
          message: 'Authentication required.'
        });
      }
    }

    // Call controller method
    return await GoogleAuthCtrl.redirect(req, res);
  } catch (error) {
    console.error('❌ Google OAuth redirect route error:', error);
    return res.status(500).json({
      status: false,
      title: 'Error',
      message: error.message || 'An error occurred while processing the request.'
    });
  }
}

