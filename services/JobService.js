/**
 * Job Service - Laravel Queue System Equivalent
 * Manages job lifecycle similar to BV project
 * Uses MongoDB collections instead of MySQL tables
 */

const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

class JobService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (!this.client) {
      const mongoUri = process.env.SUN_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/sun';
      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      this.db = this.client.db('sun'); // Use 'sun' database consistently
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Create a new job (equivalent to Laravel's dispatch)
   */
  async createJob(jobData) {
    await this.connect();
    
    const job = {
      queue: jobData.queue || 'default',
      payload: JSON.stringify({
        job: 'ImportJob',
        data: jobData.data,
        id: uuidv4(),
        attempts: 0
      }),
      attempts: 0,
      reserved_at: null,
      available_at: Math.floor(Date.now() / 1000),
      created_at: Math.floor(Date.now() / 1000)
    };

    const result = await this.db.collection('jobs').insertOne(job);
    console.log(`📝 Job created: ${result.insertedId}`);
    
    return {
      id: result.insertedId,
      job_id: result.insertedId.toString()
    };
  }

  /**
   * Log process start (equivalent to BV's process_logs)
   */
  async logProcessStart(processData) {
    await this.connect();
    
    // Initialize progress based on process type
    const progressData = {
      total: 0,
      inserted_count: 0,
      rejected_count: 0,
      rejected_file_path: null
    };
    
    // For duplicate removal, add removed_count field
    if (processData.type === 'duplicate-removal') {
      progressData.removed_count = 0;
    }
    
    const processLog = {
      process_id: processData.process_id,
      user_id: processData.user_id,
      file: processData.file,
      database: processData.database,
      table: processData.table,
      type: processData.type || 'import',
      progress: JSON.stringify(progressData),
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: processData.user_id,
      updated_by: processData.user_id
    };

    const result = await this.db.collection('process_logs').insertOne(processLog);
    console.log(`📊 Process log created: ${result.insertedId}`);
    
    return result.insertedId;
  }

  /**
   * Update process progress
   */
  async updateProcessProgress(processId, progressData) {
    await this.connect();
    
    const updateData = {
      progress: JSON.stringify(progressData),
      status: progressData.status || 'processing',
      updated_at: new Date()
    };

    await this.db.collection('process_logs').updateOne(
      { process_id: processId },
      { $set: updateData }
    );

    console.log(`📊 Process progress updated: ${processId}`);
  }

  /**
   * Complete process (success)
   */
  async completeProcess(processId, result) {
    await this.connect();
    
    // Build progress data - support both import and duplicate removal formats
    const progressData = {
      total: result.total_rows || result.total || 0,
      inserted_count: result.inserted_rows || result.inserted || 0,
      rejected_count: result.rejected_rows || result.rejected || 0,
      rejected_file_path: result.rejected_file_path || null,
      percentage: 100
    };
    
    // For duplicate removal, include removed_count
    if (result.removed_count !== undefined || result.removed !== undefined) {
      progressData.removed_count = result.removed_count || result.removed || 0;
    }
    
    const updateData = {
      progress: JSON.stringify(progressData),
      status: 'completed',
      updated_at: new Date()
    };

    await this.db.collection('process_logs').updateOne(
      { process_id: processId },
      { $set: updateData }
    );

    console.log(`✅ Process completed: ${processId}`);
  }

  /**
   * Fail process (error)
   */
  async failProcess(processId, error, partialResult = {}) {
    await this.connect();
    
    const updateData = {
      progress: JSON.stringify({
        total: partialResult.total_rows || 0,
        inserted_count: partialResult.inserted_rows || 0,
        rejected_count: partialResult.rejected_rows || 0,
        rejected_file_path: partialResult.rejected_file_path || null,
        error: error.message
      }),
      status: 'failed',
      updated_at: new Date()
    };

    await this.db.collection('process_logs').updateOne(
      { process_id: processId },
      { $set: updateData }
    );

    // Also log to failed_jobs collection
    await this.logFailedJob(processId, error);

    console.log(`❌ Process failed: ${processId}`);
  }

  /**
   * Log failed job
   */
  async logFailedJob(processId, error) {
    await this.connect();
    
    const failedJob = {
      uuid: uuidv4(),
      connection: 'mongodb',
      queue: 'import',
      payload: JSON.stringify({
        process_id: processId,
        job: 'ImportJob'
      }),
      exception: error.stack || error.message,
      failed_at: new Date(),
      created_at: new Date()
    };

    await this.db.collection('failed_jobs').insertOne(failedJob);
    console.log(`💥 Failed job logged: ${processId}`);
  }

  /**
   * Get process status (for progress API)
   */
  async getProcessStatus(processId) {
    await this.connect();
    
    const processLog = await this.db.collection('process_logs').findOne({
      process_id: processId
    });

    if (!processLog) {
      return null;
    }

    let progress = {};
    try {
      progress = JSON.parse(processLog.progress);
    } catch (e) {
      progress = {};
    }

    return {
      process_id: processLog.process_id,
      status: processLog.status,
      progress: progress,
      created_at: processLog.created_at,
      updated_at: processLog.updated_at
    };
  }

  /**
   * Get all process logs for a user
   */
  async getUserProcesses(userId, limit = 10) {
    await this.connect();
    
    const processes = await this.db.collection('process_logs')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    return processes.map(process => {
      let progress = {};
      try {
        progress = JSON.parse(process.progress);
      } catch (e) {
        progress = {};
      }

      return {
        process_id: process.process_id,
        file: process.file,
        database: process.database,
        table: process.table,
        type: process.type,
        status: process.status,
        progress: progress,
        created_at: process.created_at,
        updated_at: process.updated_at
      };
    });
  }

  /**
   * Cancel process
   */
  async cancelProcess(processId) {
    await this.connect();
    
    const updateData = {
      status: 'cancelled',
      updated_at: new Date()
    };

    await this.db.collection('process_logs').updateOne(
      { process_id: processId },
      { $set: updateData }
    );

    console.log(`🛑 Process cancelled: ${processId}`);
  }

  /**
   * Get job statistics
   */
  async getJobStats() {
    await this.connect();
    
    const [jobsCount, processLogsCount, failedJobsCount] = await Promise.all([
      this.db.collection('jobs').countDocuments(),
      this.db.collection('process_logs').countDocuments(),
      this.db.collection('failed_jobs').countDocuments()
    ]);

    const statusCounts = await this.db.collection('process_logs').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const statusStats = {};
    statusCounts.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    return {
      total_jobs: jobsCount,
      total_processes: processLogsCount,
      failed_jobs: failedJobsCount,
      status_breakdown: statusStats
    };
  }

  /**
   * Get process history with pagination and filtering
   * Used by /api/import/history endpoint
   */
  async getProcessHistory({ filter = {}, limit = 50, offset = 0, sort = { created_at: -1 } }) {
    await this.connect();
    
    // Count total matching documents
    const total = await this.db.collection('process_logs').countDocuments(filter);
    
    // Fetch paginated results
    const processes = await this.db.collection('process_logs')
      .find(filter)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .toArray();

    // Parse progress JSON for each item
    const items = processes.map(process => {
      let progress = {};
      try {
        progress = typeof process.progress === 'string' 
          ? JSON.parse(process.progress) 
          : (process.progress || {});
      } catch (e) {
        progress = {};
      }

      return {
        _id: process._id,
        process_id: process.process_id,
        user_id: process.user_id,
        file: process.file,
        database: process.database,
        table: process.table,
        type: process.type,
        status: process.status,
        progress: progress,
        error: progress.error || null,
        created_at: process.created_at,
        updated_at: process.updated_at
      };
    });

    return { items, total };
  }
}

module.exports = JobService;
