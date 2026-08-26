/**
 * SendDriftEmailJob - Sends individual drift emails
 * 
 * Handles email sending via Gmail API or SMTP with:
 * - Distributed Rate Limiting (Redis)
 * - Daily quota enforcement
 * - Placeholder replacement
 * - Status tracking
 * - Error handling and retry
 * - Token Refresh Handling
 */

const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const RedisRateLimiter = require('../RedisRateLimiter');
const GmailUtility = require('../../src/application/Services/GmailUtility');

class SendDriftEmailJob {
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
    console.log('[SendDriftEmail] Connected to MongoDB (pluto)');
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Process a single email log entry
   * @param {string} logId - ID of the drift_sequence_log to process
   */
  async processLog(logId) {
    try {
      await this.connect();

      const logsCol = this.db.collection('drift_sequence_logs');
      const sequencesCol = this.db.collection('drift_sequences');
      const subscribersCol = this.db.collection('subscribers');
      const emailAccountsCol = this.db.collection('email_accounts');
      const templatesCol = this.db.collection('templates');

      const logObjectId = new ObjectId(logId);
      const log = await logsCol.findOne({ _id: logObjectId, deleted_at: null });

      if (!log) {
        console.log(`[SendDriftEmail] Log ${logId} not found`);
        return { success: false, reason: 'Log not found' };
      }

      if (log.status !== 'pending') {
        console.log(`[SendDriftEmail] Log ${logId} is not pending (status: ${log.status})`);
        return { success: false, reason: `Log is in ${log.status} status` };
      }

      // Get related documents
      const sequence = await sequencesCol.findOne({ _id: log.sequence_id });
      const subscriber = await subscribersCol.findOne({ _id: log.subscriber_id });
      const emailAccount = await emailAccountsCol.findOne({ _id: log.email_account_id });
      
      // Resolve template - handle both ObjectId and integer template_id
      // This is CRITICAL for backward compatibility with logs created before the fix
      let template = null;
      if (log.template_id) {
        // Try ObjectId first (new logs after fix)
        if (log.template_id instanceof ObjectId || (typeof log.template_id === 'string' && log.template_id.length === 24)) {
          template = await templatesCol.findOne({ _id: log.template_id instanceof ObjectId ? log.template_id : new ObjectId(log.template_id) });
        }
        
        // If not found, try integer id field (old logs before fix)
        if (!template) {
          const Long = require('mongodb').Long;
          template = await templatesCol.findOne({
            $or: [
              { id: log.template_id },
              { id: parseInt(log.template_id) },
              { id: Long.fromNumber(Number(log.template_id)) }
            ]
          });
          
          // If found by integer id, update the log to use ObjectId for future lookups
          if (template) {
            console.log(`[SendDriftEmail] Resolved template_id ${log.template_id} to ObjectId ${template._id} for log ${logId}`);
            await logsCol.updateOne(
              { _id: log._id },
              { $set: { template_id: template._id } }
            );
          }
        }
      }

      if (!sequence || !subscriber || !emailAccount || !template) {
        console.error(`[SendDriftEmail] Missing data for log ${logId}:`, {
          sequence: !!sequence,
          subscriber: !!subscriber,
          emailAccount: !!emailAccount,
          template: !!template,
          template_id_in_log: log.template_id,
          template_id_type: typeof log.template_id
        });
        await this.updateLogStatus(log._id, 'failed', 'Missing required data');
        return { success: false, reason: 'Missing required data' };
      }

      // Check quota
      const quotaCheck = await this.checkQuota(emailAccount);
      if (!quotaCheck.allowed) {
        console.log(`[SendDriftEmail] Quota exceeded for ${emailAccount.email}`);
        await this.updateLogStatus(log._id, 'pending', 'Quota exceeded, will retry later');
        return { success: false, reason: 'Quota exceeded' };
      }

      // Update status to sending
      await this.updateLogStatus(log._id, 'sending');

      // Generate message ID
      const messageId = `<drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@${
        process.env.APP_DOMAIN || 'localhost'
      }>`;

      // Replace placeholders
      const subject = this.replacePlaceholders(sequence.subject || '', subscriber, emailAccount);
      const content = this.replacePlaceholders(template.content || '', subscriber, emailAccount, sequence._id);

      try {
        // Send email with robust handling (Redis Lock, Retries, Token Refresh)
        const sendResult = await this.sendEmailRobust(
          emailAccount,
          subscriber,
          subject,
          content,
          messageId
        );

        // Update log to sent
        await logsCol.updateOne(
          { _id: log._id },
          {
            $set: {
              status: 'sent',
              message_id: sendResult.messageId || messageId,
              sent_at: new Date(),
              updated_at: new Date()
            }
          }
        );

        console.log(`[SendDriftEmail] Email sent to ${subscriber.email} for sequence ${sequence._id}`);

        // Check if sequence is complete
        await this.checkSequenceCompletion(sequence._id);

        return { success: true, message_id: sendResult.messageId || messageId };

      } catch (sendError) {
        const errorMessage = sendError.message || String(sendError);
        console.error(`[SendDriftEmail] Failed to send to ${subscriber.email}:`, errorMessage);
        
        // Check if this is a quota/rate limit error (should retry later, not fail permanently)
        const isQuotaError = errorMessage.includes('Quota exceeded') || 
                            errorMessage.includes('429') ||
                            errorMessage.toLowerCase().includes('quota') ||
                            errorMessage.toLowerCase().includes('rate limit') ||
                            errorMessage.includes('RESOURCE_EXHAUSTED');
        
        if (isQuotaError) {
          // Keep log as PENDING - will be retried later after cooldown
          console.log(`[SendDriftEmail] ⏸️ Quota error for ${emailAccount.email} - keeping log PENDING for later retry`);
          await this.updateLogStatus(log._id, 'pending', 'Quota exceeded, will retry later');
          return { 
            success: false, 
            reason: 'Quota exceeded', 
            retryLater: true, 
            accountEmail: emailAccount.email 
          };
        }
        
        // For non-quota errors, mark as failed
        await this.updateLogStatus(log._id, 'failed', errorMessage);
        return { success: false, reason: errorMessage };
      }

    } catch (error) {
      console.error('[SendDriftEmail] Error:', error);
      throw error;
    }
  }

  /**
   * Send email to subscriber with Robust Error Handling & Redis Rate Limiting
   * (Mirrors EmailDeliveryService logic)
   */
  async sendEmailRobust(account, subscriber, subject, content, messageIdHeader) {
    const maxRetries = 2; // Only retry for transient errors (not quota)
    let attempt = 0;
    let success = false;
    let errorMessage = null;
    let finalMessageId = messageIdHeader;
    
    // Acquire rate limit lock for this account
    await RedisRateLimiter.acquireLock(account.email);
    
    try {
      // Add delay between emails from same account (use default 1000ms)
      await RedisRateLimiter.addAccountDelay(account.email);
      
      // Check requests per second
      await RedisRateLimiter.checkRateLimit(account.email);

      while (attempt < maxRetries && !success) {
        try {
          if (account.type === 'google' || account.type === 'gmail') {
            console.log(`📤 Sending via Gmail API (attempt ${attempt + 1}) - Account: ${account.email}`);

            const oauth2Client = GmailUtility.setupGoogleClient();
            oauth2Client.setCredentials({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : null
            });

            // Check if token needs refresh
            if (account.token_expiry && new Date(account.token_expiry).getTime() <= Date.now()) {
              console.log(`🔄 Refreshing token for ${account.email}`);
              const { credentials } = await oauth2Client.refreshAccessToken();
              oauth2Client.setCredentials(credentials);
              
              const emailAccountsCol = this.db.collection('email_accounts');
              await emailAccountsCol.updateOne(
                { email: account.email },
                {
                  $set: {
                    access_token: credentials.access_token,
                    token_expiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                    updated_at: new Date()
                  }
                }
              );
              
              account.access_token = credentials.access_token;
              account.token_expiry = credentials.expiry_date;
            }

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            const rawMessage = this.createGmailMessage(
              account.email,
              subscriber.email,
              subject,
              content,
              messageIdHeader
            );

            const sentMessage = await gmail.users.messages.send({
              userId: 'me',
              requestBody: rawMessage
            });

            finalMessageId = sentMessage.data.id || messageIdHeader;
            console.log(`✅ Gmail API email sent: ${finalMessageId}`);

          } else {
            console.log(`📤 Sending via SMTP (attempt ${attempt + 1}) - Account: ${account.email}`);
            
            const transporter = nodemailer.createTransport({
              host: account.outgoing_host || account.smtp_host,
              port: account.outgoing_port || account.smtp_port || 587,
              secure: (account.outgoing_port || account.smtp_port) === 465,
              auth: {
                user: account.email,
                pass: account.password
              }
            });

            const info = await transporter.sendMail({
              from: account.email,
              to: subscriber.email,
              subject: subject,
              html: content,
              messageId: messageIdHeader.replace(/[<>]/g, ''),
              headers: {
                'X-Drift-Sequence-ID': 'true'
              }
            });

            finalMessageId = info.messageId || messageIdHeader;
            console.log(`✅ SMTP email sent: ${finalMessageId}`);
          }

          success = true;

        } catch (error) {
          attempt++;
          errorMessage = error.message || String(error);
          
          // Check for QUOTA errors - throw IMMEDIATELY, no retry
          const isQuotaError = errorMessage.includes('Quota exceeded') || 
                              errorMessage.includes('429') ||
                              errorMessage.toLowerCase().includes('quota') ||
                              errorMessage.toLowerCase().includes('rate limit') ||
                              errorMessage.includes('RESOURCE_EXHAUSTED') ||
                              errorMessage.toLowerCase().includes('too many');

          console.warn(`⚠️ Attempt ${attempt} failed for ${account.email}:`, errorMessage);
          
          if (isQuotaError) {
            // DON'T RETRY quota errors - throw immediately so worker cooldown handles it
            console.log(`🚫 Quota error detected - NOT retrying, will use worker cooldown`);
            throw new Error(`Quota exceeded: ${errorMessage}`);
          }
          
          // Only retry for transient network errors (with short delay)
          if (attempt < maxRetries) {
            const delay = 2000; // 2 second delay for network retries only
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (!success) {
        throw new Error(`Failed after ${maxRetries} attempts: ${errorMessage}`);
      }

      return { messageId: finalMessageId };

    } finally {
      // Always release lock
      await RedisRateLimiter.releaseLock(account.email);
    }
  }

  /**
   * Create Gmail Raw Message (Helper from EmailDeliveryService)
   */
  createGmailMessage(from, to, subject, content, messageId) {
     const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;
     
     const fromClean = from.replace(/[<>]/g, '').trim();
     const toClean = to.replace(/[<>]/g, '').trim();

     let rawMessage = '';
     rawMessage += `From: ${fromClean}\r\n`;
     rawMessage += `To: ${toClean}\r\n`;
     rawMessage += `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
     rawMessage += `Message-ID: ${messageId}\r\n`;
     rawMessage += `MIME-Version: 1.0\r\n`;
     rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
     
     rawMessage += `--${boundary}\r\n`;
     rawMessage += `Content-Type: text/html; charset=UTF-8\r\n`;
     rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
     rawMessage += Buffer.from(content).toString('base64') + '\r\n\r\n';
     rawMessage += `--${boundary}--`;

     const encoded = Buffer.from(rawMessage)
       .toString('base64')
       .replace(/\+/g, '-')
       .replace(/\//g, '_')
       .replace(/=+$/, '');

     return { raw: encoded };
  }

  /**
   * Check email quota
   */
  async checkQuota(emailAccount) {
    const logsCol = this.db.collection('drift_sequence_logs');
    
    // 24-hour rolling window
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentCount = await logsCol.countDocuments({
      email_account_id: emailAccount._id,
      status: 'sent',
      sent_at: { $gte: twentyFourHoursAgo }
    });

    const limit = emailAccount.daily_send_limit || 100;
    
    return {
      allowed: sentCount < limit,
      sent: sentCount,
      limit: limit,
      remaining: Math.max(0, limit - sentCount)
    };
  }

  /**
   * Replace placeholders in content
   */
  replacePlaceholders(content, subscriber, emailAccount, sequenceId = null) {
    const unsubscribeLink = sequenceId 
      ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/unsubscribe/${subscriber._id}/${sequenceId}`
      : '#unsubscribe';

    const replacements = {
      '[first_name]': subscriber.first_name || '',
      '[last_name]': subscriber.last_name || '',
      '[email]': subscriber.email || '',
      '[unsubscribe_link]': unsubscribeLink,
      '[sender_email]': emailAccount.email || '',
      '[sender_first_name]': emailAccount.first_name || '',
      '[sender_last_name]': emailAccount.last_name || ''
    };

    let result = content;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.split(placeholder).join(value);
    }

    return result;
  }

  /**
   * Update log status
   */
  async updateLogStatus(logId, status, errorMessage = null) {
    const logsCol = this.db.collection('drift_sequence_logs');
    
    const update = {
      status: status,
      updated_at: new Date()
    };

    if (errorMessage) {
      update.error_message = errorMessage;
    }

    if (status === 'failed') {
      update.failed_at = new Date();
    }

    await logsCol.updateOne({ _id: logId }, { $set: update });
  }

  /**
   * Check if sequence is complete and schedule next sequence
   * 
   * IMPORTANT: This method does NOT call dispatch() immediately.
   * Instead, it schedules Sequence 2 for (completion_time + wait_time).
   * The poller will pick it up when wait time ends.
   * 
   * This ensures filters are built AT WAIT TIME END, capturing all bounces
   * that arrive during the wait period.
   */
  async checkSequenceCompletion(sequenceId) {
    const logsCol = this.db.collection('drift_sequence_logs');
    const sequencesCol = this.db.collection('drift_sequences');

    // Count pending logs
    const pendingCount = await logsCol.countDocuments({
      sequence_id: sequenceId,
      status: 'pending',
      deleted_at: null
    });

    if (pendingCount === 0) {
      console.log(`[SendDriftEmail] Sequence ${sequenceId} pending count is 0. Marking as completed...`);
      
      // Get current sequence to read wait_time
      const currentSequence = await sequencesCol.findOne({ _id: sequenceId });
      if (!currentSequence) {
        console.log(`[SendDriftEmail] Sequence ${sequenceId} not found. Cannot schedule next.`);
        return;
      }
      
      // Mark current sequence as completed (filters NOT frozen yet)
      const completedAt = new Date();
      await sequencesCol.updateOne(
        { _id: sequenceId },
        {
          $set: {
            status: 'completed',
            completed_at: completedAt,
            updated_at: new Date(),
            filters_frozen: false  // Will be frozen when wait time ends
          }
        }
      );

      console.log(`[SendDriftEmail] Sequence ${sequenceId} completed at ${completedAt.toISOString()}`);

      // Find next sequence (Sequence 2, 3, etc.)
      const nextSequence = await sequencesCol.findOne({
        previous_sequence_id: sequenceId,
        deleted_at: null
      });

      if (!nextSequence) {
        console.log(`[SendDriftEmail] No next sequence found. Campaign complete.`);
        return;
      }

      // Calculate scheduled time = now + wait_time
      // Bounces will accumulate during this wait period
      const waitTime = currentSequence.wait_time || 0;
      const waitUnit = currentSequence.wait_unit || 'minutes';
      
      let multiplier = 60 * 1000; // default minutes
      if (waitUnit === 'hours') multiplier = 60 * 60 * 1000;
      if (waitUnit === 'days') multiplier = 24 * 60 * 60 * 1000;
      if (waitUnit === 'seconds') multiplier = 1000;
      
      const delayMs = waitTime * multiplier;
      const scheduledAt = new Date(completedAt.getTime() + delayMs);

      console.log(`[SendDriftEmail] Scheduling next sequence ${nextSequence._id} for ${scheduledAt.toISOString()} (wait: ${waitTime} ${waitUnit})`);
      console.log(`[SendDriftEmail] Bounces will accumulate during wait. Filters will freeze at scheduled time.`);

      // Schedule next sequence - DO NOT dispatch now!
      // The poller will pick this up when scheduled_at <= now
      // At that point, DispatchDriftSequenceJob.dispatch() will:
      // 1. Build filters from LIVE data (including bounces arrived during wait)
      // 2. Freeze filters
      // 3. Send to matched subscribers
      await sequencesCol.updateOne(
        { _id: nextSequence._id },
        {
          $set: {
            status: 'scheduled',
            scheduled_at: scheduledAt,
            updated_at: new Date()
          }
        }
      );

      console.log(`[SendDriftEmail] Next sequence scheduled. Poller will dispatch at ${scheduledAt.toISOString()}`);
    }
  }
}

module.exports = SendDriftEmailJob;

