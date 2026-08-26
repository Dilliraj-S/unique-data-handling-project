/**
 * Flow Progress API
 * Returns real-time progress for workflow/masterflow processes
 * Polls moon.process_logs collection for progress data written by process-flow-worker.js
 */

import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../../../src/config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      message: 'Only GET requests are allowed.'
    });
  }

  const { process_id } = req.query;

  if (!process_id) {
    return res.status(400).json({
      status: false,
      message: 'process_id is required.'
    });
  }

  let client;
  try {
    const moonConfig = getConnectionConfig('moon');
    client = new MongoClient(moonConfig.uri, moonConfig.options);
    await client.connect();
    const db = client.db(moonConfig.database);

    const record = await db.collection('process_logs').findOne(
      { process_id },
      {
        projection: {
          process_id: 1,
          process_name: 1,
          process_mode: 1,
          status: 1,
          percentage: 1,
          current_workflow: 1,
          workflow_index: 1,
          workflow_total: 1,
          total: 1,
          processed: 1,
          error_message: 1,
          started_at: 1,
          completed_at: 1,
          failed_at: 1,
          updated_at: 1,
          _id: 0
        }
      }
    );

    if (!record) {
      return res.status(200).json({
        status: true,
        progress: {
          process_id,
          status: 'pending',
          percentage: 0,
          current_workflow: '',
          workflow_index: 0,
          workflow_total: 0,
          message: 'Process is queued and waiting to start.'
        }
      });
    }

    return res.status(200).json({
      status: true,
      progress: record
    });

  } catch (error) {
    console.error('❌ Flow progress API error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to fetch progress.'
    });
  } finally {
    if (client) await client.close();
  }
}
