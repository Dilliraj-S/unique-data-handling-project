import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';
import { Long } from 'mongodb';


export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.query;
    const type = req.query.type || 'opened'; // 'opened' or 'unopened'
    const isExport = req.query.export === 'true'; // Export mode: return ALL records
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isExport ? 0 : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = isExport ? 0 : (page - 1) * limit;

    if (!campaignId) {
      return res.status(400).json({ status: false, message: 'Campaign ID is required' });
    }

    if (!['opened', 'unopened'].includes(type)) {
      return res.status(400).json({ status: false, message: 'type must be "opened" or "unopened"' });
    }

    const logsCollection = await getCollection('email_campaign_logs', 'pluto');
    const progressCollection = await getCollection('campaign_progress', 'pluto');

    // Same progress_id filtering as progress.js — scope to latest dispatch
    const progress = await progressCollection.findOne(
      { campaign_id: Long.fromNumber(Number(campaignId)) },
      { sort: { created_at: -1 } }
    );

    const progressIdFilter = progress?.progress_id
      ? { progress_id: progress.progress_id }
      : { progress_id: { $exists: false } };

    // Build filter: only 'sent' emails, then filter by tracking_open
    const filter = {
      campaign_id: Long.fromNumber(Number(campaignId)),
      status: 'sent',
      tracking_open: type === 'opened' ? 1 : { $ne: 1 }, // 0, null, or missing = unopened
      ...progressIdFilter
    };

    // Get total count (for pagination)
    const total = await logsCollection.countDocuments(filter);

    // Get paginated results — project only needed fields for efficiency
    const subscribers = await logsCollection
      .find(filter, {
        projection: {
          to_email: 1,
          from_email: 1,
          sent_at: 1,
          tracking_opened_at: 1,
          _id: 0
        }
      })
      .sort({ sent_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      status: true,
      subscribers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('[tracking-subscribers] Error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
