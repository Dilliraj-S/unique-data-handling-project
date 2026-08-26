/**
 * Gmail Pub/Sub Webhook Endpoint
 * 
 * POST /api/webhooks/gmail-push
 * 
 * Receives push notifications from Google Cloud Pub/Sub when
 * a watched Gmail inbox changes. Decodes the notification and
 * enqueues it for processing by gmail-pubsub-worker.
 * 
 * Notification format (from Google):
 * {
 *   message: {
 *     data: base64-encoded JSON { emailAddress, historyId },
 *     messageId: string,
 *     publishTime: string
 *   },
 *   subscription: string
 * }
 * 
 * MUST return 200 quickly (within seconds) or Google will retry.
 * All heavy processing is done async via the queue.
 */

import gmailPubsubQueue from '../../../queues/gmailPubsubQueue';

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notification = req.body;

    // Validate notification structure
    if (!notification || !notification.message || !notification.message.data) {
      console.warn('[gmail-push] Invalid notification structure');
      // Return 200 to prevent Google retries for malformed messages
      return res.status(200).json({ status: 'invalid_notification' });
    }

    // Decode base64 message data
    const data = JSON.parse(
      Buffer.from(notification.message.data, 'base64').toString('utf-8')
    );

    const emailAddress = data.emailAddress;
    const historyId = data.historyId;

    if (!emailAddress || !historyId) {
      console.warn('[gmail-push] Missing emailAddress or historyId in notification');
      return res.status(200).json({ status: 'missing_fields' });
    }

    console.log(`[gmail-push] Notification: ${emailAddress}, historyId: ${historyId}`);

    // Deduplicate: Check if we already have a pending job for this exact historyId
    // This prevents duplicate processing when Google sends multiple notifications
    const dedupeKey = `gmail-push:${emailAddress}:${historyId}`;

    // Enqueue for async processing
    await gmailPubsubQueue.add(
      {
        emailAddress,
        historyId,
        messageId: notification.message.messageId,
        publishTime: notification.message.publishTime,
        receivedAt: new Date().toISOString()
      },
      {
        jobId: dedupeKey, // Deduplication via unique jobId
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 100,
        removeOnFail: 200
      }
    );

    // Return 200 immediately — Google requires quick response
    return res.status(200).json({ status: 'accepted' });

  } catch (error) {
    // If it's a duplicate job ID, that's fine — just acknowledge
    if (error.message && error.message.includes('Job is already')) {
      return res.status(200).json({ status: 'duplicate_ignored' });
    }

    console.error('[gmail-push] Webhook error:', error);
    // Return 200 even on error to prevent Google retries
    return res.status(200).json({ status: 'error_acknowledged' });
  }
}
