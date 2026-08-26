/**
 * Duplicate Removal Service
 * Removes duplicate records from Target Collection based on Main Collection
 * Uses queue-based processing for large datasets (optimized for 1 crore+ records)
 * 
 * MEMORY OPTIMIZATION:
 * - Uses Map instead of Set for O(1) lookups with better memory efficiency
 * - Streaming cursors with large batch sizes (50,000) to avoid loading all data
 * - Chunked deletion (10,000-50,000 per batch) to prevent memory buildup
 * - Progress updates optimized to reduce overhead for very large datasets
 * 
 * PERFORMANCE:
 * - Handles 1 crore (10M) to 5 crore (50M) records efficiently
 * - Memory usage: ~1-2GB for 1 crore unique match keys (acceptable)
 * - Processing speed: ~100K-500K records per minute (depends on hardware)
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// Lazy-load ES modules
let mongodbModule = null;
let mongodbLib = null;

async function loadMongoDB() {
  if (!mongodbModule) {
    mongodbModule = await import('mongodb');
  }
  return mongodbModule;
}

async function loadMongoDBLib() {
  if (!mongodbLib) {
    const mongodbPath = path.resolve(__dirname, '../src/lib/mongodb.js');
    const mongodbUrl = pathToFileURL(mongodbPath).href;
    mongodbLib = await import(mongodbUrl);
  }
  return mongodbLib;
}

class DuplicateRemovalService {
  constructor(options) {
    this.mainDatabase = options.mainDatabase;
    this.mainCollection = options.mainCollection;
    this.targetDatabase = options.targetDatabase;
    this.targetCollection = options.targetCollection;
    this.duplicateRule = options.duplicateRule; // 'li_full_name+li_company_name', 'li_full_name+li_smtp', 'email'
    this.processId = options.processId;
    this.job = options.job; // Bull queue job for progress updates
    this.chunkSize = options.chunkSize || 10000; // Process 10,000 records per chunk
    
    this.processedCount = 0;
    this.removedCount = 0;
    this.totalRecords = 0;
    
    this.mainClient = null;
    this.targetClient = null;
    this.mainDb = null;
    this.targetDb = null;
    this.mainCol = null;
    this.targetCol = null;
    
    // FIX RC3: Singleton JobService — reuse one connection for all progress updates
    this._jobService = null;
  }

  /**
   * Normalize value for comparison (trim, lowercase, handle null/undefined)
   */
  normalizeValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'number') return String(value).trim().toLowerCase();
    return String(value).trim().toLowerCase();
  }

  /**
   * Build match key based on duplicate rule
   * Now supports dynamic rules from database
   * Rule can be:
   *   - String (legacy): 'li_full_name+li_company_name', 'li_full_name+li_smtp', 'email'
   *   - Object (new): { rule_id, columns: ['col1', 'col2'], match_type }
   */
  buildMatchKey(record) {
    // Handle dynamic rule object (new format)
    if (typeof this.duplicateRule === 'object' && this.duplicateRule.columns) {
      const columns = this.duplicateRule.columns;
      
      if (columns.length === 1) {
        // Single column rule
        const field = columns[0];
        return this.normalizeValue(this.getFieldValue(record, field) || '');
      } else {
        // Composite rule - join multiple columns with |||
        const values = columns.map(col => 
          this.normalizeValue(this.getFieldValue(record, col) || '')
        );
        return values.join('|||');
      }
    }
    
    // Legacy string-based rules (backward compatibility)
    const ruleStr = String(this.duplicateRule);
    switch (ruleStr) {
      case 'li_full_name+li_company_name':
        const fullName = this.normalizeValue(record.li_full_name || record.liFullName || record.full_name || record.fullName || '');
        const companyName = this.normalizeValue(record.li_company_name || record.liCompanyName || record.company_name || record.companyName || '');
        return `${fullName}|||${companyName}`;
      
      case 'li_full_name+li_smtp':
        const fullName2 = this.normalizeValue(record.li_full_name || record.liFullName || record.full_name || record.fullName || '');
        const smtp = this.normalizeValue(record.li_smtp || record.liSmtp || record.email || record.Email || '');
        return `${fullName2}|||${smtp}`;
      
      case 'email':
        return this.normalizeValue(record.email || record.Email || record.li_smtp || record.liSmtp || record.li_email || record.liEmail || '');
      
      default:
        throw new Error(`Unknown duplicate rule: ${this.duplicateRule}`);
    }
  }

  /**
   * Get field value from record with multiple possible field name variations
   * Handles camelCase, snake_case, and common variations
   */
  getFieldValue(record, fieldName) {
    // Direct match
    if (record[fieldName] !== undefined && record[fieldName] !== null) {
      return record[fieldName];
    }

    // Try camelCase variation
    const camelCase = fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    if (record[camelCase] !== undefined && record[camelCase] !== null) {
      return record[camelCase];
    }

    // Try common variations (e.g., li_smtp -> email, Email, liSmtp)
    const variations = this.getFieldVariations(fieldName);
    for (const variation of variations) {
      if (record[variation] !== undefined && record[variation] !== null) {
        return record[variation];
      }
    }

    return '';
  }

  /**
   * Get common field name variations for a given field
   */
  getFieldVariations(fieldName) {
    const variations = [];
    
    // Common email field variations
    if (fieldName.includes('email') || fieldName.includes('smtp')) {
      variations.push('email', 'Email', 'li_smtp', 'liSmtp', 'li_email', 'liEmail');
    }
    
    // Common name field variations
    if (fieldName.includes('full_name') || fieldName.includes('fullName')) {
      variations.push('full_name', 'fullName', 'name', 'Name');
    }
    
    // Common company field variations
    if (fieldName.includes('company')) {
      variations.push('company_name', 'companyName', 'company', 'Company');
    }
    
    return variations;
  }

  /**
   * Build match key from record (optimized for streaming)
   * This is used when processing records directly without aggregation
   */
  buildMatchKeyOptimized(record) {
    // Handle dynamic rule object (new format)
    if (typeof this.duplicateRule === 'object' && this.duplicateRule.columns) {
      const columns = this.duplicateRule.columns;
      
      if (columns.length === 1) {
        // Single column rule
        const field = columns[0];
        return this.normalizeValue(this.getFieldValue(record, field) || '');
      } else {
        // Composite rule - join multiple columns with |||
        const values = columns.map(col => 
          this.normalizeValue(this.getFieldValue(record, col) || '')
        );
        return values.join('|||');
      }
    }
    
    // Legacy string-based rules (backward compatibility)
    const ruleStr = String(this.duplicateRule);
    switch (ruleStr) {
      case 'li_full_name+li_company_name':
        const fullName = this.normalizeValue(
          record.li_full_name || record.liFullName || record.full_name || record.fullName || ''
        );
        const companyName = this.normalizeValue(
          record.li_company_name || record.liCompanyName || record.company_name || record.companyName || ''
        );
        return `${fullName}|||${companyName}`;
      
      case 'li_full_name+li_smtp':
        const fullName2 = this.normalizeValue(
          record.li_full_name || record.liFullName || record.full_name || record.fullName || ''
        );
        const smtp = this.normalizeValue(
          record.li_smtp || record.liSmtp || record.email || record.Email || record.li_email || record.liEmail || ''
        );
        return `${fullName2}|||${smtp}`;
      
      case 'email':
        return this.normalizeValue(
          record.email || record.Email || record.li_smtp || record.liSmtp || record.li_email || record.liEmail || ''
        );
      
      default:
        throw new Error(`Unknown duplicate rule: ${JSON.stringify(this.duplicateRule)}`);
    }
  }

  /**
   * Process duplicate removal using MongoDB aggregation (memory-efficient for 1 crore+ records)
   */
  /**
   * Build projection object from duplicate rule columns (FIX #3: only fetch needed fields)
   */
  getRuleProjection() {
    const proj = { _id: 1 }; // Always need _id for deletion
    if (typeof this.duplicateRule === 'object' && this.duplicateRule.columns) {
      this.duplicateRule.columns.forEach(col => { proj[col] = 1; });
    } else {
      // Legacy rules
      const ruleStr = String(this.duplicateRule);
      switch (ruleStr) {
        case 'li_full_name+li_company_name':
          proj.li_full_name = 1; proj.li_company_name = 1;
          break;
        case 'li_full_name+li_smtp':
          proj.li_full_name = 1; proj.li_smtp = 1;
          break;
        case 'email':
          proj.email = 1; proj.li_smtp = 1; proj.li_email = 1;
          break;
      }
    }
    return proj;
  }

  /**
   * Update progress in both Bull job and JobService
   */
  async updateProgress(percentage, phase = 'processing') {
    if (this.job) {
      await this.job.progress(percentage);
    }
    if (this.processId) {
      try {
        // FIX RC3: Reuse singleton JobService — no new MongoClient per call
        if (!this._jobService) {
          const JobService = require('./JobService');
          this._jobService = new JobService();
        }
        await this._jobService.updateProcessProgress(this.processId, {
          total: this.totalRecords,
          removed_count: this.removedCount,
          status: phase,
          percentage
        });
        // DO NOT disconnect — reuse for next progress update
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }
  }

  /**
   * Process duplicate removal (optimized for 10 crore+ records)
   * 
   * Two strategies:
   *   - Map strategy (Main < 5 crore): Load Main keys into Map → O(1) lookup per Target record
   *   - Chunk strategy (Main >= 5 crore): Stream Main in 50k batches → $in query on Target → zero memory
   */
  async processDuplicateRemoval() {
    try {
      console.log(`🚀 Starting duplicate removal process: ${this.processId}`);
      const ruleDisplay = typeof this.duplicateRule === 'object' && this.duplicateRule.rule_name 
        ? this.duplicateRule.rule_name 
        : String(this.duplicateRule);
      console.log(`📋 Rule: ${ruleDisplay}`);
      console.log(`📊 Main: ${this.mainDatabase}.${this.mainCollection}`);
      console.log(`🎯 Target: ${this.targetDatabase}.${this.targetCollection}`);
      
      await this.connectToDatabase();
      
      // Count total records in target collection
      this.totalRecords = await this.targetCol.countDocuments();
      console.log(`📊 Total records in target collection: ${this.totalRecords}`);
      
      if (this.totalRecords === 0) {
        console.log(`⚠️ Target collection is empty. No duplicates to remove.`);
        return { total: 0, removed: 0, processed: 0 };
      }

      // Count main collection to choose strategy
      const mainCollectionCount = await this.mainCol.estimatedDocumentCount();
      console.log(`📊 Main collection has approximately ${mainCollectionCount} records`);

      // FIX #3: Build projection — only fetch rule fields, not entire documents
      const projection = this.getRuleProjection();
      console.log(`📋 Using projection:`, JSON.stringify(projection));

      // FIX #4: Choose strategy based on Main collection size
      // FIX RC1: Lowered from 50M to 1M. Main > 10 lakh → chunk strategy (zero memory).
      // MAP strategy loads ALL keys into RAM (~200 bytes/key). 1.6cr = ~3.2GB → OOM.
      const USE_CHUNK_STRATEGY = mainCollectionCount > 1000000; // > 10 lakh → chunk strategy
      
      if (USE_CHUNK_STRATEGY) {
        console.log(`🔀 Using CHUNK strategy (Main > 5 crore) — zero memory footprint`);
        return await this.processChunkStrategy(projection, mainCollectionCount);
      } else {
        console.log(`🗺️ Using MAP strategy (Main <= 5 crore) — O(1) lookups`);
        return await this.processMapStrategy(projection, mainCollectionCount);
      }
      
    } catch (error) {
      console.error(`❌ Duplicate removal failed:`, error);
      throw error;
    } finally {
      await this.closeConnection();
    }
  }

  /**
   * MAP strategy: Load all Main keys into Map, then stream Target for O(1) lookups.
   * Best for Main < 5 crore records. Uses ~1-2GB memory for 1 crore keys.
   */
  async processMapStrategy(projection, mainCollectionCount) {
    console.log(`🔍 Building match keys from main collection...`);
    const mainMatchKeys = new Map();
    
    // FIX #2 + #3: Stream with PROJECTION and report progress to prevent stalled kills
    // FIX RC4: noCursorTimeout prevents MongoDB closing cursor after 10 min idle
    const mainCursor = this.mainCol.find({}, { projection }).batchSize(50000).addCursorFlag('noCursorTimeout', true);
    let mainProcessed = 0;
    
    while (await mainCursor.hasNext()) {
      const mainRecord = await mainCursor.next();
      const matchKey = this.buildMatchKeyOptimized(mainRecord);
      
      if (matchKey && matchKey !== '|||' && matchKey !== '') {
        mainMatchKeys.set(matchKey, true);
      }
      
      mainProcessed++;
      // FIX #2: Report progress every 1 lakh during Main scan (prevents stalled job kill)
      if (mainProcessed % 100000 === 0) {
        const mainPct = Math.round((mainProcessed / mainCollectionCount) * 30); // 0-30% for main scan
        console.log(`📊 [Main] ${mainProcessed.toLocaleString()}/${mainCollectionCount.toLocaleString()} — ${mainMatchKeys.size.toLocaleString()} unique keys`);
        await this.updateProgress(mainPct, 'scanning_main');
      }
    }
    
    console.log(`✅ Built ${mainMatchKeys.size.toLocaleString()} unique match keys from main collection`);
    await this.updateProgress(30, 'scanning_target');

    // Step 2: Stream Target collection and find matches
    console.log(`🔍 Scanning target collection for duplicates...`);
    const targetCursor = this.targetCol.find({}, { projection }).batchSize(50000).addCursorFlag('noCursorTimeout', true);
    
    let removedIds = [];
    let lastProgressPct = 30;
    
    while (await targetCursor.hasNext()) {
      const targetRecord = await targetCursor.next();
      const matchKey = this.buildMatchKeyOptimized(targetRecord);
      
      if (matchKey && matchKey !== '|||' && matchKey !== '' && mainMatchKeys.has(matchKey)) {
        if (targetRecord._id) {
          removedIds.push(targetRecord._id);
        }
      }
      
      this.processedCount++;
      
      // Batch delete
      const deleteBatchSize = this.totalRecords > 10000000 ? 50000 : this.chunkSize;
      if (removedIds.length >= deleteBatchSize) {
        await this.deleteRecords(removedIds);
        this.removedCount += removedIds.length;
        removedIds = [];
      }
      
      // Progress update (30-100% range for target scan)
      if (this.processedCount % 100000 === 0) {
        const pct = 30 + Math.round((this.processedCount / this.totalRecords) * 70);
        if (pct > lastProgressPct) {
          lastProgressPct = pct;
          await this.updateProgress(pct, 'processing');
        }
        console.log(`📊 [Target] ${this.processedCount.toLocaleString()}/${this.totalRecords.toLocaleString()} — Removed: ${this.removedCount.toLocaleString()}`);
      }
    }
    
    // Flush remaining
    if (removedIds.length > 0) {
      await this.deleteRecords(removedIds);
      this.removedCount += removedIds.length;
    }
    
    await this.updateProgress(100, 'completed');
    console.log(`✅ Duplicate removal completed: ${this.removedCount.toLocaleString()} removed out of ${this.totalRecords.toLocaleString()}`);
    
    return { total: this.totalRecords, removed: this.removedCount, processed: this.processedCount };
  }

  /**
   * CHUNK strategy: Stream Main in batches → build $or/$in filter → deleteMany on Target.
   * Zero memory footprint. Safe for ANY size (10 crore, 50 crore, etc.).
   * Slower than Map strategy but guaranteed safe.
   */
  async processChunkStrategy(projection, mainCollectionCount) {
    console.log(`🔍 Processing in chunks of 5000 (zero-memory approach)...`);
    
    // Get the rule columns for building Target query
    const columns = typeof this.duplicateRule === 'object' && this.duplicateRule.columns
      ? this.duplicateRule.columns
      : String(this.duplicateRule).split('+');
    
    // Ensure indexes on Target for the rule columns
    try {
      const collationOpt = { collation: { locale: 'en', strength: 2 } };
      if (columns.length === 1) {
        await this.targetCol.createIndex({ [columns[0]]: 1 }, { background: true, ...collationOpt });
      } else {
        const indexSpec = {};
        columns.forEach(col => { indexSpec[col] = 1; });
        await this.targetCol.createIndex(indexSpec, { background: true, ...collationOpt });
      }
      console.log(`✅ Ensured collation-aware indexes on target for: ${columns.join(', ')}`);
    } catch (e) {
      console.log(`ℹ️ Index note: ${e.message}`);
    }


    // FIX Check 4.6: Respect this.chunkSize but cap at 5000 to avoid BSON 16MB limit
    const CHUNK_SIZE = Math.min(this.chunkSize || 5000, 5000);
    const mainCursor = this.mainCol.find({}, { projection }).batchSize(CHUNK_SIZE).addCursorFlag('noCursorTimeout', true);
    let batch = [];
    let mainProcessed = 0;
    
    // FIX Check 4.1: try/finally ensures cursor is closed even if deleteByFieldBatch throws
    try {
      while (await mainCursor.hasNext()) {
        const mainRecord = await mainCursor.next();
        mainProcessed++;
        
        // Skip records where any rule field is null/empty
        const key = this.buildMatchKeyOptimized(mainRecord);
        if (!key || key === '|||' || key === '') continue;
        
        // Extract field values for direct query (not match key)
        const fieldValues = {};
        columns.forEach(col => {
          fieldValues[col] = this.normalizeValue(this.getFieldValue(mainRecord, col) || '');
        });
        
        // Skip if any field is empty
        if (columns.some(col => !fieldValues[col])) continue;
        
        batch.push(fieldValues);
        
        if (batch.length >= CHUNK_SIZE) {
          // Build $or query from batch and delete matching Target records
          const deleted = await this.deleteByFieldBatch(batch, columns);
          this.removedCount += deleted;
          this.processedCount += batch.length;
          batch = [];
          
          // Progress update
          const pct = Math.round((mainProcessed / mainCollectionCount) * 100);
          console.log(`📊 [Chunk] Main: ${mainProcessed.toLocaleString()}/${mainCollectionCount.toLocaleString()} — Deleted: ${this.removedCount.toLocaleString()}`);
          await this.updateProgress(pct, 'processing');
          
          // Yield to prevent event loop blocking
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } catch (cursorErr) {
      console.error('Cursor error in chunk strategy:', cursorErr.message);
      throw cursorErr;
    } finally {
      try { await mainCursor.close(); } catch (e) {}
    }
    
    // Process remaining batch
    if (batch.length > 0) {
      const deleted = await this.deleteByFieldBatch(batch, columns);
      this.removedCount += deleted;
      this.processedCount += batch.length;
    }
    
    await this.updateProgress(100, 'completed');
    console.log(`✅ Chunk strategy completed: ${this.removedCount.toLocaleString()} removed`);
    
    return { total: this.totalRecords, removed: this.removedCount, processed: this.processedCount };
  }

  /**
   * Delete Target records matching a batch of Main record field values
   */
  async deleteByFieldBatch(batch, columns) {
    if (batch.length === 0) return 0;
    
    const orConditions = batch.map(fieldValues => {
      if (columns.length === 1) {
        return { [columns[0]]: fieldValues[columns[0]] };
      }
      // Compound: all fields must match
      const condition = {};
      columns.forEach(col => { condition[col] = fieldValues[col]; });
      return condition;
    });
    
    try {
      // FIX Check 3.1: Case-insensitive matching via collation. Ensures "RAHUL@ABC.com"
      // matches "rahul@abc.com" in deletion. Without this, duplicates are silently missed.
      const result = await this.targetCol.deleteMany(
        { $or: orConditions },
        { collation: { locale: 'en', strength: 2 } }
      );
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Batch delete error:', error.message);
      return 0;
    }
  }


  /**
   * Delete records by IDs
   */
  async deleteRecords(ids) {
    if (ids.length === 0) return;
    
    try {
      // Try deleting by _id first (MongoDB ObjectId)
      const objectIds = ids.filter(id => id && typeof id === 'object');
      if (objectIds.length > 0) {
        await this.targetCol.deleteMany({ _id: { $in: objectIds } });
      }
      
      // Also try deleting by id field (if it's a different field)
      const otherIds = ids.filter(id => id && typeof id !== 'object');
      if (otherIds.length > 0) {
        await this.targetCol.deleteMany({ id: { $in: otherIds } });
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      // Continue processing even if some deletions fail
    }
  }

  /**
   * Get connection config helper (CommonJS compatible for queue worker)
   */
  getConnectionConfig(connectionName) {
    // Try to load from config file (ES6 module)
    try {
      // Use dynamic import with path resolution
      const path = require('path');
      const { pathToFileURL } = require('url');
      const configPath = path.resolve(__dirname, '../src/config/database.js');
      const configUrl = pathToFileURL(configPath).href;
      
      // For now, use fallback since dynamic import in CommonJS context is complex
      // Use environment variables directly
      const envMap = {
        moon: { uri: process.env.MOON_MONGODB_URI || 'mongodb://localhost:27017/moon', database: 'moon' },
        mars: { uri: process.env.MARS_MONGODB_URI || 'mongodb://localhost:27017/mars', database: 'mars' },
        jupiter: { uri: process.env.JUPITER_MONGODB_URI || 'mongodb://localhost:27017/jupiter', database: 'jupiter' },
        earth: { uri: process.env.EARTH_MONGODB_URI || 'mongodb://localhost:27017/earth', database: 'earth' },
        mercury: { uri: process.env.MERCURY_MONGODB_URI || 'mongodb://localhost:27017/mercury', database: 'mercury' },
        saturn: { uri: process.env.SATURN_MONGODB_URI || 'mongodb://localhost:27017/saturn', database: 'saturn' },
        neptune: { uri: process.env.NEPTUNE_MONGODB_URI || 'mongodb://localhost:27017/neptune', database: 'neptune' },
        sun: { uri: process.env.SUN_MONGODB_URI || 'mongodb://localhost:27017/sun', database: 'sun' },
        central: { uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu', database: 'nextjs_stu' },
      };
      
      return envMap[connectionName] || envMap.moon;
    } catch (error) {
      // Fallback to environment variables
      const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      return {
        uri: `${baseUri}/${connectionName}`,
        database: connectionName
      };
    }
  }

  /**
   * Connect to databases
   */
  async connectToDatabase() {
    try {
      const { MongoClient } = await loadMongoDB();
      
      // Connect to main database
      const mainConnectionName = this.mainDatabase === 'nextjs_stu' ? 'central' : this.mainDatabase;
      const mainConfig = this.getConnectionConfig(mainConnectionName);
      // FIX RC5: Pool limits prevent 200 sockets. Socket timeout for long scans.
      this.mainClient = new MongoClient(mainConfig.uri, {
        maxPoolSize: 5,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 600000,
        connectTimeoutMS: 30000
      });
      await this.mainClient.connect();
      this.mainDb = this.mainClient.db(mainConfig.database || this.mainDatabase);
      this.mainCol = this.mainDb.collection(this.mainCollection);
      
      // Connect to target database
      const targetConnectionName = this.targetDatabase === 'nextjs_stu' ? 'central' : this.targetDatabase;
      const targetConfig = this.getConnectionConfig(targetConnectionName);
      this.targetClient = new MongoClient(targetConfig.uri, {
        maxPoolSize: 5,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 600000,
        connectTimeoutMS: 30000
      });
      await this.targetClient.connect();
      this.targetDb = this.targetClient.db(targetConfig.database || this.targetDatabase);
      this.targetCol = this.targetDb.collection(this.targetCollection);
      
      console.log(`✅ Connected to both databases: ${mainConnectionName} and ${targetConnectionName}`);
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async closeConnection() {
    try {
      // FIX RC3: Disconnect singleton JobService
      if (this._jobService) {
        try { await this._jobService.disconnect(); } catch (e) {}
        this._jobService = null;
      }
      if (this.mainClient) {
        await this.mainClient.close();
      }
      if (this.targetClient) {
        await this.targetClient.close();
      }
      console.log(`✅ Database connections closed`);
    } catch (error) {
      console.error('Error closing connections:', error);
    }
  }
}

module.exports = DuplicateRemovalService;

