/**
 * DispatchDriftSequenceJob - Dispatches the next sequence in a drift email set
 * 
 * This job is called when a sequence completes to dispatch the next sequence
 * based on category filters (replied, unopened, bounced, etc.)
 */

const { MongoClient, ObjectId } = require('mongodb');

class DispatchDriftSequenceJob {
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
    console.log('[DispatchDriftSequence] Connected to MongoDB (pluto)');
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Main dispatch function
   * @param {string} previousSequenceId - ID of the just-completed sequence
   */
  async dispatch(previousSequenceId) {
    try {
      await this.connect();

      const sequencesCol = this.db.collection('drift_sequences');
      const logsCol = this.db.collection('drift_sequence_logs');
      const subscribersCol = this.db.collection('subscribers');
      const emailAccountsCol = this.db.collection('email_accounts');

      // Get the previous sequence
      const prevSeqId = new ObjectId(previousSequenceId);
      const previousSequence = await sequencesCol.findOne({ _id: prevSeqId, deleted_at: null });
      
      if (!previousSequence) {
        console.log(`[DispatchDriftSequence] Previous sequence ${previousSequenceId} not found`);
        return { success: false, reason: 'Previous sequence not found' };
      }

      // Find next sequence in the set
      // Find next sequence in the set
      // Handle potential Type Mismatch (String vs ObjectId)
      const query = {
        set_id: previousSequence.set_id,
        deleted_at: null,
        $or: [
            { previous_sequence_id: prevSeqId }, // ObjectId
            { previous_sequence_id: prevSeqId.toString() } // String
        ]
      };

      const nextSequence = await sequencesCol.findOne(query);

      if (!nextSequence) {
        console.log(`[DispatchDriftSequence] No next sequence found for set ${previousSequence.set_id}`);
        return { success: true, reason: 'No more sequences in set' };
      }

      // Check if next sequence is in dispatchable state
      // 'dispatching' is also valid since the poller sets this status before calling dispatch
      if (!['draft', 'scheduled', 'dispatching'].includes(nextSequence.status)) {
        console.log(`[DispatchDriftSequence] Next sequence ${nextSequence._id} is in ${nextSequence.status} status`);
        return { success: false, reason: `Next sequence is in ${nextSequence.status} status` };
      }

      // CRITICAL: Update status to 'running' IMMEDIATELY to prevent double dispatch
      // The poller runs every second - if we don't update status first,
      // it will find this sequence again while we're still processing
      await sequencesCol.updateOne(
        { _id: nextSequence._id },
        {
          $set: {
            status: 'running',
            started_at: new Date(),
            updated_at: new Date()
          }
        }
      );
      console.log(`[DispatchDriftSequence] Marked sequence ${nextSequence._id} as running to prevent double dispatch`);

      // Current time for scheduling logs
      const now = new Date();

      // =========================================================================
      // BUILD FILTERS FROM LIVE DATA
      // At this point, wait time has already passed (poller triggered us)
      // Bounces have accumulated during the wait period
      // =========================================================================
      if (!previousSequence.filters_frozen) {
        console.log(`[DispatchDriftSequence] Building filters from LIVE data for ${previousSequence._id}...`);
        console.log(`[DispatchDriftSequence] This captures all bounces that arrived during the wait period.`);
        
        // Build filters from LIVE data (emails collection)
        const filters = await this.buildFiltersForSequence(previousSequence);
        
        // Freeze filters in the previous sequence
        await sequencesCol.updateOne(
          { _id: previousSequence._id },
          {
            $set: {
              filters: filters,
              filters_frozen: true,
              filters_frozen_at: new Date(),
              updated_at: new Date()
            }
          }
        );
        
        // Update local copy for use below
        previousSequence.filters = filters;
        previousSequence.filters_frozen = true;
        
        console.log(`[DispatchDriftSequence] Filters frozen: ${filters.length} entries at ${new Date().toISOString()}`);
      } else {
        console.log(`[DispatchDriftSequence] Filters already frozen for ${previousSequence._id} (${previousSequence.filters?.length || 0} entries)`);
      }
      // =========================================================================

      // Get subscribers based on category filters (now using frozen filters)
      const subscribers = await this.getSubscribersForNextSequence(previousSequence, nextSequence);

      if (subscribers.length === 0) {
        console.log(`[DispatchDriftSequence] No subscribers matched for sequence ${nextSequence._id}`);
        
        // Since filters are built at wait time end, if 0 matches then genuinely no bounces
        // Skip the sequence - don't reschedule forever
        console.log(`[DispatchDriftSequence] Filters have 0 matching subscribers. SKIPPING sequence.`);
        
        await sequencesCol.updateOne(
          { _id: nextSequence._id },
          {
            $set: {
              status: 'skipped',
              skipped_reason: 'No recipients matched the selected categories (bounces). Filters were built at wait time end with 0 matches.',
              completed_at: new Date(),
              updated_at: new Date()
            }
          }
        );
        
        // Try to dispatch the next sequence after this one (if any)
        const nextNextSequence = await sequencesCol.findOne({
          previous_sequence_id: nextSequence._id,
          deleted_at: null
        });
        
        if (nextNextSequence) {
          console.log(`[DispatchDriftSequence] Triggering next sequence after skipped: ${nextNextSequence._id}`);
          // Recursively call dispatch for the next sequence
          return await this.dispatch(nextSequence._id.toString());
        }
        
        return { 
          success: true, 
          reason: 'Skipped - no matching subscribers after wait time', 
          status: 'skipped'
        };
      }

      // Get active email accounts
      // from_emails may be stored as JSON string or array
      let fromEmails = nextSequence.from_emails || previousSequence.from_emails || [];
      if (typeof fromEmails === 'string') {
        try {
          fromEmails = JSON.parse(fromEmails);
        } catch (e) {
          console.warn('[DispatchDriftSequence] Failed to parse from_emails JSON:', e);
          // Try splitting by comma as fallback
          fromEmails = fromEmails.split(',').map(e => e.trim()).filter(Boolean);
        }
      }
      if (!Array.isArray(fromEmails)) {
        fromEmails = [];
      }
      
      // Remove duplicates from fromEmails array before querying
      const uniqueFromEmails = [...new Set(fromEmails)];
      
      let emailAccounts = await emailAccountsCol
        .find({ email: { $in: uniqueFromEmails }, status: 'active', deleted_at: null })
        .toArray();
      
      // Remove duplicate accounts (same email) - keep only first occurrence
      // This prevents the same account from being assigned twice
      const uniqueAccounts = [];
      const seenEmails = new Set();
      for (const account of emailAccounts) {
        if (!seenEmails.has(account.email.toLowerCase())) {
          seenEmails.add(account.email.toLowerCase());
          uniqueAccounts.push(account);
        }
      }
      
      // Use unique accounts
      const originalCount = emailAccounts.length;
      emailAccounts = uniqueAccounts;
      
      if (originalCount > uniqueAccounts.length) {
        console.log(`[DispatchDriftSequence] Found ${emailAccounts.length} unique email accounts (removed ${originalCount - uniqueAccounts.length} duplicates)`);
      } else {
        console.log(`[DispatchDriftSequence] Found ${emailAccounts.length} unique email accounts`);
      }

      if (emailAccounts.length === 0) {
        console.log(`[DispatchDriftSequence] No active email accounts for sequence ${nextSequence._id}`);
        
        await sequencesCol.updateOne(
          { _id: nextSequence._id },
          {
            $set: {
              status: 'failed',
              error_message: 'No active email accounts found',
              updated_at: new Date()
            }
          }
        );
        
        return { success: false, reason: 'No active email accounts' };
      }


      // Status already updated to 'running' at start of dispatch to prevent double dispatch

      // Resolve Template ID (It might be an Integer like 9, we need the _id ObjectId)
      // This is CRITICAL - template_id might be stored as integer but needs ObjectId for lookup
      const templatesCol = this.db.collection('templates');
      let resolvedTemplateId = null;
      const rawTemplateId = nextSequence.template_id;
      
      if (rawTemplateId) {
        let templateQuery = {};
        try {
          if (typeof rawTemplateId === 'string' && rawTemplateId.length === 24) {
            // It's already an ObjectId string
            templateQuery = { _id: new ObjectId(rawTemplateId) };
          } else {
            // It's likely a Number/Long - find by id field
            const Long = require('mongodb').Long;
            templateQuery = {
              $or: [
                { id: rawTemplateId },
                { id: parseInt(rawTemplateId) },
                { id: Long.fromNumber(Number(rawTemplateId)) }
              ]
            };
          }
        } catch(e) {
          templateQuery = { id: rawTemplateId };
        }
        
        const templateDoc = await templatesCol.findOne(templateQuery);
        if (templateDoc) {
          resolvedTemplateId = templateDoc._id;
          console.log(`[DispatchDriftSequence] Resolved template_id ${rawTemplateId} to ObjectId ${resolvedTemplateId}`);
        } else {
          console.error(`[DispatchDriftSequence] Template not found for ID: ${rawTemplateId}`);
          await sequencesCol.updateOne(
            { _id: nextSequence._id },
            {
              $set: {
                status: 'failed',
                error_message: `Template not found (ID: ${rawTemplateId})`,
                updated_at: new Date()
              }
            }
          );
          return { success: false, reason: `Template not found (ID: ${rawTemplateId})` };
        }
      } else {
        console.error(`[DispatchDriftSequence] No template_id in sequence ${nextSequence._id}`);
        await sequencesCol.updateOne(
          { _id: nextSequence._id },
          {
            $set: {
              status: 'failed',
              error_message: 'Template ID is required',
              updated_at: new Date()
            }
          }
        );
        return { success: false, reason: 'Template ID is required' };
      }

      // Create logs with round-robin email account assignment
      // Ensure batch_size is respected per account
      const emailAccountCount = emailAccounts.length;
      let subscriberIndex = 0;
      const batchSize = nextSequence.batch_size || previousSequence.batch_size || 10;

      // Track assignments per account to ensure batch_size limit
      const accountAssignments = new Array(emailAccountCount).fill(0);
      const maxPerAccount = batchSize;
      
      // Limit total subscribers to batch_size * account_count
      let subscribersToProcess = subscribers;
      if (batchSize && batchSize > 0) {
        const totalToSend = parseInt(batchSize) * emailAccountCount;
        if (subscribers.length > totalToSend) {
          console.log(`[DispatchDriftSequence] Limiting to ${totalToSend} subscribers (Batch Size: ${batchSize} per account × ${emailAccountCount} accounts)`);
          subscribersToProcess = subscribers.slice(0, totalToSend);
        }
      }

      for (const subscriber of subscribersToProcess) {
        // Use round-robin, but ensure no account exceeds batch_size
        let accountIndex = subscriberIndex % emailAccountCount;
        
        // If current account has reached batch_size, try next account
        if (accountAssignments[accountIndex] >= maxPerAccount) {
          // Find next available account that hasn't reached batch_size
          let found = false;
          for (let i = 0; i < emailAccountCount; i++) {
            const nextIndex = (accountIndex + i + 1) % emailAccountCount;
            if (accountAssignments[nextIndex] < maxPerAccount) {
              accountIndex = nextIndex;
              found = true;
              break;
            }
          }
          // If all accounts are at capacity, skip this subscriber
          if (!found) {
            console.log(`[DispatchDriftSequence] All accounts at capacity (${maxPerAccount} each). Skipping subscriber ${subscriber.email}`);
            subscriberIndex++;
            continue;
          }
        }
        
        const account = emailAccounts[accountIndex];
        accountAssignments[accountIndex]++;

        await logsCol.insertOne({
          sequence_id: nextSequence._id,
          set_id: nextSequence.set_id,
          subscriber_id: subscriber._id,
          email_account_id: account._id,
          template_id: resolvedTemplateId, // Use resolved ObjectId, not raw integer
          status: 'pending',
          scheduled_at: now, // Dispatch called after wait time, so schedule immediately
          batch_size: batchSize,
          created_at: now,
          updated_at: now,
          deleted_at: null
        });

        subscriberIndex++;
      }
      
      // Log account assignment summary
      console.log(`[DispatchDriftSequence] Account assignments:`, emailAccounts.map((acc, idx) => ({
        email: acc.email,
        assigned: accountAssignments[idx]
      })));

      console.log(`[DispatchDriftSequence] Dispatched sequence ${nextSequence._id}: ${subscribers.length} subscribers, ${emailAccounts.length} accounts, Scheduled At: ${now.toISOString()}`);

      return {
        success: true,
        sequence_id: nextSequence._id.toString(),
        subscriber_count: subscribers.length,
        email_account_count: emailAccounts.length
      };

    } catch (error) {
      console.error('[DispatchDriftSequence] Error:', error);
      throw error;
    }
  }

  /**
   * Get subscribers for next sequence based on category filters
   */
  async getSubscribersForNextSequence(previousSequence, nextSequence) {
    const subscribersCol = this.db.collection('subscribers');

    // Parse categories - they may be stored as JSON string or array
    let categories = nextSequence.categories || [];
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (e) {
        console.warn('[DispatchDriftSequence] Failed to parse categories JSON:', e);
        categories = [];
      }
    }
    if (!Array.isArray(categories)) {
      categories = [];
    }

    // If first sequence or no categories, return empty (shouldn't happen for Seq 2+)
    if (categories.length === 0) {
      console.log('[DispatchDriftSequence] No categories specified for next sequence');
      return [];
    }

    // Category mappings (same as BV)
    const categoryMappings = {
      'unsubscribed': ['unsubscribe', 'unsubscribed'],
      'hardbounce': ['hardbounce', 'hard_bounce'],
      'softbounce': ['softbounce', 'soft_bounce'],
      'replied': ['replied'],
      'automatic_reply': ['automatic_reply'],
      'no_longer': ['no_longer', 'nolonger'],
      'opened': ['opened'],
      'unopened': ['unopened', 'sent', 'delivered']
    };

    // Normalize categories
    const normalizedCategories = [];
    for (const cat of categories) {
      const mapping = categoryMappings[cat.toLowerCase()];
      if (mapping) {
        normalizedCategories.push(...mapping);
      }
    }

    // Get filters from previous sequence
    // Filters may be stored as array or null
    let filters = previousSequence.filters || [];
    if (!Array.isArray(filters)) {
      filters = [];
    }

    console.log(`[DispatchDriftSequence] Previous sequence has ${filters.length} filters, looking for categories: ${categories.join(', ')}`);

    // Find matching subscriber emails
    const subscriberEmails = [];
    const matchedEmails = new Set(); // Prevent duplicates
    const statusBreakdown = {}; // Track which statuses are being matched
    
    for (const filterEntry of filters) {
      if (!filterEntry || !filterEntry.status || !filterEntry.email) continue;
      
      const filterStatus = filterEntry.status.toLowerCase().trim();
      
      // Normalize filter status to match category expectations
      // This ensures we match regardless of how the status was stored
      let normalizedFilterStatus = filterStatus;
      
      // Map all possible variations to normalized forms
      if (filterStatus === 'hard_bounce' || filterStatus === 'hardbounce') {
        normalizedFilterStatus = 'hardbounce';
      } else if (filterStatus === 'soft_bounce' || filterStatus === 'softbounce') {
        normalizedFilterStatus = 'softbounce';
      } else if (filterStatus === 'unsubscribe' || filterStatus === 'unsubscribed') {
        normalizedFilterStatus = 'unsubscribed';
      } else if (filterStatus === 'sent' || filterStatus === 'delivered') {
        normalizedFilterStatus = 'unopened';
      }
      // Keep other statuses as-is: 'replied', 'automatic_reply', etc.
      
      // Check if normalized filter status matches any of the normalized categories
      let matched = false;
        for (const cat of normalizedCategories) {
        const normalizedCat = cat.toLowerCase().trim();
        
        // Match exact status (after normalization)
        if (normalizedFilterStatus === normalizedCat) {
          if (!matchedEmails.has(filterEntry.email)) {
            subscriberEmails.push(filterEntry.email);
            matchedEmails.add(filterEntry.email);
            matched = true;
            
            // Track status breakdown
            if (!statusBreakdown[normalizedFilterStatus]) {
              statusBreakdown[normalizedFilterStatus] = 0;
          }
            statusBreakdown[normalizedFilterStatus]++;
            
            break; // Found match, move to next filter
        }
      }
    }
    }
    
    // Log detailed breakdown
    console.log(`[DispatchDriftSequence] Found ${subscriberEmails.length} unique subscriber emails matching categories`);
    console.log(`[DispatchDriftSequence] Status breakdown:`, JSON.stringify(statusBreakdown, null, 2));
    console.log(`[DispatchDriftSequence] Normalized categories being matched:`, normalizedCategories);

    if (subscriberEmails.length === 0) {
      return [];
    }

    // Fetch actual subscriber documents
    const subscribers = await subscribersCol
      .find({
        email: { $in: [...new Set(subscriberEmails)] },
        status: 'subscribed',
        deleted_at: null
      })
      .toArray();

    console.log(`[DispatchDriftSequence] Found ${subscribers.length} subscribers matching categories ${categories.join(', ')}`);

    return subscribers;
  }

  /**
   * Build filters for a completed sequence by reading LIVE data from emails collection.
   * This is called when wait time ends, NOT at sequence completion.
   * This ensures bounces that arrive during the wait period are captured.
   * 
   * @param {Object} sequence - The completed sequence to build filters for
   * @returns {Array} - Array of filter objects { email, status, sequence_id, created_at, updated_at }
   */
  async buildFiltersForSequence(sequence) {
    console.log(`[DispatchDriftSequence] Building filters for sequence ${sequence._id}...`);
    
    const logsCol = this.db.collection('drift_sequence_logs');
    const emailsCol = this.db.collection('emails');
    const subscribersCol = this.db.collection('subscribers');
    const emailAccountsCol = this.db.collection('email_accounts');
    
    // Get all logs for this sequence (sent, failed, etc.)
    const allLogs = await logsCol.find({
      sequence_id: sequence._id,
      deleted_at: null
    }).toArray();
    
    console.log(`[DispatchDriftSequence] Found ${allLogs.length} logs for sequence`);
    
    if (allLogs.length === 0) {
      return [];
    }
    
    // 1. Extract Message IDs from sent logs
    const messageIds = allLogs
      .map(log => log.message_id)
      .filter(id => id);
    
    // 2. Find incoming events (Bounces/Replies) in Emails Collection
    let incomingEvents = [];
    if (messageIds.length > 0) {
      // Clean message IDs for matching
      const cleanMessageIds = messageIds.map(id => id.replace(/[<>]/g, '').trim());
      const allPotentialIds = [...messageIds, ...cleanMessageIds];
      
      // Get account emails for matching automatic replies
      const accountEmails = new Set();
      for (const log of allLogs) {
        if (log.email_account_id) {
          const account = await emailAccountsCol.findOne({ _id: log.email_account_id });
          if (account && account.email) {
            accountEmails.add(account.email.toLowerCase());
          }
        }
      }
      
      // Get subscriber emails for matching bounces & automatic replies
      const subscriberEmails = new Set();
      for (const log of allLogs) {
        if (log.subscriber_id) {
          const subscriber = await subscribersCol.findOne({ _id: log.subscriber_id });
          if (subscriber && subscriber.email) {
            subscriberEmails.add(subscriber.email.toLowerCase());
          }
        }
      }
      
      // Find events by in_reply_to (bounces, replies)
      // CRITICAL: Use 'status' field, NOT 'category' - bounces have category='inbox' but status='hard_bounce'
      const eventsByInReplyTo = await emailsCol.find({
        in_reply_to: { $in: allPotentialIds },
        status: { $in: ['soft_bounce', 'hard_bounce', 'replied', 'unsubscribed', 'automatic_reply'] }
      }).toArray();
      
      // Also find bounces by recipient email (even without in_reply_to)
      // Bounces often don't have proper in_reply_to headers
      const bounceEmails = await emailsCol.find({
        account_email: { $in: Array.from(accountEmails) },
        status: { $in: ['soft_bounce', 'hard_bounce'] },
        received_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).toArray();
      
      // Match bounces to subscribers by extracting recipient email from body/snippet
      const bouncePatterns = [
        /wasn't delivered to\s+([\w\.-]+@[\w\.-]+\.\w+)/i,
        /wasn't delivered to\s+<b>([\w\.-]+@[\w\.-]+\.\w+)<\/b>/i,
        /message to\s+([\w\.-]+@[\w\.-]+\.\w+)\s+couldn/i,
        /message to\s+<b>([\w\.-]+@[\w\.-]+\.\w+)<\/b>/i,
        /couldn't be delivered to\s+([\w\.-]+@[\w\.-]+\.\w+)/i,
        /Recipient.*rejected.*<([\w\.-]+@[\w\.-]+\.\w+)>/i,
        /blocked.*<b>([\w\.-]+@[\w\.-]+\.\w+)<\/b>/i,
        /blocked.*to\s+([\w\.-]+@[\w\.-]+\.\w+)/i
      ];
      
      for (const bounce of bounceEmails) {
        let recipientEmail = null;
        const textToSearch = (bounce.snippet || '') + ' ' + (bounce.body_plain || '');
        
        for (const pattern of bouncePatterns) {
          const match = textToSearch.match(pattern);
          if (match && match[1]) {
            recipientEmail = match[1].toLowerCase();
            break;
          }
        }
        
        // Fallback: Check 'to' field
        if (!recipientEmail && bounce.to) {
          const emailMatch = bounce.to.match(/<(.+?)>/) || bounce.to.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
          recipientEmail = emailMatch ? (emailMatch[1] || emailMatch[0]).toLowerCase() : null;
        }
        
        if (recipientEmail && subscriberEmails.has(recipientEmail)) {
          bounce.matched_recipient = recipientEmail;
          const alreadyFound = eventsByInReplyTo.some(e => e._id.toString() === bounce._id.toString());
          if (!alreadyFound) {
            incomingEvents.push(bounce);
            console.log(`[DispatchDriftSequence] Matched bounce to subscriber: ${recipientEmail} (status: ${bounce.status})`);
          }
        }
      }
      
      // Find automatic replies by subject pattern
      const autoReplyPattern = /(automatic reply|out of office|out of email|auto.?reply|away from office|out of the office)/i;
      const autoRepliesBySubject = await emailsCol.find({
        account_email: { $in: Array.from(accountEmails) },
        $or: [
          { subject: { $regex: autoReplyPattern } },
          { from_name: { $regex: /automatic|auto.?reply/i } }
        ],
        received_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).toArray();
      
      // Add eventsByInReplyTo
      for (const evt of eventsByInReplyTo) {
        const alreadyExists = incomingEvents.some(e => e._id.toString() === evt._id.toString());
        if (!alreadyExists) {
          incomingEvents.push(evt);
        }
      }
      
      // Add automatic replies that match our sequence subject
      for (const autoReply of autoRepliesBySubject) {
        let subjectMatch = false;
        if (sequence.subject && autoReply.subject) {
          subjectMatch = autoReply.subject.toLowerCase().includes(sequence.subject.toLowerCase().substring(0, 30));
        }
        
        if (subjectMatch) {
          let senderEmail = null;
          if (autoReply.from_email) {
            const emailMatch = autoReply.from_email.match(/<(.+?)>/) || autoReply.from_email.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
            senderEmail = emailMatch ? (emailMatch[1] || emailMatch[0]) : autoReply.from_email;
          }
          
          if (senderEmail && subscriberEmails.has(senderEmail.toLowerCase())) {
            autoReply.category = 'automatic_reply';
            autoReply.status = 'automatic_reply';
            autoReply.matched_recipient = senderEmail.toLowerCase();
            incomingEvents.push(autoReply);
          }
        }
      }
      
      console.log(`[DispatchDriftSequence] Found ${eventsByInReplyTo.length} events by in_reply_to, ${autoRepliesBySubject.length} potential auto-replies`);
    }
    
    console.log(`[DispatchDriftSequence] Found ${incomingEvents.length} total incoming events (bounces/replies)`);
    
    // 3. Create lookup maps
    const statusMap = new Map();
    const emailToStatusMap = new Map();
    
    incomingEvents.forEach(email => {
      const eventStatus = email.status || email.category;
      
      if (email.in_reply_to) {
        const key = email.in_reply_to;
        statusMap.set(key, eventStatus);
        if (key.includes('<')) {
          statusMap.set(key.replace(/[<>]/g, '').trim(), eventStatus);
        }
      }
      
      if (['automatic_reply', 'hard_bounce', 'soft_bounce'].includes(eventStatus)) {
        const recipientEmail = email.matched_recipient || email.to || email.from_email;
        if (recipientEmail) {
          let cleanEmail = recipientEmail;
          if (typeof recipientEmail === 'string') {
            const emailMatch = recipientEmail.match(/<(.+?)>/) || recipientEmail.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
            cleanEmail = emailMatch ? (emailMatch[1] || emailMatch[0]) : recipientEmail;
          }
          emailToStatusMap.set(cleanEmail.toLowerCase(), eventStatus);
        }
      }
    });
    
    // 4. Build filters with deduplication
    const statusPriority = {
      'hardbounce': 6, 'hard_bounce': 6,
      'softbounce': 5, 'soft_bounce': 5,
      'unsubscribed': 4,
      'automatic_reply': 3,
      'replied': 2,
      'unopened': 1,
      'sent': 0, 'delivered': 0
    };
    
    const emailToFilter = new Map();
    
    for (const log of allLogs) {
      const subscriber = await subscribersCol.findOne({ _id: log.subscriber_id });
      if (!subscriber) continue;
      
      // Check for incoming event
      let mappedStatus = statusMap.get(log.message_id);
      if (!mappedStatus && log.message_id) {
        mappedStatus = statusMap.get(log.message_id.replace(/[<>]/g, '').trim());
      }
      if (!mappedStatus && subscriber.email) {
        mappedStatus = emailToStatusMap.get(subscriber.email.toLowerCase());
      }
      
      // Determine final status
      let finalStatus = mappedStatus || log.status;
      
      if (!mappedStatus && ['sent', 'delivered'].includes(log.status)) {
        finalStatus = 'unopened';
      } else if (finalStatus === 'hard_bounce') {
        finalStatus = 'hardbounce';
      } else if (finalStatus === 'soft_bounce') {
        finalStatus = 'softbounce';
      } else if (finalStatus === 'unsubscribe') {
        finalStatus = 'unsubscribed';
      }
      
      // Deduplicate by email, keeping highest priority
      const email = subscriber.email.toLowerCase();
      const currentPriority = statusPriority[finalStatus] || 0;
      const existing = emailToFilter.get(email);
      
      if (!existing || currentPriority > existing.priority) {
        emailToFilter.set(email, {
          email: subscriber.email,
          status: finalStatus,
          priority: currentPriority,
          sequence_id: sequence._id,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }
    
    // Convert to array (without priority)
    const filters = [];
    for (const [email, filterData] of emailToFilter) {
      filters.push({
        email: filterData.email,
        status: filterData.status,
        sequence_id: filterData.sequence_id,
        created_at: filterData.created_at,
        updated_at: filterData.updated_at
      });
    }
    
    console.log(`[DispatchDriftSequence] Built ${filters.length} unique filters from ${allLogs.length} logs (deduplicated by email)`);
    
    // Log status breakdown
    const statusBreakdown = {};
    filters.forEach(f => {
      statusBreakdown[f.status] = (statusBreakdown[f.status] || 0) + 1;
    });
    console.log(`[DispatchDriftSequence] Filter status breakdown:`, JSON.stringify(statusBreakdown, null, 2));
    
    return filters;
  }
}

module.exports = DispatchDriftSequenceJob;

