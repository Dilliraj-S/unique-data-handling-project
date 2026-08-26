import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (value instanceof Long) {
    return value.toNumber();
  }
  return value;
};

const toLong = (value, fieldName) => {
  if (value instanceof Long) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Long.fromNumber(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid numeric value for ${fieldName}`);
    }
    return Long.fromNumber(parsed);
  }
  throw new Error(`Invalid value for ${fieldName}`);
};

export default async function handler(req, res) {
  try {
    await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method === 'GET') {
    try {
      const campaignsCollection = await getCollection('campaigns', 'pluto');

      const campaigns = await campaignsCollection
        .find({
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        })
        .sort({ updated_at: -1, created_at: -1 })
        .toArray();

      return res.status(200).json(
        campaigns.map((campaign) => ({
          id: normalizeId(campaign.id),
          _id: campaign._id?.toString(),
          name: campaign.name,
          template_id: normalizeId(campaign.template_id),
          audience_id: normalizeId(campaign.audience_id),
          status: campaign.status || 'Draft',
          created_at: campaign.created_at,
          updated_at: campaign.updated_at
        }))
      );
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch campaigns'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, template_id, audience_id, status } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          status: false,
          message: 'Campaign name is required.'
        });
      }

      if (!template_id) {
        return res.status(400).json({
          status: false,
          message: 'Template is required.'
        });
      }

      if (!audience_id) {
        return res.status(400).json({
          status: false,
          message: 'Audience is required.'
        });
      }

      const campaignsCollection = await getCollection('campaigns', 'pluto');

      // Get next ID
      const lastDoc = await campaignsCollection.findOne(
        {},
        { sort: { id: -1 }, projection: { id: 1 } }
      );

      let nextId = Long.fromNumber(1);
      if (lastDoc && lastDoc.id) {
        const maxId = lastDoc.id instanceof Long ? lastDoc.id : Long.fromNumber(Number(lastDoc.id));
        nextId = Long.fromNumber(maxId.toNumber() + 1);
      }

      const userId = req.user?.user_id || req.user?.id || null;
      const userIdLong = userId ? Long.fromNumber(Number(userId)) : Long.fromNumber(0);

      const now = new Date();

      const newCampaign = {
        id: nextId,
        name: name.trim(),
        template_id: toLong(template_id, 'template_id'),
        audience_id: toLong(audience_id, 'audience_id'),
        status: (status || 'Draft').trim(),
        created_at: now,
        updated_at: now,
        deleted_at: null,
        created_by: userIdLong,
        updated_by: userIdLong
      };

      const result = await campaignsCollection.insertOne(newCampaign);

      return res.status(200).json({
        status: true,
        id: normalizeId(nextId),
        _id: result.insertedId.toString(),
        message: 'Campaign created successfully.'
      });
    } catch (error) {
      console.error('Failed to create campaign:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to create campaign'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}


