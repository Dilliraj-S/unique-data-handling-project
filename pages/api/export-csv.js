import { authMiddleware } from '../../src/server/Http/Middleware/auth';
import fs from 'fs';
import path from 'path';

// Disable body size limits for large downloads
export const config = {
  api: {
    responseLimit: false,
  }
};

/**
 * CSV Export API
 * 
 * POST /api/export-csv
 *   - Receives token + filters + columns
 *   - Resolves token → { system, table }
 *   - Queues an export job
 *   - Returns { jobId }
 * 
 * GET /api/export-csv?jobId=X
 *   - Poll job progress
 * 
 * GET /api/export-csv?jobId=X&download=true
 *   - Download result CSV/ZIP file
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Authenticate
  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // ─── GET: Progress Polling or File Download ───
  if (req.method === 'GET') {
    try {
      const { jobId, download } = req.query;

      if (!jobId) {
        return res.status(400).json({ success: false, message: 'jobId is required' });
      }

      const exportQueue = require('../../queues/exportQueue');
      const job = await exportQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      // ─── Download Result ───
      if (download === 'true') {
        const state = await job.getState();
        if (state !== 'completed') {
          return res.status(400).json({
            success: false,
            message: 'Job is not completed yet. Current state: ' + state
          });
        }

        const result = job.returnvalue;
        if (!result) {
          return res.status(404).json({ success: false, message: 'Result not found' });
        }

        const filePaths = result.outputFilePaths || (result.outputFilePath ? [result.outputFilePath] : []);
        const existingPaths = filePaths.filter(fp => fs.existsSync(fp));

        if (existingPaths.length === 0) {
          return res.status(404).json({ success: false, message: 'Result file(s) have been deleted' });
        }

        const baseName = `export_${result.table}_${result.totalRecords}records`;

        // Single file → stream CSV
        if (existingPaths.length === 1) {
          const fileName = `${baseName}.csv`;
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          const fileStream = fs.createReadStream(existingPaths[0]);
          fileStream.pipe(res);
          return;
        }

        // Multiple parts → ZIP
        const archiver = require('archiver');
        const fileName = `${baseName}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const archive = archiver('zip', { zlib: { level: 1 } });
        archive.on('error', (err) => {
          console.error('Archive error:', err);
          if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Failed to create ZIP' });
          }
        });

        archive.pipe(res);
        for (const fp of existingPaths) {
          archive.file(fp, { name: path.basename(fp) });
        }
        await archive.finalize();
        return;
      }

      // ─── Progress Polling ───
      const state = await job.getState();
      const progress = job._progress || {};
      const result = job.returnvalue || null;
      const failedReason = job.failedReason || null;

      return res.status(200).json({
        success: true,
        jobId: job.id,
        state,
        progress,
        result,
        failedReason,
        data: {
          system: job.data.system,
          table: job.data.table,
          totalExpected: job.data.totalExpected || 0
        }
      });
    } catch (error) {
      console.error('Error checking export job:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─── POST: Queue Export Job ───
  if (req.method === 'POST') {
    try {
      const { token, filters, exportColumns, excludedIds, totalExpected, system: frontendSystem, tableName: frontendTable, entity, source: productSource, selectedIds } = req.body;

      let system = frontendSystem;
      let table = frontendTable;

      // Products entity: bypass token resolution, use source → collection mapping
      if (entity === 'products') {
        const SOURCE_MAP = {
          products: 'products',
          apollo: 'apolloproduct',
          g2: 'g2product',
          linkedin: 'linkedinprodcut',
          mssps: 'MSSPsproduct',
          msps: 'MSPsproduct'
        };
        const source = (productSource || 'products').toString().trim().toLowerCase();
        table = SOURCE_MAP[source];
        if (!table) {
          return res.status(400).json({
            success: false,
            message: `Invalid products source: ${productSource}. Use one of: products, apollo, g2, linkedin, mssps, msps`
          });
        }
        system = 'central';
        console.log(`📤 Export CSV requested (products): ${system}.${table} source=${source}, selectedIds=${selectedIds?.length || 0}`);
      } else if (entity === 'companies_products') {
        system = 'central';
        table = 'companies_products';
        console.log(`📤 Export CSV requested (companies_products): ${system}.${table}, selectedIds=${selectedIds?.length || 0}`);
      } else {
        // Token-based export (contacts, companies, etc.)
        if (!token) {
          return res.status(400).json({ success: false, message: 'Token is required' });
        }

        // Resolve token to get system + table
        const SkeletonService = (await import('../../src/services/SkeletonService')).default;
        
        // Build table token (append _t to get the table action token)
        const tableToken = token.endsWith('_t') ? token : `${token}_t`;
        const tokenConfig = await SkeletonService.resolveToken(tableToken);
        
        if (!tokenConfig || !tokenConfig.status) {
          return res.status(400).json({
            success: false,
            message: `Invalid token: ${token}. ${tokenConfig?.message || 'Token not found'}`
          });
        }

        // CRITICAL: Use frontend-provided system/table as overrides
        system = frontendSystem || tokenConfig.system || 'central';
        table = frontendTable || tokenConfig.table;

        if (!table) {
          return res.status(400).json({ success: false, message: 'Could not resolve table from token' });
        }

        console.log(`📤 Export CSV requested: ${system}.${table} (token: ${token})`);
      }
      console.log(`📋 Columns: ${exportColumns?.length || 'all'}, Expected: ~${(totalExpected || 0).toLocaleString()}`);

      // Queue the export job
      const exportQueue = require('../../queues/exportQueue');
      const jobId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

      const job = await exportQueue.add('csv-export', {
        system,
        table,
        filters: filters || {},
        exportColumns: exportColumns || [],
        excludedIds: excludedIds || [],
        // selectedIds is optional and used for both products and token-based exports
        selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
        totalExpected: totalExpected || 0,
        requestedBy: req.user?.email || req.user?.username || 'unknown',
        requestedAt: new Date().toISOString()
      }, {
        jobId
      });

      console.log(`✅ Export job ${job.id} queued: ${system}.${table}`);

      return res.status(200).json({
        success: true,
        message: 'Export job queued',
        jobId: job.id,
        system,
        table,
        totalExpected: totalExpected || 0
      });

    } catch (error) {
      console.error('Error starting CSV export:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to start export'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
