import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';

/**
 * Start CSV import process - equivalent to processCsv in bv project
 * POST /api/import/start
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      transfer_id, 
      mapped_columns, 
      chunk_size = 500,
      database,
      table,
      type = 'normal'
    } = req.body;

    if (!transfer_id || !mapped_columns) {
      return res.status(400).json({ 
        error: 'Missing required parameters' 
      });
    }

    const filePath = path.join(process.cwd(), 'temp', 'imports', `${transfer_id}.csv`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'CSV file not found' 
      });
    }

    // Initialize progress tracking
    const progressData = {
      transfer_id,
      status: 'processing',
      processed: 0,
      total: 0,
      inserted_rows: 0,
      rejected_rows: 0,
      rejected_file: null,
      started_at: new Date().toISOString()
    };

    // Store progress in memory (in production, use Redis or database)
    global.importProgress = global.importProgress || {};
    global.importProgress[transfer_id] = progressData;

    // Count total rows
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const totalRows = csvContent.split('\n').filter(line => line.trim()).length - 1; // Exclude header
    
    global.importProgress[transfer_id].total = totalRows;

    // Start import worker
    const workerPath = path.join(process.cwd(), 'src', 'server', 'workers', 'importWorker.js');
    const worker = new Worker(workerPath, {
      workerData: {
        transferId: transfer_id,
        filePath,
        mappedColumns: mapped_columns,
        chunkSize: chunk_size,
        database,
        table,
        type
      }
    });

    // Store worker reference for potential cancellation
    global.importWorkers = global.importWorkers || {};
    global.importWorkers[transfer_id] = worker;

    worker.on('message', (message) => {
      if (message.type === 'progress') {
        global.importProgress[transfer_id] = {
          ...global.importProgress[transfer_id],
          ...message.data
        };
      }
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      global.importProgress[transfer_id].status = 'failed';
      global.importProgress[transfer_id].error = error.message;
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
        if (global.importProgress[transfer_id].status === 'processing') {
          global.importProgress[transfer_id].status = 'failed';
        }
      }
      // Clean up worker reference
      delete global.importWorkers[transfer_id];
    });

    return res.status(200).json({
      status: true,
      transfer_id,
      message: 'Import started successfully'
    });

  } catch (error) {
    console.error('Start import error:', error);
    return res.status(500).json({ 
      error: 'Failed to start import', 
      details: error.message 
    });
  }
}
