import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { toLong } from '../audiences/helpers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedStatuses = ['subscribed', 'unsubscribed'];

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

  const { subscriberId } = req.query;

  let numericSubscriberId;
  try {
    numericSubscriberId = toLong(subscriberId);
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'Invalid subscriber identifier.'
    });
  }

  const subscribersCollection = await getCollection('subscribers', 'pluto');

  if (req.method === 'PUT') {
    const { first_name, last_name, email, status } = req.body || {};
    const updates = {};

    if (first_name !== undefined) {
      updates.first_name = first_name?.toString().trim() || '';
    }

    if (last_name !== undefined) {
      updates.last_name = last_name?.toString().trim() || '';
    }

    if (email !== undefined) {
      const normalizedEmail = email?.toString().trim().toLowerCase();
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        return res.status(422).json({
          status: false,
          message: 'A valid email address is required.'
        });
      }
      updates.email = normalizedEmail;
    }

    if (status !== undefined) {
      const normalizedStatus = status?.toString().toLowerCase();
      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(422).json({
          status: false,
          message: `Status must be one of: ${allowedStatuses.join(', ')}.`
        });
      }
      updates.status = normalizedStatus;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        status: false,
        message: 'No updates supplied.'
      });
    }

    updates.updated_at = new Date();
    updates.updated_by = user?.user_id || user?.id || null;

    try {
      const result = await subscribersCollection.updateOne(
        { id: numericSubscriberId },
        { $set: updates }
      );

      if (!result.matchedCount) {
        return res.status(404).json({
          status: false,
          message: 'Subscriber not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Subscriber updated successfully.'
      });
    } catch (error) {
      console.error('Failed to update subscriber:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to update subscriber.'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await subscribersCollection.deleteOne({ id: numericSubscriberId });

      if (!result.deletedCount) {
        return res.status(404).json({
          status: false,
          message: 'Subscriber not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Subscriber removed successfully.'
      });
    } catch (error) {
      console.error('Failed to delete subscriber:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to delete subscriber.'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}

