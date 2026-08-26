import { getCollection } from '@/lib/mongodb';

/**
 * Email Open Tracking Pixel Endpoint
 * 
 * GET /api/track/open?tid=<tracking_id>&cid=<campaign_id>&sid=<subscriber_id>
 * 
 * Called when a recipient opens an email (their client loads the 1x1 pixel image).
 * - NO authentication required (called from recipient's email client)
 * - Updates email_campaign_logs.tracking_open = 1 and sets tracking_opened_at
 * - Returns a 1x1 transparent GIF
 * - Idempotent: safe to call multiple times (updates opened_at each time)
 */

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export default async function handler(req, res) {
  // Always return the pixel image, even if DB update fails
  // This prevents broken images in emails
  const sendPixel = () => {
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', TRANSPARENT_PIXEL.length);
    // Prevent caching so each open is tracked
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).end(TRANSPARENT_PIXEL);
  };

  if (req.method !== 'GET') {
    return sendPixel();
  }

  try {
    const { tid, cid, sid } = req.query;

    // Validate required params
    if (!tid || !cid) {
      console.warn('[track/open] Missing params:', { tid, cid, sid });
      return sendPixel();
    }

    const logsCollection = await getCollection('email_campaign_logs', 'pluto');

    // Build filter — tracking_id is the primary lookup key
    const filter = { tracking_id: tid };

    // Update tracking_open to 1 and record when it was opened
    const result = await logsCollection.updateOne(
      filter,
      {
        $set: {
          tracking_open: 1,
          tracking_opened_at: new Date(),
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount > 0) {
      console.log(`[track/open] ✅ Recorded open: tid=${tid}, cid=${cid}, sid=${sid}`);

      // Best-effort: update source collection immediately
      try {
        const log = await logsCollection.findOne(filter, {
          projection: { to_email: 1, subscriber_id: 1, campaign_id: 1 }
        });

        if (log && log.subscriber_id) {
          const subscribersCollection = await getCollection('subscribers', 'pluto');
          const subscriber = await subscribersCollection.findOne(
            { id: log.subscriber_id },
            { projection: { source_table: 1, source_system: 1 } }
          );

          if (subscriber?.source_table && subscriber?.source_system) {
            const sourceCollection = await getCollection(subscriber.source_table, subscriber.source_system);
            const email = log.to_email?.toString().toLowerCase().trim();

            if (email) {
              await sourceCollection.updateOne(
                { email },
                {
                  $set: {
                    dls_mailer_status: 'opened',
                    dls_mailer_status_updated_at: new Date()
                  },
                  $push: {
                    dls_mailer_status_history: {
                      $each: [{
                        status: 'opened',
                        campaign_id: log.campaign_id,
                        opened_at: new Date(),
                        source: 'real-time-webhook'
                      }],
                      $slice: -50
                    }
                  },
                  $inc: { dls_mailer_open_count: 1 }
                }
              );
              console.log(`[track/open] 📬 Source updated: ${subscriber.source_system}.${subscriber.source_table} for ${email}`);
            }
          }
        }
      } catch (sourceErr) {
        // Non-fatal: periodic worker will catch this later
        console.warn(`[track/open] ⚠️ Source update failed (non-fatal): ${sourceErr.message}`);
      }
    } else {
      console.warn(`[track/open] ⚠️ No matching log found: tid=${tid}, cid=${cid}`);
    }

  } catch (error) {
    // Log error but still return the pixel (don't break the email)
    console.error('[track/open] Error recording open:', error.message);
  }

  return sendPixel();
}

