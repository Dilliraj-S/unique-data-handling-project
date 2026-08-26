

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { pathToFileURL } = require('url');

// Lazy-load ES modules (loaded once and cached)
let mongodbModule = null;
let mongodbLib = null;
let helpersModule = null;

async function loadMongoDB() {
  if (!mongodbModule) {
    mongodbModule = await import('mongodb');
  }
  return mongodbModule;
}

async function loadMongoDBLib() {
  if (!mongodbLib) {
    // Use absolute path with file:// URL for proper ES module resolution
    const mongodbPath = path.resolve(__dirname, '../src/lib/mongodb.js');
    const mongodbUrl = pathToFileURL(mongodbPath).href;
    mongodbLib = await import(mongodbUrl);
  }
  return mongodbLib;
}

async function loadHelpers() {
  if (!helpersModule) {
    // Use absolute path with file:// URL for proper ES module resolution
    const helpersPath = path.resolve(__dirname, '../pages/api/audiences/helpers.js');
    const helpersUrl = pathToFileURL(helpersPath).href;
    helpersModule = await import(helpersUrl);
  }
  return helpersModule;
}

class SubscriberImportService {
  constructor(options) {
    this.audienceId = options.audienceId;
    this.filePath = options.filePath;
    this.subscribers = options.subscribers || []; // For direct array input
    this.userId = options.userId;
    this.chunkSize = options.chunkSize || 5000; // Process 5000 at a time
    this.job = options.job; // Bull queue job for progress updates
    this.sourceTable = options.sourceTable || null; // Source collection name (e.g., "master_leads")
    this.sourceSystem = options.sourceSystem || null; // Source database name (e.g., "sun")
    this.processedRows = 0;
    this.insertedRows = 0;
    this.skippedRows = 0;
    this.rejectedRows = [];
    this.totalRows = 0;
  }

  /**
   * Process subscribers from array (for API direct calls)
   */
  async processSubscribersArray() {
    // Load ES modules
    const { Long } = await loadMongoDB();
    const { getCollection } = await loadMongoDBLib();
    const { getNextNumericValue, sanitizeSubscriberPayload, toLong } = await loadHelpers();
    
    console.log(`🚀 Processing ${this.subscribers.length} subscribers for audience ${this.audienceId}`);
    
    this.totalRows = this.subscribers.length;
    
    // Validate audience exists
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const numericAudienceId = toLong(this.audienceId);
    const audience = await audiencesCollection.findOne({
      id: numericAudienceId,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!audience) {
      throw new Error('Audience not found');
    }

    // Clean and validate subscribers
    const cleanedSubscribers = this.subscribers
      .map(sanitizeSubscriberPayload)
      .filter(Boolean);

    if (!cleanedSubscribers.length) {
      throw new Error('No valid subscribers found');
    }

    // Get existing emails to avoid duplicates
    const subscribersCollection = await getCollection('subscribers', 'pluto');
    const existing = await subscribersCollection
      .find({
        audience_id: numericAudienceId,
        email: { $in: cleanedSubscribers.map((s) => s.email) }
      })
      .project({ email: 1 })
      .toArray();

    const existingEmails = new Set(
      existing.map((record) => (record.email || '').toLowerCase())
    );

    // Process in chunks
    const chunks = [];
    for (let i = 0; i < cleanedSubscribers.length; i += this.chunkSize) {
      chunks.push(cleanedSubscribers.slice(i, i + this.chunkSize));
    }

    let nextId = await getNextNumericValue(subscribersCollection);
    const now = new Date();

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      const docsToInsert = chunk
        .filter((subscriber) => !existingEmails.has((subscriber.email || '').toLowerCase()))
        .map((subscriber) => ({
          id: Long.fromNumber(nextId++),
          audience_id: numericAudienceId,
          first_name: subscriber.first_name || '',
          last_name: subscriber.last_name || '',
          email: subscriber.email,
          status: 'subscribed',
          created_at: now,
          updated_at: now,
          deleted_at: null,
          created_by: this.userId || null,
          updated_by: this.userId || null,
          source_table: this.sourceTable,
          source_system: this.sourceSystem
        }));

      if (docsToInsert.length > 0) {
        await subscribersCollection.insertMany(docsToInsert);
        this.insertedRows += docsToInsert.length;
      }
      
      this.skippedRows += chunk.length - docsToInsert.length;
      this.processedRows += chunk.length;

      // Update progress if job is available
      if (this.job) {
        const progress = Math.round((this.processedRows / this.totalRows) * 100);
        await this.job.progress(progress);
      }

      console.log(`📊 Processed chunk ${chunkIndex + 1}/${chunks.length}: ${docsToInsert.length} inserted, ${chunk.length - docsToInsert.length} skipped`);
    }

    return {
      total: this.totalRows,
      inserted: this.insertedRows,
      skipped: this.skippedRows,
      rejected: this.rejectedRows.length
    };
  }

  /**
   * Process subscribers from CSV file (for queue-based imports)
   * Optimized for memory efficiency with proper backpressure handling
   */
  async processCsvFile() {
    // Load ES modules
    const { Long } = await loadMongoDB();
    const { getCollection } = await loadMongoDBLib();
    const { getNextNumericValue, toLong } = await loadHelpers();
    
    console.log(`🚀 Processing CSV file: ${this.filePath} for audience ${this.audienceId}`);
    
    if (!fs.existsSync(this.filePath)) {
      throw new Error(`CSV file not found: ${this.filePath}`);
    }

    // For large files, reduce chunk size to prevent memory issues
    // Adjust chunk size based on file size estimate
    const fileStats = fs.statSync(this.filePath);
    const estimatedRows = Math.ceil(fileStats.size / 100); // Rough estimate: ~100 bytes per row
    if (estimatedRows > 10000) {
      this.chunkSize = Math.min(this.chunkSize, 1000); // Use smaller chunks for large files
      console.log(`📦 Adjusted chunk size to ${this.chunkSize} for large file`);
    }

    // Count total rows first (optional - can skip for very large files)
    try {
      this.totalRows = await this.countTotalRows();
      console.log(`📊 Total rows in CSV: ${this.totalRows}`);
    } catch (error) {
      console.warn(`⚠️ Could not count rows, processing without total count: ${error.message}`);
      this.totalRows = 0; // Will estimate progress
    }

    // Validate audience exists
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const numericAudienceId = toLong(this.audienceId);
    const audience = await audiencesCollection.findOne({
      id: numericAudienceId,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!audience) {
      throw new Error('Audience not found');
    }

    const subscribersCollection = await getCollection('subscribers', 'pluto');
    let nextId = await getNextNumericValue(subscribersCollection);
    const now = new Date();
    const documents = [];
    // Only keep emails from current chunk to prevent memory leak
    const currentChunkEmails = new Set();
    let isProcessing = false;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filePath)
        .pipe(csv());

      const processChunk = async () => {
        if (isProcessing || documents.length === 0) return;
        
        isProcessing = true;
        stream.pause(); // Pause stream while processing

        try {
          const chunkToProcess = [...documents];
          const chunkEmails = new Set(chunkToProcess.map(d => d.email));
          documents.length = 0; // Clear array immediately
          currentChunkEmails.clear(); // Clear Set to free memory

          // Check for existing emails in database
          const emailsToCheck = Array.from(chunkEmails);
          const existing = await subscribersCollection
            .find({
              audience_id: numericAudienceId,
              email: { $in: emailsToCheck }
            })
            .project({ email: 1 })
            .toArray();

          const existingSet = new Set(
            existing.map(r => (r.email || '').toLowerCase())
          );

          const docsToInsert = chunkToProcess.filter(d => !existingSet.has(d.email.toLowerCase()));
          
          if (docsToInsert.length > 0) {
            await subscribersCollection.insertMany(docsToInsert);
            this.insertedRows += docsToInsert.length;
          }
          
          this.skippedRows += chunkToProcess.length - docsToInsert.length;
          this.processedRows += chunkToProcess.length;

          // Update progress
          if (this.job) {
            const progress = this.totalRows > 0 
              ? Math.round((this.processedRows / this.totalRows) * 100)
              : Math.min(95, Math.round((this.processedRows / estimatedRows) * 100));
            await this.job.progress(progress);
          }

          console.log(`📊 Processed ${this.processedRows}${this.totalRows > 0 ? `/${this.totalRows}` : ''} rows: ${this.insertedRows} inserted, ${this.skippedRows} skipped`);

          // Force garbage collection hint (if available)
          if (global.gc) {
            global.gc();
          }

          isProcessing = false;
          stream.resume(); // Resume stream after processing
          
          // Check if more documents accumulated while processing
          if (documents.length >= this.chunkSize) {
            processChunk().catch((err) => {
              stream.destroy();
              reject(err);
            });
          }
        } catch (error) {
          isProcessing = false;
          stream.resume();
          reject(error);
        }
      };

      stream.on('data', (row) => {
        try {
          // Map CSV row to subscriber object
          const subscriber = {
            first_name: row.first_name || row['First Name'] || '',
            last_name: row.last_name || row['Last Name'] || '',
            email: (row.email || row.Email || '').trim().toLowerCase()
          };

          if (!subscriber.email) {
            this.rejectedRows.push({
              row: this.processedRows + documents.length + 1,
              reason: 'Missing email'
            });
            return;
          }

          // Check if email already exists in current chunk (not all emails)
          if (currentChunkEmails.has(subscriber.email)) {
            this.skippedRows++;
            return;
          }

          currentChunkEmails.add(subscriber.email);

          const doc = {
            id: Long.fromNumber(nextId++),
            audience_id: numericAudienceId,
            first_name: subscriber.first_name,
            last_name: subscriber.last_name,
            email: subscriber.email,
            status: 'subscribed',
            created_at: now,
            updated_at: now,
            deleted_at: null,
            created_by: this.userId || null,
            updated_by: this.userId || null,
            source_table: this.sourceTable,
            source_system: this.sourceSystem
          };

          documents.push(doc);

          // Insert in chunks with backpressure handling
          if (documents.length >= this.chunkSize && !isProcessing) {
            // Don't await - let it process in background, stream will pause
            processChunk().catch((err) => {
              stream.destroy();
              reject(err);
            });
          }
        } catch (error) {
          this.rejectedRows.push({
            row: this.processedRows + documents.length + 1,
            reason: error.message
          });
        }
      });

      stream.on('end', async () => {
        try {
          // Process remaining documents
          if (documents.length > 0) {
            stream.pause();
            await processChunk();
          }

          // Update final progress
          if (this.job) {
            await this.job.progress(100);
          }

          console.log(`✅ CSV import completed: ${this.insertedRows} inserted, ${this.skippedRows} skipped, ${this.rejectedRows.length} rejected`);

          resolve({
            total: this.totalRows || this.processedRows,
            inserted: this.insertedRows,
            skipped: this.skippedRows,
            rejected: this.rejectedRows.length
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * Count total rows in CSV file
   */
  async countTotalRows() {
    return new Promise((resolve, reject) => {
      let count = 0;
      fs.createReadStream(this.filePath)
        .pipe(csv())
        .on('data', () => count++)
        .on('end', () => resolve(count))
        .on('error', reject);
    });
  }
}

module.exports = SubscriberImportService;

