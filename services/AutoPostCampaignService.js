/**
 * AutoPostCampaignService
 *
 * Automatically triggers bounce-status and email-sent-status updates
 * when a campaign finishes sending all emails.
 *
 * How it works:
 * 1. Reads subscribers for the campaign's audience
 * 2. Groups them by source_system + source_table
 * 3. Queues update-sent-status job (IMMEDIATE — data available right away)
 * 4. Queues update-bounce-status jobs (delayed: 5min, 30min, 4hr, 24hr)
 *    - 24hr final check catches all late bounces, opens, unopen statuses
 * 5. Saves all job IDs to campaign_progress.post_campaign_jobs for UI tracking
 * 6. Skips subscribers without source_table (manual imports without source info)
 */

const { Long } = require('mongodb');

class AutoPostCampaignService {

  /**
   * Trigger post-campaign jobs after a campaign completes
   * @param {Db} db - MongoDB database connection (pluto)
   * @param {string|number} campaignId - The campaign ID
   * @param {string} progressId - The progress ID
   */
  static async triggerPostCampaignJobs(db, campaignId, progressId) {
    try {
      console.log(`\n🤖 AutoPostCampaign: Starting for campaign ${campaignId}, progress ${progressId}`);

      // 1. Get the campaign to find audience_id
      const campaign = await db.collection('campaigns').findOne({
        id: Long.fromNumber(Number(campaignId))
      });

      if (!campaign) {
        console.warn(`⚠️ AutoPostCampaign: Campaign ${campaignId} not found, skipping`);
        return;
      }

      const audienceId = campaign.audience_id;
      if (!audienceId) {
        console.warn(`⚠️ AutoPostCampaign: Campaign ${campaignId} has no audience_id, skipping`);
        return;
      }

      console.log(`📋 AutoPostCampaign: Campaign "${campaign.name || campaignId}", Audience ID: ${audienceId}`);

      // 2. Read subscribers for this audience, group by source_table + source_system
      const subscribers = await db.collection('subscribers').find({
        audience_id: typeof audienceId === 'number' ? Long.fromNumber(audienceId) : audienceId,
        source_table: { $ne: null, $exists: true },
        source_system: { $ne: null, $exists: true }
      }, {
        projection: { source_table: 1, source_system: 1 }
      }).toArray();

      if (!subscribers.length) {
        console.log(`ℹ️ AutoPostCampaign: No subscribers with source_table found for audience ${audienceId}. Skipping auto-updates.`);
        
        // Still record that we attempted (no jobs to queue)
        await this._savePostCampaignJobs(db, campaignId, [], [], 'no_source_subscribers');
        return;
      }

      // 3. Group by source_system + source_table
      const sourceGroups = new Map();
      for (const sub of subscribers) {
        const key = `${sub.source_system}::${sub.source_table}`;
        if (!sourceGroups.has(key)) {
          sourceGroups.set(key, {
            database: sub.source_system,
            collection: sub.source_table,
            count: 0
          });
        }
        sourceGroups.get(key).count++;
      }

      console.log(`📊 AutoPostCampaign: Found ${sourceGroups.size} source group(s):`);
      for (const [key, group] of sourceGroups) {
        console.log(`   - ${group.database}.${group.collection} (${group.count} subscribers)`);
      }

      // 4. Queue jobs for each source group
      const bounceQueue = require('../queues/bounceQueue');
      const emailSentStatusQueue = require('../queues/emailSentStatusQueue');
      const timestamp = Date.now();
      let jobCount = 0;

      // Track job IDs for UI
      const sentStatusJobs = [];
      const bounceStatusJobs = [];

      for (const [key, group] of sourceGroups) {
        // 4a. Queue update-sent-status (IMMEDIATE — sent data already exists in email_campaign_logs)
        const sentJobId = `auto-sent-${campaignId}-${group.database}-${group.collection}-${timestamp}`;
        await emailSentStatusQueue.add('update-sent-status', {
          campaignId: String(campaignId),
          campaignName: campaign.name || `Campaign ${campaignId}`,
          database: group.database,
          collection: group.collection,
          batchSize: 5000,
          emailField: 'email',
          autoTriggered: true
        }, {
          jobId: sentJobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });
        jobCount++;
        sentStatusJobs.push({
          jobId: sentJobId,
          database: group.database,
          collection: group.collection,
          type: 'sent-status',
          delayLabel: 'immediate'
        });
        console.log(`✅ Queued: update-sent-status (immediate) for ${group.database}.${group.collection}`);

        // 4b. Queue update-bounce-status with delays (bounces arrive at different times)
        const bounceDelays = [
          { delay: 5 * 60 * 1000, label: '5min' },         // 5 minutes - immediate hard bounces
          { delay: 30 * 60 * 1000, label: '30min' },        // 30 minutes - soft bounces
          { delay: 4 * 60 * 60 * 1000, label: '4hr' },      // 4 hours - delayed bounces
          { delay: 24 * 60 * 60 * 1000, label: '24hr' }     // 24 hours - final reconciliation (catches all late bounces, opens, unopen)
        ];

        for (const bounce of bounceDelays) {
          const bounceJobId = `auto-bounce-${campaignId}-${group.database}-${group.collection}-${bounce.label}-${timestamp}`;
          await bounceQueue.add('update-bounce-status', {
            database: group.database,
            collection: group.collection,
            batchSize: 5000,
            autoTriggered: true,
            campaignId: String(campaignId),
            campaignName: campaign.name || `Campaign ${campaignId}`,
            campaignStartedAt: campaign.updated_at || new Date(),
            delayLabel: bounce.label
          }, {
            jobId: bounceJobId,
            delay: bounce.delay,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
          });
          jobCount++;
          bounceStatusJobs.push({
            jobId: bounceJobId,
            database: group.database,
            collection: group.collection,
            type: 'bounce-status',
            delayLabel: bounce.label,
            delayMs: bounce.delay
          });
        }
        console.log(`✅ Queued: 4 bounce-status jobs for ${group.database}.${group.collection} (5min, 30min, 4hr, 24hr delays)`);
      }

      // 5. Queue global-email-sync for each sending account (2 min delay — let Gmail inbox receive bounces)
      try {
        const Queue = require('bull');
        const emailSyncQueue = new Queue('Global Email Sync', {
          redis: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT || '6379', 10) }
        });

        // Get from_emails used in this campaign from email_campaign_logs
        const fromEmails = await db.collection('email_campaign_logs').distinct('from_email', {
          campaign_id: Long.fromNumber(Number(campaignId))
        });

        // Get user_id for each account
        for (const fromEmail of fromEmails) {
          if (!fromEmail) continue;
          const account = await db.collection('email_accounts').findOne(
            { email: fromEmail },
            { projection: { user_id: 1 } }
          );

          const syncJobId = `auto-sync-${campaignId}-${fromEmail}-${timestamp}`;
          await emailSyncQueue.add('email-sync', {
            email: fromEmail,
            category: 'inbox',
            user_id: account?.user_id || null
          }, {
            jobId: syncJobId,
            delay: 2 * 60 * 1000, // 2 minutes — let bounces arrive in inbox
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 }
          });
          jobCount++;
          console.log(`✅ Queued: email-sync for ${fromEmail} (2min delay)`);
        }

        await emailSyncQueue.close();
      } catch (syncErr) {
        console.error('⚠️ AutoPostCampaign: email-sync queue failed (non-fatal):', syncErr.message);
      }

      // 6. Queue open-sync job (1hr delay — give time for recipients to open)
      // NOTE: gmail-pubsub is NOT triggered here — it runs 24/7 independently
      try {
        const openStatusSyncQueue = require('../queues/openStatusSyncQueue');

        const openJobId = `auto-open-sync-${campaignId}-1hr-${timestamp}`;
        await openStatusSyncQueue.add('sync-open-status', {
          immediate: true,
          autoTriggered: true,
          campaignId: String(campaignId)
        }, {
          jobId: openJobId,
          delay: 60 * 60 * 1000, // 1 hour
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });
        jobCount++;
        console.log(`✅ Queued: open-sync (1hr delay)`);
      } catch (openErr) {
        console.error('⚠️ AutoPostCampaign: open-sync queue failed (non-fatal):', openErr.message);
      }

      // 7. Save job IDs to campaign_progress for UI tracking
      await this._savePostCampaignJobs(db, campaignId, sentStatusJobs, bounceStatusJobs, 'in_progress');

      console.log(`\n🎉 AutoPostCampaign: Successfully queued ${jobCount} jobs for campaign ${campaignId}\n`);

    } catch (error) {
      // Don't throw - this is a best-effort automation, should not break email delivery
      console.error(`❌ AutoPostCampaign: Failed for campaign ${campaignId}:`, error.message);
      console.error(error.stack);
    }
  }

  /**
   * Save post-campaign job IDs to campaign_progress for UI tracking
   */
  static async _savePostCampaignJobs(db, campaignId, sentStatusJobs, bounceStatusJobs, status) {
    try {
      await db.collection('campaign_progress').updateOne(
        { campaign_id: Long.fromNumber(Number(campaignId)) },
        {
          $set: {
            post_campaign_jobs: {
              status,
              queued_at: new Date(),
              total_jobs: sentStatusJobs.length + bounceStatusJobs.length,
              sent_status_jobs: sentStatusJobs,
              bounce_status_jobs: bounceStatusJobs
            }
          }
        }
      );
      console.log(`📝 AutoPostCampaign: Saved ${sentStatusJobs.length + bounceStatusJobs.length} job IDs to campaign_progress`);
    } catch (saveError) {
      // Non-fatal — jobs are still queued even if we can't save tracking info
      console.error(`⚠️ AutoPostCampaign: Failed to save job IDs to campaign_progress:`, saveError.message);
    }
  }
}

module.exports = AutoPostCampaignService;

