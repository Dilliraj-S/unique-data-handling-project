/**
 * POST /api/central/emailsystem/drift/send
 * Start sending a drift email sequence
 * 
 * SMART EXECUTION:
 * If a user tries to start Sequence N, but Sequence N-1 (dependency) is not complete,
 * this API automatically backtracks to find the earliest pending ancestor and starts THAT instead.
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sequence_id,
      name,
      template_id,
      audience_id,
      subject,
      from_emails,
      time_gap,
      batch_size,
      wait_time,
      wait_unit,
      sequence_number = 1,
      assignment_mode = 'batch_size',
      manual_assignments,
      categories,
      set_id
    } = req.body;

    // Validation
    if (!sequence_id) {
      return res.status(422).json({ error: 'Sequence ID is required' });
    }

    if (!template_id) {
      return res.status(422).json({ error: 'Template ID is required' });
    }

    if (!from_emails || !Array.isArray(from_emails) || from_emails.length === 0) {
      return res.status(422).json({ error: 'At least one From Email is required' });
    }

    if (!subject) {
      return res.status(422).json({ error: 'Subject is required' });
    }

    let seqObjectId;
    try {
      seqObjectId = new ObjectId(sequence_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid sequence ID format' });
    }

    const sequencesCollection = await getCollection('drift_sequences', 'pluto');
    const logsCollection = await getCollection('drift_sequence_logs', 'pluto');
    const subscribersCollection = await getCollection('subscribers', 'pluto');
    const emailAccountsCollection = await getCollection('email_accounts', 'pluto');

    // --- SMART BACKTRACKING LOGIC ---
    // Check if we need to start an earlier sequence instead
    let targetSequenceId = seqObjectId;
    let didBacktrack = false;
    let originalSequenceName = name; // For UI message
    let targetSequenceName = name;

    try {
        const { ancestorId, ancestorName, pathChanged } = await findEarliestPendingAncestor(seqObjectId, sequencesCollection);
        if (pathChanged) {
            targetSequenceId = ancestorId;
            targetSequenceName = ancestorName;
            didBacktrack = true;
            console.log(`[Drift Smart Exec] Backtracking: Requested ${sequence_id} (${name}) -> Starting ${targetSequenceId} (${targetSequenceName})`);
        }
    } catch (err) {
        console.error('[Drift Smart Exec] Error in backtracking:', err);
        // Fallback to original requested sequence if logic fails
    }

    // Get the FINAL target sequence
    const sequence = await sequencesCollection.findOne({ _id: targetSequenceId, deleted_at: null });
    if (!sequence) {
      return res.status(404).json({ error: 'Target sequence not found' });
    }

    // Check if already running
    if (['running', 'sending'].includes(sequence.status)) {
       // If we backtracked, maybe it's already running?
       if (didBacktrack) {
           return res.status(200).json({ 
               success: true, 
               message: `Sequence "${targetSequenceName}" (dependency for "${originalSequenceName}") is already running.`,
               status: 'running' 
            });
       }
      return res.status(422).json({ error: 'Sequence is already running' });
    }

    // Get active email accounts
    // Remove duplicates from from_emails array
    const uniqueFromEmails = [...new Set(from_emails)];
    
    let emailAccounts = await emailAccountsCollection
      .find({ email: { $in: uniqueFromEmails }, status: 'active' })
      .toArray();
    
    // Remove duplicate accounts (same email) - keep only first occurrence
    // This prevents the same account from being assigned twice, which causes batch_size doubling
    const uniqueAccounts = [];
    const seenEmails = new Set();
    for (const account of emailAccounts) {
      if (!seenEmails.has(account.email.toLowerCase())) {
        seenEmails.add(account.email.toLowerCase());
        uniqueAccounts.push(account);
      }
    }
    
    emailAccounts = uniqueAccounts;
    
    console.log(`[Drift Send] Found ${emailAccounts.length} unique email accounts (removed ${emailAccounts.length - uniqueAccounts.length} duplicates)`);

    if (emailAccounts.length === 0) {
      return res.status(422).json({ error: 'No active email accounts found for the selected From Emails' });
    }

    let subscribers = [];

    // NOTE: Logic below uses 'sequence' (the TARGET one), not necessarily the request body params (which might be for the CHILD)
    // We should reload critical params from the target sequence if we backtracked.
    // However, the request body usually comes from the UI form of the *clicked* sequence.
    // If we backtrack to Seq 1, we need Seq 1's config (Audience, Template, etc.)
    // SAFETY: If we backtracked, we MUST rely on the DB data for that sequence, NOT the request body.
    
    // Check if target is "Sequence 1" (no previous sequence)
    const isFirstSequence = !sequence.previous_sequence_id;

    if (isFirstSequence) {
      // Sequence 1: Get subscribers from audience
      // If backtracked, use DB audience_id. If not, prefer request body (latest edit)
      const targetAudienceId = didBacktrack ? sequence.audience_id : (audience_id || sequence.audience_id);

      if (!targetAudienceId) {
        return res.status(422).json({ error: 'Audience is required for Sequence 1' });
      }

      // FIX: Audience ID is stored as Long/Int in legacy BV style, not always ObjectId
      // We try both to be safe: As ObjectId (if valid 24 hex) OR as exact value (Long/Int)
      let queryAudienceId = targetAudienceId;
      try {
          // If it looks like an ObjectId, try casting.
          if (typeof targetAudienceId === 'string' && targetAudienceId.length === 24) {
             queryAudienceId = new ObjectId(targetAudienceId);
          }
      } catch (e) {
          // Keep as is
      }
      
      console.log(`[Drift Debug] Querying Subs for Audience ID: ${targetAudienceId} (Type: ${typeof targetAudienceId})`);

      subscribers = await subscribersCollection
        .find({ audience_id: queryAudienceId, status: { $in: ['subscribed', 'active'] }, deleted_at: null })
        .toArray();
      
      // Fallback: If 0 found, maybe it's a Long vs Number mismatch?
      if (subscribers.length === 0) {
           console.log('[Drift Debug] 0 subscribers found. Retrying with Long/String variants...');
           // Try Long matching if it was a number
           const Long = require('mongodb').Long;
           subscribers = await subscribersCollection.find({ 
               $or: [
                   { audience_id: targetAudienceId }, // Exact match
                   { audience_id: String(targetAudienceId) }, // String match
                   { audience_id: Long.fromNumber(Number(targetAudienceId)) }, // Long match
                   { audience_id: parseInt(targetAudienceId) } // Int match
               ],
               status: { $in: ['subscribed', 'active'] }, 
               deleted_at: null 
            }).toArray();
            console.log(`[Drift Debug] Retry found ${subscribers.length} subscribers.`);
      }

      if (subscribers.length === 0) {
        return res.status(422).json({ error: 'No subscribers found in the selected audience' });
      }
    } else {
      // Sequence 2+: Get subscribers based on previous sequence filters
      // Use DB data for previous_sequence_id
      let prevSeqId;
      try {
          prevSeqId = new ObjectId(sequence.previous_sequence_id);
      } catch (e) {
          prevSeqId = sequence.previous_sequence_id;
      }

      const prevSequence = await sequencesCollection.findOne({ _id: prevSeqId, deleted_at: null });
      if (!prevSequence) {
          return res.status(422).json({ error: `Previous sequence not found (ID: ${sequence.previous_sequence_id})` });
      }

      // Get filters & Categories
      // Use DB data if backtracked, else valid request data
      let filters = prevSequence.filters || [];
      if (!Array.isArray(filters)) {
        filters = [];
      }

      // Parse categories - they may be stored as JSON string or array
      let targetCategories = didBacktrack ? (sequence.categories || []) : (categories || sequence.categories || []);
      if (typeof targetCategories === 'string') {
        try {
          targetCategories = JSON.parse(targetCategories);
        } catch (e) {
          console.warn('[Drift Send] Failed to parse categories JSON:', e);
          targetCategories = [];
        }
      }
      if (!Array.isArray(targetCategories)) {
        targetCategories = [];
      }

      if (targetCategories.length === 0) {
        return res.status(422).json({ error: 'At least one category must be selected for Sequence 2+' });
      }

      console.log(`[Drift Send] Sequence 2+: Found ${filters.length} filters, looking for categories: ${targetCategories.join(', ')}`);

      // Category mappings
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

      const normalizedCategories = [];
      for (const cat of targetCategories) {
        const mapping = categoryMappings[cat.toLowerCase()];
        if (mapping) {
          normalizedCategories.push(...mapping);
        }
      }

      const subscriberEmails = [];
      for (const filterEntry of filters) {
        if (!filterEntry || !filterEntry.status || !filterEntry.email) continue;
        
        const filterStatus = filterEntry.status.toLowerCase().trim();
        
        for (const cat of normalizedCategories) {
          const normalizedCat = cat.toLowerCase().trim();
          
          // Match exact or normalized status
          if (filterStatus === normalizedCat) {
            subscriberEmails.push(filterEntry.email);
            break;
          }
          
          // Also handle common variations
          if (
            (filterStatus === 'sent' && normalizedCat === 'unopened') ||
            (filterStatus === 'delivered' && normalizedCat === 'unopened') ||
            (filterStatus === 'hard_bounce' && normalizedCat === 'hardbounce') ||
            (filterStatus === 'soft_bounce' && normalizedCat === 'softbounce') ||
            (filterStatus === 'unsubscribe' && normalizedCat === 'unsubscribed')
          ) {
            subscriberEmails.push(filterEntry.email);
            break;
          }
        }
      }

      if (subscriberEmails.length === 0) {
        await sequencesCollection.updateOne(
          { _id: targetSequenceId },
          { 
            $set: { 
              status: 'skipped',
              skipped_reason: 'No recipients matched the selected categories',
              updated_at: new Date()
            } 
          }
        );
        
        // If we backtracked and hit a skip, we should ideally try the NEXT one?
        // But for simplicity, let's stop and inform the user.
        return res.status(200).json({ 
          success: true,
          message: `Sequence "${targetSequenceName}" skipped (No recipients match filters).`,
          status: 'skipped'
        });
      }

      subscribers = await subscribersCollection
        .find({ email: { $in: subscriberEmails }, status: { $in: ['subscribed', 'active'] }, deleted_at: null })
        .toArray();
    }

    const now = new Date();

    // Update sequence to running status
    await sequencesCollection.updateOne(
      { _id: targetSequenceId },
      {
        $set: {
          status: 'running',
          started_at: now,
          updated_at: now
        }
      }
    );

    // Create logs
    // If backtracked, we MUST use DB config for template/batch etc.
    const rawTemplateId = didBacktrack ? sequence.template_id : template_id;
    const targetSetId = didBacktrack ? sequence.set_id : set_id;
    const targetBatchSize = didBacktrack ? sequence.batch_size : batch_size;

    // Resolve Template ID (It might be an Integer like 9, we need the _id ObjectId)
    const templatesCollection = await getCollection('templates', 'pluto');
    let resolvedTemplateId = null;

    // Try finding by _id (if valid ObjectId) or id (if number/long)
    let templateQuery = {};
    let isObjId = false;
    try {
        if (typeof rawTemplateId === 'string' && rawTemplateId.length === 24) {
            templateQuery = { _id: new ObjectId(rawTemplateId) };
            isObjId = true;
        } else {
            // It's likely a Number/Long
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
         // Fallback
         templateQuery = { id: rawTemplateId };
    }

    const templateDoc = await templatesCollection.findOne(templateQuery);
    
    if (templateDoc) {
        resolvedTemplateId = templateDoc._id;
    } else {
        // If we processed an ObjectId and it failed, maybe it WAS an ObjectId but passed as string?
        // But if we can't find it, we can't create valid logs.
        console.error(`[Drift] Template not found for ID: ${rawTemplateId}`);
        // We might want to error out, or just fail this batch?
        // Let's error out to be safe.
        return res.status(422).json({ error: `Template not found (ID: ${rawTemplateId})` });
    }

    console.log(`[Drift Debug] Email Accounts: ${emailAccounts.length}, Resolved Template ID: ${resolvedTemplateId}`);
    
    const emailAccountCount = emailAccounts.length;
    let subscriberIndex = 0;
    let insertedCount = 0;
    
    // LIMIT LOGS based on Batch Size PER ACCOUNT
    // If batch_size is 400 and accounts is 2, each account should get 400 emails = 800 total
    // But we need to ensure round-robin distributes evenly
    let subscribersToProcess = subscribers;
    if (targetBatchSize && targetBatchSize > 0) {
        const totalToSend = parseInt(targetBatchSize) * emailAccountCount;
        if (subscribers.length > totalToSend) {
            console.log(`[Drift] Limiting execution to ${totalToSend} subscribers (Batch Size: ${targetBatchSize} per account × ${emailAccountCount} accounts)`);
            subscribersToProcess = subscribers.slice(0, totalToSend);
        }
    }

    // Track how many emails each account has been assigned
    const accountAssignments = new Array(emailAccountCount).fill(0);
    const maxPerAccount = targetBatchSize || subscribersToProcess.length;

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
          console.log(`[Drift] All accounts at capacity (${maxPerAccount} each). Skipping subscriber ${subscriber.email}`);
          subscriberIndex++;
          continue;
        }
      }
      
      const account = emailAccounts[accountIndex];
      accountAssignments[accountIndex]++;

      const logDoc = {
        sequence_id: targetSequenceId,
        set_id: targetSetId,
        subscriber_id: subscriber._id,
        email_account_id: account._id,
        template_id: resolvedTemplateId, // Use the resolved ObjectId
        status: 'pending',
        batch_size: targetBatchSize || null,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      try {
          await logsCollection.insertOne(logDoc);
          insertedCount++;
      } catch (insertErr) {
          console.error(`[Drift Error] Failed to insert log for ${subscriber.email}:`, insertErr);
      }
      subscriberIndex++;
    }
    
    // Log account assignment summary
    console.log(`[Drift Debug] Account assignments:`, emailAccounts.map((acc, idx) => ({
      email: acc.email,
      assigned: accountAssignments[idx]
    })));
    
    console.log(`[Drift Debug] Inserted ${insertedCount} logs into drift_sequence_logs (pluto)`);

    console.log(`[Drift] Started sequence ${targetSequenceId}: ${subscribers.length} subscribers`);
    
    // Construct friendly message
    let message = `Sequence "${targetSequenceName}" started successfully. ${subscribers.length} emails queued.`;
    if (didBacktrack) {
        message = `⚠️ Auto-started Dependency: "${targetSequenceName}" (Sequence 1) was not complete, so it has been started first. "${originalSequenceName}" will run automatically afterwards.`;
    }

    return res.status(200).json({
      success: true,
      message: message,
      status: 'running',
      subscriber_count: subscribers.length,
      email_account_count: emailAccounts.length,
      did_backtrack: didBacktrack,
      started_sequence_name: targetSequenceName
    });

  } catch (error) {
    console.error('[Drift] Error starting sequence:', error);
    return res.status(500).json({ error: 'Failed to start sequence: ' + error.message });
  }
}

/**
 * Recursive function to find the earliest ancestor that is NOT complete/skipped.
 */
async function findEarliestPendingAncestor(sequenceId, collection) {
    const sequence = await collection.findOne({ _id: sequenceId });
    if (!sequence) return { ancestorId: sequenceId, ancestorName: 'Unknown', pathChanged: false };

    // If no previous sequence, this IS the start.
    if (!sequence.previous_sequence_id) {
        return { ancestorId: sequence._id, ancestorName: sequence.name, pathChanged: false };
    }

    let prevId;
    try { prevId = new ObjectId(sequence.previous_sequence_id); } 
    catch(e) { prevId = sequence.previous_sequence_id; }

    const prevSequence = await collection.findOne({ _id: prevId });
    if (!prevSequence) {
        // Current sequence has a broken link? Just run current.
        return { ancestorId: sequence._id, ancestorName: sequence.name, pathChanged: false };
    }

    // Check status of previous
    const isComplete = ['completed', 'skipped'].includes(prevSequence.status);
    
    if (isComplete) {
        // Previous is done. So WE are the earliest pending one.
        return { ancestorId: sequence._id, ancestorName: sequence.name, pathChanged: false };
    } else {
        // Previous is NOT done. It (or its ancestor) should run first.
        const result = await findEarliestPendingAncestor(prevSequence._id, collection);
        // We found an ancestor. It is definitely different from us.
        return { ancestorId: result.ancestorId, ancestorName: result.ancestorName, pathChanged: true };
    }
}
