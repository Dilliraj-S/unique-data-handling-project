import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';
const Queue = require('bull');

/**
 * Bulk Update API
 * 
 * POST /api/querynest/bulk-column-update
 *   action: 'rename' → Rename a column
 *   action: 'value-update' → Set a value on all documents for a column
 * 
 * GET /api/querynest/bulk-column-update?job_id=xxx
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
          database: progress.database,
          collection: progress.collection,
          old_column: progress.old_column || null,
          new_column: progress.new_column || null,
          column: progress.column || null,
          value: progress.value !== undefined ? progress.value : null,
          total_docs: progress.total_docs,
          updated: progress.updated,
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
      console.error('❌ Progress check error:', error);
      return res.status(500).json({ success: false, message: error.message });
    } finally {
      if (client) await client.close();
    }
  }

  // ── POST: Dispatch jobs ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, database, collection, oldColumn, newColumn, column, value } = req.body;

    if (action !== 'rename' && action !== 'value-update') {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "rename" or "value-update".' });
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

    // ── ACTION: rename ───────────────────────────────────────────────
    if (action === 'rename') {
      if (!database || !collection || !oldColumn || !newColumn) {
        return res.status(400).json({
          success: false,
          message: 'database, collection, oldColumn, and newColumn are all required'
        });
      }

      if (oldColumn === newColumn) {
        return res.status(400).json({
          success: false,
          message: 'Old column and new column names cannot be the same'
        });
      }

      if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(newColumn)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid column name. Use letters, numbers, underscores, and dots only.'
        });
      }

      const protectedFields = ['_id', 'id'];
      if (protectedFields.includes(oldColumn)) {
        return res.status(400).json({
          success: false,
          message: `Cannot rename protected field: ${oldColumn}`
        });
      }

      let client;
      try {
        const targetUri = getTargetUri(database);
        const targetClient = new MongoClient(targetUri);
        await targetClient.connect();
        const targetDb = targetClient.db(database);
        const col = targetDb.collection(collection);

        const totalDocs = await col.countDocuments({ [oldColumn]: { $exists: true } });
        await targetClient.close();

        if (totalDocs === 0) {
          return res.status(400).json({
            success: false,
            message: `Column "${oldColumn}" not found in any documents of ${database}.${collection}`
          });
        }

        const checkClient = new MongoClient(targetUri);
        await checkClient.connect();
        const checkDb = checkClient.db(database);
        const existingCount = await checkDb.collection(collection).countDocuments(
          { [newColumn]: { $exists: true } },
          { limit: 1 }
        );
        await checkClient.close();

        if (existingCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Column "${newColumn}" already exists in ${database}.${collection}. Rename would overwrite existing data.`
          });
        }

        const jobId = `colrename_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const centralConfig = getConnectionConfig('central');
        client = new MongoClient(centralConfig.uri);
        await client.connect();
        const centralDb = client.db(centralConfig.name || 'nextjs_stu');

        await centralDb.collection('bulk_update_progress').insertOne({
          job_id: jobId,
          update_type: 'column-rename',
          database,
          collection,
          old_column: oldColumn,
          new_column: newColumn,
          total_docs: totalDocs,
          updated: 0,
          current_batch: 0,
          total_batches: 0,
          status: 'queued',
          message: null,
          created_at: new Date(),
          started_at: null,
          completed_at: null
        });

        const bulkUpdateQueue = new Queue('Bulk Update Processing', {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10)
          }
        });

        await bulkUpdateQueue.add('column-rename', {
          jobId, database, collection, oldColumn, newColumn, totalDocs
        }, {
          attempts: 2, removeOnComplete: 10, removeOnFail: false, timeout: 0
        });

        await bulkUpdateQueue.close();

        console.log(`📋 Column rename queued: ${jobId} — ${database}.${collection} [${oldColumn} → ${newColumn}] (${totalDocs.toLocaleString()} docs)`);

        return res.status(200).json({
          success: true,
          job_id: jobId,
          message: `Column rename queued! "${oldColumn}" → "${newColumn}" across ${totalDocs.toLocaleString()} documents.`,
          total_docs: totalDocs
        });

      } catch (error) {
        console.error('❌ Column rename queue error:', error);
        return res.status(500).json({ success: false, message: error.message });
      } finally {
        if (client) await client.close();
      }
    }

    // ── ACTION: value-update ─────────────────────────────────────────
    if (action === 'value-update') {
      if (!database || !collection || !column) {
        return res.status(400).json({
          success: false,
          message: 'database, collection, and column are required'
        });
      }

      if (value === undefined || value === null) {
        return res.status(400).json({
          success: false,
          message: 'value is required (can be empty string)'
        });
      }

      const protectedFields = ['_id'];
      if (protectedFields.includes(column)) {
        return res.status(400).json({
          success: false,
          message: `Cannot update protected field: ${column}`
        });
      }

      let client;
      try {
        const targetUri = getTargetUri(database);
        const targetClient = new MongoClient(targetUri);
        await targetClient.connect();
        const targetDb = targetClient.db(database);
        const totalDocs = await targetDb.collection(collection).estimatedDocumentCount();
        await targetClient.close();

        const jobId = `valupdate_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const centralConfig = getConnectionConfig('central');
        client = new MongoClient(centralConfig.uri);
        await client.connect();
        const centralDb = client.db(centralConfig.name || 'nextjs_stu');

        await centralDb.collection('bulk_update_progress').insertOne({
          job_id: jobId,
          update_type: 'value-update',
          database,
          collection,
          column,
          value,
          total_docs: totalDocs,
          updated: 0,
          current_batch: 0,
          total_batches: 0,
          status: 'queued',
          message: null,
          created_at: new Date(),
          started_at: null,
          completed_at: null
        });

        const bulkUpdateQueue = new Queue('Bulk Update Processing', {
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10)
          }
        });

        await bulkUpdateQueue.add('value-update', {
          jobId, database, collection, column, value, totalDocs
        }, {
          attempts: 2, removeOnComplete: 10, removeOnFail: false, timeout: 0
        });

        await bulkUpdateQueue.close();

        console.log(`📋 Value update queued: ${jobId} — ${database}.${collection}.${column} = "${value}" (${totalDocs.toLocaleString()} docs)`);

        return res.status(200).json({
          success: true,
          job_id: jobId,
          message: `Value update queued! Setting "${column}" = "${value}" across ${totalDocs.toLocaleString()} documents.`,
          total_docs: totalDocs
        });

      } catch (error) {
        console.error('❌ Value update queue error:', error);
        return res.status(500).json({ success: false, message: error.message });
      } finally {
        if (client) await client.close();
      }
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}
