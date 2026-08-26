import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long, ObjectId } from 'mongodb';

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

const toLong = (value) => {
  if (value instanceof Long) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Long.fromNumber(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric identifier');
    }
    return Long.fromNumber(parsed);
  }
  throw new Error('Invalid identifier provided');
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

  const { campaignId } = req.query;

  if (!campaignId) {
    return res.status(400).json({
      status: false,
      message: 'Campaign ID is required.'
    });
  }

  const campaignsCollection = await getCollection('campaigns', 'pluto');

  if (req.method === 'GET') {
    try {
      // Try to find by numeric ID first
      let campaign;
      try {
        const idLong = toLong(campaignId);
        campaign = await campaignsCollection.findOne({
          id: idLong,
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        });
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(campaignId)) {
          campaign = await campaignsCollection.findOne({
            _id: new ObjectId(campaignId),
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
          });
        }
      }

      if (!campaign) {
        return res.status(404).json({
          status: false,
          message: 'Campaign not found.'
        });
      }

      // Get template
      const templatesCollection = await getCollection('templates', 'pluto');
      const template = await templatesCollection.findOne({
        id: campaign.template_id
      });

      // Get audience and subscribers
      const audiencesCollection = await getCollection('audiences', 'pluto');
      const audience = await audiencesCollection.findOne({
        id: campaign.audience_id
      });

      // Get subscriber count and sample (don't load all subscribers to avoid large responses)
      let subscriberCount = 0;
      let sampleSubscriber = null;
      if (audience) {
        const subscribersCollection = await getCollection('subscribers', 'pluto');
        subscriberCount = await subscribersCollection.countDocuments({
          audience_id: campaign.audience_id,
          status: { $in: ['subscribed', 'active'] }
        });
        // Get only one sample subscriber for template preview
        sampleSubscriber = await subscribersCollection.findOne({
          audience_id: campaign.audience_id,
          status: { $in: ['subscribed', 'active'] }
        });
      }

      // Get email account for preview
      const emailAccountsCollection = await getCollection('email_accounts', 'pluto');
      const userId = req.user?.user_id || req.user?.id;
      const emailAccount = await emailAccountsCollection.findOne({
        status: 'active',
        user_id: Long.fromNumber(Number(userId))
      });

      // Process template content with placeholders for preview
      let templateContent = template?.content || '';

      const replacements = {
        '[email]': sampleSubscriber?.email || 'N/A',
        '[first_name]': sampleSubscriber?.first_name || 'N/A',
        '[last_name]': sampleSubscriber?.last_name || 'N/A',
        '[phone_number]': sampleSubscriber?.phone_number || 'N/A',
        '[designation]': sampleSubscriber?.designation || 'N/A',
        '[fax]': sampleSubscriber?.fax || 'N/A',
        '[unsubscribe_link]': sampleSubscriber ? `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${sampleSubscriber.tracking_id || sampleSubscriber.id}` : 'N/A',
        '[postal_code]': sampleSubscriber?.postal_code || 'N/A',
        '[address]': sampleSubscriber?.address || 'N/A',
        '[sender_email]': emailAccount?.email || 'N/A',
        '[sender_first_name]': emailAccount?.first_name || 'N/A',
        '[sender_last_name]': emailAccount?.last_name || 'N/A',
        '[type]': emailAccount?.type || 'N/A',
        '[status]': emailAccount?.status || 'N/A'
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        templateContent = templateContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }

      return res.status(200).json({
        id: normalizeId(campaign.id),
        _id: campaign._id?.toString(),
        name: campaign.name,
        template_id: normalizeId(campaign.template_id),
        template_title: template?.title || 'N/A',
        template_content: templateContent,
        audience_id: normalizeId(campaign.audience_id),
        audience_name: audience?.name || 'N/A',
        subscriber_count: subscriberCount,
        subscribers: sampleSubscriber ? [{
          id: normalizeId(sampleSubscriber.id),
          first_name: sampleSubscriber.first_name || 'N/A',
          last_name: sampleSubscriber.last_name || 'N/A',
          email: sampleSubscriber.email,
          status: sampleSubscriber.status,
          phone_number: sampleSubscriber.phone_number || 'N/A',
          designation: sampleSubscriber.designation || 'N/A',
          fax: sampleSubscriber.fax || 'N/A',
          postal_code: sampleSubscriber.postal_code || 'N/A',
          address: sampleSubscriber.address || 'N/A'
        }] : [],
        status: campaign.status || 'Draft',
        email_accounts: emailAccount ? [emailAccount.email] : [],
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      });
    } catch (error) {
      console.error('Failed to fetch campaign:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch campaign'
      });
    }
  }

  if (req.method === 'PUT') {
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

      // Try to find by numeric ID first
      let query;
      try {
        const idLong = toLong(campaignId);
        query = { id: idLong };
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(campaignId)) {
          query = { _id: new ObjectId(campaignId) };
        } else {
          return res.status(400).json({
            status: false,
            message: 'Invalid campaign ID format.'
          });
        }
      }

      const userId = req.user?.user_id || req.user?.id || null;
      const userIdLong = userId ? Long.fromNumber(Number(userId)) : Long.fromNumber(0);
      const now = new Date();

      const updateData = {
        name: name.trim(),
        template_id: toLong(template_id),
        audience_id: toLong(audience_id),
        status: (status || 'Draft').trim(),
        updated_at: now,
        updated_by: userIdLong
      };

      const result = await campaignsCollection.updateOne(
        query,
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          message: 'Campaign not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Campaign updated successfully.'
      });
    } catch (error) {
      console.error('Failed to update campaign:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to update campaign'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Try to find by numeric ID first
      let query;
      try {
        const idLong = toLong(campaignId);
        query = { id: idLong };
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(campaignId)) {
          query = { _id: new ObjectId(campaignId) };
        } else {
          return res.status(400).json({
            status: false,
            message: 'Invalid campaign ID format.'
          });
        }
      }

      const result = await campaignsCollection.updateOne(
        query,
        { $set: { deleted_at: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          message: 'Campaign not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Campaign deleted successfully.'
      });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to delete campaign'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}


