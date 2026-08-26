import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';
import { escapeRegex, mapAudience, toLong } from '../helpers';

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
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

  const audiencesCollection = await getCollection('audiences', 'pluto');
  const subscribersCollection = await getCollection('subscribers', 'pluto');

  if (req.method === 'GET') {
    try {
      const audience = await audiencesCollection.findOne({
        id: numericAudienceId,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });

      if (!audience) {
        return res.status(404).json({
          status: false,
          message: 'Audience not found.'
        });
      }

      const stats = await subscribersCollection
        .aggregate([
          { $match: { audience_id: numericAudienceId } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
        .toArray();

      const totals = stats.reduce(
        (acc, current) => {
          const statusKey = (current._id || '').toLowerCase();
          acc.total += current.count;
          if (statusKey === 'subscribed' || statusKey === 'active') acc.subscribed += current.count;
          if (statusKey === 'unsubscribed') acc.unsubscribed += current.count;
          return acc;
        },
        { total: 0, subscribed: 0, unsubscribed: 0 }
      );

      return res.status(200).json({
        status: true,
        data: {
          ...mapAudience(audience),
          stats: totals
        }
      });
    } catch (error) {
      console.error('Failed to fetch audience details:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch audience details.'
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name } = req.body || {};
      const updates = {};

      if (name !== undefined) {
        const trimmed = name.toString().trim();
        if (!trimmed) {
          return res.status(422).json({
            status: false,
            message: 'Audience name cannot be empty.'
          });
        }

        const duplicate = await audiencesCollection.findOne({
          id: { $ne: numericAudienceId },
          name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        });

        if (duplicate) {
          return res.status(409).json({
            status: false,
            message: 'Another audience already uses this name.'
          });
        }

        updates.name = trimmed;
      }

      if (!Object.keys(updates).length) {
        return res.status(400).json({
          status: false,
          message: 'No updates supplied.'
        });
      }

      updates.updated_at = new Date();
      updates.updated_by = user?.user_id || user?.id || null;

      const result = await audiencesCollection.updateOne(
        { id: numericAudienceId },
        { $set: updates }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          status: false,
          message: 'Audience not found.'
        });
      }

      const refreshed = await audiencesCollection.findOne({ id: numericAudienceId });

      return res.status(200).json({
        status: true,
        message: 'Audience updated successfully.',
        data: mapAudience(refreshed)
      });
    } catch (error) {
      console.error('Failed to update audience:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to update audience.'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}

