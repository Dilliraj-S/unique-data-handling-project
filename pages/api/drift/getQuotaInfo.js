/**
 * GET /api/central/emailsystem/drift/getQuotaInfo
 * Get quota information for all email accounts
 */
import { getCollection } from '../../../src/lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const emailAccountsCollection = await getCollection('email_accounts');
    const logsCollection = await getCollection('drift_sequence_logs', 'pluto');

    // Get all active email accounts
    const accounts = await emailAccountsCollection
      .find({ status: 'active', deleted_at: null })
      .project({ _id: 1, email: 1, daily_send_limit: 1, first_name: 1, last_name: 1 })
      .toArray();

    // Calculate sent count in last 24 hours for each account
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let totalLimit = 0;
    let totalUsed = 0;

    const accountsWithUsage = await Promise.all(
      accounts.map(async (account) => {
        const sentCount = await logsCollection.countDocuments({
          email_account_id: account._id,
          status: 'sent',
          sent_at: { $gte: twentyFourHoursAgo }
        });

        const dailyLimit = account.daily_send_limit || 100;
        totalLimit += dailyLimit;
        totalUsed += sentCount;

        return {
          id: account._id.toString(),
          email: account.email,
          first_name: account.first_name || '',
          last_name: account.last_name || '',
          daily_send_limit: dailyLimit,
          sent_in_last_24h: sentCount,
          remaining: Math.max(0, dailyLimit - sentCount)
        };
      })
    );

    return res.status(200).json({
      success: true,
      accounts: accountsWithUsage,
      total_limit: totalLimit,
      total_used: totalUsed,
      total_remaining: Math.max(0, totalLimit - totalUsed)
    });
  } catch (error) {
    console.error('[Drift] Error fetching quota info:', error);
    return res.status(500).json({ error: 'Failed to fetch quota info: ' + error.message });
  }
}
