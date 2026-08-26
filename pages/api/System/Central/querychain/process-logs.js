/**
 * Process Logs API
 * Fetches process logs for display in process-logs page
 * Equivalent to ProcessFlowHelper::fetchLogs() in BV project
 */

import ProcessFlowHelper from '../../../../../src/application/Services/ProcessFlowHelper.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: false,
      title: 'Method Not Allowed',
      message: 'Only GET requests are allowed.',
    });
  }

  try {
    const { process_id } = req.query;

    // Fetch logs using ProcessFlowHelper
    const logs = await ProcessFlowHelper.fetchLogs(process_id || null);

    return res.status(200).json({
      status: true,
      data: logs,
      title: 'Process Logs Retrieved',
      message: 'Process logs retrieved successfully.',
    });
  } catch (error) {
    console.error('❌ Process Logs API error:', error);
    return res.status(500).json({
      status: false,
      title: 'Error',
      message: error.message || 'An error occurred while fetching process logs.',
    });
  }
}

