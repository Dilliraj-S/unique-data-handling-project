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
    console.log('📧 Send Email Request:', JSON.stringify({
      method: req.method,
      body: req.body,
      user: user ? { user_id: user.user_id, username: user.username } : 'No user'
    }, null, 2));

    const {
      campaign_id,
      from_emails,
      subject,
      time_gap = 1,
      assignment_mode = 'batch_size',
      batch_size = 2,
      manual_assignments = {}
    } = req.body;

    // Validation
    if (!campaign_id) {
      console.error('❌ Validation failed: Campaign ID is required');
      return res.status(400).json({
        status: false,
        message: 'Campaign ID is required'
      });
    }

    if (!from_emails || !Array.isArray(from_emails) || from_emails.length === 0) {
      console.error('❌ Validation failed: At least one from email is required', { from_emails });
      return res.status(400).json({
        status: false,
        message: 'At least one from email is required'
      });
    }

    if (!subject || !subject.trim()) {
      console.error('❌ Validation failed: Subject is required', { subject });
      return res.status(400).json({
        status: false,
        message: 'Subject is required'
      });
    }

    const campaignsCollection = await getCollection('campaigns', 'pluto');
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
    if (!userId) {
      console.error('❌ No user ID found:', { user });
      return res.status(400).json({
        status: false,
        message: `Invalid user ID: user ID is missing`,
        debug: { user }
      });
    }
    
    // Convert to string if needed (for backward compatibility)
    const userIdString = String(userId);
    
    console.log('📧 Send Email - User Info:', JSON.stringify({
      user_id: userId,
      user_id_string: userIdString,
      user_type: typeof userId,
      from_emails: from_emails,
      user_object: user
    }, null, 2));
    
    if (!userIdString || userIdString === 'undefined' || userIdString === 'null') {
      console.error('❌ Invalid user ID after conversion:', { userId, userIdString, user });
      return res.status(400).json({
        status: false,
        message: `Invalid user ID format: ${userIdString}`,
        debug: { userId, userIdString, user }
      });
    }
    
    // Query email accounts - only accounts belonging to the current user
    const activeAccounts = await emailAccountsCollection.find({
      email: { $in: from_emails },
      status: 'active',
      user_id: userIdString  // String user_id (e.g., "USR_ADMIN_001")
    }).toArray();
    
    console.log('📧 Found accounts for user:', JSON.stringify({
      count: activeAccounts.length,
      user_id: userIdString,
      accounts: activeAccounts.map(a => ({ email: a.email, status: a.status, user_id: a.user_id }))
    }, null, 2));

    if (activeAccounts.length === 0) {
      // Get all accounts for debugging
      const allAccounts = await emailAccountsCollection.find({
        email: { $in: from_emails }
      }).toArray();
      
      const errorDetails = {
        selected_emails: from_emails,
        user_id: userIdString,
        all_accounts: allAccounts.map(a => ({ email: a.email, status: a.status, user_id: a.user_id }))
      };
      
      console.error('❌ No active email accounts found:', JSON.stringify(errorDetails, null, 2));
      
      const errorMessage = `No active email accounts available for the selected emails. Found ${allAccounts.length} accounts (${allAccounts.filter(a => a.status !== 'active').length} inactive). Selected emails: ${from_emails.join(', ')}`;
      
      console.error('❌ Returning 400 error:', errorMessage);
      
      return res.status(400).json({
        status: false,
        message: errorMessage,
        debug: {
          selected_emails: from_emails,
          found_accounts: allAccounts.map(a => ({ email: a.email, status: a.status, user_id: a.user_id })),
          user_id: userIdString
        }
      });
    }

    const missingAccounts = from_emails.filter(
      email => !activeAccounts.some(acc => acc.email === email)
    );
    if (missingAccounts.length > 0) {
      const errorMessage = `These email accounts are inactive or unavailable: ${missingAccounts.join(', ')}. Available accounts: ${activeAccounts.map(a => a.email).join(', ')}`;
      console.error('❌ Missing accounts error:', errorMessage);
      return res.status(400).json({
        status: false,
        message: errorMessage
      });
    }

    // ============================================
    // BULK EMAIL SYSTEM: Daily Limit Management
    // ============================================
    // Calculate available capacity based on daily send limits
    // Use 24-hour rolling window for true rate limiting (prevents rapid re-sending)
    const emailCampaignLogsCollectionForCapacity = await getCollection('email_campaign_logs', 'pluto');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const batchSizeNum = Number(batch_size);
    const isBatchSizeMode = assignment_mode === 'batch_size';

    // Get sent count for each account (last 24 hours)
    // IMPORTANT: For batch_size mode, batch_size is the TARGET per account
    // We allow batch_size to be sent even if it exceeds remaining daily capacity
    // (The dispatcher will respect daily limits during actual sending)
    // NOTE: Always read daily_send_limit from database - it's set via mailconfig.js
    const DEFAULT_DAILY_SEND_LIMIT = parseInt(process.env.DEFAULT_DAILY_SEND_LIMIT, 10) || 500;
    const accountCapacity = await Promise.all(activeAccounts.map(async (acc) => {
      // Read daily_send_limit from database (set via mailconfig.js)
      // This ensures consistency with worker and dispatcher
      const dailyLimit = acc.daily_send_limit || DEFAULT_DAILY_SEND_LIMIT;
      const sentToday = await emailCampaignLogsCollectionForCapacity.countDocuments({
        from_email: acc.email,
        status: 'sent',
        sent_at: { $gte: twentyFourHoursAgo }
      });
      const available = Math.max(0, dailyLimit - sentToday);
      
      // For batch_size mode: Use batch_size as target (dispatcher will cap at daily limit)
      // For manual mode: Use available capacity
      const targetCapacity = isBatchSizeMode && batchSizeNum > 0
        ? batchSizeNum  // Use batch_size as target, dispatcher will respect daily limits
        : available;
      
      return {
        email: acc.email,
        account: acc,
        dailyLimit,
        sentToday,
        available,
        targetCapacity  // Target capacity (batch_size or available)
      };
    }));
    
    // Total capacity: sum of target capacities (batch_size per account in batch_size mode)
    const totalAvailableCapacity = accountCapacity.reduce(
      (sum, acc) => sum + acc.targetCapacity,
      0
    );
    
    // Warn if batch_size exceeds daily limit OR available capacity for any account
    const capacityWarnings = [];
    if (isBatchSizeMode && batchSizeNum > 0) {
      accountCapacity.forEach(acc => {
        if (batchSizeNum > acc.dailyLimit) {
          const warning = `batch_size (${batchSizeNum}) exceeds daily limit (${acc.dailyLimit}) for account ${acc.email}. Will be capped at daily limit.`;
          console.warn(`⚠️ ${warning}`);
          capacityWarnings.push({ email: acc.email, type: 'exceeds_daily_limit', message: warning });
        }
        if (batchSizeNum > acc.available) {
          const warning = `batch_size (${batchSizeNum}) exceeds available capacity (${acc.available}) for account ${acc.email}. Account already sent ${acc.sentToday} emails today. Will send only ${acc.available} emails.`;
          console.warn(`⚠️ ${warning}`);
          capacityWarnings.push({ 
            email: acc.email, 
            type: 'insufficient_capacity', 
            message: warning,
            available: acc.available,
            sentToday: acc.sentToday,
            dailyLimit: acc.dailyLimit
          });
        }
      });
    }

    console.log('📊 Daily Capacity Analysis:', JSON.stringify({
      totalAccounts: activeAccounts.length,
      totalAvailableCapacity,
      totalSubscribers: subscriberCount,
      accountDetails: accountCapacity.map(acc => ({
        email: acc.email,
        dailyLimit: acc.dailyLimit,
        sentToday: acc.sentToday,
        available: acc.available,
        targetCapacity: acc.targetCapacity,
        expectedTotal: isBatchSizeMode ? batchSizeNum : acc.available,
        actualCapacity: Math.min(acc.targetCapacity, acc.available),
        canSendFullBatch: isBatchSizeMode ? (acc.available >= batchSizeNum) : true,
        note: isBatchSizeMode 
          ? `Target: ${acc.targetCapacity} (batch_size), Available: ${acc.available}${acc.available < batchSizeNum ? ` - WARNING: Will send only ${acc.available} (account already sent ${acc.sentToday} today)` : ''}` 
          : `Available: ${acc.available}`
      })),
      capacityWarnings: capacityWarnings
    }, null, 2));

    // Validate capacity based on assignment mode
    // For batch_size mode: Respect daily limits - only assign up to available capacity
    // For manual_assign mode: Validate manual assignments don't exceed available capacity
    if (assignment_mode === 'manual_assign') {
      const totalManualCapacity = activeAccounts.reduce((sum, acc) => {
        const allowed = Number(manual_assignments[acc.email] || 0);
        return sum + (allowed > 0 ? allowed : 0);
      }, 0);

      if (totalManualCapacity > totalAvailableCapacity) {
        const errorMessage = `Manual assignments total ${totalManualCapacity} emails, but only ${totalAvailableCapacity} available capacity across all accounts today. Please reduce manual assignments or wait for quota reset.`;
        console.error('❌ Manual assignment exceeds available capacity:', JSON.stringify({
          totalManualCapacity,
          totalAvailableCapacity,
          accountCapacity: accountCapacity.map(acc => ({
            email: acc.email,
            available: acc.available,
            manual: manual_assignments[acc.email] || 0
          }))
        }, null, 2));
        return res.status(400).json({
          status: false,
          message: errorMessage
        });
      }

      // Manual assignments don't need to cover ALL subscribers.
      // The dispatcher will only send to the assigned count and skip the rest.
      if (totalManualCapacity < subscriberCount) {
        console.log(`ℹ️ Manual assignments (${totalManualCapacity}) < total subscribers (${subscriberCount}). Only ${totalManualCapacity} emails will be sent.`);
      }
    }
    
    // Determine how many subscribers to send to
    let subscribersToSendCount = subscriberCount;
    let sendingStrategy = 'all'; // 'all' or 'limited'

    // For manual_assign mode: only send the manually assigned count
    if (assignment_mode === 'manual_assign') {
      const manualTotal = activeAccounts.reduce((sum, acc) => {
        return sum + (Number(manual_assignments[acc.email] || 0));
      }, 0);
      if (manualTotal > 0 && manualTotal < subscriberCount) {
        subscribersToSendCount = manualTotal;
        sendingStrategy = 'limited';
        console.log(`📧 Manual assign mode: Will dispatch ${manualTotal} emails out of ${subscriberCount} subscribers.`);
      }
    }

    // For batch_size mode: DO NOT slice subscribers here.
    // The DispatchCampaignJob already enforces batch_size per account (lines 436-536).
    // Slicing here was causing 44,517 subscribers to be silently dropped.
    // Let the dispatcher read ALL subscribers and handle capacity management.
    if (assignment_mode === 'batch_size') {
      // Calculate estimated days needed (based on target capacity)
      const estimatedDays = totalAvailableCapacity > 0 ? Math.ceil(subscriberCount / totalAvailableCapacity) : 1;
      console.log('📧 Batch size mode - Distribution info:', JSON.stringify({
        subscribersCount: subscriberCount,
        subscribersToSendToday: subscriberCount,
        activeAccountsCount: activeAccounts.length,
        batch_size: batch_size,
        totalAvailableCapacity,
        estimatedDays: estimatedDays,
        sendingStrategy: 'all',
        note: `All ${subscriberCount} subscribers will be passed to dispatcher. Dispatcher will enforce batch_size (${batch_size}) per account.`
      }, null, 2));
    }

    // ============================================
    // MULTI-DAY RESUME: Count already-sent subscribers
    // ============================================
    // Check if this campaign was previously dispatched (partial send on Day 1, etc.)
    // This data is used for: (1) resume metadata, (2) accurate progress display
    const emailCampaignLogsForResume = await getCollection('email_campaign_logs', 'pluto');
    const alreadySentCount = await emailCampaignLogsForResume.countDocuments({
      campaign_id: Long.fromNumber(Number(campaign_id)),
      status: 'sent'
    });
    const alreadyFailedCount = await emailCampaignLogsForResume.countDocuments({
      campaign_id: Long.fromNumber(Number(campaign_id)),
      status: 'failed'
    });
    const isResume = alreadySentCount > 0 || alreadyFailedCount > 0;
    const remainingToSend = Math.max(0, subscriberCount - alreadySentCount - alreadyFailedCount);

    if (isResume) {
      console.log(`📢 RESUME DETECTED for campaign ${campaign_id}: ${alreadySentCount} already sent, ${alreadyFailedCount} already failed, ${remainingToSend} remaining`);
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

    // total_emails = total subscribers (the authoritative count for progress calculation)
    // pending_emails = 0 initially (dispatcher will update after creating log entries — BUG #7 fix)
    const totalEmailsInCampaign = subscriberCount;
    
    await campaignProgressCollection.insertOne({
      id: nextProgressNumericId,
      progress_id: progressId,
      campaign_id: Long.fromNumber(Number(campaign_id)),
      from_email: from_emails.join(','),
      assignment_mode: assignment_mode,
      manual_assignments: assignment_mode === 'manual_assign' ? JSON.stringify(manual_assignments || {}) : null,
      batch_size: batch_size ? String(batch_size) : null,
      total_emails: subscriberCount, // Full subscriber count (lightweight countDocuments)
      sent_emails: 0,
      failed_emails: 0,
      pending_emails: 0, // Dispatcher will set this after creating log entries
      sending_emails: 0,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      campaign_metadata: {
        total_subscribers: subscriberCount,
        already_sent_before_dispatch: alreadySentCount,
        already_failed_before_dispatch: alreadyFailedCount,
        remaining_to_send: remainingToSend,
        is_resume: isResume,
        subscribers_sent_today: 0,
        remaining_subscribers: remainingToSend,
        estimated_days: totalAvailableCapacity > 0 ? Math.ceil(remainingToSend / totalAvailableCapacity) : 1,
        sending_strategy: sendingStrategy
      }
    });

    // ============================================
    // HIGH-PERFORMANCE DISPATCHER MODE
    // ============================================
    // Instead of creating individual jobs, dispatch a single campaign job
    // The dispatcher will handle cursor-based reading and job creation
    const emailDeliveryQueue = new Queue('Email Delivery', {
      redis: { host: 'localhost', port: 6379 }
    });

    // Dispatch campaign job (producer-consumer pattern)
    // The dispatcher will read subscribers in chunks and create email jobs
    await emailDeliveryQueue.add('dispatch-campaign', {
      campaign_id: campaign_id,
      from_emails: from_emails,
      subject: subject,
      progress_id: progressId,
      assignment_mode: assignment_mode,
      batch_size: batch_size,
      manual_assignments: manual_assignments
    }, {
      attempts: 1, // Dispatcher should not retry (manual retry if needed)
      removeOnComplete: true,
      removeOnFail: false
    });

    console.log('✅ Campaign dispatch job queued. Dispatcher will process subscribers in chunks.');

    // Update campaign status
    await campaignsCollection.updateOne(
      { id: Long.fromNumber(Number(campaign_id)) },
      { $set: { status: 'Sending', updated_at: new Date() } }
    );

    // Calculate summary information
    const estimatedDays = totalAvailableCapacity > 0 ? Math.ceil(subscriberCount / totalAvailableCapacity) : 1;
    const remainingSubscribers = subscriberCount - subscribersToSendCount;
    
    // Calculate assigned subscribers based on batch_size and accounts
    let assignedSubscribers = 0;
    if (assignment_mode === 'batch_size') {
      // For batch_size mode, calculate how many will be assigned per round
      const emailsPerRound = batch_size * activeAccounts.length;
      assignedSubscribers = Math.min(subscribersToSendCount, emailsPerRound);
    } else {
      // For manual_assign mode, use the manual assignments total
      assignedSubscribers = Object.values(manual_assignments || {}).reduce((sum, count) => sum + (Number(count) || 0), 0);
    }
    
    // Check if any accounts can't send full batch_size
    const accountsWithInsufficientCapacity = accountCapacity.filter(acc => 
      isBatchSizeMode && batchSizeNum > 0 && acc.available < batchSizeNum
    );
    
    let warningMessage = null;
    if (accountsWithInsufficientCapacity.length > 0) {
      warningMessage = `⚠️ Warning: ${accountsWithInsufficientCapacity.length} account(s) don't have enough capacity for batch_size (${batchSizeNum}). They will send less: ${accountsWithInsufficientCapacity.map(acc => `${acc.email}: ${acc.available}`).join(', ')}`;
    }

    // Build response message based on resume state
    let responseMessage;
    if (isResume) {
      responseMessage = `Campaign resumed! ${alreadySentCount} already sent in previous dispatches. Dispatching remaining ${remainingToSend} subscribers.`;
    } else if (sendingStrategy === 'limited') {
      responseMessage = `Campaign dispatch started! Dispatcher will process ${subscribersToSendCount} subscribers for today. ${remainingSubscribers} remaining will be sent over ${estimatedDays} days.`;
    } else {
      responseMessage = `Campaign dispatch started! Dispatcher will process all ${subscriberCount} subscribers.`;
    }

    return res.status(200).json({
      status: true,
      message: responseMessage,
      campaign_id: campaign_id,
      progress_id: progressId,
      total_subscribers: subscriberCount,
      is_resume: isResume,
      already_sent_previously: alreadySentCount,
      remaining_to_send: remainingToSend,
      assigned_subscribers: assignedSubscribers,
      subscribers_sent_today: subscribersToSendCount,
      subscribers_to_dispatch: subscribersToSendCount,
      remaining_subscribers: remainingSubscribers,
      active_accounts: activeAccounts.map(acc => acc.email),
      assignment_mode: assignment_mode,
      batch_size: batch_size,
      total_available_capacity: totalAvailableCapacity,
      estimated_days: estimatedDays,
      account_capacity: accountCapacity.map(acc => ({
        email: acc.email,
        daily_limit: acc.dailyLimit,
        sent_today: acc.sentToday,
        available: acc.available,
        expected_total: isBatchSizeMode ? batchSizeNum : acc.available,
        can_send_full_batch: isBatchSizeMode ? (acc.available >= batchSizeNum) : true
      })),
      capacity_warnings: capacityWarnings,
      warning_message: warningMessage,
      sending_strategy: sendingStrategy,
      dispatch_mode: 'high-performance',
      note: 'Campaign is being dispatched in chunks. Check progress in campaign progress section.'
    });

  } catch (error) {
    console.error('❌ Failed to start email campaign:', JSON.stringify({
      error: error.message,
      stack: error.stack,
      body: req.body,
      user: user ? { user_id: user.user_id, username: user.username } : 'No user'
    }, null, 2));
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to start campaign'
    });
  }
}

