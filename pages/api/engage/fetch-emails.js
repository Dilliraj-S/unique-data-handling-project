import { getCollection } from '@/lib/mongodb';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { Long } from 'mongodb';

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

    const { email, category = 'inbox', search, status, pageToken } = req.query;

    if (!email) {
      return res.status(400).json({ status: false, message: 'Email is required' });
    }

    const collection = await getCollection('emails', 'pluto');
    const accountsCollection = await getCollection('email_accounts', 'pluto');
    
    // Find account and verify it belongs to the current user
    const account = await accountsCollection.findOne({ 
      email: email,
      user_id: user.user_id  // Ensure account belongs to current user (string user_id)
    });
    
    if (!account) {
      return res.status(404).json({ status: false, message: 'Account not found or access denied' });
    }

    // Build Query
    const idCandidates = [];
    const appendCandidate = (value) => {
      if (value === undefined || value === null) return;
      const key = typeof value === 'object' && value !== null && value.toString ? value.toString() : String(value);
      if (!idCandidates.find(candidate => {
        if (candidate === value) return true;
        if (typeof candidate === 'object' && candidate !== null && candidate.toString) {
          return candidate.toString() === key;
        }
        return String(candidate) === key;
      })) {
        idCandidates.push(value);
      }
    };

    if (account.id !== undefined && account.id !== null) {
      appendCandidate(account.id);
      if (typeof account.id === 'number' && Number.isFinite(account.id)) {
        appendCandidate(Long.fromNumber(account.id));
        appendCandidate(String(account.id));
      } else if (typeof account.id === 'string') {
        const numericId = Number(account.id);
        if (!Number.isNaN(numericId)) {
          appendCandidate(numericId);
          appendCandidate(Long.fromNumber(numericId));
        }
      } else if (Long.isLong && Long.isLong(account.id)) {
        appendCandidate(account.id.toNumber());
      }
    }

    const query = {
      category: category
    };

    if (idCandidates.length === 1) {
      query.email_account_id = idCandidates[0];
    } else if (idCandidates.length > 1) {
      query.email_account_id = { $in: idCandidates };
    } else {
      query.account_email = account.email;
    }

    // Build status filter - MUST be exact match to prevent cross-category filtering
    // This is critical: we need to ensure emails with status='automatic_reply' 
    // don't appear when filtering by 'unsubscribe'
    let statusCondition = null;
    if (status && status !== 'all') {
      if (status === 'other') {
        // Handle "other" status: emails that don't match any known keywords
        statusCondition = {
          $or: [
            { status: null },
            { status: { $exists: false } },
            { status: 'other' }
          ]
        };
      } else {
        // CRITICAL: Use exact string match - no regex, no case-insensitive matching
        // This ensures strict filtering by status value
        statusCondition = { status: status };
      }
    }

    // Build search filter
    let searchCondition = null;
    if (search && search.trim()) {
      searchCondition = {
        $or: [
          { subject: { $regex: search.trim(), $options: 'i' } },
          { from_name: { $regex: search.trim(), $options: 'i' } },
          { from_email: { $regex: search.trim(), $options: 'i' } },
          { snippet: { $regex: search.trim(), $options: 'i' } }
        ]
      };
    }

    // Combine filters using $and to ensure ALL conditions are met
    // This prevents cross-category filtering issues
    const conditions = [];
    if (statusCondition) {
      conditions.push(statusCondition);
    }
    if (searchCondition) {
      conditions.push(searchCondition);
    }
    
    // If we have multiple conditions, use $and to combine them
    if (conditions.length > 1) {
      query.$and = conditions;
    } else if (conditions.length === 1) {
      // Single condition - merge directly into query
      Object.assign(query, conditions[0]);
    }
    
    // Debug logging to verify query structure
    console.log('🔍 Email query - Status:', status, '| Query:', JSON.stringify(query, null, 2));

    // Pagination - Server-side pagination
    const limit = 20;
    let page = parseInt(pageToken);
    if (isNaN(page) || page < 1) {
      page = 1; // Default to page 1 if invalid
    }
    const skip = (page - 1) * limit;

    const total_count = await collection.countDocuments(query);
    const emails = await collection.find(query)
      .sort({ received_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      status: true,
      emails: emails,
      total_count: total_count,
      nextPageToken: (skip + limit < total_count) ? page + 1 : null,
      meta: {
        last_synced_at: account.last_synced_at || null,
        syncing: !!account.syncing,
        syncing_category: account.syncing_category || null,
        last_sync_status: account.last_sync_status || null,
        last_sync_count: account.last_sync_count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
