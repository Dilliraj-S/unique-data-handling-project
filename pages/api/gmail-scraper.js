import { getCollection } from '../../src/lib/mongodb.js';
import formidable from 'formidable';
import fs from 'fs';
import csvParser from 'csv-parser';

/**
 * Gmail Photo Scraper API
 * 
 * POST  — Upload CSV + create session
 * PUT   — Start/Pause/Resume/Stop
 * GET   — Stats, Recent results, Download CSV
 * 
 * All data stored in `automation` database:
 * - gmail_scrape_sessions
 * - gmail_scrape_jobs
 * - gmail_scrape_results
 */

export const config = {
  api: {
    bodyParser: false, // formidable handles multipart
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extract user_id from auth header or query (for multi-user isolation)
  const userId = req.headers['x-user-id'] || req.query.user_id || 'default';

  // ═══════════════════════════════════════════════════════════════════
  // POST — Upload CSV, create session + jobs
  // ═══════════════════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const file = files.csv?.[0] || files.csv;
      if (!file) {
        return res.status(400).json({ status: false, message: 'CSV file required (field name: csv)' });
      }

      // Parse CSV and detect email column
      const rows = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.filepath || file.path)
          .pipe(csvParser())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ status: false, message: 'CSV file is empty' });
      }

      // Detect email column
      const headers = Object.keys(rows[0]);
      let emailColumn = headers.find(h => /^email$/i.test(h));
      if (!emailColumn) {
        // Fallback: find column with @ symbols
        emailColumn = headers.find(h => {
          const vals = rows.slice(0, 10).map(r => r[h] || '');
          return vals.filter(v => v.includes('@')).length >= 3;
        });
      }
      if (!emailColumn) {
        return res.status(400).json({
          status: false,
          message: 'Could not detect email column. Ensure CSV has a column named "email" or contains email addresses.'
        });
      }

      // Extract and clean emails
      const validEmails = [];
      const skipped = [];

      for (const row of rows) {
        let email = (row[emailColumn] || '').trim().toLowerCase();
        if (!email || !email.includes('@')) {
          skipped.push(email || '(empty)');
          continue;
        }

        // Fix common suffixes: john@myob.com/au → john@myob.com.au
        const slashMatch = email.match(/^(.+@.+\..+)\/([a-z]{2,3})$/);
        if (slashMatch) {
          email = `${slashMatch[1]}.${slashMatch[2]}`;
        } else if (email.includes('/')) {
          // Skip ambiguous ones like john@abb.com/global
          skipped.push(email);
          continue;
        }

        validEmails.push(email);
      }

      // Deduplicate
      const uniqueEmails = [...new Set(validEmails)];

      if (uniqueEmails.length === 0) {
        return res.status(400).json({ status: false, message: 'No valid emails found in CSV' });
      }

      // Create session
      const sessionId = `gscrape_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
      const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');

      const now = new Date();
      await sessionsCol.insertOne({
        session_id: sessionId,
        user_id: userId,
        status: 'pending',
        login_status: 'waiting',
        browser_count: 3, // default, updated on start
        total_emails: uniqueEmails.length,
        processed: 0,
        with_image: 0,
        no_image: 0,
        failed: 0,
        input_file: file.originalFilename || file.name || 'upload.csv',
        created_at: now,
        updated_at: now,
      });

      // Insert jobs in batches of 5000 (faster bulk insertion for large CSVs)
      for (let i = 0; i < uniqueEmails.length; i += 5000) {
        const batch = uniqueEmails.slice(i, i + 5000).map((email, idx) => ({
          job_id: `${sessionId}_${i + idx}`,
          session_id: sessionId,
          user_id: userId,
          email,
          email_index: i + idx,
          status: 'pending',
          created_at: now,
          updated_at: now,
        }));
        await jobsCol.insertMany(batch, { ordered: false });
      }

      // Ensure indexes
      try {
        await sessionsCol.createIndex({ session_id: 1 }, { unique: true, background: true });
        await jobsCol.createIndex({ session_id: 1, status: 1 }, { background: true });
        await jobsCol.createIndex({ job_id: 1 }, { unique: true, background: true });
        await jobsCol.createIndex({ status: 1, created_at: 1 }, { background: true });
        // Compound index for fast grabBatch() sort by email_index
        await jobsCol.createIndex(
          { session_id: 1, status: 1, email_index: 1 },
          { background: true, name: 'session_status_index' }
        );
      } catch (e) { /* indexes may already exist */ }

      // Cleanup uploaded file
      try { fs.unlinkSync(file.filepath || file.path); } catch (e) { /* ignore */ }

      return res.status(200).json({
        status: true,
        session_id: sessionId,
        total_emails: uniqueEmails.length,
        skipped: skipped.length,
        message: `Session created with ${uniqueEmails.length} emails (${skipped.length} skipped)`,
      });
    } catch (error) {
      console.error('❌ Gmail scraper upload error:', error);
      return res.status(500).json({ status: false, message: error.message || 'Upload failed' });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // PUT — Start / Pause / Resume / Stop
  // ═══════════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      // Parse body manually since bodyParser is disabled
      const body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({}); }
        });
      });

      const { session_id, action } = body;
      if (!session_id || !action) {
        return res.status(400).json({ status: false, message: 'session_id and action required' });
      }

      const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
      const jobsCol = await getCollection('gmail_scrape_jobs', 'automation');
      const session = await sessionsCol.findOne({ session_id });

      if (!session) {
        return res.status(404).json({ status: false, message: 'Session not found' });
      }

      const now = new Date();

      if (action === 'start') {
        // Accept browser_count from client (1-40, default 3)
        const browserCount = Math.min(40, Math.max(1, parseInt(body.browser_count) || 3));

        // Set pending jobs to queued so worker picks them up
        await jobsCol.updateMany(
          { session_id, status: 'pending' },
          { $set: { status: 'queued', updated_at: now } }
        );
        await sessionsCol.updateOne(
          { session_id },
          { $set: { status: 'running', browser_count: browserCount, updated_at: now } }
        );
        return res.status(200).json({ status: true, browser_count: browserCount, message: `Session started with ${browserCount} browser(s). Worker will begin shortly.` });
      }

      if (action === 'pause') {
        await sessionsCol.updateOne(
          { session_id },
          { $set: { status: 'paused', updated_at: now } }
        );
        return res.status(200).json({ status: true, message: 'Session paused' });
      }

      if (action === 'resume') {
        await sessionsCol.updateOne(
          { session_id },
          { $set: { status: 'running', updated_at: now } }
        );
        return res.status(200).json({ status: true, message: 'Session resumed' });
      }

      if (action === 'stop') {
        // Cancel remaining jobs
        await jobsCol.updateMany(
          { session_id, status: { $in: ['pending', 'queued'] } },
          { $set: { status: 'cancelled', updated_at: now } }
        );
        await sessionsCol.updateOne(
          { session_id },
          { $set: { status: 'completed', updated_at: now } }
        );
        return res.status(200).json({ status: true, message: 'Session stopped' });
      }

      return res.status(400).json({ status: false, message: 'Invalid action. Use: start, pause, resume, stop' });
    } catch (error) {
      console.error('❌ Gmail scraper action error:', error);
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // GET — Stats / Recent / Download
  // ═══════════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const { session_id, recent, download, type, list } = req.query;

      // List all sessions
      if (list === 'true') {
        const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
        const sessions = await sessionsCol.find({})
          .sort({ created_at: -1 })
          .limit(20)
          .toArray();
        return res.status(200).json({ status: true, sessions });
      }

      if (!session_id) {
        return res.status(400).json({ status: false, message: 'session_id required' });
      }

      // ── Download CSV ──
      if (download === 'true') {
        const resultsCol = await getCollection('gmail_scrape_results', 'automation');
        const filter = { session_id };
        if (type === 'with-images') {
          filter.has_image = true;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="gmail-photos-${session_id}.csv"`);
        res.write('image_url,email\n');

        const cursor = resultsCol.find(filter).sort({ scraped_at: 1 });
        const BATCH_SIZE = 1000;
        let batch = [];

        while (await cursor.hasNext()) {
          const doc = await cursor.next();
          batch.push(`"${(doc.image_url || '').replace(/"/g, '""')}","${(doc.email || '').replace(/"/g, '""')}"\n`);

          if (batch.length >= BATCH_SIZE) {
            res.write(batch.join(''));
            batch = [];
          }
        }
        if (batch.length > 0) res.write(batch.join(''));
        return res.end();
      }

      // ── Recent results ──
      if (recent === 'true') {
        const resultsCol = await getCollection('gmail_scrape_results', 'automation');
        const results = await resultsCol.find({ session_id })
          .sort({ scraped_at: -1 })
          .limit(20)
          .project({ email: 1, image_url: 1, has_image: 1, scraped_at: 1, _id: 0 })
          .toArray();
        return res.status(200).json({ status: true, results });
      }

      // ── Session stats ──
      const sessionsCol = await getCollection('gmail_scrape_sessions', 'automation');
      const session = await sessionsCol.findOne({ session_id });

      if (!session) {
        return res.status(404).json({ status: false, message: 'Session not found' });
      }

      const percentComplete = session.total_emails > 0
        ? Math.round((session.processed / session.total_emails) * 100)
        : 0;

      return res.status(200).json({
        status: true,
        data: {
          session_id: session.session_id,
          status: session.status,
          login_status: session.login_status,
          total: session.total_emails,
          processed: session.processed,
          with_image: session.with_image,
          no_image: session.no_image,
          failed: session.failed,
          percent_complete: percentComplete,
          is_running: session.status === 'running',
          is_paused: session.status === 'paused',
          session_healthy: session.login_status === 'logged_in' || session.login_status === 'waiting',
          input_file: session.input_file,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
      });
    } catch (error) {
      console.error('❌ Gmail scraper GET error:', error);
      return res.status(500).json({ status: false, message: error.message });
    }
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
}
