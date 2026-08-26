import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';
import { escapeRegex, getNextNumericValue, mapAudience } from './helpers';

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

  const audiencesCollection = await getCollection('audiences', 'pluto');

  if (req.method === 'GET') {
    try {
      const audiences = await audiencesCollection
        .find({
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        })
        .sort({ created_at: -1 })
        .toArray();

      return res.status(200).json({
        status: true,
        data: audiences.map(mapAudience)
      });
    } catch (error) {
      console.error('Failed to fetch audiences:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch audiences'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body || {};

      if (!name || !name.toString().trim()) {
        return res.status(422).json({
          status: false,
          message: 'Audience name is required.'
        });
      }

      const trimmedName = name.toString().trim();
      const existing = await audiencesCollection.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, 'i') },
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });

      if (existing) {
        return res.status(409).json({
          status: false,
          message: 'An audience with this name already exists.'
        });
      }

      const nextId = await getNextNumericValue(audiencesCollection);
      const now = new Date();
      const doc = {
        id: Long.fromNumber(nextId),
        name: trimmedName,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        created_by: user?.user_id || user?.id || null,
        updated_by: user?.user_id || user?.id || null
      };

      await audiencesCollection.insertOne(doc);

      return res.status(201).json({
        status: true,
        message: 'Audience created successfully.',
        data: mapAudience(doc)
      });
    } catch (error) {
      console.error('Failed to create audience:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to create audience'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}
