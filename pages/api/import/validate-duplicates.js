import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';

const JobService = require('../../../services/JobService');
const maintenanceQueue = require('../../../queues/maintenanceQueue');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      mainDatabase,
      mainCollection,
      targetDatabase,
      targetCollection,
      duplicateRule
    } = req.body;

    // Validation
    if (!mainDatabase || !mainCollection || !targetDatabase || !targetCollection || !duplicateRule) {
      return res.status(400).json({
        status: false,
        message: 'Missing required fields: mainDatabase, mainCollection, targetDatabase, targetCollection, duplicateRule'
      });
    }

    // Validate duplicate rule
    // Accept both legacy string format and new object format
    let ruleObject;
    if (typeof duplicateRule === 'string') {
      // Legacy format: validate against known rules
      const validRules = ['li_full_name+li_company_name', 'li_full_name+li_smtp', 'email'];
      if (!validRules.includes(duplicateRule)) {
        return res.status(400).json({
          status: false,
          message: `Invalid duplicate rule. Must be one of: ${validRules.join(', ')}`
        });
      }
      // Convert to object format for consistency
      ruleObject = {
        rule_id: duplicateRule,
        columns: duplicateRule.split('+'),
        match_type: duplicateRule.includes('+') ? 'composite' : 'single'
      };
    } else if (typeof duplicateRule === 'object' && duplicateRule.columns) {
      // New format: validate structure
      if (!Array.isArray(duplicateRule.columns) || duplicateRule.columns.length === 0) {
        return res.status(400).json({
          status: false,
          message: 'Invalid duplicate rule: columns must be a non-empty array'
        });
      }
      ruleObject = duplicateRule;
    } else {
      return res.status(400).json({
        status: false,
        message: 'Invalid duplicate rule format. Must be a string or object with columns array'
      });
    }

    // Generate process ID
    const processId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    // Initialize job service for progress tracking
    const jobService = new JobService();

    // Log process start
    await jobService.logProcessStart({
      process_id: processId,
      user_id: req.headers['x-user-id'] || req.user?.user_id || req.user?.id || 'system',
      file: `Duplicate Removal: ${targetDatabase}.${targetCollection}`,
      database: targetDatabase,
      table: targetCollection,
      type: 'duplicate-removal'
    });

    // Queue the duplicate removal job (maintenance queue - lowest priority)
    const jobId = uuidv4();
    await maintenanceQueue.add('duplicate-removal', {
      jobId,
      processId,
      mainDatabase,
      mainCollection,
      targetDatabase,
      targetCollection,
      duplicateRule: ruleObject,
      userId: req.headers['x-user-id'] || req.user?.user_id || req.user?.id || null,
      chunkSize: 50000 // Larger chunk size for maintenance worker
    }, {
      jobId,
      priority: 1, // Lowest priority - runs when system is less busy
      attempts: 2, // Fewer retries for maintenance jobs
      backoff: { type: 'exponential', delay: 10000 }, // Longer delay for very heavy jobs
      removeOnComplete: true,
      removeOnFail: false
    });

    // Update initial progress
    await jobService.updateProcessProgress(processId, {
      total: 0,
      removed_count: 0,
      status: 'processing',
      percentage: 0
    });

    await jobService.disconnect();

    return res.status(202).json({
      status: true,
      message: 'Duplicate removal job queued successfully',
      process_id: processId,
      jobId,
      operation: {
        main: `${mainDatabase}.${mainCollection}`,
        target: `${targetDatabase}.${targetCollection}`,
        rule: duplicateRule
      }
    });

  } catch (error) {
    console.error('Duplicate removal error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to start duplicate removal'
    });
  }
}

