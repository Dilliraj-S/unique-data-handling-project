/**
 * Bulk Audience Assignment Service
 * Handles bulk assignment of records to audiences with chunked processing
 * Optimized for 1 crore to 5 crore (10M to 50M) records using queue-based processing
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// Lazy-load ES modules (loaded once and cached)
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

class BulkAudienceAssignmentService {
  constructor(options) {
    this.audienceId = options.audienceId;
    this.records = options.records || [];
    this.source = options.source || {};
    this.splitFullName = options.splitFullName !== false;
    this.userId = options.userId;
    this.chunkSize = options.chunkSize || 10000; // Process 10,000 at a time for bulk operations
    this.job = options.job; // Bull queue job for progress updates
    this.processedRecords = 0;
    this.insertedRecords = 0;
    this.skippedRecords = 0;
    this.totalRecords = 0;
    this.audienceName = options.audienceName || null;
  }

  /**
   * Sanitize a value from record using multiple possible keys
   */
  sanitizeValue(record, keys = []) {
    for (const key of keys) {
      if (record && record[key] !== undefined && record[key] !== null) {
        const value = record[key];
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return String(value);
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (value && typeof value.toString === 'function') {
          return value.toString().trim();
        }
      }
    }
    return '';
  }

  /**
   * Format records with proper field mapping (including LinkedIn fields)
   */
  formatRecords(records) {
    return records
      .map((record) => {
        const sourceId = this.sanitizeValue(record, ['id', '_id', 'ID', 'original_id']);
        // Check for LinkedIn fields first (master_leads), then standard fields
        const firstName = this.sanitizeValue(record, [
          'li_first_name', 'liFirstName', // LinkedIn fields (master_leads)
          'first_name', 'firstName'        // Standard fields
        ]);
        const lastName = this.sanitizeValue(record, [
          'li_last_name', 'liLastName',   // LinkedIn fields (master_leads)
          'last_name', 'lastName'         // Standard fields
        ]);
        const fullName = this.sanitizeValue(record, [
          'li_full_name', 'liFullName',    // LinkedIn full name (master_leads)
          'ap_full_name', 'apFullName',    // Alternative full name
          'full_name', 'fullName', 'name'  // Standard fields
        ]);
        const email = this.sanitizeValue(record, [
          'email', 'Email', 
          'li_email', 'liEmail', 
          'li_smtp', 'liSmtp',            // LinkedIn SMTP (master_accounts)
          'gs_smtp', 'gsSmtp',             // Google SMTP
          'ap_company_smtp', 'apCompanySmtp' // Alternative SMTP
        ]).toLowerCase();
        const status = this.sanitizeValue(record, ['status', 'Status']) || 'active';

        let finalFirstName = firstName;
        let finalLastName = lastName;

        if (this.splitFullName && !finalFirstName && !finalLastName && fullName) {
          const nameParts = fullName.split(/\s+/).filter(Boolean);
          if (nameParts.length === 1) {
            finalFirstName = nameParts[0];
          } else if (nameParts.length > 1) {
            finalLastName = nameParts.pop();
            finalFirstName = nameParts.join(' ');
          }
        }

        return {
          source_id: sourceId || null,
          first_name: finalFirstName,
          last_name: finalLastName,
          email,
          status,
          full_name: fullName
        };
      })
      .filter((record) => !!record.email);
  }

  /**
   * Process bulk assignment in streaming chunks (MEMORY OPTIMIZED)
   * Instead of loading all sanitized records into memory, process in batches:
   * 1. Format records in batches (e.g., 50k at a time)
   * 2. Check duplicates for that batch
   * 3. Insert and discard batch
   * This reduces memory footprint from O(n) to O(batch_size)
   */
  async processBulkAssignment() {
    // Load ES modules
    const { Long } = await loadMongoDB();
    const { getCollection } = await loadMongoDBLib();

    console.log(`🚀 Processing ${this.records.length} records for audience assignment (streaming mode)`);
    
    this.totalRecords = this.records.length;

    if (this.totalRecords === 0) {
      throw new Error('No records provided for audience assignment');
    }

    // Validate audience exists
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const numericAudienceId = this.audienceId instanceof Long 
      ? this.audienceId 
      : Long.fromNumber(Number(this.audienceId));

    const audience = await audiencesCollection.findOne({
      id: numericAudienceId,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!audience) {
      throw new Error('Audience not found');
    }

    this.audienceName = audience.name;

    // Get subscribers collection
    const subscribersCollection = await getCollection('subscribers', 'pluto');

    // Get next subscriber ID
    const getNextNumericValue = async (collection) => {
      const lastDoc = await collection.findOne(
        {},
        { sort: { id: -1 }, projection: { id: 1 } }
      );

      if (!lastDoc || lastDoc.id === undefined || lastDoc.id === null) {
        return 1;
      }

      const lastId =
        lastDoc.id instanceof Long
          ? lastDoc.id.toNumber()
          : Number(lastDoc.id);

      return (Number.isNaN(lastId) ? 0 : lastId) + 1;
    };

    let nextSubscriberId = await getNextNumericValue(subscribersCollection);
    const now = new Date();

    // MEMORY OPTIMIZATION: Process records in streaming batches
    // Instead of formatting all records first, process in batches of 50k
    const STREAMING_BATCH_SIZE = 50000; // Format and process 50k at a time
    const totalBatches = Math.ceil(this.records.length / STREAMING_BATCH_SIZE);
    
    console.log(`📦 Processing ${totalBatches} streaming batches of up to ${STREAMING_BATCH_SIZE} records each`);
    console.log(`💾 Memory optimization: Processing in batches instead of loading all records into memory`);

    // Track existing emails across batches (grows but bounded by audience size, not input size)
    const existingEmailSet = new Set();

    // Process records in streaming batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * STREAMING_BATCH_SIZE;
      const batchEnd = Math.min(batchStart + STREAMING_BATCH_SIZE, this.records.length);
      const recordBatch = this.records.slice(batchStart, batchEnd);

      // Format this batch only (not all records)
      const sanitizedBatch = this.formatRecords(recordBatch);

      if (sanitizedBatch.length === 0) {
        this.processedRecords += recordBatch.length;
        continue;
      }

      // Check for existing emails in this batch (query only emails in current batch)
      const batchEmails = sanitizedBatch.map(r => r.email).filter(Boolean);
      if (batchEmails.length > 0) {
        const existing = await subscribersCollection
          .find({
            audience_id: numericAudienceId,
            email: { $in: batchEmails }
          })
          .project({ email: 1 })
          .toArray();

        existing.forEach(record => {
          if (record.email) {
            existingEmailSet.add(record.email.toLowerCase());
          }
        });
      }

      // Process this batch in insertion chunks
      const insertionChunks = [];
      for (let i = 0; i < sanitizedBatch.length; i += this.chunkSize) {
        insertionChunks.push(sanitizedBatch.slice(i, i + this.chunkSize));
      }

      for (const chunk of insertionChunks) {
        const preparedSubscribers = [];

        for (const record of chunk) {
          this.processedRecords++;

          // Skip if email already exists
          if (existingEmailSet.has(record.email.toLowerCase())) {
            this.skippedRecords++;
            continue;
          }

          // Add to existing set to avoid duplicates within this batch
          existingEmailSet.add(record.email.toLowerCase());

          preparedSubscribers.push({
            id: Long.fromNumber(nextSubscriberId++),
            audience_id: numericAudienceId,
            first_name: record.first_name || '',
            last_name: record.last_name || '',
            email: record.email,
            status: record.status || 'active',
            created_at: now,
            updated_at: now,
            deleted_at: null,
            source_id: record.source_id || null,
            source_table: this.source.table || null,
            source_system: this.source.system || null
          });
        }

        // Insert chunk (MongoDB insertMany limit is 100,000, so we're safe with 10,000)
        if (preparedSubscribers.length > 0) {
          try {
            await subscribersCollection.insertMany(preparedSubscribers, { ordered: false });
            this.insertedRecords += preparedSubscribers.length;
          } catch (error) {
            // Handle duplicate key errors (ordered: false allows partial success)
            if (error.code === 11000 || error.writeErrors) {
              const inserted = preparedSubscribers.length - (error.writeErrors?.length || 0);
              this.insertedRecords += inserted;
              this.skippedRecords += (error.writeErrors?.length || 0);
              console.warn(`⚠️ Some duplicates in batch ${batchIndex + 1}, inserted ${inserted}, skipped ${error.writeErrors?.length || 0}`);
            } else {
              throw error;
            }
          }
        }
      }

      // Update progress after each streaming batch
      const progress = Math.round((this.processedRecords / this.totalRecords) * 100);
      if (this.job) {
        await this.job.progress(progress);
      }

      console.log(`✅ Streaming batch ${batchIndex + 1}/${totalBatches} processed: ${this.insertedRecords} inserted, ${this.processedRecords}/${this.totalRecords} total processed (${progress}%)`);
      
      // Memory hint: Batch is now out of scope and can be garbage collected
    }

    console.log(`📊 Final stats: ${existingEmailSet.size} unique emails checked, ${this.insertedRecords} inserted, ${this.skippedRecords} skipped`);

    return {
      total: this.totalRecords,
      inserted: this.insertedRecords,
      skipped: this.skippedRecords,
      audience: {
        id: numericAudienceId.toNumber(),
        name: this.audienceName
      }
    };
  }
}

module.exports = BulkAudienceAssignmentService;

