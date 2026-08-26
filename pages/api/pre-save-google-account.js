import GoogleAuthCtrl from './System/Central/emailsystem/GoogleAuthCtrl';
import { authMiddleware } from '../../src/server/Http/Middleware/auth';

/**
 * API Route: Pre-save Google Account
 * POST /api/pre-save-google-account
 * Saves account details before initiating Google OAuth flow
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      title: 'Method Not Allowed',
      message: 'Only POST method is allowed.'
    });
  }

  try {
    // Verify authentication
    try {
      const user = await authMiddleware(req);
      req.user = user;
      console.log('✅ Authentication successful for user:', user.user_id);
    } catch (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.error('❌ Auth error details:', {
        hasAuthHeader: !!req.headers.authorization,
        authHeaderPrefix: req.headers.authorization?.substring(0, 20),
        errorName: authError.name,
        errorMessage: authError.message
      });
      return res.status(401).json({
        status: false,
        title: 'Unauthorized',
        message: authError.message || 'Authentication required.'
      });
    }

    // Call controller method
    return await GoogleAuthCtrl.preSaveGoogleAccount(req, res);
  } catch (error) {
    console.error('❌ Pre-save Google account route error:', error);
    return res.status(500).json({
      status: false,
      title: 'Error',
      message: error.message || 'An error occurred while processing the request.'
    });
  }
}

