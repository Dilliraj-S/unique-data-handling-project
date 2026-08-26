/**
 * GET /api/central/emailsystem/drift/getRepliedEmails
 * Get replied emails for a sequence
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequence_id } = req.query;

    if (!sequence_id) {
      return res.status(422).json({ error: 'Sequence ID is required' });
    }

    let seqObjectId;
    try {
      seqObjectId = new ObjectId(sequence_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid sequence ID format' });
    }

    const sequencesCollection = await getCollection('drift_sequences', 'pluto');
    const logsCollection = await getCollection('drift_sequence_logs', 'pluto');
    const subscribersCollection = await getCollection('subscribers');
    const emailAccountsCollection = await getCollection('email_accounts');

    // Verify sequence exists
    const sequence = await sequencesCollection.findOne({ _id: seqObjectId, deleted_at: null });
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Get logs with replied status or replies > 0
    const repliedLogs = await logsCollection
      .find({
        sequence_id: seqObjectId,
        $or: [
          { status: 'replied' },
          { replies: { $gt: 0 } }
        ],
        deleted_at: null
      })
      .sort({ replied_at: -1 })
      .toArray();

    // Enrich with subscriber and account info
    const enrichedReplies = await Promise.all(
      repliedLogs.map(async (log) => {
        let subscriber = null;
        let emailAccount = null;

        if (log.subscriber_id) {
          subscriber = await subscribersCollection.findOne({ _id: log.subscriber_id });
        }

        if (log.email_account_id) {
          emailAccount = await emailAccountsCollection.findOne({ _id: log.email_account_id });
        }

        return {
          id: log._id.toString(),
          subscriber: subscriber ? {
            id: subscriber._id.toString(),
            email: subscriber.email,
            first_name: subscriber.first_name || '',
            last_name: subscriber.last_name || ''
          } : null,
          email_account: emailAccount ? {
            id: emailAccount._id.toString(),
            email: emailAccount.email
          } : null,
          status: log.status,
          replies: log.replies || 1,
          sent_at: log.sent_at,
          replied_at: log.replied_at,
          message_id: log.message_id
        };
      })
    );

    return res.status(200).json({
      success: true,
      sequence_id: sequence_id,
      sequence_name: sequence.name,
      replied_count: enrichedReplies.length,
      replies: enrichedReplies
    });
  } catch (error) {
    console.error('[Drift] Error fetching replied emails:', error);
    return res.status(500).json({ error: 'Failed to fetch replied emails: ' + error.message });
  }
}
