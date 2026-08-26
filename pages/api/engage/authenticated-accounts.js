import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Get accounts filtered by current user's user_id (string)
    const collection = await getCollection('email_accounts', 'pluto');
    const accounts = await collection.find({ 
      status: 'active',
      user_id: user.user_id  // Filter by string user_id (e.g., "USR_ADMIN_001")
    }).toArray();
    
    console.log(`📧 Found ${accounts.length} email accounts for user_id: ${user.user_id}`);
    
    const normalizedAccounts = accounts
      .filter(account => !!account.email)
      .map(account => ({
        email: account.email,
        last_synced_at: account.last_synced_at || null,
        syncing: !!account.syncing,
        syncing_category: account.syncing_category || null,
        last_sync_started_at: account.last_sync_started_at || null,
        last_sync_status: account.last_sync_status || null,
        last_sync_count: account.last_sync_count || 0,
        last_sync_error: account.last_sync_error || null
      }));
    
    return res.status(200).json({
      status: true,
      accounts: normalizedAccounts,
      active: normalizedAccounts.length > 0 ? normalizedAccounts[0].email : null
    });

  } catch (error) {
    console.error('Error fetching accounts:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
