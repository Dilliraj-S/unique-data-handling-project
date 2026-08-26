/**
 * TrackDriftRepliesJob - Tracks email replies for drift sequences
 * 
 * Monitors Gmail inbox for replies to sent drift emails
 * and updates the logs accordingly
 */

const { MongoClient, ObjectId } = require('mongodb');
const { google } = require('googleapis');

class TrackDriftRepliesJob {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (this.client) return;
    
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db('pluto');
    console.log('[TrackDriftReplies] Connected to MongoDB (pluto)');
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Track replies for a specific sequence
   * @param {string} sequenceId - ID of the sequence to track
   */
  async trackForSequence(sequenceId) {
    try {
      await this.connect();

      const sequencesCol = this.db.collection('drift_sequences');
      const logsCol = this.db.collection('drift_sequence_logs');
      const emailAccountsCol = this.db.collection('email_accounts');

      const seqObjectId = new ObjectId(sequenceId);
      const sequence = await sequencesCol.findOne({ _id: seqObjectId, deleted_at: null });

      if (!sequence) {
        console.log(`[TrackDriftReplies] Sequence ${sequenceId} not found`);
        return { success: false, reason: 'Sequence not found' };
      }

      // Get sent logs for this sequence
      const sentLogs = await logsCol.find({
        sequence_id: seqObjectId,
        status: 'sent',
        deleted_at: null
      }).toArray();

      if (sentLogs.length === 0) {
        console.log(`[TrackDriftReplies] No sent logs for sequence ${sequenceId}`);
        return { success: true, replies_found: 0 };
      }

      // Group logs by email account
      const logsByAccount = {};
      for (const log of sentLogs) {
        const accountId = log.email_account_id.toString();
        if (!logsByAccount[accountId]) {
          logsByAccount[accountId] = [];
        }
        logsByAccount[accountId].push(log);
      }

      let totalReplies = 0;

      // Check replies for each email account
      for (const [accountId, logs] of Object.entries(logsByAccount)) {
        const emailAccount = await emailAccountsCol.findOne({ 
          _id: new ObjectId(accountId),
          deleted_at: null 
        });

        if (!emailAccount) continue;

        // Only Gmail accounts can track replies
        if (emailAccount.type !== 'google' && emailAccount.type !== 'gmail') {
          console.log(`[TrackDriftReplies] Skipping non-Gmail account ${emailAccount.email}`);
          continue;
        }

        try {
          const replies = await this.checkGmailReplies(emailAccount, logs);
          totalReplies += replies;
        } catch (error) {
          console.error(`[TrackDriftReplies] Error checking replies for ${emailAccount.email}:`, error.message);
        }
      }

      console.log(`[TrackDriftReplies] Found ${totalReplies} replies for sequence ${sequenceId}`);

      return { success: true, replies_found: totalReplies };

    } catch (error) {
      console.error('[TrackDriftReplies] Error:', error);
      throw error;
    }
  }

  /**
   * Check Gmail for replies to sent emails
   */
  async checkGmailReplies(emailAccount, logs) {
    const logsCol = this.db.collection('drift_sequence_logs');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: emailAccount.access_token,
      refresh_token: emailAccount.refresh_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let repliesFound = 0;

    for (const log of logs) {
      if (!log.message_id) continue;

      // Clean message ID for search
      const messageId = log.message_id.replace(/[<>]/g, '').trim();

      try {
        // Search for replies in Gmail
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: `in:inbox rfc822msgid:${messageId}`,
          maxResults: 10
        });

        const messages = response.data.messages || [];

        for (const message of messages) {
          // Get full message to check headers
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['In-Reply-To', 'References', 'From']
          });

          const headers = fullMessage.data.payload?.headers || [];
          
          let inReplyTo = '';
          let references = '';
          let fromEmail = '';

          for (const header of headers) {
            if (header.name.toLowerCase() === 'in-reply-to') {
              inReplyTo = header.value;
            }
            if (header.name.toLowerCase() === 'references') {
              references = header.value;
            }
            if (header.name.toLowerCase() === 'from') {
              fromEmail = header.value;
            }
          }

          // Check if this is a reply to our message
          if (inReplyTo.includes(messageId) || references.includes(messageId)) {
            // Update log with reply info
            await logsCol.updateOne(
              { _id: log._id },
              {
                $inc: { replies: 1 },
                $set: {
                  status: 'replied',
                  replied_at: new Date(),
                  reply_from: fromEmail,
                  updated_at: new Date()
                }
              }
            );

            repliesFound++;
            console.log(`[TrackDriftReplies] Found reply from ${fromEmail} to ${log.message_id}`);
          }
        }
      } catch (error) {
        console.error(`[TrackDriftReplies] Error checking message ${log.message_id}:`, error.message);
      }
    }

    return repliesFound;
  }

  /**
   * Track replies for all running sequences
   */
  async trackAllRunning() {
    try {
      await this.connect();

      const sequencesCol = this.db.collection('drift_sequences');
      
      // Get sequences that need reply tracking (sent within last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const sequences = await sequencesCol.find({
        status: { $in: ['running', 'completed'] },
        started_at: { $gte: sevenDaysAgo },
        deleted_at: null
      }).toArray();

      console.log(`[TrackDriftReplies] Tracking replies for ${sequences.length} sequences`);

      let totalReplies = 0;

      for (const sequence of sequences) {
        const result = await this.trackForSequence(sequence._id.toString());
        if (result.success) {
          totalReplies += result.replies_found;
        }
      }

      return { success: true, sequences_checked: sequences.length, total_replies: totalReplies };

    } catch (error) {
      console.error('[TrackDriftReplies] Error tracking all:', error);
      throw error;
    }
  }
}

module.exports = TrackDriftRepliesJob;
