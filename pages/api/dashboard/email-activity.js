import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * Email Activity Chart API
 * GET /api/dashboard/email-activity?period=7d|30d|90d
 * Returns email activity data for charts
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
  const period = req.query.period || '7d';

  try {
    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    
    if (period === '7d') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === '90d') {
      startDate.setDate(now.getDate() - 90);
    } else {
      startDate.setDate(now.getDate() - 7);
    }
    
    startDate.setHours(0, 0, 0, 0);

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
          labels: [],
          datasets: {
            sent: [],
            delivered: [],
            failed: [],
            bounced: []
          }
        }
      });
    }

    // Get email logs grouped by date
    const emailCampaignLogsCollection = await getCollection('email_campaign_logs', 'pluto');
    
    const logs = await emailCampaignLogsCollection.aggregate([
      {
        $match: {
          from_email: { $in: userAccountEmails },
          sent_at: { $gte: startDate }
        }
      },
      {
        $project: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$sent_at'
            }
          },
          status: 1
        }
      },
      {
        $group: {
          _id: '$date',
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
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();

    // Generate all dates in range
    const labels = [];
    const sentData = [];
    const deliveredData = [];
    const failedData = [];
    const bouncedData = [];

    const dateMap = {};
    logs.forEach(log => {
      dateMap[log._id] = log;
    });

    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const formattedDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      labels.push(formattedDate);
      
      const dayData = dateMap[dateStr] || { sent: 0, delivered: 0, failed: 0, bounced: 0 };
      sentData.push(dayData.sent || 0);
      deliveredData.push(dayData.delivered || 0);
      failedData.push(dayData.failed || 0);
      bouncedData.push(dayData.bounced || 0);
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.status(200).json({
      status: true,
      data: {
        labels,
        datasets: {
          sent: sentData,
          delivered: deliveredData,
          failed: failedData,
          bounced: bouncedData
        }
      }
    });

  } catch (error) {
    console.error('❌ Email activity chart error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch email activity data'
    });
  }
}

