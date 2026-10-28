/**
 * Mailcow IMAP IDLE Worker
 * 
 * Starts persistent IMAP IDLE connections to all Mailcow accounts.
 * Receives real-time email notifications without polling.
 * 
 * Prerequisites:
 *   npm install imapflow mailparser
 * 
 * Usage: node mailcow-imap-worker.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const MailcowImapService = require('../src/application/Services/MailcowImapService');

let db = null;
let imapService = null;

async function start() {
  console.log('🚀 Mailcow IMAP IDLE Worker starting...');

  // Connect to MongoDB
  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db('pluto');
  console.log('✅ MongoDB connected');

  // Create IMAP service and start all connections
  imapService = new MailcowImapService(db);
  await imapService.startAllIdle();

  // Status logging every 5 minutes
  setInterval(() => {
    const status = imapService.getStatus();
    const connected = status.filter(s => s.connected).length;
    const total = status.length;
    console.log(`[MailcowIMAP] Status: ${connected}/${total} connections active`);
  }, 5 * 60 * 1000);

  console.log('🚀 Mailcow IMAP IDLE Worker running');
}

// Start the worker
start().catch(err => {
  console.error('❌ Mailcow IMAP Worker startup failed:', err);
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  console.log('[MailcowIMAP] Shutting down...');
  if (imapService) {
    await imapService.stopAll();
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
