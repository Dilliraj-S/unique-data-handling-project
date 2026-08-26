import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';
const Queue = require('bull');

/**
 * Compare Update API
 * 
 * Cross-collection field-level compare and update.
 * Reads base collection → matches on compare field in target → $set source field.
 * 
 * POST /api/querynest/compare-update
 *   → Validates, counts base docs, dispatches Bull job, returns job_id
 * 
 * GET /api/querynest/compare-update?job_id=xxx
 *   → Returns progress from bulk_update_progress collection
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: Poll progress ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const { job_id } = req.query;
    if (!job_id) {
      return res.status(400).json({ success: false, message: 'job_id is required' });
    }

    let client;
    try {
      const centralConfig = getConnectionConfig('central');
      client = new MongoClient(centralConfig.uri);
      await client.connect();
      const db = client.db(centralConfig.name || 'nextjs_stu');

      const progress = await db.collection('bulk_update_progress').findOne({ job_id });
      if (!progress) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      return res.status(200).json({
        success: true,
        data: {
          job_id: progress.job_id,
          update_type: progress.update_type,
          base_database: progress.base_database,
          base_collection: progress.base_collection,
          target_database: progress.target_database,
          target_collection: progress.target_collection,
          compare_field: progress.compare_field,
          source_field: progress.source_field,
          value_to_store: progress.value_to_store,
          total_docs: progress.total_docs,
          processed: progress.processed || 0,
          matched: progress.matched || 0,
          updated: progress.updated || 0,
          current_batch: progress.current_batch,
          total_batches: progress.total_batches,
          status: progress.status,
          message: progress.message,
          started_at: progress.started_at,
          completed_at: progress.completed_at,
          created_at: progress.created_at
        }
      });
    } catch (error) {
      console.error('❌ Compare-update progress check error:', error);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      if (client) await client.close();
    }
  }

  // ── POST: Dispatch compare-update job ───────────────────────────────
  if (req.method === 'POST') {
    const {
      baseDatabase, baseCollection,
      targetDatabase, targetCollection,
      compareField, sourceField, valueToStore
    } = req.body;

    // Validate all required fields
    if (!baseDatabase || !baseCollection || !targetDatabase || !targetCollection ||
        !compareField || !sourceField || valueToStore === undefined || valueToStore === null) {
      return res.status(400).json({
        success: false,
        message: 'All fields required: baseDatabase, baseCollection, targetDatabase, targetCollection, compareField, sourceField, valueToStore'
      });
    }

    if (typeof compareField !== 'string' || compareField.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'compareField must be a non-empty string'
      });
    }

    if (typeof sourceField !== 'string' || sourceField.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'sourceField must be a non-empty string'
      });
    }

    // Protect _id field
    if (sourceField.trim() === '_id') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update protected field: _id'
      });
    }

    // Helper: get target DB URI
    function getTargetUri(dbName) {
      const connectionName = dbName === 'nextjs_stu' ? 'central' : dbName;
      try {
        const config = getConnectionConfig(connectionName);
        return config.uri;
      } catch (e) {
        const baseUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017';
        return `${baseUri.replace(/\/[^/]+$/, '')}/${dbName}`;
      }
    }

    let client;
    try {
      // Count base collection documents to estimate work
      const baseUri = getTargetUri(baseDatabase);
      const baseClient = new MongoClient(baseUri);
      await baseClient.connect();
      const baseDb = baseClient.db(baseDatabase);
      const totalDocs = await baseDb.collection(baseCollection).estimatedDocumentCount();
      await baseClient.close();

      if (totalDocs === 0) {
        return res.status(400).json({
          success: false,
          message: `Base collection "${baseDatabase}.${baseCollection}" is empty — nothing to compare`
        });
      }

      // Generate job ID
      const jobId = `cmpupdate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Insert progress document
      const centralConfig = getConnectionConfig('central');
      client = new MongoClient(centralConfig.uri);
      await client.connect();
      const centralDb = client.db(centralConfig.name || 'nextjs_stu');

      await centralDb.collection('bulk_update_progress').insertOne({
        job_id: jobId,
        update_type: 'compare-update',
        base_database: baseDatabase,
        base_collection: baseCollection,
        target_database: targetDatabase,
        target_collection: targetCollection,
        compare_field: compareField.trim(),
        source_field: sourceField.trim(),
        value_to_store: valueToStore,
        total_docs: totalDocs,
        processed: 0,
        matched: 0,
        updated: 0,
        current_batch: 0,
        total_batches: 0,
        status: 'queued',
        message: null,
        created_at: new Date(),
        started_at: null,
        completed_at: null
      });

      // Dispatch Bull job
      const bulkUpdateQueue = new Queue('Bulk Update Processing', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10)
        }
      });

      await bulkUpdateQueue.add('compare-update', {
        jobId,
        baseDatabase, baseCollection,
        targetDatabase, targetCollection,
        compareField: compareField.trim(),
        sourceField: sourceField.trim(),
        valueToStore,
        totalDocs
      }, {
        attempts: 2, removeOnComplete: 10, removeOnFail: false, timeout: 0
      });

      await bulkUpdateQueue.close();

      console.log(`📋 Compare-update queued: ${jobId} — ${baseDatabase}.${baseCollection} → ${targetDatabase}.${targetCollection} [match: ${compareField}, set: ${sourceField}="${valueToStore}"] (${totalDocs.toLocaleString()} base docs)`);

      return res.status(200).json({
        success: true,
        job_id: jobId,
        message: `Compare update queued! Matching "${compareField}" from ${baseDatabase}.${baseCollection} → updating "${sourceField}" in ${targetDatabase}.${targetCollection} (${totalDocs.toLocaleString()} base docs)`,
        total_docs: totalDocs
      });

    } catch (error) {
      console.error('❌ Compare-update queue error:', error);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      if (client) await client.close();
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
