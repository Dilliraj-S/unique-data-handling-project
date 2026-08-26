import fs from 'fs';
import path from 'path';

const JobService = require('../../../services/JobService');

/**
 * Download rejected records CSV file
 * GET /api/import/download-rejected?process_id=xxx
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { process_id } = req.query;

    if (!process_id) {
      return res.status(400).json({ 
        error: 'Missing process_id parameter' 
      });
    }

    // Get process status to find rejected file path
    const jobService = new JobService();
    const processStatus = await jobService.getProcessStatus(process_id);
    
    if (!processStatus || !processStatus.progress.rejected_file_path) {
      return res.status(404).json({ 
        error: 'No rejected file found for this process' 
      });
    }

    const rejectedFilePath = path.join(process.cwd(), processStatus.progress.rejected_file_path);
    
    await jobService.disconnect();

    if (!fs.existsSync(rejectedFilePath)) {
      return res.status(404).json({ 
        error: 'Rejected file not found on disk' 
      });
    }

    const fileContent = fs.readFileSync(rejectedFilePath);
    const fileName = `rejected_${process_id}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileContent.length);

    return res.status(200).send(fileContent);

  } catch (error) {
    console.error('Download rejected file error:', error);
    return res.status(500).json({ 
      error: 'Failed to download rejected file', 
      details: error.message 
    });
  }
}
