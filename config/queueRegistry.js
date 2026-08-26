/**
 * Queue Registry - Single source of truth for all Bull queues and their workers.
 * Used by Queue Control Center API and UI.
 *
 * - id: stable key for API
 * - queueName: Bull Redis queue name (must match worker)
 * - label: Display name = command name (npmScript) for consistency with commands file
 * - workerFile: script run by npm script
 * - npmScript: package.json script name (e.g. queue:work)
 * - triggerScript, triggerArgs: optional; for queues that need a separate "job feeder" (e.g. global email sync needs emails:init-sync:global to add jobs)
 */

const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const TRIGGER_PREFIX = 'queue-trigger:';

const QUEUE_REGISTRY = [
  // For most queues, a single worker instance is enough.
  { id: 'csv-import', queueName: 'CSV Import Processing', label: 'queue:work', workerFile: 'queue-worker.js', npmScript: 'queue:work', modulePath: 'queues/importQueue.js', defaultInstances: 1, maxInstances: 2 },
  { id: 'audience', queueName: 'Bulk Audience Assignment', label: 'queue:audience', workerFile: 'audience-queue-worker.js', npmScript: 'queue:audience', modulePath: 'queues/audienceQueue.js', defaultInstances: 1, maxInstances: 2 },
  { id: 'maintenance', queueName: 'Maintenance Operations', label: 'queue:maintenance', workerFile: 'maintenance-queue-worker.js', npmScript: 'queue:maintenance', modulePath: 'queues/maintenanceQueue.js', defaultInstances: 1, maxInstances: 1 },
  {
    id: 'global-email-sync',
    queueName: 'Global Email Sync',
    label: 'queue:email-sync',
    workerFile: 'email-sync-worker.js',
    npmScript: 'queue:email-sync',
    modulePath: null,
    triggerScript: 'scripts/init-email-sync.js',
    triggerArgs: ['--all-users', '--daemon'],
    triggerLabel: 'emails:init-sync:global:daemon',
    defaultInstances: 1,
    maxInstances: 1,
  },
  { id: 'user-email-sync', queueName: 'User Email Sync', label: 'queue:user-email-sync', workerFile: 'user-email-sync-worker.js', npmScript: 'queue:user-email-sync', modulePath: null, defaultInstances: 1, maxInstances: 1 },
  // Email delivery is the heavy queue – allow more instances for bulk campaigns.
  { id: 'email-delivery', queueName: 'Email Delivery', label: 'queue:email-delivery', workerFile: 'email-delivery-worker.js', npmScript: 'queue:email-delivery', modulePath: null, defaultInstances: 1, maxInstances: 4 },
  { id: 'process-flow', queueName: 'process_flows', label: 'queue:process-flow', workerFile: 'process-flow-worker.js', npmScript: 'queue:process-flow', modulePath: null, defaultInstances: 1, maxInstances: 2 },
  { id: 'drift', queueName: 'Drift Email', label: 'queue:drift', workerFile: 'drift-worker.js', npmScript: 'queue:drift', modulePath: null, defaultInstances: 1, maxInstances: 2 },
  { id: 'mapping', queueName: 'Mapping Lookup', label: 'queue:mapping', workerFile: 'mapping-worker.js', npmScript: 'queue:mapping', modulePath: 'queues/mappingQueue.js', defaultInstances: 1, maxInstances: 2 },
  { id: 'cleanup', queueName: 'field-cleanup', label: 'queue:cleanup', workerFile: 'cleanup-worker.js', npmScript: 'queue:cleanup', modulePath: 'queues/cleanupQueue.js', defaultInstances: 1, maxInstances: 1 },
  { id: 'deduplicate', queueName: 'deduplication', label: 'queue:deduplicate', workerFile: 'deduplicate-worker.js', npmScript: 'queue:deduplicate', modulePath: 'queues/deduplicateQueue.js', defaultInstances: 1, maxInstances: 2 },
  { id: 'open-sync', queueName: 'Open Status Sync', label: 'queue:open-sync', workerFile: 'open-status-sync-worker.js', npmScript: 'queue:open-sync', modulePath: 'queues/openStatusSyncQueue.js', defaultInstances: 1, maxInstances: 1 },
  { id: 'filter-export', queueName: 'Filter Export', label: 'queue:export', workerFile: 'export-worker.js', npmScript: 'queue:export', modulePath: 'queues/exportQueue.js', defaultInstances: 1, maxInstances: 2 },
  { id: 'gmail-pubsub', queueName: 'Gmail PubSub', label: 'queue:gmail-pubsub', workerFile: 'gmail-pubsub-worker.js', npmScript: 'queue:gmail-pubsub', modulePath: 'queues/gmailPubsubQueue.js', defaultInstances: 1, maxInstances: 1 },
  { id: 'bulk-update', queueName: 'Bulk Update Processing', label: 'queue:bulkupdate', workerFile: 'bulkupdate-worker.js', npmScript: 'queue:bulkupdate', modulePath: null, defaultInstances: 1, maxInstances: 1 },
  { id: 'db-transfer', queueName: 'DB Transfer Processing', label: 'queue:dbtransfer', workerFile: 'dbtransfer-worker.js', npmScript: 'queue:dbtransfer', modulePath: null, defaultInstances: 1, maxInstances: 1 },
  { id: 'email-sent-status', queueName: 'Email Sent Status Update', label: 'email-sent-status-worker', workerFile: 'email-sent-status-worker.js', npmScript: null, modulePath: 'queues/emailSentStatusQueue.js', defaultInstances: 1, maxInstances: 1 },
  { id: 'bounce-status', queueName: 'Bounce Status Update', label: 'bounce-status-worker', workerFile: 'bounce-status-worker.js', npmScript: null, modulePath: 'queues/bounceQueue.js', defaultInstances: 1, maxInstances: 1 },
  { id: 'gmail-scraper', queueName: 'Gmail Photo Scraper', label: 'queue:gmail-scraper', workerFile: 'gmail-photo-scraper-worker.js', npmScript: 'queue:gmail-scraper', modulePath: null, defaultInstances: 1, maxInstances: 1 },
];

function getRegistry() {
  return QUEUE_REGISTRY;
}

function getById(id) {
  return QUEUE_REGISTRY.find((q) => q.id === id) || null;
}

function getByQueueName(queueName) {
  return QUEUE_REGISTRY.find((q) => q.queueName === queueName) || null;
}

function getProjectRoot() {
  return projectRoot;
}

function getTriggerPm2Name(queueId) {
  return TRIGGER_PREFIX + queueId;
}

module.exports = {
  QUEUE_REGISTRY,
  TRIGGER_PREFIX,
  getRegistry,
  getById,
  getByQueueName,
  getProjectRoot,
  getTriggerPm2Name,
};
