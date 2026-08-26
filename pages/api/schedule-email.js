import { authMiddleware } from '../../src/server/Http/Middleware/auth';
import { getCollection } from '../../src/lib/mongodb';
import { Long } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
const Queue = require('bull');

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    const {
      campaign_id,
      from_emails,
      subject,
      scheduled_at,
      timezone,
      time_gap = 1,
      assignment_mode = 'batch_size',
      batch_size = 2,
      manual_assignments = {}
    } = req.body;

    // Validation
    if (!campaign_id) {
      return res.status(400).json({
        status: false,
        message: 'Campaign ID is required'
      });
    }

    if (!from_emails || !Array.isArray(from_emails) || from_emails.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'At least one from email is required'
      });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        status: false,
        message: 'Subject is required'
      });
    }

    if (!scheduled_at) {
      return res.status(400).json({
        status: false,
        message: 'Scheduled time is required'
      });
    }

    if (!timezone) {
      return res.status(400).json({
        status: false,
        message: 'Timezone is required'
      });
    }

    // Validate scheduled time is in the future
    const scheduledDateTime = new Date(scheduled_at);
    if (scheduledDateTime <= new Date()) {
      return res.status(400).json({
        status: false,
        message: 'Scheduled time must be in the future'
      });
    }

    const db = await getCollection('campaigns', 'pluto');
    const campaignsCollection = db;
    const campaign = await campaignsCollection.findOne({
      id: Long.fromNumber(Number(campaign_id))
    });

    if (!campaign) {
      return res.status(404).json({
        status: false,
        message: 'Campaign not found'
      });
    }

    // Get template
    const templatesCollection = await getCollection('templates', 'pluto');
    const template = await templatesCollection.findOne({
      id: campaign.template_id
    });

    if (!template) {
      return res.status(404).json({
        status: false,
        message: 'Template not found'
      });
    }

    // Get audience and subscribers
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const audience = await audiencesCollection.findOne({
      id: campaign.audience_id
    });

    if (!audience) {
      return res.status(404).json({
        status: false,
        message: 'Audience not found'
      });
    }

    const subscribersCollection = await getCollection('subscribers', 'pluto');
    const subscriberCount = await subscribersCollection.countDocuments({
      audience_id: campaign.audience_id,
      status: { $in: ['subscribed', 'active'] }
    });

    if (subscriberCount === 0) {
      return res.status(400).json({
        status: false,
        message: 'No subscribed subscribers found for this campaign'
      });
    }

    // Get active email accounts
    const emailAccountsCollection = await getCollection('email_accounts', 'pluto');
    const userId = user.user_id || user.id;
    
    // Build user_id query - handle both string and numeric IDs
    // user_id is now a string (e.g., "USR_ADMIN_001") - no conversion needed
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        status: false,
        message: `Invalid user ID format: ${userId}`
      });
    }
    
    // Query email accounts - only accounts belonging to the current user
    const activeAccounts = await emailAccountsCollection.find({
      email: { $in: from_emails },
      status: 'active',
      user_id: userId  // String user_id (e.g., "USR_ADMIN_001")
    }).toArray();
    
    console.log('📧 Schedule Email - Found accounts for user:', JSON.stringify({
      count: activeAccounts.length,
      user_id: userId,
      accounts: activeAccounts.map(a => ({ email: a.email, status: a.status, user_id: a.user_id }))
    }, null, 2));

    if (activeAccounts.length === 0) {
      // Get all accounts for debugging
      const allAccounts = await emailAccountsCollection.find({
        email: { $in: from_emails }
      }).toArray();
      
      return res.status(400).json({
        status: false,
        message: `No active email accounts available for the selected emails. Found ${allAccounts.length} accounts (${allAccounts.filter(a => a.status !== 'active').length} inactive). Selected emails: ${from_emails.join(', ')}`,
        debug: {
          selected_emails: from_emails,
          found_accounts: allAccounts.map(a => ({ email: a.email, status: a.status, user_id: a.user_id })),
          user_id: userId
        }
      });
    }

    const missingAccounts = from_emails.filter(
      email => !activeAccounts.some(acc => acc.email === email)
    );
    if (missingAccounts.length > 0) {
      return res.status(400).json({
        status: false,
        message: `These email accounts are inactive or unavailable: ${missingAccounts.join(', ')}. Available accounts: ${activeAccounts.map(a => a.email).join(', ')}`
      });
    }

    // Compute theoretical max capacity, but DO NOT hard-block scheduling if audience is larger.
    // We will schedule up to available capacity; extra subscribers will simply not be scheduled.
    let totalCapacity = 0;
    if (assignment_mode === 'batch_size') {
      totalCapacity = activeAccounts.length * Number(batch_size);  
    } else {
      totalCapacity = activeAccounts.reduce((sum, acc) => {
        const allowed = Number(manual_assignments[acc.email] || 0);
        return sum + (allowed > 0 ? allowed : 0);
      }, 0);
    }

    if (totalCapacity < subscriberCount) {
      console.warn(
        `⚠️ schedule-email: audience larger than capacity. ` +
        `Capacity=${totalCapacity}, subscribers=${subscriberCount}. ` +
        `Will schedule only the first ${totalCapacity} subscribers according to assignment rules.`
      );
    }

    // Create progress record
    const progressId = uuidv4();
    const campaignProgressCollection = await getCollection('campaign_progress', 'pluto');
    
    // Atomic counter for progress ID — O(1), race-safe
    const countersCollection = await getCollection('counters', 'pluto');
    const progressCounterDoc = await countersCollection.findOneAndUpdate(
      { _id: 'campaign_progress' },
      { $inc: { seq: Long.fromNumber(1) } },
      { upsert: true, returnDocument: 'after' }
    );
    const nextProgressNumericId = Long.fromNumber(
      progressCounterDoc.seq instanceof Long
        ? progressCounterDoc.seq.toNumber()
        : Number(progressCounterDoc.seq)
    );

    await campaignProgressCollection.insertOne({
      id: nextProgressNumericId,
      progress_id: progressId,
      campaign_id: Long.fromNumber(Number(campaign_id)),
      from_email: from_emails.join(','),
      assignment_mode: assignment_mode || 'batch_size',
      manual_assignments: assignment_mode === 'manual_assign' ? JSON.stringify(manual_assignments || {}) : null,
      batch_size: batch_size ? String(batch_size) : null,
      total_emails: subscriberCount,
      sent_emails: 0,
      failed_emails: 0,
      pending_emails: 0, // Dispatcher will set this after creating log entries (BUG #7 fix)
      sending_emails: 0,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      scheduled_at: scheduledDateTime,
      timezone: timezone,
      // campaign_metadata needed by progress.js for correct progress denominator (BUG #3 fix)
      campaign_metadata: {
        total_subscribers: subscriberCount,
        subscribers_sent_today: 0,
        remaining_subscribers: subscriberCount,
        estimated_days: totalCapacity > 0 ? Math.ceil(subscriberCount / totalCapacity) : 1,
        sending_strategy: totalCapacity >= subscriberCount ? 'all' : 'limited'
      }
    });

    // HIGH-PERFORMANCE DISPATCHER MODE FOR SCHEDULED CAMPAIGNS
    // Mirror non-scheduled flow: enqueue one 'dispatch-campaign' job.
    // When it runs (after delay), DispatchCampaignJob will create per-subscriber
    // 'send-email' jobs with delay 0, and RedisRateLimiter controls speed.
    const emailDeliveryQueue = new Queue('Email Delivery', {
      redis: { host: 'localhost', port: 6379 }
    });

    // Calculate delay until scheduled time
    const delayUntilScheduled = Math.max(0, scheduledDateTime.getTime() - Date.now());

    await emailDeliveryQueue.add('dispatch-campaign', {
      campaign_id: campaign_id,
      from_emails: from_emails,
      subject: subject,
      progress_id: progressId,
      assignment_mode: assignment_mode,
      batch_size: batch_size,
      manual_assignments: manual_assignments
    }, {
      delay: delayUntilScheduled,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false
    });

    // Update campaign status
    await campaignsCollection.updateOne(
      { id: Long.fromNumber(Number(campaign_id)) },
      { 
        $set: { 
          status: 'Scheduled',
          scheduled_at: scheduledDateTime,
          timezone: timezone,
          updated_at: new Date() 
        } 
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Campaign scheduled successfully',
      campaign_id: campaign_id,
      progress_id: progressId,
      scheduled_at: scheduledDateTime.toISOString(),
      total_subscribers: subscriberCount,
      assigned_subscribers: subscriberCount,
      active_accounts: activeAccounts.map(acc => acc.email),
      batch_size: batch_size
    });

  } catch (error) {
    console.error('Failed to schedule email campaign:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to schedule campaign'
    });
  }
}

