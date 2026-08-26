import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * DELETE /api/profile/delete-account
 * Deletes the authenticated user's account from the users collection.
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  let userSession;
  try {
    userSession = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  try {
    const usersCollection = await getCollection('users', 'central');
    const result = await usersCollection.deleteOne({ user_id: userSession.user_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to delete account'
    });
  }
}

