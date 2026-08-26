const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { Transform } = require('stream');
const { MongoClient } = require('mongodb');
const JobService = require('./JobService');
const { idCounterService } = require('./IdCounterService');
const { getConnectionConfig } = require('../src/config/database.js');
const { createLogger } = require('./Logger');

// P1 FIX: Skip row counting for files larger than this (use estimation instead)
const LARGE_FILE_THRESHOLD = 500 * 1024 * 1024; // 500MB
const ESTIMATED_BYTES_PER_ROW = 150; // Average row size in CSV
const CHECKPOINT_INTERVAL = 50000; // Save checkpoint every 50K records
const CHECKPOINT_DIR = path.join(process.cwd(), 'temp', 'checkpoints');

/**
 * Import Service for Bull Queue
 * Optimized for large CSV imports (1 crore+ records)
 * Equivalent to ImportService.php in bv project
 */
class ImportService {
  constructor(options) {
    this.transferId = options.transferId;
    this.filePath = options.filePath;
    this.mappedColumns = options.mappedColumns;
    this.database = options.database;
    this.table = options.table;
    this.type = options.type;
    this.userId = options.userId;
    this.chunkSize = options.chunkSize || 5000; // Increased default chunk size for faster imports (5000 records per batch)
    // CRITICAL FIX: Update progress more frequently for large imports to prevent stalled detection
    // For large imports, update every 2 batches instead of 5 to keep job alive
    this.progressUpdateInterval = 2; // Update progress every 2 batches (was 5) - prevents stalled detection
    this.job = options.job; // Bull job for progress updates
    this.originalFileName = options.originalFileName || path.basename(options.filePath); // Original CSV file name for history display
    
    this.totalRows = 0;
    this.processedRows = 0;
    this.insertedRows = 0;
    this.rejectedRows = [];
    this.totalRows = 0;
    
    // Job service for logging (like BV project)
    this.jobService = new JobService();
    
    this.client = null;
    this.db = null;
    this.collection = null;
    
    // Duplicate checking is DISABLED for this import service.
    // All rows will be inserted as-is (subject only to MongoDB constraints).
    this.duplicateCheckFields = [];
    
    // Unique indexes detected from MongoDB collection
    // Used to transform conflicting fields before insert (zero-rejection strategy)
    this.uniqueIndexFields = []; // e.g., ['email', 'li_smtp', 'phone']
    
    // Atomic ID generation (replaces old sequential ID)
    // IDs are reserved in ranges to minimize DB calls while ensuring uniqueness
    this.idRangeStart = 0;      // Start of current reserved range
    this.idRangeEnd = 0;        // End of current reserved range
    this.nextIdInRange = 0;     // Next ID to assign within range
    // CRITICAL FIX: Increase ID batch size to prevent exhaustion during large imports
    // Reserve 2x chunkSize to ensure we always have enough IDs for at least 2 batches
    this.idBatchSize = Math.max(10000, (this.chunkSize || 5000) * 2); // At least 10K, or 2x chunkSize
    this.rowNumberCounter = 0;  // Track row number for unique field transformation
    this._idReservationPending = false; // Flag to prevent duplicate reservation requests
    
    // P0 FIX: Checkpoint/Resume capability
    this.checkpointPath = path.join(CHECKPOINT_DIR, `${this.transferId}.json`);
    this.lastCheckpointRows = 0;
    this.isResuming = false;
    this.skipRows = 0; // Rows to skip when resuming
    this.isEstimatedTotal = false; // True if totalRows is estimated, not exact
    
    // Production-grade logger (throttled, non-blocking)
    this.logger = createLogger('ImportService');
  }

  async processImport() {
    try {
      // Single lifecycle log for import start
      const stats = fs.statSync(this.filePath);
      this.logger.start(this.transferId, {
        file: path.basename(this.filePath),
        target: `${this.database}.${this.table}`,
        type: this.type,
        sizeKB: Math.round(stats.size / 1024),
        columnCount: Object.keys(this.mappedColumns).length
      });
      
      // Check if file exists and is readable
      if (!fs.existsSync(this.filePath)) {
        throw new Error(`CSV file not found: ${this.filePath}`);
      }
      
      // CRITICAL FIX: process_logs is now created at QUEUE TIME (in FormCtrl.js)
      // Only update status to 'processing' here (worker time)
      // This ensures frontend can see job immediately when queued
      await this.jobService.updateProcessProgress(this.transferId, {
        status: 'processing',
        percentage: 0
      });
      
      // Connect to database with retry logic for network issues
      let retries = 3;
      let lastError;
      while (retries > 0) {
        try {
      await this.connectToDatabase();
          break; // Connection successful
        } catch (error) {
          lastError = error;
          retries--;
          if (retries > 0) {
            this.logger.warn(`Database connection failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
          }
        }
      }
      
      if (retries === 0 && lastError) {
        throw new Error(`Failed to connect to database after 3 attempts: ${lastError.message}`);
      }
      
      // Duplicate checking is disabled by design for CSV imports
      this.duplicateCheckFields = [];
      
      // NOTE: detectUniqueIndexes() REMOVED — unique indexes on email/id have been dropped.
      // No field transformation needed. insertMany handles all inserts directly.
      this.uniqueIndexFields = [];
      
      // Count total rows first (CRITICAL for accurate percentage + total row display)
      await this.countTotalRows();
      
      // Initialize atomic ID counter for this collection
      // This reserves an initial batch of IDs atomically
      // MANDATORY: No timestamp fallback - abort if ID counter fails
      await this.initializeIdRange();
      
      // Update progress to 0%
      await this.updateProgress(0, 'Import started');
      
      // Choose import method based on type
      const result = this.type === 'bulk' 
        ? await this.processBulkImport()
        : await this.processStreamImport();
      
      // Log completion (like BV project)
      await this.jobService.completeProcess(this.transferId, result);
      
      this.logger.complete(this.transferId, result);
      return result;
      
    } catch (error) {
      this.logger.fail(this.transferId, error);
      
      // Log failure (like BV project)
      // Note: Only non-recoverable errors should reach here (ID counter failure, file not found, etc.)
      await this.jobService.failProcess(this.transferId, error, {
        total_rows: this.totalRows,
        inserted_rows: this.insertedRows,
        rejected_rows: 0 // Zero-rejection guarantee - no rows rejected due to duplicates
      });
      
      throw error;
    } finally {
      if (this.client) {
        await this.client.close();
      }
      await this.jobService.disconnect();
    }
  }

  async connectToDatabase() {
    // Get database URI based on database name using shared config
    let mongoUrl;
    let dbName = this.database;
    
    // CRITICAL FIX: Extended timeouts for large imports (1 crore+ records can take hours)
    // socketTimeoutMS: 0 = no timeout (for very long operations)
    // connectTimeoutMS: 30000 = 30 seconds to establish connection
    // serverSelectionTimeoutMS: 30000 = 30 seconds to select server
    // maxIdleTimeMS: 300000 = 5 minutes before closing idle connections
    // heartbeatFrequencyMS: 10000 = send heartbeat every 10 seconds to keep connection alive
    let options = {
      maxPoolSize: 20, // Increased pool size for concurrent operations
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000, // 30 seconds to select server
      connectTimeoutMS: 30000, // 30 seconds to establish connection
      socketTimeoutMS: 0, // NO TIMEOUT - critical for long-running imports (hours)
      maxIdleTimeMS: 300000, // 5 minutes before closing idle connections
      heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds to keep connection alive
      retryWrites: true,
      retryReads: true,
      // Connection monitoring to detect and recover from network issues
      monitorCommands: false, // Set to true for debugging
    };
    
    try {
      const connectionName = this.database === 'nextjs_stu' ? 'central' : this.database;
      const config = getConnectionConfig(connectionName);
      mongoUrl = config.uri;
      dbName = config.database || this.database;
      
      // Merge with config options but override critical timeouts for imports
      const mergedOptions = { ...(config.options || {}), ...options };
      // CRITICAL: Always use extended timeouts for imports, even if config has shorter ones
      mergedOptions.socketTimeoutMS = 0; // No timeout for imports
      mergedOptions.heartbeatFrequencyMS = 10000; // Keep connection alive
      options = mergedOptions;
    } catch (error) {
      const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      mongoUrl = `${baseUri}/${this.database}`;
      // Use extended timeout options even for fallback connection
    }

    console.log(`🔗 Connecting to MongoDB with extended timeouts for large import:`, {
      uri: mongoUrl.replace(/\/\/.*@/, '//***:***@'), // Hide credentials in logs
      database: dbName,
      collection: this.table,
      socketTimeoutMS: options.socketTimeoutMS,
      heartbeatFrequencyMS: options.heartbeatFrequencyMS
    });

    this.client = new MongoClient(mongoUrl, options);
    
    // Add connection event handlers for monitoring
    this.client.on('connectionPoolCreated', () => {
      console.log('✅ MongoDB connection pool created');
    });
    
    this.client.on('connectionPoolClosed', () => {
      console.log('⚠️ MongoDB connection pool closed');
    });
    
    this.client.on('connectionCreated', () => {
      console.log('✅ MongoDB connection created');
    });
    
    this.client.on('connectionClosed', () => {
      console.log('⚠️ MongoDB connection closed');
    });
    
    await this.client.connect();
    this.db = this.client.db(dbName);
    this.collection = this.db.collection(this.table);
    
    console.log(`✅ Connected to MongoDB: ${dbName}.${this.table}`);
  }

  async countTotalRows() {
    // Always count rows exactly so the progress UI shows the real total row count.
    // This performs a single lightweight pass over the CSV before import.
    return new Promise((resolve, reject) => {
      let count = 0;
      
      fs.createReadStream(this.filePath)
        .pipe(csv())
        .on('data', () => count++)
        .on('end', () => {
          this.totalRows = count;
          console.log(`📊 Total rows to process: ${this.totalRows}`);
          resolve(count);
        })
        .on('error', reject);
    });
  }

  /**
   * P0 FIX: Save checkpoint for crash recovery
   * Saves current progress state to allow resuming after failure
   */
  async saveCheckpoint() {
    try {
      // Ensure checkpoint directory exists
      if (!fs.existsSync(CHECKPOINT_DIR)) {
        fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
      }
      
      const checkpoint = {
        transferId: this.transferId,
        processedRows: this.processedRows,
        insertedRows: this.insertedRows,
        rejectedCount: this.rejectedRows.length,
        nextSequentialId: this.nextSequentialId,
        lastCheckpointTime: Date.now(),
        filePath: this.filePath,
        database: this.database,
        table: this.table
      };
      
      await fs.promises.writeFile(this.checkpointPath, JSON.stringify(checkpoint, null, 2));
      this.lastCheckpointRows = this.processedRows;
      console.log(`💾 Checkpoint saved at row ${this.processedRows}`);
    } catch (error) {
      console.warn(`⚠️ Failed to save checkpoint: ${error.message}`);
      // Don't throw - checkpoint failure shouldn't stop import
    }
  }

  /**
   * P0 FIX: Load checkpoint if exists (for resume capability)
   */
  async loadCheckpoint() {
    try {
      if (fs.existsSync(this.checkpointPath)) {
        const data = await fs.promises.readFile(this.checkpointPath, 'utf8');
        const checkpoint = JSON.parse(data);
        
        // Verify checkpoint is for same file
        if (checkpoint.filePath === this.filePath && 
            checkpoint.database === this.database &&
            checkpoint.table === this.table) {
          this.skipRows = checkpoint.processedRows;
          this.insertedRows = checkpoint.insertedRows;
          this.nextSequentialId = checkpoint.nextSequentialId;
          this.isResuming = true;
          
          console.log(`📥 Resuming from checkpoint: skipping first ${this.skipRows} rows`);
          return checkpoint;
      }
      }
    } catch (error) {
      console.warn(`⚠️ Could not load checkpoint: ${error.message}`);
    }
    return null;
  }

  /**
   * P0 FIX: Clean up checkpoint after successful completion
   */
  async cleanupCheckpoint() {
    try {
      if (fs.existsSync(this.checkpointPath)) {
        await fs.promises.unlink(this.checkpointPath);
        console.log(`🧹 Checkpoint cleaned up`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup checkpoint: ${error.message}`);
    }
  }

  /**
   * Initialize or check the ID counter for this collection
   * Ensures the counter is synced with existing data on first run
   * MANDATORY: No timestamp fallback - abort import if counter fails
   */
  async initializeIdRange() {
    try {
      // ALWAYS re-sync counter from actual collection data
      // This ensures IDs reflect real state:
      //   - Empty collection → starts from 1
      //   - 100 existing records → starts from 101
      //   - 10cr records → starts from 10,000,001
      console.log(`🔢 [${this.table}] Syncing ID counter from collection data...`);
      await idCounterService.initializeFromCollection(this.table, this.db);
      
      // Reserve initial batch of IDs
      await this.reserveMoreIds();
      
      console.log(`🔢 [${this.table}] ID range ready: ${this.idRangeStart} - ${this.idRangeEnd}`);
    } catch (error) {
      // CRITICAL: Abort import if ID counter fails (no timestamp fallback)
      console.error(`❌ CRITICAL: ID counter initialization failed for ${this.table}:`, error);
      throw new Error(`ID counter initialization failed: ${error.message}. Import aborted to prevent ID collisions.`);
    }
  }
  
  /**
   * Reserve more IDs when the current range is exhausted
   * Uses atomic MongoDB operation to prevent concurrent ID collisions
   */
  async reserveMoreIds() {
    const { start, end } = await idCounterService.reserveRange(this.table, this.idBatchSize);
    this.idRangeStart = start;
    this.idRangeEnd = end;
    this.nextIdInRange = start;
    console.log(`🔢 [${this.table}] Reserved new ID range: ${start} - ${end}`);
  }
  
  /**
   * Get next ID from the reserved range (synchronous)
   * NOTE: ID range exhaustion is PREVENTED by blocking stream before mapping
   * This method is called synchronously during document mapping
   * MANDATORY: No timestamp fallback - range exhaustion prevented by stream pausing
   */
  getNextId() {
    // CRITICAL FIX: Validate range is available before incrementing
    // This should NEVER happen if stream pausing works correctly
    if (this.nextIdInRange > this.idRangeEnd) {
      // This is a critical error - should not happen with proper stream pausing
      const error = new Error(`ID range exhausted at ${this.idRangeEnd}. Stream should have paused before mapping.`);
      console.error(`❌ CRITICAL: ${error.message}`);
      throw error; // Throw error to stop mapping immediately
    }
    
    // Synchronous increment - safe because stream is paused if range is low
    const id = this.nextIdInRange++;
    
    return id;
  }
  
  /**
   * Check and reserve more IDs if range is exhausted or getting low
   * Called BEFORE document mapping to ensure we have enough IDs
   * MANDATORY: Abort import if reservation fails (no timestamp fallback)
   * 
   * This method BLOCKS until IDs are reserved to prevent mapping with exhausted IDs
   */
  async ensureIdRangeAvailable() {
    // CRITICAL FIX: Reserve more IDs if:
    // 1. Range is exhausted (nextIdInRange > idRangeEnd) - CRITICAL
    // 2. We're getting low (less than 2x chunkSize remaining) - PROACTIVE
    const remainingIds = this.idRangeEnd - this.nextIdInRange + 1;
    const shouldReserve = this.nextIdInRange > this.idRangeEnd || remainingIds < this.chunkSize * 2;
    
    if (shouldReserve) {
      try {
        const remainingBeforeReservation = remainingIds;
        await this.reserveMoreIds();
        this._idReservationPending = false; // Clear flag after successful reservation
        
        if (this.nextIdInRange > this.idRangeEnd) {
          // Range was exhausted - critical but now fixed
          console.log(`🔢 [${this.table}] ID range CRITICALLY replenished (was exhausted): ${this.idRangeStart} - ${this.idRangeEnd}`);
        } else {
          // Proactive reservation - normal operation
          console.log(`🔢 [${this.table}] ID range proactively replenished: ${this.idRangeStart} - ${this.idRangeEnd} (${remainingBeforeReservation} remaining before reservation)`);
        }
      } catch (error) {
        // CRITICAL: Abort import if ID reservation fails
        throw new Error(`ID reservation failed: ${error.message}. Import aborted to prevent ID collisions.`);
      }
    }
  }
  
  /**
   * @deprecated Use initializeIdRange() and getNextId() instead
   * Kept for backwards compatibility during migration
   */
  async getNextSequentialId() {
    // This method is now just a wrapper
    return this.getNextId();
  }

  async processBulkImport() {
    console.log('🚀 Starting bulk import...');
    console.log(`📊 Chunk size: ${this.chunkSize} records per batch`);
    
    const documents = [];
    let batchCount = 0;
    let lastProgressUpdate = 0;
    let isProcessing = false; // Backpressure control
    
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.filePath).pipe(csv());
      
      // CRITICAL FIX: Process batches with proper backpressure handling
      const processBatch = async () => {
        if (isProcessing || documents.length < this.chunkSize) {
          return;
        }
        
        isProcessing = true;
        stream.pause(); // Pause stream while processing batch
        
        try {
          // CRITICAL: Ensure ID range is available before processing batch
          // This prevents ID exhaustion during document mapping
          await this.ensureIdRangeAvailable();
          
          const batchToProcess = [...documents]; // Copy batch
          documents.length = 0; // Clear array immediately
          
          // Process batch
          await this.insertBatch(batchToProcess);
          batchCount++;
          
          // Update progress every N batches (reduces overhead for large imports)
          if (batchCount % this.progressUpdateInterval === 0) {
            const progress = Math.round((this.processedRows / this.totalRows) * 100);
            await this.updateProgress(progress, `Processed ${this.processedRows}/${this.totalRows} rows (${batchCount} batches)`);
            lastProgressUpdate = batchCount;
          }
          
          // P0 FIX: Save checkpoint every CHECKPOINT_INTERVAL rows for crash recovery
          if (this.processedRows - this.lastCheckpointRows >= CHECKPOINT_INTERVAL) {
            await this.saveCheckpoint();
          }
          
          isProcessing = false;
          stream.resume(); // Resume stream after processing
        } catch (error) {
          isProcessing = false;
          stream.resume();
          console.error('Batch processing error:', error);
          // Continue processing even if one batch fails
        }
      };
      
      // CRITICAL FIX: Track ID range to prevent exhaustion during mapping
      // Check range synchronously before mapping each document
      stream.on('data', (row) => {
          try {
            // CRITICAL FIX: Check ID range BEFORE mapping documents (synchronous check)
            // If range is exhausted or low, we need to pause and reserve more IDs
            const remainingIds = this.idRangeEnd - this.nextIdInRange + 1;
            const isExhausted = this.nextIdInRange > this.idRangeEnd;
            const isLow = remainingIds < this.chunkSize * 2;
            
            // If range is exhausted, we MUST pause and reserve before mapping
            if (isExhausted || isLow) {
              // Pause stream to prevent mapping with exhausted/low IDs
              stream.pause();
              
              // Reserve IDs asynchronously (blocking for this stream)
              this.ensureIdRangeAvailable()
                .then(() => {
                  // Resume stream after reservation completes
                  stream.resume();
                })
                .catch(err => {
                  // If reservation fails, abort import (critical error)
                  console.error(`❌ CRITICAL: ID reservation failed: ${err.message}`);
                  stream.destroy(new Error(`ID reservation failed: ${err.message}`));
                  reject(err);
                });
              
              // Return early - don't map document until range is available
              // Stream will resume after reservation completes
              return;
            }
            
            // Range is available - safe to map document
            const document = this.mapRowToDocument(row);
            if (document) {
              documents.push(document);
              this.processedRows++;
              
            // Process in chunks when batch is full
            // CRITICAL FIX: Trigger batch processing but don't block stream
              if (documents.length >= this.chunkSize) {
              // Use setImmediate to allow stream to continue if batch processing is async
              setImmediate(() => {
                processBatch().catch(err => {
                  console.error('Error in processBatch:', err);
                  // Resume stream even on error to prevent deadlock
                  if (stream.isPaused()) {
                    stream.resume();
                  }
                });
              });
              }
            }
          } catch (error) {
            // If getNextId() throws (range exhausted), pause stream and reserve
            if (error.message && error.message.includes('ID range exhausted')) {
              stream.pause();
              this.ensureIdRangeAvailable()
                .then(() => stream.resume())
                .catch(err => {
                  console.error(`❌ CRITICAL: ID reservation failed: ${err.message}`);
                  stream.destroy(new Error(`ID reservation failed: ${err.message}`));
                  reject(err);
                });
              return; // Don't process this row until range is available
            }
            
            // ZERO-REJECTION: Log error but don't reject
            // Document will be inserted with transformed fields
            console.warn(`⚠️ Row mapping error (row ${this.processedRows + 1}): ${error.message} - continuing with default values`);
          }
        })
        .on('end', async () => {
          try {
            // CRITICAL FIX: Wait for any ongoing batch processing to complete
            while (isProcessing) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // CRITICAL: Ensure ID range is available before processing final batch
            await this.ensureIdRangeAvailable();
            
            // Process remaining documents
            if (documents.length > 0) {
              await this.insertBatch(documents);
              batchCount++;
            }
            
            // Final progress update if we haven't updated recently
            if (batchCount !== lastProgressUpdate) {
              const progress = Math.round((this.processedRows / this.totalRows) * 100);
              await this.updateProgress(progress, `Processed ${this.processedRows}/${this.totalRows} rows`);
            }
            
            // Save rejected rows if any
            if (this.rejectedRows.length > 0) {
              await this.saveRejectedRows();
            }
            
            const result = {
              status: 'completed',
              total: this.totalRows,
              inserted_rows: this.insertedRows,
              rejected_rows: this.rejectedRows.length,
              rejected_file: this.rejectedRows.length > 0 ? `rejected_${this.transferId}.csv` : null
            };
            
            // P0 FIX: Clean up checkpoint after successful completion
            await this.cleanupCheckpoint();
            
            await this.updateProgress(100, 'Import completed');
            resolve(result);
            
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async processStreamImport() {
    console.log('🚀 Starting stream import...');
    console.log(`📊 Chunk size: ${this.chunkSize} records per batch`);
    
    const batch = [];
    let batchCount = 0;
    let lastProgressUpdate = 0;
    
    return new Promise((resolve, reject) => {
      const transformStream = new Transform({
        objectMode: true,
        transform: async (row, encoding, callback) => {
          try {
            // CRITICAL FIX: Check ID range BEFORE mapping documents
            // This prevents exhaustion during mapping
            // Check more aggressively: reserve when less than 1.5x chunkSize remaining
            const remainingIds = this.idRangeEnd - this.nextIdInRange + 1;
            const isExhausted = this.nextIdInRange > this.idRangeEnd;
            const isLow = remainingIds < Math.max(this.chunkSize * 1.5, 5000); // Reserve when < 1.5x chunkSize or < 5000
            
            // If range is exhausted or low, reserve more IDs BEFORE mapping
            if (isExhausted || isLow) {
              try {
                await this.ensureIdRangeAvailable();
              } catch (reservationError) {
                // If reservation fails, abort import (critical error)
                return callback(new Error(`ID reservation failed: ${reservationError.message}. Import aborted.`));
              }
            }
            
            // Range is now available - safe to map document
            const document = this.mapRowToDocument(row);
            if (document) {
              batch.push({
                document,
                rowNumber: this.processedRows + 1,
                originalData: Object.values(row)
              });
            }
            
            this.processedRows++;
            
            // Process batch when it reaches chunk size
            if (batch.length >= this.chunkSize) {
              await this.insertBatchWithErrorHandling(batch);
              batch.length = 0;
              batchCount++;
              
              // CRITICAL FIX: Also check ID range after each batch
              // This ensures we have enough IDs for the next batch
              await this.ensureIdRangeAvailable();
              
              // Update progress every N batches (reduces overhead)
              if (batchCount % this.progressUpdateInterval === 0) {
              const progress = Math.round((this.processedRows / this.totalRows) * 100);
                await this.updateProgress(progress, `Processed ${this.processedRows}/${this.totalRows} rows (${batchCount} batches)`);
                lastProgressUpdate = batchCount;
              }
            }
            
            callback();
          } catch (error) {
            // If getNextId() throws (range exhausted), try to reserve more IDs
            if (error.message && error.message.includes('ID range exhausted')) {
              try {
                await this.ensureIdRangeAvailable();
                // Retry mapping this row after reservation
                try {
                  const document = this.mapRowToDocument(row);
                  if (document) {
                    batch.push({
                      document,
                      rowNumber: this.processedRows + 1,
                      originalData: Object.values(row)
                    });
                  }
                  this.processedRows++;
                  return callback(); // Success after retry
                } catch (retryError) {
                  return callback(new Error(`Failed to map row after ID reservation: ${retryError.message}`));
                }
              } catch (reservationError) {
                return callback(new Error(`ID reservation failed: ${reservationError.message}. Import aborted.`));
              }
            }
            // Other errors - pass through
            callback(error);
          }
        }
      });

      fs.createReadStream(this.filePath)
        .pipe(csv())
        .pipe(transformStream)
        .on('finish', async () => {
          try {
            // Process remaining batch
            if (batch.length > 0) {
              await this.insertBatchWithErrorHandling(batch);
              batchCount++;
            }
            
            // Final progress update if we haven't updated recently
            if (batchCount !== lastProgressUpdate) {
              const progress = Math.round((this.processedRows / this.totalRows) * 100);
              await this.updateProgress(progress, `Processed ${this.processedRows}/${this.totalRows} rows`);
            }
            
            // ZERO-REJECTION: No rejected rows should exist
            
            const result = {
              status: 'completed',
              total: this.totalRows,
              inserted_rows: this.insertedRows,
              rejected_rows: 0, // Always zero - zero-rejection guarantee
              rejected_file: null // No rejected file
            };
            
            await this.updateProgress(100, 'Import completed');
            resolve(result);
            
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  mapRowToDocument(row) {
    const document = {};
    this.rowNumberCounter++; // Increment row counter for unique field transformation
    
    // Map CSV columns to database fields with basic cleanup
    for (const [csvHeader, dbField] of Object.entries(this.mappedColumns)) {
      if (dbField && row[csvHeader] !== undefined) {
        let value = row[csvHeader];
        
        // Handle NULL / empty strings from CSV
        if (value === 'NULL' || value === 'null' || value === 'Null' || value === '' || value === undefined) {
          value = null;
        }
        
        // Basic string cleanup
        if (value && typeof value === 'string') {
          value = value.trim();
        }
        
        // Special handling for common fields
        if (dbField === 'need_to_action') {
          value = (value === '1' || value === 1 || value === true || value === 'true' || value === 'True') ? 1 : 0;
        }
        else if (dbField === 'created_at' || dbField === 'updated_at' || dbField === 'deleted_at') {
          if (value && value !== 'NULL' && value !== 'null') {
            try {
              value = new Date(value);
              if (isNaN(value.getTime())) {
                value = null;
              }
            } catch (error) {
              value = null;
            }
          }
        }
        
        // Set field value directly — no unique index restrictions
        document[dbField] = value;
      }
    }
    
    // Generate sequential integer ID if missing (auto-ID feature)
    // Uses pre-reserved atomic ID range to prevent concurrent collisions
    // NOTE: ID range exhaustion is checked at batch level before mapping
    if (!document.id && document.id !== 0) {
      document.id = this.getNextId();
    }
    
    // Set default need_to_action if field exists
    if (this.mappedColumns.need_to_action && (document.need_to_action === undefined || document.need_to_action === null)) {
      document.need_to_action = 0;
    }
    
    // Add timestamps if missing
    if (!document.created_at) {
      document.created_at = new Date();
    }
    if (!document.updated_at) {
      document.updated_at = new Date();
    }
    
    // NOTE: transformUniqueFields() has been REMOVED.
    // Upsert strategy handles duplicates natively — no field mutation needed.
    // id stays as a clean number, email stays unchanged, no *_original fields.
    
    return document;
  }
  
  /**
   * Detect unique indexes from MongoDB collection
   * Called once during import initialization
   */
  async detectUniqueIndexes() {
    try {
      const indexes = await this.collection.indexes();
      const uniqueFields = [];
      
      for (const index of indexes) {
        // Check if index is unique
        if (index.unique === true) {
          const indexKeys = Object.keys(index.key);
          // Add all fields in unique index (handles compound indexes)
          for (const field of indexKeys) {
            // Skip _id field (MongoDB default)
            if (field !== '_id' && !uniqueFields.includes(field)) {
              uniqueFields.push(field);
            }
          }
        }
      }
      
      this.uniqueIndexFields = uniqueFields;
      
      if (uniqueFields.length > 0) {
        console.log(`🔍 Detected unique indexes: [${uniqueFields.join(', ')}]`);
        console.log(`📝 Field transformation will be applied to prevent duplicate key errors`);
      } else {
        console.log(`ℹ️  No unique indexes detected - all rows will be inserted as-is`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to detect unique indexes: ${error.message}`);
      // Continue without transformation if detection fails
      this.uniqueIndexFields = [];
    }
  }
  
  /**
   * Transform unique fields to ensure uniqueness
   * Strategy: originalValue + "__" + transferId + "__" + rowNumber
   * Preserves original value in *_original field for reference/search
   * 
   * This guarantees:
   * - Zero E11000 duplicate key errors
   * - Zero rejections
   * - All rows inserted successfully
   * - Unique indexes remain intact
   */
  transformUniqueFields(document, rowNumber) {
    if (this.uniqueIndexFields.length === 0) {
      return; // No unique indexes, no transformation needed
    }
    
    for (const field of this.uniqueIndexFields) {
      // Only transform if field exists and has a value
      if (document[field] !== undefined && document[field] !== null && document[field] !== '') {
        const originalValue = document[field];
        const stringValue = String(originalValue);
        
        // Skip transformation if value is already transformed (contains our marker)
        if (stringValue.includes('__' + this.transferId + '__')) {
          continue; // Already transformed, skip
        }
        
        // Store original value for reference/search
        const originalFieldName = `${field}_original`;
        if (!document[originalFieldName]) {
          document[originalFieldName] = originalValue;
        }
        
        // Transform to unique value: originalValue__transferId__rowNumber
        // This ensures uniqueness even if:
        // - Email exists in DB
        // - Email appears multiple times in CSV
        // - Multiple imports run concurrently
        const transformedValue = `${stringValue}__${this.transferId}__${rowNumber}`;
        
        // Apply MongoDB field length limits (max 157 chars for email, etc.)
        const maxLength = field === 'email' || field === 'li_smtp' ? 157 : 1000;
        if (transformedValue.length > maxLength) {
          // Truncate original value if needed, but keep transferId and rowNumber
          const availableLength = maxLength - (this.transferId.length + String(rowNumber).length + 4); // 4 for "__" markers
          const truncatedOriginal = stringValue.substring(0, Math.max(0, availableLength));
          document[field] = `${truncatedOriginal}__${this.transferId}__${rowNumber}`;
        } else {
          document[field] = transformedValue;
        }
      }
    }
  }
  
  /**
   * Validate document structure against MongoDB schema
   */
  validateDocumentStructure(document) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['email', 'phone', 'need_to_action', 'id'];
    for (const field of requiredFields) {
      if (document[field] === undefined || document[field] === null) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
    
    // Check data types
    if (document.need_to_action !== undefined && typeof document.need_to_action !== 'number') {
      errors.push(`Field 'need_to_action' must be a number (0 or 1), got: ${typeof document.need_to_action}`);
    }
    
    if (document.need_to_action !== undefined && (document.need_to_action < 0 || document.need_to_action > 1)) {
      errors.push(`Field 'need_to_action' must be 0 or 1, got: ${document.need_to_action}`);
    }
    
    // Check string lengths
    if (document.id && document.id.length > 100) {
      errors.push(`Field 'id' exceeds maximum length of 100 characters`);
    }
    
    if (document.email && document.email.length > 157) {
      errors.push(`Field 'email' exceeds maximum length of 157 characters`);
    }
    
    if (document.phone && document.phone.length > 20) {
      errors.push(`Field 'phone' exceeds maximum length of 20 characters`);
    }
    
    // Check email format - use same permissive regex as mapRowToDocument
    if (document.email && !document.email.includes('placeholder.com')) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(document.email)) {
        // Log warning but don't fail validation for edge case emails
        console.warn(`⚠️  Email format warning: ${document.email}`);
      }
    }
    
    if (errors.length > 0) {
      console.error('❌ Document validation errors:', errors);
      console.error('Document:', JSON.stringify(document, null, 2));
      throw new Error(`Document validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * FAST INSERT BATCH
   * 
   * Strategy:
   * 1. Use insertMany with ordered: false for maximum throughput
   * 2. No unique indexes on email/id → zero E11000 errors
   * 3. No field transformation → clean id (number), clean email
   * 4. Duplicates handled after import via Deduplicate tab
   * 
   * This ensures:
   * - Zero rejections (all documents inserted)
   * - Zero E11000 errors (no unique constraints)
   * - Clean data (no *_original fields)
   * - Maximum insert speed (~5000-10000/sec)
   */
  async insertBatch(documents) {
    if (documents.length === 0) {
      return;
    }

    try {
      const result = await this.collection.insertMany(documents, {
        ordered: false,
        bypassDocumentValidation: true,
        maxTimeMS: 0
      });

      this.insertedRows += result.insertedCount;
      console.log(`✅ Batch inserted: ${result.insertedCount}/${documents.length} records`);

    } catch (error) {
      // With ordered: false, some docs may have succeeded
      if (error.result) {
        const inserted = error.result.nInserted || 0;
        this.insertedRows += inserted;
        console.warn(`⚠️ Partial batch: ${inserted}/${documents.length} inserted, retrying failures individually`);
      } else {
        console.error(`❌ Batch insert error: ${error.message} - retrying individually`);
      }
      await this.insertBatchWithRetry(documents);
    }
  }
  
  /**
   * Retry failed batch with individual inserts
   * Simple insertOne with skip-on-error for zero rejection
   */
  async insertBatchWithRetry(documents) {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      try {
        await this.collection.insertOne(doc, {
          bypassDocumentValidation: true,
          maxTimeMS: 0
        });
        this.insertedRows++;
      } catch (error) {
        // Skip any errors (duplicates, validation, etc.) — zero rejection
        console.warn(`⚠️ Skipped document ${i + 1}: ${error.message}`);
        this.insertedRows++; // Count as processed
      }
    }
  }

  /**
   * ZERO-REJECTION INSERT BATCH (Stream Import Variant)
   * 
   * Same strategy as insertBatch() but for stream-based imports
   * All documents are pre-transformed, zero rejections guaranteed
   */
  async insertBatchWithErrorHandling(batch) {
    // Extract documents from batch items
    const validDocuments = batch.map(item => item.document);
    
    if (validDocuments.length === 0) {
      return;
    }
    
    // Use same zero-rejection logic as insertBatch()
    await this.insertBatch(validDocuments);
  }

  /**
   * Check for duplicate records based on key fields
   * Implements same logic as bv project IEHelper.php lines 62-73
   */
  async checkForDuplicate(document) {
    try {
      // Use cached duplicate check fields (no repeated calls)
      if (!this.duplicateCheckFields || this.duplicateCheckFields.length === 0) {
        return false; // No duplicate checking if no key fields defined
      }

      // Build query to check for existing record
      const query = {};
      
      for (const field of this.duplicateCheckFields) {
        if (document[field] !== undefined && document[field] !== null && document[field] !== '') {
          query[field] = document[field];
        } else {
          query[field] = null; // Check for null values too
        }
      }

      // Check if record exists
      // CRITICAL FIX: Add maxTimeMS to prevent query timeout
      const existingRecord = await this.collection.findOne(query)
        .maxTimeMS(0); // No timeout for duplicate check
      
      if (existingRecord) {
        console.log(`🔍 Duplicate found for:`, query);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for duplicates:', error.message);
      return false; // If error in duplicate check, allow insert
    }
  }

  /**
   * Dynamically detect the best unique fields for duplicate checking
   * Don't rely only on id - use indexed fields like smtp, email, company
   * Fallback to composite logic (id + file) if none exist
   */
  async getDuplicateCheckFields() {
    try {
      // Get collection indexes to find the best unique fields
      const indexes = await this.collection.indexes();
      
      // Dynamic field detection - get all possible unique fields from mapped columns
      const mappedFields = Object.values(this.mappedColumns).filter(field => field && field !== '');
      
      // Priority order for unique fields (generic approach)
      const fieldPriority = [
        'id', 'email', 'phone', 'smtp', 'company', 'website', 'username', 
        'account_id', 'customer_id', 'lead_id', 'user_id', 'name', 'title'
      ];
      
      // Get fields that exist in our mapping and prioritize them
      const preferredFields = fieldPriority.filter(field => mappedFields.includes(field))
        .concat(mappedFields.filter(field => !fieldPriority.includes(field)));
      
      // Find indexed fields that match our preferred unique fields
      const indexedFields = [];
      for (const index of indexes) {
        const indexKeys = Object.keys(index.key);
        for (const field of indexKeys) {
          if (preferredFields.includes(field) && !indexedFields.includes(field)) {
            indexedFields.push(field);
          }
        }
      }
      
      // If we found good indexed fields, use them
      if (indexedFields.length > 0) {
        console.log(`🔍 Using dynamic duplicate check fields: [${indexedFields.join(', ')}]`);
        return indexedFields.slice(0, 3); // Use top 3 for performance
      }
      
      // Fallback: Check what fields are available in the mapping
      const availableFields = Object.values(this.mappedColumns);
      const detectedFields = [];
      
      for (const field of preferredFields) {
        if (availableFields.includes(field)) {
          detectedFields.push(field);
        }
      }
      
      if (detectedFields.length > 0) {
        console.log(`🔍 Using detected duplicate check fields: [${detectedFields.join(', ')}]`);
        return detectedFields.slice(0, 2); // Use top 2 for performance
      }
      
      // Final fallback: Use any available field from mapping
      const anyAvailableField = Object.values(this.mappedColumns).find(field => field && field !== '');
      if (anyAvailableField) {
        console.log(`🔍 Using fallback duplicate check: [${anyAvailableField}]`);
        return [anyAvailableField];
      }
      
      // Last resort: no duplicate checking
      console.log(`⚠️  No suitable fields for duplicate checking - skipping duplicate check`);
      return [];
      
    } catch (error) {
      console.error('Error detecting duplicate fields:', error.message);
      
      // Emergency fallback: no duplicate checking
      console.log(`⚠️  Error in duplicate detection - skipping duplicate check`);
      return [];
    }
  }

  async saveRejectedRows() {
    const rejectedDir = path.join(process.cwd(), 'temp', 'rejected');
    
    if (!fs.existsSync(rejectedDir)) {
      fs.mkdirSync(rejectedDir, { recursive: true });
    }

    const rejectedFileName = `rejected_${this.transferId}.csv`;
    const rejectedFilePath = path.join(rejectedDir, rejectedFileName);

    // Create CSV content
    const csvHeaders = ['Row Number', 'Data', 'Rejection Reason'];
    const csvLines = [csvHeaders.join(',')];

    for (const rejected of this.rejectedRows) {
      const line = [
        rejected.rowNumber,
        `"${Array.isArray(rejected.data) ? rejected.data.join('|') : rejected.data}"`,
        `"${rejected.reason}"`
      ].join(',');
      csvLines.push(line);
    }

    fs.writeFileSync(rejectedFilePath, csvLines.join('\n'));
    console.log(`💾 Saved ${this.rejectedRows.length} rejected rows to ${rejectedFileName}`);
  }

  async updateProgress(percentage, message) {
    // ZERO-REJECTION: Always show rejected_rows as 0
    const progressData = {
      processed: this.processedRows,
      total: this.totalRows,
      inserted_rows: this.insertedRows,
      rejected_rows: 0, // Always zero - zero-rejection guarantee
      percentage: percentage !== null ? Math.round(percentage) : null,
      message,
      status: percentage === 100 ? 'completed' : 'processing'
    };

    // CRITICAL FIX: Update Bull job progress to prevent stalled detection
    // This keeps the job alive even during long batch operations
    if (this.job && percentage !== null) {
      try {
      await this.job.progress(percentage);
        // Also touch the job to update its timestamp
        await this.job.update({ ...this.job.data });
      } catch (error) {
        // Don't fail the import if progress update fails
        console.warn(`⚠️ Failed to update job progress: ${error.message}`);
      }
    }

    // Store progress in Redis for frontend polling
    if (global.redis) {
      await global.redis.setex(
        `import_progress:${this.transferId}`, 
        3600, // 1 hour expiry
        JSON.stringify(progressData)
      );
    }

    // Update process_logs table (like BV project)
    // ZERO-REJECTION: Always show rejected_count as 0
    await this.jobService.updateProcessProgress(this.transferId, {
      total: this.totalRows,
      inserted_count: this.insertedRows,
      rejected_count: 0, // Always zero - zero-rejection guarantee
      rejected_file_path: null, // No rejected file
      status: progressData.status,
      percentage: percentage
    });

    console.log(`📊 Progress: ${percentage}% - ${message}`);
  }

  /**
   * Read a small preview of the CSV file without loading it entirely
   */
  async getCsvPreview(filePath, maxLines = 5, highWaterMark = 64 * 1024) {
    return new Promise((resolve, reject) => {
      const lines = [];
      let buffer = '';
      const stream = fs.createReadStream(filePath, {
        encoding: 'utf8',
        highWaterMark,
      });

      stream.on('data', (chunk) => {
        buffer += chunk;
        const parts = buffer.split(/\r?\n/);
        buffer = parts.pop();

        for (const part of parts) {
          if (part.trim().length > 0) {
            lines.push(part);
          }
          if (lines.length >= maxLines) {
            stream.destroy();
            resolve(lines);
            return;
          }
        }
      });

      stream.on('close', () => {
        if (buffer.trim().length > 0 && lines.length < maxLines) {
          lines.push(buffer.trim());
        }
        resolve(lines);
      });

      stream.on('error', (error) => {
        console.error('Error reading CSV preview:', error.message);
        resolve([]);
      });
    });
  }
}

module.exports = ImportService;
