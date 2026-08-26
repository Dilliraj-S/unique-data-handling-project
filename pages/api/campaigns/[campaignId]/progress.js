import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';
import { Long } from 'mongodb';

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    console.error('Auth error in campaign progress:', error);
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get campaignId from query params (Next.js dynamic route)
    // In Next.js, dynamic route segments are available in req.query
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      console.error('Campaign progress: Missing campaignId in query:', req.query);
      return res.status(400).json({
        status: false,
        message: 'Campaign ID is required'
      });
    }

    console.log('Campaign progress request:', { campaignId, user: user?.user_id || user?.id });

    const emailCampaignLogsCollection = await getCollection('email_campaign_logs', 'pluto');
    const campaignsCollection = await getCollection('campaigns', 'pluto');
    const campaignProgressCollection = await getCollection('campaign_progress', 'pluto');

    // Get batch_size from campaign_progress FIRST (needed for filtering)
    // CRITICAL: Get latest progress record to filter by progress_id
    const progress = await campaignProgressCollection.findOne({
      campaign_id: Long.fromNumber(Number(campaignId))
    }, {
      sort: { created_at: -1 } // Get latest progress record
    });

    // CRITICAL FIX: Filter by progress_id to only count emails from the latest dispatch
    // This prevents counting duplicate dispatches (e.g., if campaign was dispatched twice)
    // If progress_id exists, only count emails with that progress_id
    // If no progress_id (legacy campaigns), count all emails for the campaign
    const progressIdFilter = progress?.progress_id 
      ? { progress_id: progress.progress_id }
      : { progress_id: { $exists: false } };

    // Optional flag to skip heavy per-account aggregation for lightweight polling
    const includeDetails = req.query.light !== 'true';

    // Get stats from email_campaign_logs - FILTERED BY PROGRESS_ID
    // CRITICAL: Only count emails from the latest progress_id to prevent duplicate counting
    const stats = await emailCampaignLogsCollection.aggregate([
      {
        $match: {
          campaign_id: Long.fromNumber(Number(campaignId)),
          ...progressIdFilter
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          opened: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'sent'] }, { $eq: ['$tracking_open', 1] }] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          sending: {
            $sum: { $cond: [{ $eq: ['$status', 'sending'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const statsData = stats[0] || {
      total: 0,
      sent: 0,
      opened: 0,
      failed: 0,
      pending: 0,
      sending: 0
    };

    // Progress record already retrieved above (moved before stats aggregation)

    // Per-account stats (live monitoring) - FILTERED BY PROGRESS_ID
    // These are relatively expensive aggregations, so allow disabling them for "light" polling.
    let perAccount = [];
    if (includeDetails) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      perAccount = await emailCampaignLogsCollection.aggregate([
        {
          $match: {
            campaign_id: Long.fromNumber(Number(campaignId)),
            ...progressIdFilter
          }
        },
        {
          $group: {
            _id: '$from_email',
            total: { $sum: 1 },
            sent: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            sending: {
              $sum: { $cond: [{ $eq: ['$status', 'sending'] }, 1, 0] }
            },
            daily_sent: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'sent'] },
                      { $gte: ['$sent_at', startOfDay] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            last_sent_at: { $max: '$sent_at' },
            last_error: { $max: '$error_message' }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray();
    }

    // Progress record already retrieved above (moved before per-account stats)

    // Get batch_size (keep as string for schema compliance, but convert to number for API response)
    const batchSizeString = progress?.batch_size || null;
    const batchSizeNumber = batchSizeString ? Number(batchSizeString) : null;

    // Get failed details - FILTERED BY PROGRESS_ID
    let failedDetails = [];
    if (includeDetails) {
      failedDetails = await emailCampaignLogsCollection.find({
        campaign_id: Long.fromNumber(Number(campaignId)),
        status: 'failed',
        ...progressIdFilter
      }, {
        projection: {
          to_email: 1,
          error_message: 1,
          retry_attempts: 1
        },
        limit: 50
      }).toArray();
    }

    // BUG #5 FIX: Completion requires ALL subscribers to be processed, not just dispatched jobs.
    // Use total_subscribers from campaign_metadata as the authoritative count.
    const totalSubscribers = progress?.campaign_metadata?.total_subscribers || progress?.total_emails || 0;
    const logsProcessed = (statsData.sent || 0) + (statsData.failed || 0);
    const totalLogsCreated = statsData.total || 0;
    
    // CRITICAL FIX: Prevent false "Completed" when dispatcher creates fewer logs than totalSubscribers.
    //
    // Previous bug: noActiveWorkIsReal checked logsProcessed >= totalLogsCreated.
    // If dispatcher only created 621 logs out of 1489 subscribers (batch_size cap),
    // 621 >= 621 = true → campaign marked "Completed" with 870 emails never sent!
    //
    // NEW LOGIC:
    // - When totalSubscribers IS known (> 0): Use ONLY allAccountedFor.
    //   Campaign is complete ONLY when logsProcessed >= totalSubscribers.
    //   This guarantees every subscriber is accounted for.
    //
    // - When totalSubscribers is NOT known (legacy, = 0): Fall back to noActiveWork.
    //   Complete when pending=0 AND sending=0 AND all created logs are processed.
    const allAccountedFor = totalSubscribers > 0 && logsProcessed >= totalSubscribers;
    
    // Fallback for legacy campaigns only (no totalSubscribers in metadata)
    const noActiveWork = statsData.pending === 0 && statsData.sending === 0;
    const noActiveWorkIsReal = noActiveWork && totalLogsCreated > 0 
      && logsProcessed > 0 && logsProcessed >= totalLogsCreated;
    
    const hasStarted = statsData.total > 0;
    const isScheduledAndWaiting =
      (progress?.status === 'Scheduled' || progress?.status === 'pending')
      && !hasStarted;
    
    // Use allAccountedFor when we know totalSubscribers; noActiveWorkIsReal only for legacy
    const completionCondition = totalSubscribers > 0
      ? allAccountedFor
      : noActiveWorkIsReal;
    
    const isCompleted =
      hasStarted && !isScheduledAndWaiting && statsData.sending === 0
      && completionCondition && logsProcessed > 0;
    const overallStatus = isCompleted
      ? (statsData.failed > 0 ? 'Completed (With Errors)' : 'Completed')
      : (statsData.sent > 0 || statsData.sending > 0 ? 'Sending' : 'Pending');

    // Update campaign_progress table
    // NOTE: Only update fields that are in the schema to avoid validation errors
    const updateTimestamp = new Date();
    if (progress) {
      // Check if campaign just completed (for completion time tracking)
      const wasCompleted = progress.status === 'Completed' || progress.status === 'Completed (With Errors)';
      const justCompleted = isCompleted && !wasCompleted;
      
      // BUG #2 FIX: Do NOT overwrite total_emails with statsData.total (log count).
      // total_emails was set correctly by send-email.js to total subscriber count.
      // Only update live counters (sent, failed, pending, sending).
      const updateData = {
        sent_emails: parseInt(statsData.sent || 0, 10),
        failed_emails: parseInt(statsData.failed || 0, 10),
        pending_emails: parseInt(statsData.pending || 0, 10),
        sending_emails: parseInt(statsData.sending || 0, 10),
        batch_size: batchSizeString, // Must be string or null for schema compliance
        updated_at: updateTimestamp,
        status: overallStatus
      };
      
      try {
        await campaignProgressCollection.updateOne(
          { campaign_id: Long.fromNumber(Number(campaignId)) },
          { $set: updateData }
        );
        
        // If campaign just completed, store completion time in metadata (if metadata exists and is flexible)
        // Note: This might fail if metadata field has strict validation, but we'll try
        if (justCompleted && progress.campaign_metadata) {
          try {
            await campaignProgressCollection.updateOne(
              { campaign_id: Long.fromNumber(Number(campaignId)) },
              { $set: { 'campaign_metadata.completed_at': updateTimestamp } }
            );
          } catch (metadataError) {
            // Ignore metadata update errors - completion time will use updated_at
            console.warn('Could not store completion time in metadata:', metadataError.message);
          }
        }
      } catch (updateError) {
        console.error('Error updating campaign_progress:', updateError);
        // Log the error details for debugging
        if (updateError.message && updateError.message.includes('validation')) {
          console.error('Validation error details:', {
            updateData,
            error: updateError.message,
            stack: updateError.stack
          });
        }
        throw updateError; // Re-throw to be caught by outer try-catch
      }
    }

    // Keep campaigns table in sync
    await campaignsCollection.updateOne(
      { id: Long.fromNumber(Number(campaignId)) },
      {
        $set: {
          status: overallStatus,
          updated_at: new Date()
        }
      }
    );

    // Get completion time for API response
    // Since completed_at is not in schema, we use updated_at when status is "Completed" as a proxy
    let finalCompletedAt = null;
    if (isCompleted) {
      // If campaign is completed, use updated_at as completion time
      // After update, updated_at will be the current timestamp
      // First check if metadata has completion time stored
      if (progress?.campaign_metadata?.completed_at) {
        finalCompletedAt = progress.campaign_metadata.completed_at;
      } else {
        // Use the update timestamp (which is now the updated_at value)
        finalCompletedAt = updateTimestamp;
      }
    }

    // MULTI-DAY RESUME: Get cumulative sent count across ALL dispatches for this campaign
    // For single-dispatch campaigns, this equals statsData.sent → no difference
    let cumulativeSent = statsData.sent || 0;
    const isResumeDispatch = progress?.campaign_metadata?.is_resume;
    if (isResumeDispatch) {
      const cumulativeResult = await emailCampaignLogsCollection.aggregate([
        {
          $match: {
            campaign_id: Long.fromNumber(Number(campaignId)),
            status: 'sent'
            // NO progressIdFilter → counts ALL dispatches
          }
        },
        { $group: { _id: null, total: { $sum: 1 } } }
      ]).toArray();
      cumulativeSent = cumulativeResult[0]?.total || statsData.sent || 0;
    }

    return res.status(200).json({
      // BUG #3 FIX: Use total_subscribers (full subscriber count) as the progress denominator.
      // This ensures progress = sent / total_subscribers, not sent / dispatched_count.
      total: totalSubscribers,
      sent: statsData.sent || 0,
      cumulative_sent: cumulativeSent,
      opened: statsData.opened || 0,
      unopened: Math.max(0, (statsData.sent || 0) - (statsData.opened || 0)),
      failed: statsData.failed || 0,
      pending: statsData.pending || 0,
      sending: statsData.sending || 0,
      batch_size: batchSizeNumber, // Return as number for frontend
      status: overallStatus,
      completed_at: finalCompletedAt,
      is_resume: isResumeDispatch || false,
      already_sent_previously: progress?.campaign_metadata?.already_sent_before_dispatch || 0,
      per_account_stats: perAccount.map(account => ({
        from_email: account._id || 'Unknown',
        total: account.total || 0,
        sent: account.sent || 0,
        failed: account.failed || 0,
        pending: account.pending || 0,
        sending: account.sending || 0,
        daily_sent: account.daily_sent || 0,
        last_sent_at: account.last_sent_at || null,
        last_error: account.last_error || null
      })),
      failed_details: failedDetails.map(detail => ({
        to_email: detail.to_email || 'N/A',
        error_message: detail.error_message || 'N/A',
        retry_attempts: detail.retry_attempts || 0
      }))
    });

  } catch (error) {
    console.error('Failed to fetch campaign progress:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch progress'
    });
  }
}

