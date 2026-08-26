/**
 * API endpoint to fetch workflows
 * Equivalent to bv/app/Http/Controllers/System/Actions/WorkflowCtrl.php
 */

import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../../../src/config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, error: 'Method not allowed' });
  }

  try {
    const moonConfig = getConnectionConfig('moon');
    const client = new MongoClient(moonConfig.uri, moonConfig.options);
    await client.connect();
    const db = client.db(moonConfig.database);

    const workflows = await db
      .collection('workflows')
      .find({ deleted_at: null })
      .toArray();

    const mappedWorkflows = workflows.map((workflow) => ({
      id: workflow.id || workflow._id?.toString(),
      identifier: workflow.identifier || workflow.name,
      name: workflow.name || 'Unnamed Workflow',
      type: ['wf', 'wmf', 'mf'].includes(workflow.type) ? workflow.type : 'wf',
      required_headers: Array.isArray(workflow.required_headers)
        ? workflow.required_headers
        : workflow.required_headers
        ? JSON.parse(workflow.required_headers)
        : [],
      update_headers: Array.isArray(workflow.update_headers)
        ? workflow.update_headers
        : workflow.update_headers
        ? JSON.parse(workflow.update_headers)
        : [],
      mapping_headers: Array.isArray(workflow.mapping_headers)
        ? workflow.mapping_headers
        : workflow.mapping_headers
        ? JSON.parse(workflow.mapping_headers)
        : [],
      mandatory: workflow.mandatory ?? 1,
      support_table: workflow.support_table || null,
    }));

    await client.close();

    return res.status(200).json({
      status: true,
      data: mappedWorkflows,
    });
  } catch (error) {
    console.error('Workflows API error:', error);
    return res.status(500).json({
      status: false,
      error: error.message || 'Failed to fetch workflows',
    });
  }
}

