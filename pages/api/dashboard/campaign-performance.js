import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';

/**
 * Campaign Performance API
 * GET /api/dashboard/campaign-performance?limit=10
 * Returns top performing campaigns
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (!user || !user.user_id) {
    return res.status(401).json({
      status: false,
      message: 'User authentication required'
    });
  }

  const userId = String(user.user_id);
  const limit = parseInt(req.query.limit) || 10;

  try {
    // Get user's email accounts
    const emailAccountsCollection = await getCollection('email_accounts', 'pluto');
    const userAccounts = await emailAccountsCollection.find({
      user_id: userId,
      status: 'active'
    }).toArray();
    
    const userAccountEmails = userAccounts.map(acc => acc.email);

    if (userAccountEmails.length === 0) {
      return res.status(200).json({
        status: true,
        data: {
          campaigns: []
        }
      });
    }

    // Get campaigns with performance metrics
    const campaignsCollection = await getCollection('campaigns', 'pluto');
    const emailCampaignLogsCollection = await getCollection('email_campaign_logs', 'pluto');

    const campaigns = await campaignsCollection.find({}).limit(limit).toArray();

    const campaignPerformance = await Promise.all(
      campaigns.map(async (campaign) => {
        const campaignId = campaign.id?.toNumber ? campaign.id.toNumber() : campaign.id;
        
        const stats = await emailCampaignLogsCollection.aggregate([
          {
            $match: {
              campaign_id: Long.fromNumber(Number(campaignId)),
              from_email: { $in: userAccountEmails }
            }
          },
          {
            $group: {
              _id: null,
              sent: { $sum: 1 },
              delivered: {
                $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
              },
              opened: {
                $sum: { $cond: [{ $eq: ['$opened', true] }, 1, 0] }
              },
              clicked: {
                $sum: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
              },
              bounced: {
                $sum: { $cond: [{ $in: ['$status', ['hard_bounce', 'soft_bounce']] }, 1, 0] }
              }
            }
          }
        ]).toArray();

        const statsData = stats[0] || {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0
        };

        const openRate = statsData.delivered > 0
          ? ((statsData.opened / statsData.delivered) * 100).toFixed(2)
          : 0;

        const clickRate = statsData.delivered > 0
          ? ((statsData.clicked / statsData.delivered) * 100).toFixed(2)
          : 0;

        return {
          id: campaignId,
          name: campaign.name || 'Unnamed Campaign',
          sent: statsData.sent || 0,
          delivered: statsData.delivered || 0,
          opened: statsData.opened || 0,
          clicked: statsData.clicked || 0,
          bounced: statsData.bounced || 0,
          open_rate: parseFloat(openRate),
          click_rate: parseFloat(clickRate),
          status: campaign.status || 'draft'
        };
      })
    );

    // Sort by sent count (descending)
    campaignPerformance.sort((a, b) => b.sent - a.sent);

    return res.status(200).json({
      status: true,
      data: {
        campaigns: campaignPerformance.slice(0, limit)
      }
    });

  } catch (error) {
    console.error('❌ Campaign performance error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch campaign performance data'
    });
  }
}

