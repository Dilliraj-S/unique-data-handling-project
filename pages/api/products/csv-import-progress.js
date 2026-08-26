import { getCollection } from '../../../src/lib/mongodb';

/**
 * API: CSV Import Progress Tracking
 * 
 * GET /api/products/csv-import-progress?job_id=xxx
 * 
 * Returns progress of a queued CSV import job (product or company CSV).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const { job_id } = req.query;
  if (!job_id) {
    return res.status(400).json({ status: false, message: 'job_id is required' });
  }

  try {
    const progressCollection = await getCollection('csv_import_progress', 'central');
    const progress = await progressCollection.findOne({ job_id: job_id });

    if (!progress) {
      return res.status(404).json({
        status: false,
        message: 'Import job not found'
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        job_id: progress.job_id,
        import_type: progress.import_type,
        total_records: progress.total_records,
        inserted: progress.inserted,
        skipped: progress.skipped,
        failed: progress.failed,
        status: progress.status,  // 'queued', 'processing', 'completed', 'failed'
        message: progress.message || null,
        started_at: progress.started_at,
        completed_at: progress.completed_at,
        created_at: progress.created_at
      }
    });
  } catch (error) {
    console.error('❌ Progress check error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
}
