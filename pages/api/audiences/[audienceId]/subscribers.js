import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';
import { normalizeId, toLong } from '../helpers';

const mapSubscriber = (subscriber) => ({
  id: normalizeId(subscriber?.id ?? subscriber?._id),
  first_name: subscriber?.first_name || '',
  last_name: subscriber?.last_name || '',
  email: subscriber?.email || '',
  status: subscriber?.status || 'subscribed',
  created_at: subscriber?.created_at || null,
  updated_at: subscriber?.updated_at || null,
});

export default async function handler(req, res) {
  try {
    await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  const { audienceId } = req.query;

  let numericAudienceId;
  try {
    numericAudienceId = toLong(audienceId);
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'Invalid audience identifier.'
    });
  }

  try {
    const subscribersCollection = await getCollection('subscribers', 'pluto');

    const subscribers = await subscribersCollection
      .find({
        audience_id: numericAudienceId,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      })
      .sort({ created_at: -1 })
      .toArray();

    return res.status(200).json({
      status: true,
      data: subscribers.map(mapSubscriber)
    });
  } catch (error) {
    console.error('Failed to fetch subscribers:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch subscribers'
    });
  }
}

