import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import Queue from 'bull';

// User-specific email sync queue (for manual user-triggered syncs)
const USER_SYNC_QUEUE_NAME = 'User Email Sync';
const getUserEmailSyncQueue = () => {
  if (!global.__userEmailSyncQueue) {
    global.__userEmailSyncQueue = new Queue(USER_SYNC_QUEUE_NAME, {
      redis: { host: 'localhost', port: 6379 }
    });
  }
  return global.__userEmailSyncQueue;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    let user;
    try {
      user = await authMiddleware(req);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
    }

    if (!user?.user_id || typeof user.user_id !== 'string') {
      return res.status(400).json({ status: false, message: 'Invalid user ID format' });
    }

    const { email, category = 'inbox' } = req.body || {};
    if (!email) {
      return res.status(400).json({ status: false, message: 'Email is required' });
    }

    const accountsCollection = await getCollection('email_accounts', 'pluto');
    const account = await accountsCollection.findOne({
      email,
      user_id: user.user_id,
      status: 'active'
    });

    if (!account) {
      return res.status(404).json({ status: false, message: 'Account not found or access denied' });
    }

    // Use user-specific queue for manual syncs
    const queue = getUserEmailSyncQueue();
    const job = await queue.add('email-sync', { 
      email, 
      category,
      user_id: user.user_id  // Include user_id in job data
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false
    });

    await accountsCollection.updateOne(
      { _id: account._id },
      {
        $set: {
          sync_requested_at: new Date(),
          syncing: true,
          syncing_category: category
        }
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Sync requested successfully',
      jobId: job.id
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    return res.status(500).json({ status: false, message: error.message || 'Failed to trigger sync' });
  }
}

