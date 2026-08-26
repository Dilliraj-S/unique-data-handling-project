import { authMiddleware } from 'src/server/Http/Middleware/auth';
import NavigationService from 'src/services/NavigationService';

/**
 * User Navigation API
 * Returns filtered navigation based on user's view permissions
 * Only modules/sections/items with 'view' permission are included
 */
export default async function handler(req, res) {
  // Apply authentication
  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get userId from query or authenticated user
    const userId = req.query.userId || req.user.user_id || req.user.id;
    
    if (!userId) {
      return res.status(400).json({
        status: false,
        message: 'User ID is required'
      });
    }

    console.log(`🔄 Fetching navigation for user: ${userId}`);

    const navigation = await NavigationService.getUserNavigation(userId);

    console.log(`✅ Found ${navigation.length} visible modules for user ${userId}`);

    return res.status(200).json({
      status: true,
      data: navigation,
      message: 'Navigation loaded successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching user navigation:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch navigation'
    });
  }
}

