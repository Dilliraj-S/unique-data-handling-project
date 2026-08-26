/**
 * Import History API
 * 
 * Fetches complete history of all CSV import operations from process_logs collection.
 * Returns both successful and failed imports with all relevant metadata.
 * 
 * Usage: GET /api/import/history?limit=50&offset=0
 */

const JobService = require('../../../services/JobService');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { limit = 50, offset = 0, status } = req.query;

  try {
    const jobService = new JobService();
    
    // Build query filter - fetch all import records
    // Note: type field can be 'normal', 'import', 'csv_import', etc.
    // We don't filter by type since all process_logs are import-related
    const filter = {};
    
    // Optional status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Fetch from process_logs collection
    const history = await jobService.getProcessHistory({
      filter,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort: { created_at: -1 } // Most recent first
    });
    
    // Transform to frontend-friendly format
    const formattedHistory = history.items.map(item => ({
      id: item.process_id || item._id,
      fileName: item.file || item.metadata?.file || 'Unknown',
      database: item.database || item.metadata?.database || '',
      collection: item.table || item.metadata?.table || '',
      totalRows: item.progress?.total || 0,
      insertedRows: item.progress?.inserted_count || 0,
      rejectedRows: item.progress?.rejected_count || 0,
      status: formatStatus(item.status),
      statusRaw: item.status,
      errorReason: item.error || item.progress?.error || null,
      rejectedFilePath: item.progress?.rejected_file_path || null,
      createdAt: item.created_at,
      completedAt: item.updated_at,
      duration: calculateDuration(item.created_at, item.updated_at),
      userId: item.user_id
    }));

    await jobService.disconnect();

    return res.status(200).json({
      success: true,
      history: formattedHistory,
      pagination: {
        total: history.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + formattedHistory.length) < history.total
      }
    });

  } catch (error) {
    console.error('History fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch history', 
      details: error.message 
    });
  }
}

// Helper: Format status for display
function formatStatus(status) {
  const statusMap = {
    'completed': 'Completed',
    'failed': 'Failed',
    'processing': 'In Progress',
    'pending': 'Pending',
    'cancelled': 'Cancelled',
    'stopped': 'Stopped'
  };
  return statusMap[status] || status;
}

// Helper: Calculate duration
function calculateDuration(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate - startDate;
  
  if (durationMs < 0) return null;
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
