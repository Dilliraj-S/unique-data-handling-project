import GoogleAuthCtrl from '../../System/Central/emailsystem/GoogleAuthCtrl';

/**
 * API Route: Google OAuth Callback
 * GET /api/auth/google/callback
 * Handles Google OAuth callback after user authorization
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
    // Note: Callback doesn't require token verification as it's called by Google
    // But we should verify the state parameter for security
    
    // Call controller method
    return await GoogleAuthCtrl.callback(req, res);
  } catch (error) {
    console.error('❌ Google OAuth callback route error:', error);
    return res.status(500).json({
      status: false,
      title: 'Error',
      message: error.message || 'An error occurred while processing the request.'
    });
  }
}

