import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';

/**
 * Dashboard Statistics API
 * GET /api/dashboard/stats
 * Returns comprehensive dashboard statistics for the authenticated user
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

  try {
    // Get date ranges
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(now);
    monthStart.setMonth(now.getMonth() - 1);
    monthStart.setHours(0, 0, 0, 0);

    // Collections
    const emailCampaignLogsCollection = await getCollection('email_campaign_logs', 'pluto');
    const campaignsCollection = await getCollection('campaigns', 'pluto');
    const subscribersCollection = await getCollection('subscribers', 'pluto');
    const emailAccountsCollection = await getCollection('email_accounts', 'pluto');
    const usersCollection = await getCollection('users', 'central');
    
    // Get user's email accounts
    const userAccounts = await emailAccountsCollection.find({
      user_id: userId,
      status: 'active'
    }).toArray();
    
    const userAccountEmails = userAccounts.map(acc => acc.email);

    // Heavy queries are done in parallel to shorten end-to-end latency
    const [
      // Email statistics (today / week / month) – scoped to user's active accounts
      emailStats,
      // Campaign level statistics – avoid $lookup explosion by aggregating logs directly
      campaignLogStats,
      campaignCounts,
      // Collection counts
      contactsCountResult,
      companiesCountResult,
      productsCountResult,
      // Subscribers and users
      subscriberStats,
      userStats
    ] = await Promise.all([
      Promise.all([
        // Today
        emailCampaignLogsCollection.aggregate([
          {
            $match: {
              from_email: { $in: userAccountEmails },
              sent_at: { $gte: todayStart }
            }
          },
          {
            $group: {
              _id: null,
              sent: { $sum: 1 },
              delivered: {
                $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
              },
              failed: {
                $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
              },
              bounced: {
                $sum: { $cond: [{ $in: ['$status', ['hard_bounce', 'soft_bounce']] }, 1, 0] }
              }
            }
          }
        ]).toArray(),
        // Week
        emailCampaignLogsCollection.aggregate([
          {
            $match: {
              from_email: { $in: userAccountEmails },
              sent_at: { $gte: weekStart }
            }
          },
          {
            $group: {
              _id: null,
              sent: { $sum: 1 }
            }
          }
        ]).toArray(),
        // Month
        emailCampaignLogsCollection.aggregate([
          {
            $match: {
              from_email: { $in: userAccountEmails },
              sent_at: { $gte: monthStart }
            }
          },
          {
            $group: {
              _id: null,
              sent: { $sum: 1 }
            }
          }
        ]).toArray()
      ]),

      // Campaign delivery metrics directly from logs to avoid expensive $lookup
      emailCampaignLogsCollection.aggregate([
        {
          $match: {
            from_email: { $in: userAccountEmails }
          }
        },
        {
          $group: {
            _id: null,
            total_sent: { $sum: 1 },
            total_delivered: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            total_opened: {
              $sum: { $cond: [{ $eq: ['$opened', true] }, 1, 0] }
            },
            total_clicked: {
              $sum: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
            }
          }
        }
      ]).toArray(),

      // Campaign counts without joining large log sets
      Promise.all([
        campaignsCollection.estimatedDocumentCount(),
        campaignsCollection.countDocuments({ status: 'active' })
      ]),

      // Contacts count
      (async () => {
        try {
          const masterLeadsCollection = await getCollection('master_leads', 'sun');
          try {
            return await masterLeadsCollection.countDocuments({
              $or: [
                { deleted_at: null },
                { deleted_at: { $exists: false } }
              ]
            }, { maxTimeMS: 10000 });
          } catch {
            return await masterLeadsCollection.estimatedDocumentCount();
          }
        } catch (e) {
          console.error('Failed to fetch contacts count:', e);
          return 0;
        }
      })(),

      // Companies count
      (async () => {
        try {
          const masterAccountsCollection = await getCollection('master_accounts', 'sun');
          try {
            return await masterAccountsCollection.countDocuments({
              $or: [
                { deleted_at: null },
                { deleted_at: { $exists: false } }
              ]
            }, { maxTimeMS: 10000 });
          } catch {
            return await masterAccountsCollection.estimatedDocumentCount();
          }
        } catch (e) {
          console.error('Failed to fetch companies count:', e);
          return 0;
        }
      })(),

      // Products count
      (async () => {
        try {
          const productsCollection = await getCollection('products', 'central');
          try {
            return await productsCollection.countDocuments({
              $or: [
                { deleted_at: null },
                { deleted_at: { $exists: false } }
              ]
            }, { maxTimeMS: 10000 });
          } catch {
            return await productsCollection.estimatedDocumentCount();
          }
        } catch (e) {
          console.error('Failed to fetch products count:', e);
          return 0;
        }
      })(),

      // Subscriber Statistics
      subscribersCollection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            subscribed: {
              $sum: { $cond: [{ $eq: ['$status', 'subscribed'] }, 1, 0] }
            },
            unsubscribed: {
              $sum: { $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0] }
            }
          }
        }
      ]).toArray(),

      // User Statistics
      usersCollection.aggregate([
        {
          $match: {
            $or: [
              { deleted_at: null },
              { deleted_at: { $exists: false } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: { $cond: [{ $eq: ['$account_status', 'active'] }, 1, 0] }
            }
          }
        }
      ]).toArray()
    ]);

    const todayStats = emailStats[0][0] || { sent: 0, delivered: 0, failed: 0, bounced: 0 };
    const weekStats = emailStats[1][0] || { sent: 0 };
    const monthStats = emailStats[2][0] || { sent: 0 };

    const campaignLogData = campaignLogStats[0] || {
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      total_clicked: 0
    };

    const campaignData = {
      total: campaignCounts?.[0] || 0,
      active: campaignCounts?.[1] || 0,
      total_sent: campaignLogData.total_sent || 0,
      total_delivered: campaignLogData.total_delivered || 0,
      total_opened: campaignLogData.total_opened || 0,
      total_clicked: campaignLogData.total_clicked || 0
    };

    const avgOpenRate = campaignData.total_delivered > 0
      ? ((campaignData.total_opened / campaignData.total_delivered) * 100).toFixed(2)
      : 0;
    
    const avgClickRate = campaignData.total_delivered > 0
      ? ((campaignData.total_clicked / campaignData.total_delivered) * 100).toFixed(2)
      : 0;

    const contactsCount = contactsCountResult || 0;
    const companiesCount = companiesCountResult || 0;
    const productsCount = productsCountResult || 0;

    const subscriberData = subscriberStats[0] || {
      total: 0,
      subscribed: 0,
      unsubscribed: 0
    };

    const userData = userStats[0] || { total: 0, active: 0 };

    // Email Account Statistics
    const accountData = {
      total: userAccounts.length,
      active: userAccounts.filter(acc => acc.status === 'active').length
    };

    return res.status(200).json({
      status: true,
      data: {
        emails: {
          sent_today: todayStats.sent || 0,
          sent_week: weekStats.sent || 0,
          sent_month: monthStats.sent || 0,
          delivered: todayStats.delivered || 0,
          failed: todayStats.failed || 0,
          bounced: todayStats.bounced || 0,
          success_rate: todayStats.sent > 0
            ? (((todayStats.delivered || 0) / todayStats.sent) * 100).toFixed(2)
            : 0
        },
        campaigns: {
          active: campaignData.active || 0,
          total: campaignData.total || 0,
          avg_open_rate: parseFloat(avgOpenRate),
          avg_click_rate: parseFloat(avgClickRate),
          total_sent: campaignData.total_sent || 0
        },
        data: {
          contacts: contactsCount || 0,
          companies: companiesCount || 0,
          products: productsCount || 0,
          subscribers: subscriberData.subscribed || 0
        },
        users: {
          total: userData.total || 0,
          active: userData.active || 0
        },
        accounts: {
          total: accountData.total || 0,
          active: accountData.active || 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch dashboard statistics'
    });
  }
}

