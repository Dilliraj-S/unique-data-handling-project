/**
 * Gmail One-Click Unsubscribe Endpoint
 * 
 * POST /api/unsubscribe-post
 * 
 * Called by Gmail's one-click unsubscribe feature when the user clicks
 * the "Unsubscribe" button in Gmail UI. This works because outgoing emails
 * include:
 *   List-Unsubscribe: <https://yourdomain.com/api/unsubscribe-post?token={subscriberToken}>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 * 
 * Gmail sends a POST request with body: List-Unsubscribe=One-Click
 * 
 * Also handles direct unsubscribe via token in query string.
 * No authentication required — the token itself is the auth.
 */

import { getCollection } from '../../src/lib/mongodb';
import { Long } from 'mongodb';

export default async function handler(req, res) {
  // Accept both GET and POST (Gmail uses POST, manual links may use GET)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    // Token can come from query string or POST body
    const token = req.query.token || req.body?.token;

    if (!token) {
      return res.status(400).json({
        status: false,
        message: 'Unsubscribe token is required'
      });
    }

    console.log(`📧 Unsubscribe request received for token: ${token}`);

    const subscribersCollection = await getCollection('subscribers', 'pluto');

    // Find subscriber by tracking_id or numeric ID
    let subscriber = null;

    // Try tracking_id first (primary lookup)
    subscriber = await subscribersCollection.findOne({ tracking_id: token });

    // Fallback: try as numeric ID
    if (!subscriber) {
      const numericId = Number(token);
      if (!isNaN(numericId) && numericId > 0) {
        subscriber = await subscribersCollection.findOne({
          id: Long.fromNumber(numericId)
        });
      }
    }

    if (!subscriber) {
      console.warn(`⚠️ Unsubscribe: subscriber not found for token: ${token}`);
      // Return 200 even for not-found to comply with RFC 8058
      // (Gmail expects 200 response regardless)
      return res.status(200).json({
        status: true,
        message: 'Unsubscribe processed'
      });
    }

    const now = new Date();

    // Update subscriber status
    await subscribersCollection.updateOne(
      { _id: subscriber._id },
      {
        $set: {
          status: 'unsubscribed',
          unsubscribed_at: now,
          suppressed: true,
          suppressed_at: now,
          suppression_reason: 'unsubscribe',
          updated_at: now
        }
      }
    );

    // Add to suppressed_emails collection
    const suppressedCollection = await getCollection('suppressed_emails', 'pluto');
    const normalizedEmail = subscriber.email.toLowerCase().trim();

    await suppressedCollection.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          reason: 'unsubscribe',
          source_campaign_id: null,  // One-click doesn't carry campaign context
          source_subscriber_id: subscriber.id || null,
          dsn_code: null,
          dsn_status: null,
          suppressed_at: now,
          unsuppressed_at: null,
          active: true,
          updated_at: now
        },
        $setOnInsert: {
          email: normalizedEmail,
          created_at: now
        }
      },
      { upsert: true }
    );

    // Clear Redis cache for this email (if Redis is available)
    try {
      const Redis = require('ioredis');
      const redis = new Redis({ host: 'localhost', port: 6379, lazyConnect: true });
      await redis.connect();
      await redis.set(`suppressed:${normalizedEmail}`, '1', 'EX', 86400);
      await redis.disconnect();
    } catch (redisErr) {
      // Non-fatal
    }

    console.log(`✅ Unsubscribed: ${subscriber.email} (token: ${token})`);

    // Return 200 OK — Gmail requires this per RFC 8058
    return res.status(200).json({
      status: true,
      message: 'Successfully unsubscribed',
      email: subscriber.email
    });

  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    // Still return 200 to Gmail (RFC 8058 compliance)
    return res.status(200).json({
      status: true,
      message: 'Unsubscribe processed'
    });
  }
}
