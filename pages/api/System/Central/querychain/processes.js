/**
 * API endpoint to fetch predefined processes
 * Equivalent to moon.processes collection queries
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

    const processes = await db
      .collection('processes')
      .find({ deleted_at: null })
      .sort({ created_at: -1 })
      .toArray();

    const mappedProcesses = processes.map((process) => ({
      process_id: process.process_id,
      name: process.name,
      flows: Array.isArray(process.flows)
        ? process.flows
        : process.flows
        ? JSON.parse(process.flows)
        : [],
      mode: process.mode || 'flow',
      input_source: process.input_source,
      output_target: process.output_target,
      input_db: process.input_db || null,
      input_table: process.input_table || null,
      output_db: process.output_db || null,
      output_table: process.output_table || null,
      input_columns: process.input_columns || [],
      created_at: process.created_at,
      updated_at: process.updated_at,
    }));

    await client.close();

    return res.status(200).json({
      status: true,
      data: mappedProcesses,
    });
  } catch (error) {
    console.error('Processes API error:', error);
    return res.status(500).json({
      status: false,
      error: error.message || 'Failed to fetch processes',
    });
  }
}

