import { getCollection } from '../../src/lib/mongodb';

/**
 * Email Sent Status API
 * 
 * POST /api/email-sent-status — Start a background job to mark emails as "sent"
 * GET  /api/email-sent-status?jobId=X — Get job progress
 * 
 * Request body (POST):
 * {
 *   campaignName: string,   // Campaign name to look up
 *   database: string,       // Target database name
 *   collection: string,     // Target collection name
 *   batchSize: number,      // Optional, default 5000
 *   emailField: string      // Optional, field name for email in target, default 'email'
 * }
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ─── GET: Job Progress ───
  if (req.method === 'GET') {
    try {
      const { jobId } = req.query;
      if (!jobId) {
        return res.status(400).json({ success: false, message: 'jobId is required' });
      }

      const emailSentStatusQueue = require('../../queues/emailSentStatusQueue');
      const job = await emailSentStatusQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const state = await job.getState();
      const progress = job._progress || 0;
      const result = job.returnvalue || null;
      const failedReason = job.failedReason || null;

      return res.status(200).json({
        success: true,
        jobId: job.id,
        state,
        progress,
        result,
        failedReason,
        data: {
          campaignName: job.data.campaignName,
          database: job.data.database,
          collection: job.data.collection,
          batchSize: job.data.batchSize
        }
      });
    } catch (error) {
      console.error('Error checking job progress:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── POST: Start Update Job ───
  if (req.method === 'POST') {
    try {
      const { campaignName, database, collection, batchSize = 5000, emailField = 'email' } = req.body;

      // Validate inputs
      if (!campaignName) {
        return res.status(400).json({ success: false, message: 'Campaign name is required' });
      }
      if (!database) {
        return res.status(400).json({ success: false, message: 'Database is required' });
      }
      if (!collection) {
        return res.status(400).json({ success: false, message: 'Collection is required' });
      }

      // Look up campaign by name to get campaign_id
      const campaignsCollection = await getCollection('campaigns', 'pluto');
      const campaign = await campaignsCollection.findOne(
        { name: campaignName },
        { projection: { id: 1, name: 1, _id: 1 } }
      );

      if (!campaign) {
        return res.status(404).json({ 
          success: false, 
          message: `Campaign "${campaignName}" not found` 
        });
      }

      const campaignId = campaign.id || campaign._id;
      console.log(`📧 Email Sent Status - Found campaign: ${campaignName} (ID: ${campaignId})`);

      // Add job to queue
      const emailSentStatusQueue = require('../../queues/emailSentStatusQueue');
      const job = await emailSentStatusQueue.add('update-sent-status', {
        campaignId: Number(campaignId),
        campaignName,
        database,
        collection,
        batchSize: Number(batchSize),
        emailField
      }, {
        jobId: `sent-status-${campaignId}-${Date.now()}`
      });

      console.log(`✅ Job ${job.id} queued for campaign "${campaignName}"`);

      return res.status(200).json({
        success: true,
        message: `Update job started for campaign "${campaignName}"`,
        jobId: job.id,
        campaignId: Number(campaignId),
        database,
        collection,
        batchSize: Number(batchSize)
      });

    } catch (error) {
      console.error('Error starting email sent status update:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Failed to start update job' 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
