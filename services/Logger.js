/**
 * Production-Grade Logger Service
 * 
 * Non-blocking, high-performance logging using pino.
 * Designed for heavy CSV imports (10GB+, 1 crore+ rows).
 * 
 * Features:
 * - Non-blocking async logging
 * - Environment-based log levels
 * - File-based logging for production
 * - Throttled batch-level logs
 * - PM2-friendly
 */

const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Log level based on environment
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Create transport based on environment
let transport;

if (isProduction) {
  // Production: Write to rotating log files (non-blocking)
  transport = pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: path.join(logsDir, 'import.log') },
        level: 'info'
      },
      {
        target: 'pino/file',
        options: { destination: path.join(logsDir, 'error.log') },
        level: 'error'
      }
    ]
  });
} else {
  // Development: Pretty console output but still non-blocking
  transport = pino.transport({
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      sync: false // Non-blocking!
    }
  });
}

// Create the logger
const baseLogger = pino({
  level: logLevel,
  // Reduce serialization overhead
  serializers: {
    err: pino.stdSerializers.err
  },
  // Disable timestamp in development for cleaner output
  timestamp: isProduction ? pino.stdTimeFunctions.isoTime : false
}, transport);

/**
 * Import Logger - Wrapper with throttling for batch operations
 */
class ImportLogger {
  constructor(name = 'import') {
    this.logger = baseLogger.child({ module: name });
    this.lastProgressLog = 0;
    this.progressLogInterval = 10000; // Log progress max once per 10 seconds
    this.batchLogInterval = 50; // Log every 50th batch
    this.batchCount = 0;
  }

  // Lifecycle logs (always log)
  start(transferId, details = {}) {
    this.logger.info({ transferId, ...details }, `🚀 Import started: ${transferId}`);
  }

  complete(transferId, result = {}) {
    this.logger.info({ transferId, ...result }, `✅ Import completed: ${transferId}`);
  }

  fail(transferId, error, partialResult = {}) {
    this.logger.error({ transferId, error: error.message, ...partialResult }, `❌ Import failed: ${transferId}`);
  }

  // Mapping logs (log once)
  mappingComplete(transferId, columnCount) {
    this.logger.info({ transferId, columnCount }, `📊 Header mapping complete: ${columnCount} columns`);
  }

  // Batch-level progress (throttled)
  batchProgress(transferId, processed, total, inserted) {
    this.batchCount++;
    
    // Only log every Nth batch
    if (this.batchCount % this.batchLogInterval !== 0) return;
    
    const now = Date.now();
    // Also throttle by time to prevent log flooding
    if (now - this.lastProgressLog < this.progressLogInterval) return;
    
    this.lastProgressLog = now;
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    this.logger.info(
      { transferId, processed, total, inserted, percentage },
      `📊 Progress: ${percentage}% (${processed.toLocaleString()}/${total.toLocaleString()})`
    );
  }

  // DB connection logs (log once)
  dbConnected(database, collection) {
    this.logger.debug({ database, collection }, `🔗 Connected to ${database}.${collection}`);
  }

  // Error logs (always log)
  error(message, details = {}) {
    this.logger.error(details, message);
  }

  // Warning logs
  warn(message, details = {}) {
    this.logger.warn(details, message);
  }

  // Debug logs (only in development)
  debug(message, details = {}) {
    if (isDevelopment) {
      this.logger.debug(details, message);
    }
  }

  // Batch insert result (log only on error or significant events)
  batchInserted(count, duration) {
    // Only log if batch took unusually long (> 5 seconds)
    if (duration > 5000) {
      this.logger.warn({ count, durationMs: duration }, `⚠️ Slow batch insert: ${count} records in ${duration}ms`);
    }
  }

  // Checkpoint logs
  checkpoint(processedRows) {
    this.logger.debug({ processedRows }, `💾 Checkpoint at row ${processedRows}`);
  }
}

// Export singleton for general use
const defaultLogger = new ImportLogger('import');

module.exports = {
  ImportLogger,
  logger: defaultLogger,
  // Convenience methods
  createLogger: (name) => new ImportLogger(name)
};
