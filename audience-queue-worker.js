#!/usr/bin/env node

/**
 * Audience Queue Worker
 * Dedicated worker for bulk audience assignment jobs
 * Optimized for large datasets (10M to 50M records)
 * Concurrency: 1 (one heavy job at a time to prevent memory issues)
 */

require('dotenv').config();
const Queue = require('bull');

console.log('🚀 Starting Audience Queue Worker...');

// Create audience queue
const audienceQueue = new Queue('Bulk Audience Assignment', {
  redis: { host: 'localhost', port: 6379 }
});

console.log('📊 Queue Dashboard: http://localhost:3000/admin/queues');
console.log('⏹️  Press Ctrl+C to stop');

// Set up processor with concurrency 1 for heavy memory-intensive jobs
console.log('🔧 Setting up audience assignment processor...');
console.log('⚙️  Concurrency: 1 (one heavy job at a time to prevent memory issues)');

audienceQueue.process('bulk-audience-assignment', 1, async (job) => {
  console.log(`\n👥 ========== PROCESSING BULK AUDIENCE ASSIGNMENT JOB ${job.id} ==========`);
  console.log(`📋 Job ID: ${job.data.jobId}`);
  console.log(`👥 Audience ID: ${job.data.audienceId}`);
  console.log(`📊 Total Records: ${job.data.records?.length || 0}`);

  const {
    jobId,
    audienceId,
    records,
    source,
    splitFullName,
    userId,
    chunkSize
  } = job.data;

  try {
    await job.progress(0);

    const BulkAudienceAssignmentService = require('./services/BulkAudienceAssignmentService');
    const service = new BulkAudienceAssignmentService({
      audienceId,
      records,
      source,
      splitFullName,
      userId,
      chunkSize: chunkSize || 10000,
      job
    });

    const result = await service.processBulkAssignment();

    await job.progress(100);

    console.log(`✅ Bulk audience assignment completed: ${result.inserted} inserted, ${result.skipped} skipped`);
    return result;

  } catch (error) {
    console.error(`❌ Bulk audience assignment failed:`, error);
    throw error;
  }
});

// ============================================================
// Server-side Select All Processor
// Uses mongoQuery + streaming cursor instead of pre-fetched records
// ============================================================
audienceQueue.process('bulk-audience-assignment-selectall', 1, async (job) => {
  console.log(`\n🚀 ========== PROCESSING SELECT ALL AUDIENCE ASSIGNMENT JOB ${job.id} ==========`);
  console.log(`📋 Job ID: ${job.data.jobId}`);
  console.log(`👥 Audience ID: ${job.data.audienceId}`);
  console.log(`📊 Expected Records: ~${job.data.matchCount}`);

  const {
    jobId,
    audienceId,
    mongoQuery,
    sourceTable,
    sourceSystem,
    splitFullName,
    userId,
    matchCount,
    chunkSize = 10000
  } = job.data;

  try {
    await job.progress(0);

    // Dynamically load ES modules (same pattern as BulkAudienceAssignmentService)
    const path = require('path');
    const { pathToFileURL } = require('url');
    const mongodbModule = await import('mongodb');
    const Long = mongodbModule.Long;
    const mongodbPath = path.resolve(__dirname, 'src/lib/mongodb.js');
    const mongodbUrl = pathToFileURL(mongodbPath).href;
    const { getCollection } = await import(mongodbUrl);

    // Get source collection and run the query with streaming cursor
    const sourceCollection = await getCollection(sourceTable, sourceSystem);
    const subscribersCollection = await getCollection('subscribers', 'pluto');

    // Validate audience exists
    const audiencesCollection = await getCollection('audiences', 'pluto');
    const numericAudienceId = Long.fromNumber(Number(audienceId));
    const audience = await audiencesCollection.findOne({
      id: numericAudienceId,
      $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
    });

    if (!audience) {
      throw new Error(`Audience ${audienceId} not found`);
    }

    console.log(`📂 Source: ${sourceSystem}.${sourceTable}`);
    console.log(`🎯 Target Audience: "${audience.name}" (ID: ${audienceId})`);
    console.log(`📦 Chunk size: ${chunkSize}`);

    // Get existing subscriber emails to avoid duplicates
    const existingEmailsDocs = await subscribersCollection
      .find(
        { audience_id: numericAudienceId },
        { projection: { email: 1 } }
      )
      .toArray();
    const existingEmailSet = new Set(existingEmailsDocs.map(d => (d.email || '').toLowerCase()));
    console.log(`📧 Existing subscribers in audience: ${existingEmailSet.size}`);

    // Get next subscriber ID
    const lastDoc = await subscribersCollection.findOne(
      {},
      { sort: { id: -1 }, projection: { id: 1 } }
    );
    let nextSubscriberId = 1;
    if (lastDoc && lastDoc.id !== undefined && lastDoc.id !== null) {
      const lastId = lastDoc.id instanceof Long ? lastDoc.id.toNumber() : Number(lastDoc.id);
      nextSubscriberId = (Number.isNaN(lastId) ? 0 : lastId) + 1;
    }

    const now = new Date();
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalProcessed = 0;
    let batch = [];

    // Helper: format a raw record into subscriber fields
    const formatRecord = (record) => {
      let firstName = record.first_name || record.li_first_name || '';
      let lastName = record.last_name || record.li_last_name || '';
      const email = (record.email || record.li_email || '').toString().trim().toLowerCase();

      if (!email) return null;

      // Split full_name if no first/last name
      if (!firstName && !lastName && splitFullName !== false) {
        const fullName = record.full_name || record.li_full_name || record.name || '';
        if (fullName) {
          const parts = fullName.trim().split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
      }

      return {
        first_name: firstName,
        last_name: lastName,
        email,
        status: record.status || 'active',
        source_id: record.id || record._id || null
      };
    };

    // Stream records using cursor
    console.log(`🔍 Executing query on ${sourceSystem}.${sourceTable}...`);
    const cursor = sourceCollection.find(mongoQuery).batchSize(chunkSize);

    for await (const record of cursor) {
      totalProcessed++;

      const formatted = formatRecord(record);
      if (!formatted || !formatted.email) {
        totalSkipped++;
        continue;
      }

      if (existingEmailSet.has(formatted.email)) {
        totalSkipped++;
        continue;
      }
      existingEmailSet.add(formatted.email);

      batch.push({
        id: Long.fromNumber(nextSubscriberId++),
        audience_id: numericAudienceId,
        first_name: formatted.first_name,
        last_name: formatted.last_name,
        email: formatted.email,
        status: formatted.status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        source_id: formatted.source_id,
        source_table: sourceTable,
        source_system: sourceSystem
      });

      // Insert when batch is full
      if (batch.length >= chunkSize) {
        try {
          await subscribersCollection.insertMany(batch, { ordered: false });
        } catch (insertErr) {
          // Handle duplicate key errors gracefully
          if (insertErr.code === 11000) {
            const inserted = insertErr.result?.nInserted || 0;
            totalInserted += inserted;
            totalSkipped += batch.length - inserted;
            console.log(`⚠️ Batch had ${batch.length - inserted} duplicates (inserted ${inserted})`);
            batch = [];
            const progress = Math.min(99, Math.round((totalProcessed / matchCount) * 100));
            await job.progress(progress);
            continue;
          }
          throw insertErr;
        }
        totalInserted += batch.length;
        batch = [];

        const progress = Math.min(99, Math.round((totalProcessed / matchCount) * 100));
        await job.progress(progress);
        console.log(`📦 Progress: ${totalProcessed.toLocaleString()}/${matchCount.toLocaleString()} processed, ${totalInserted.toLocaleString()} inserted (${progress}%)`);
      }
    }

    // Insert remaining records
    if (batch.length > 0) {
      try {
        await subscribersCollection.insertMany(batch, { ordered: false });
        totalInserted += batch.length;
      } catch (insertErr) {
        if (insertErr.code === 11000) {
          const inserted = insertErr.result?.nInserted || 0;
          totalInserted += inserted;
          totalSkipped += batch.length - inserted;
        } else {
          throw insertErr;
        }
      }
    }

    await job.progress(100);

    console.log(`\n✅ Select All Audience Assignment Complete!`);
    console.log(`📊 Results: ${totalInserted.toLocaleString()} inserted, ${totalSkipped.toLocaleString()} skipped, ${totalProcessed.toLocaleString()} processed`);

    return {
      inserted: totalInserted,
      skipped: totalSkipped,
      processed: totalProcessed,
      audienceId,
      audienceName: audience.name
    };

  } catch (error) {
    console.error(`❌ Select All audience assignment failed:`, error);
    throw error;
  }
});

// Subscriber Import Processor (also runs in audience queue)
audienceQueue.process('subscriber-import', 1, async (job) => {
  console.log(`\n👥 ========== PROCESSING SUBSCRIBER IMPORT JOB ${job.id} ==========`);
  console.log(`📋 Job ID: ${job.data.jobId}`);
  console.log(`👥 Audience ID: ${job.data.audienceId}`);
  console.log(`📁 File Path: ${job.data.filePath}`);
  
  const SubscriberImportService = require('./services/SubscriberImportService');
  
  try {
    await job.progress(0);
    
    const importService = new SubscriberImportService({
      audienceId: job.data.audienceId,
      filePath: job.data.filePath,
      userId: job.data.userId,
      chunkSize: job.data.chunkSize || 5000,
      job,
      sourceTable: job.data.sourceTable || null,
      sourceSystem: job.data.sourceSystem || null
    });
    
    const result = await importService.processCsvFile();
    
    await job.progress(100);
    
    console.log(`✅ Subscriber import completed: ${result.inserted} inserted, ${result.skipped} skipped`);
    return result;
    
  } catch (error) {
    console.error(`❌ Subscriber import failed:`, error);
    throw error;
  }
});

// Event handlers
audienceQueue.on('completed', (job, result) => {
  console.log(`🎉 Audience job ${job.id} completed:`, {
    jobId: job.data.jobId,
    inserted: result.inserted || 0,
    skipped: result.skipped || 0
  });
});

audienceQueue.on('failed', (job, error) => {
  console.error(`💥 Audience job ${job.id} failed:`, {
    jobId: job.data.jobId,
    error: error.message
  });
});

audienceQueue.on('active', (job) => {
  console.log(`🔄 Audience job ${job.id} started processing`);
});

console.log('✅ Audience queue processor set up successfully');
console.log('🔄 Waiting for audience assignment jobs...');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down audience queue worker...');
  await audienceQueue.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down audience queue worker...');
  await audienceQueue.close();
  process.exit(0);
});

