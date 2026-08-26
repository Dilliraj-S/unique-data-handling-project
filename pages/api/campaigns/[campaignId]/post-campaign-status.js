import { authMiddleware } from '../../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../../src/lib/mongodb';
import { Long } from 'mongodb';
import Queue from 'bull';

/**
 * Post-Campaign Status API
 * 
 * GET /api/campaigns/[campaignId]/post-campaign-status
 * 
 * Returns the status of auto-triggered post-campaign jobs
 * (bounce-status updates, sent-status updates, dls_mailer_status open updates)
 * 
 * Response:
 * {
 *   hasJobs: boolean,
 *   status: 'in_progress' | 'completed' | 'partial' | 'no_source_subscribers',
 *   queuedAt: ISO date,
 *   totalJobs: number,
 *   completedJobs: number,
 *   failedJobs: number,
 *   activeJobs: number,
 *   waitingJobs: number,
 *   delayedJobs: number,
 *   jobs: Array<{ jobId, type, database, collection, state, progress, result, delayLabel }>
 * }
 */

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

// Reuse queue instances (don't create new ones per request)
let bounceQueueInstance = null;
let sentStatusQueueInstance = null;

function getBounceQueue() {
  if (!bounceQueueInstance) {
    bounceQueueInstance = new Queue('Bounce Status Update', { redis: REDIS_CONFIG });
  }
  return bounceQueueInstance;
}

function getSentStatusQueue() {
  if (!sentStatusQueueInstance) {
    sentStatusQueueInstance = new Queue('Email Sent Status Update', { redis: REDIS_CONFIG });
  }
  return sentStatusQueueInstance;
}

/**
 * Get job state from a Bull queue
 */
async function getJobState(queue, jobId) {
  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return { state: 'not_found', progress: 0, result: null };
    }

    const state = await job.getState();
    return {
      state,
      progress: job.progress() || 0,
      result: job.returnvalue || null,
      failedReason: job.failedReason || null,
      processedOn: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      delay: job.opts?.delay || 0,
      timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null
    };
  } catch (error) {
    console.error(`[post-campaign-status] Error getting job ${jobId}:`, error.message);
    return { state: 'error', progress: 0, result: null, error: error.message };
  }
}

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message || 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  try {
    const { campaignId } = req.query;

    if (!campaignId) {
      return res.status(400).json({ status: false, message: 'Campaign ID is required' });
    }

    // 1. Read post_campaign_jobs from campaign_progress
    const progressCollection = await getCollection('campaign_progress', 'pluto');
    const progress = await progressCollection.findOne(
      { campaign_id: Long.fromNumber(Number(campaignId)) },
      { sort: { created_at: -1 } }
    );

    if (!progress?.post_campaign_jobs) {
      return res.status(200).json({
        status: true,
        hasJobs: false,
        message: 'No post-campaign jobs found for this campaign'
      });
    }

    const postJobs = progress.post_campaign_jobs;
    const allJobEntries = [
      ...(postJobs.sent_status_jobs || []),
      ...(postJobs.bounce_status_jobs || [])
    ];

    if (allJobEntries.length === 0) {
      return res.status(200).json({
        status: true,
        hasJobs: true,
        postCampaignStatus: postJobs.status || 'no_source_subscribers',
        queuedAt: postJobs.queued_at,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        activeJobs: 0,
        waitingJobs: 0,
        delayedJobs: 0,
        jobs: []
      });
    }

    // 2. Query each job's state from Bull queues
    const bounceQueue = getBounceQueue();
    const sentStatusQueue = getSentStatusQueue();

    const jobStates = [];
    let completedJobs = 0;
    let failedJobs = 0;
    let activeJobs = 0;
    let waitingJobs = 0;
    let delayedJobs = 0;

    for (const jobEntry of allJobEntries) {
      const queue = jobEntry.type === 'bounce-status' ? bounceQueue : sentStatusQueue;
      const jobState = await getJobState(queue, jobEntry.jobId);

      // Count by state
      switch (jobState.state) {
        case 'completed': completedJobs++; break;
        case 'failed': failedJobs++; break;
        case 'active': activeJobs++; break;
        case 'waiting': waitingJobs++; break;
        case 'delayed': delayedJobs++; break;
      }

      jobStates.push({
        jobId: jobEntry.jobId,
        type: jobEntry.type,
        database: jobEntry.database,
        collection: jobEntry.collection,
        delayLabel: jobEntry.delayLabel || null,
        ...jobState
      });
    }

    // 3. Determine overall status
    const totalJobs = allJobEntries.length;
    let overallStatus = postJobs.status || 'in_progress';
    
    if (completedJobs === totalJobs) {
      overallStatus = 'completed';
    } else if (failedJobs > 0 && (completedJobs + failedJobs) === totalJobs) {
      overallStatus = 'partial';
    } else if (completedJobs > 0 || activeJobs > 0 || waitingJobs > 0 || delayedJobs > 0) {
      overallStatus = 'in_progress';
    }

    // 4. Update status in DB if it changed
    if (overallStatus !== postJobs.status) {
      try {
        await progressCollection.updateOne(
          { campaign_id: Long.fromNumber(Number(campaignId)) },
          { $set: { 'post_campaign_jobs.status': overallStatus } }
        );
      } catch (updateError) {
        // Non-fatal
        console.warn('[post-campaign-status] Failed to update status:', updateError.message);
      }
    }

    return res.status(200).json({
      status: true,
      hasJobs: true,
      postCampaignStatus: overallStatus,
      queuedAt: postJobs.queued_at,
      totalJobs,
      completedJobs,
      failedJobs,
      activeJobs,
      waitingJobs,
      delayedJobs,
      jobs: jobStates
    });

  } catch (error) {
    console.error('[post-campaign-status] Error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
