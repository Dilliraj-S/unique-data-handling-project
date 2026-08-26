
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

// ============================================
// SERVER-SIDE CACHE (2-second TTL)
// Prevents hammering DB with repeated polls
// ============================================
const reportCache = new Map();
const CACHE_TTL_MS = 2000;

function getCachedReport(sequenceId) {
  const cached = reportCache.get(sequenceId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCachedReport(sequenceId, data) {
  reportCache.set(sequenceId, {
    data,
    timestamp: Date.now()
  });
  
  // Cleanup old entries (keep cache size bounded)
  if (reportCache.size > 100) {
    const oldestKey = reportCache.keys().next().value;
    reportCache.delete(oldestKey);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sequence_id } = req.query;

  if (!sequence_id) {
    return res.status(400).json({ error: 'Sequence ID is required' });
  }

  // Check cache first
  const cached = getCachedReport(sequence_id);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const startTime = Date.now();
    
    const logsCol = await getCollection('drift_sequence_logs', 'pluto');
    const emailsCol = await getCollection('emails', 'pluto');
    const sequencesCol = await getCollection('drift_sequences', 'pluto');

    const seqObjectId = new ObjectId(sequence_id);
    
    // ============================================
    // STEP 1: Get sequence info (single query)
    // ============================================
    const sequence = await sequencesCol.findOne({ _id: seqObjectId, deleted_at: null });
    
    // ============================================
    // STEP 2: SINGLE AGGREGATION for all stats
    // Uses $facet to get multiple result sets in ONE query
    // ============================================
    const mainAggregation = await logsCol.aggregate([
      { $match: { sequence_id: seqObjectId, deleted_at: null } },
      {
        $facet: {
          // Facet 1: Status counts
          statusCounts: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          
          // Facet 2: Per-account stats with account email lookup
          accountStats: [
            {
              $group: {
                _id: '$email_account_id',
                total: { $sum: 1 },
                sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                sending: { $sum: { $cond: [{ $eq: ['$status', 'sending'] }, 1, 0] } },
                last_sent_at: { $max: '$sent_at' },
                last_error: { $last: '$error_message' }
              }
            },
            {
              $lookup: {
                from: 'email_accounts',
                localField: '_id',
                foreignField: '_id',
                as: 'account'
              }
            },
            {
              $unwind: { path: '$account', preserveNullAndEmptyArrays: true }
            },
            {
              $project: {
                from_email: { $ifNull: ['$account.email', 'Unknown'] },
                total: 1,
                sent: 1,
                pending: 1,
                failed: 1,
                sending: 1,
                last_sent_at: 1,
                last_error: 1
              }
            }
          ],
          
          // Facet 3: Get unique subscriber emails (for bounce matching)
          subscriberEmails: [
            {
              $lookup: {
                from: 'subscribers',
                localField: 'subscriber_id',
                foreignField: '_id',
                as: 'subscriber'
              }
            },
            { $unwind: { path: '$subscriber', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: null,
                emails: { $addToSet: { $toLower: '$subscriber.email' } }
              }
            }
          ],
          
          // Facet 4: Get unique account emails (for filtering bounce sources)
          accountEmails: [
            {
              $lookup: {
                from: 'email_accounts',
                localField: 'email_account_id',
                foreignField: '_id',
                as: 'account'
              }
            },
            { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: null,
                emails: { $addToSet: { $toLower: '$account.email' } }
              }
            }
          ],
          
          // Facet 5: Failed details with subscriber lookup
          failedDetails: [
            { $match: { status: 'failed' } },
            {
              $lookup: {
                from: 'subscribers',
                localField: 'subscriber_id',
                foreignField: '_id',
                as: 'subscriber'
              }
            },
            { $unwind: '$subscriber' },
            {
              $project: {
                to_email: '$subscriber.email',
                error_message: '$error_message'
              }
            },
            { $limit: 100 } // Limit for performance
          ]
        }
      }
    ]).toArray();

    const result = mainAggregation[0];
    
    // ============================================
    // STEP 3: Process aggregation results
    // ============================================
    
    // Build stats object from status counts
    const stats = {
      sent: 0,
      failed: 0,
      replied: 0,
      skipped: 0,
      pending: 0,
      hardbounce: 0,
      softbounce: 0,
      automatic_reply: 0,
      unsubscribed: 0,
      unopened: 0
    };

    (result.statusCounts || []).forEach(item => {
      const status = item._id || 'unknown';
      stats[status] = item.count;
    });

    // Extract subscriber and account emails
    const subscriberEmailSet = new Set(result.subscriberEmails?.[0]?.emails || []);
    const accountEmailSet = new Set(result.accountEmails?.[0]?.emails || []);
    
    // Deduplicate per-account stats by email
    const emailStatsMap = new Map();
    (result.accountStats || []).forEach(stat => {
      const email = stat.from_email;
      if (emailStatsMap.has(email)) {
        const existing = emailStatsMap.get(email);
        existing.total += stat.total;
        existing.sent += stat.sent;
        existing.pending += stat.pending;
        existing.failed += stat.failed;
        existing.sending += stat.sending;
        if (stat.last_sent_at && (!existing.last_sent_at || stat.last_sent_at > existing.last_sent_at)) {
          existing.last_sent_at = stat.last_sent_at;
        }
        if (stat.last_error && !existing.last_error) {
          existing.last_error = stat.last_error;
        }
      } else {
        emailStatsMap.set(email, { ...stat });
      }
    });
    
    const per_account_stats = Array.from(emailStatsMap.values());

    // ============================================
    // STEP 4: Real-time Bounce/Reply Detection
    // Only if we have subscriber and account emails
    // ============================================
    
    if (subscriberEmailSet.size > 0 && accountEmailSet.size > 0) {
      const seqStartTime = sequence?.started_at || sequence?.created_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const accountEmailArray = Array.from(accountEmailSet);
      
      // Single aggregation for bounce detection
      const bounceAggregation = await emailsCol.aggregate([
        {
          $match: {
            account_email: { $in: accountEmailArray },
            status: { $in: ['soft_bounce', 'hard_bounce'] },
            received_at: { $gte: new Date(seqStartTime) }
          }
        },
        {
          $project: {
            status: 1,
            snippet: 1,
            body_plain: 1
          }
        },
        { $limit: 1000 } // Cap for performance
      ]).toArray();
      
      // Extract bounced emails using regex patterns
      const bouncePatterns = [
        /wasn't delivered to\s+([\w\.-]+@[\w\.-]+\.\w+)/i,
        /wasn't delivered to\s+<b>([\w\.-]+@[\w\.-]+\.\w+)<\/b>/i,
        /message to\s+([\w\.-]+@[\w\.-]+\.\w+)\s+couldn/i,
        /couldn't be delivered to\s+([\w\.-]+@[\w\.-]+\.\w+)/i,
        /Recipient.*rejected.*<([\w\.-]+@[\w\.-]+\.\w+)>/i,
        /blocked.*<b>([\w\.-]+@[\w\.-]+\.\w+)<\/b>/i,
        /blocked.*to\s+([\w\.-]+@[\w\.-]+\.\w+)/i
      ];
      
      let hardBounceCount = 0;
      let softBounceCount = 0;
      const matchedBounceEmails = new Set();
      
      for (const bounce of bounceAggregation) {
        const textToSearch = (bounce.snippet || '') + ' ' + (bounce.body_plain || '');
        let recipientEmail = null;
        
        for (const pattern of bouncePatterns) {
          const match = textToSearch.match(pattern);
          if (match && match[1]) {
            recipientEmail = match[1].toLowerCase();
            break;
          }
        }
        
        if (recipientEmail && subscriberEmailSet.has(recipientEmail) && !matchedBounceEmails.has(recipientEmail)) {
          matchedBounceEmails.add(recipientEmail);
          if (bounce.status === 'hard_bounce') {
            hardBounceCount++;
          } else if (bounce.status === 'soft_bounce') {
            softBounceCount++;
          }
        }
      }
      
      // Single aggregation for reply detection
      const replyAggregation = await emailsCol.aggregate([
        {
          $match: {
            account_email: { $in: accountEmailArray },
            status: { $in: ['automatic_reply', 'replied', 'unsubscribed'] },
            received_at: { $gte: new Date(seqStartTime) }
          }
        },
        {
          $project: {
            status: 1,
            from_email: 1
          }
        },
        { $limit: 1000 }
      ]).toArray();
      
      let automaticReplyCount = 0;
      let repliedCount = 0;
      let unsubscribedCount = 0;
      const matchedReplyEmails = new Set();
      
      for (const reply of replyAggregation) {
        let senderEmail = null;
        if (reply.from_email) {
          const emailMatch = reply.from_email.match(/<(.+?)>/) || reply.from_email.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
          senderEmail = emailMatch ? (emailMatch[1] || emailMatch[0]).toLowerCase() : null;
        }
        
        if (senderEmail && subscriberEmailSet.has(senderEmail) && !matchedReplyEmails.has(senderEmail)) {
          matchedReplyEmails.add(senderEmail);
          if (reply.status === 'automatic_reply') {
            automaticReplyCount++;
          } else if (reply.status === 'replied') {
            repliedCount++;
          } else if (reply.status === 'unsubscribed') {
            unsubscribedCount++;
          }
        }
      }
      
      // Apply real-time counts
      stats.hardbounce = hardBounceCount;
      stats.softbounce = softBounceCount;
      stats.automatic_reply = automaticReplyCount;
      stats.replied = repliedCount;
      stats.unsubscribed = unsubscribedCount;
    }

    // ============================================
    // STEP 5: Handle Sequence 2+ filter counts
    // ============================================
    
    if (sequence && sequence.previous_sequence_id) {
      let prevSeqId;
      try {
        prevSeqId = new ObjectId(sequence.previous_sequence_id);
      } catch (e) {
        prevSeqId = sequence.previous_sequence_id;
      }
      
      const prevSequence = await sequencesCol.findOne({ _id: prevSeqId, deleted_at: null });
      
      if (prevSequence && prevSequence.filters && Array.isArray(prevSequence.filters)) {
        let categories = sequence.categories || [];
        if (typeof categories === 'string') {
          try {
            categories = JSON.parse(categories);
          } catch (e) {
            categories = [];
          }
        }
        if (!Array.isArray(categories)) {
          categories = [];
        }
        
        const filterCounts = {
          softbounce: 0,
          hardbounce: 0,
          unsubscribed: 0,
          automatic_reply: 0,
          replied: 0,
          unopened: 0
        };
        
        const categoryMappings = {
          'unsubscribed': ['unsubscribe', 'unsubscribed'],
          'hardbounce': ['hardbounce', 'hard_bounce'],
          'softbounce': ['softbounce', 'soft_bounce'],
          'replied': ['replied'],
          'automatic_reply': ['automatic_reply'],
          'unopened': ['unopened', 'sent', 'delivered']
        };
        
        for (const filter of prevSequence.filters) {
          if (!filter || !filter.status || !filter.email) continue;
          
          const filterStatus = filter.status.toLowerCase().trim();
          let matched = false;
          
          for (const cat of categories) {
            if (matched) break;
            const mapping = categoryMappings[cat.toLowerCase()];
            if (mapping) {
              for (const mappedCat of mapping) {
                if (filterStatus === mappedCat.toLowerCase()) {
                  if (filterStatus === 'softbounce' || filterStatus === 'soft_bounce') {
                    filterCounts.softbounce++;
                  } else if (filterStatus === 'hardbounce' || filterStatus === 'hard_bounce') {
                    filterCounts.hardbounce++;
                  } else if (filterStatus === 'unsubscribed' || filterStatus === 'unsubscribe') {
                    filterCounts.unsubscribed++;
                  } else if (filterStatus === 'automatic_reply') {
                    filterCounts.automatic_reply++;
                  } else if (filterStatus === 'replied') {
                    filterCounts.replied++;
                  } else if (filterStatus === 'unopened' || filterStatus === 'sent' || filterStatus === 'delivered') {
                    filterCounts.unopened++;
                  }
                  matched = true;
                  break;
                }
              }
            }
          }
        }
        
        // Override with filter counts for Sequence 2+
        stats.softbounce = filterCounts.softbounce;
        stats.hardbounce = filterCounts.hardbounce;
        stats.unsubscribed = filterCounts.unsubscribed;
        stats.automatic_reply = filterCounts.automatic_reply;
        stats.replied = filterCounts.replied;
      }
    }

    // Calculate unopened
    const terminalStates = (stats.replied || 0) + (stats.softbounce || 0) + (stats.hardbounce || 0) + (stats.unsubscribed || 0);
    stats.unopened = Math.max(0, (stats.sent || 0) - terminalStates);

    const endTime = Date.now();
    console.log(`[Drift Reports] Optimized query completed in ${endTime - startTime}ms`);

    const responseData = { 
      success: true, 
      stats, 
      per_account_stats, 
      failed_details: result.failedDetails || [],
      _performance: {
        queryTimeMs: endTime - startTime,
        subscriberCount: subscriberEmailSet.size,
        accountCount: accountEmailSet.size
      }
    };
    
    // Cache the result
    setCachedReport(sequence_id, responseData);

    return res.status(200).json(responseData);

  } catch (error) {
    console.error('[Drift Reports] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
}
