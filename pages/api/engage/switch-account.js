 import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    // Authenticate user and get user_id
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    if (!user || !user.user_id) {
      return res.status(401).json({ status: false, message: 'User authentication required' });
    }

    // user.user_id is now a string (e.g., "USR_ADMIN_001") - no conversion needed
    if (!user.user_id || typeof user.user_id !== 'string') {
      console.error('❌ Invalid user_id format - must be string:', user.user_id);
      return res.status(400).json({ status: false, message: 'Invalid user ID format' });
    }
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ status: false, message: 'Email is required' });
    }

    // Verify that the account belongs to the current user
    const accountsCollection = await getCollection('email_accounts', 'pluto');
    const account = await accountsCollection.findOne({ 
      email: email,
      user_id: user.user_id,  // String user_id (e.g., "USR_ADMIN_001")
      status: 'active'
    });
    
    if (!account) {
      return res.status(403).json({ 
        status: false, 
        message: 'Account not found or access denied. You can only switch to your own accounts.' 
      });
    }
    
    // In a real app, we would update the server-side session.
    // For this implementation, we just acknowledge the switch.
    
    return res.status(200).json({
      status: true,
      message: `Switched to ${email}`
    });

  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
}
