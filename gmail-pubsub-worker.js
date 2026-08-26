/**
 * Gmail Pub/Sub Worker — PULL MODE
 * 
 * Pulls notifications from Google Cloud Pub/Sub subscription.
 * No ngrok or public URL needed — works on localhost!
 * 
 * How it works:
 * 1. Connects to Pub/Sub subscription using Google Cloud credentials
 * 2. Pulls messages (notifications about inbox changes)
 * 3. For each notification, fetches new emails via history.list()
 * 4. Classifies with SmartClassifier → stores → enqueues actions
 * 
 * Prerequisites:
 *   npm install @google-cloud/pubsub
 *   Set GOOGLE_APPLICATION_CREDENTIALS env var OR use GOOGLE_CLIENT_ID/SECRET
 * 
 * Usage: node gmail-pubsub-worker.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { PubSub } = require('@google-cloud/pubsub');
const GmailWatcherService = require('./src/application/Services/GmailWatcherService');
const GmailUtility = require('./src/application/Services/GmailUtility');
const SmartClassifier = require('./src/application/Services/SmartClassifier');
const syncActionQueue = require('./queues/syncActionQueue');

// Singleton connections
let db = null;
let watcherService = null;

async function getConnections() {
  if (db && watcherService) return { db, watcherService };

  const mongoUrl = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db('pluto');
  watcherService = new GmailWatcherService(db);

  console.log('✅ Gmail PubSub Worker: DB connected');
  return { db, watcherService };
}

async function start() {
  console.log('🚀 Gmail PubSub Worker starting (PULL mode — no ngrok needed)...');

  const { db: database, watcherService: watcher } = await getConnections();

  // Connect to Google Cloud Pub/Sub
  const pubsub = new PubSub({
    projectId: process.env.GMAIL_PUBSUB_TOPIC
      ? process.env.GMAIL_PUBSUB_TOPIC.split('/')[1]
      : 'myauthproject-479114'
  });

  const subscriptionName = process.env.GMAIL_PUBSUB_SUBSCRIPTION
    || 'projects/myauthproject-479114/subscriptions/gmail-push-sub';
  
  // Extract just the subscription ID from full path
  const subId = subscriptionName.includes('/')
    ? subscriptionName.split('/').pop()
    : subscriptionName;

  const subscription = pubsub.subscription(subId);

  console.log(`📡 Listening on subscription: ${subId}`);

  // Listen for messages
  subscription.on('message', async (message) => {
    try {
      // Decode notification
      const data = JSON.parse(message.data.toString('utf-8'));
      const emailAddress = data.emailAddress;
      const historyId = data.historyId;

      if (!emailAddress || !historyId) {
        console.warn('[gmail-pubsub] Invalid notification — missing fields');
        message.ack();
        return;
      }

      console.log(`[gmail-pubsub] 📬 Notification: ${emailAddress}, historyId: ${historyId}`);

      // Process the notification
      await processNotification(database, watcher, emailAddress, historyId);

      // Acknowledge the message (tells Pub/Sub we processed it)
      message.ack();
    } catch (err) {
      console.error('[gmail-pubsub] Error processing message:', err.message);
      // Nack = Pub/Sub will retry later
      message.nack();
    }
  });

  subscription.on('error', (error) => {
    console.error('[gmail-pubsub] Subscription error:', error.message);
  });

  console.log('🚀 Gmail PubSub Worker running (PULL mode)');
  console.log('   Waiting for inbox notifications...');
}

/**
 * Process a single Pub/Sub notification
 */
async function processNotification(database, watcher, emailAddress, historyId) {
  // Step 1: Fetch history changes
  const historyResult = await watcher.processHistoryNotification(emailAddress, historyId);

  if (historyResult.needsFullSync) {
    console.log(`[gmail-pubsub] ${emailAddress} needs full sync — skipping push`);
    return;
  }

  if (!historyResult.messageIds || historyResult.messageIds.length === 0) {
    return;
  }

  // Step 2: Deduplicate
  const emailsCollection = database.collection('emails');
  const existingMsgs = await emailsCollection.find(
    {
      message_id: { $in: historyResult.messageIds },
      email_account_id: historyResult.account.id
    },
    { projection: { message_id: 1 } }
  ).toArray();

  const existingIds = new Set(existingMsgs.map(e => e.message_id));
  const newMessageIds = historyResult.messageIds.filter(id => !existingIds.has(id));

  if (newMessageIds.length === 0) {
    console.log(`[gmail-pubsub] ${emailAddress}: all ${historyResult.messageIds.length} messages already stored`);
    return;
  }

  // Step 3: Load keywords
  const rawKeywords = await database.collection('keywords').find({}).toArray();

  // Step 4: Fetch, classify, store
  const documents = [];
  const gmail = historyResult.gmail;
  const account = historyResult.account;

  for (const msgId of newMessageIds) {
    try {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msgId,
        format: 'full'
      });

      const headers = fullMessage.data.payload.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const inReplyTo = getHeader('In-Reply-To');
      const references = getHeader('References');
      const date = new Date(parseInt(fullMessage.data.internalDate, 10));
      const body = GmailUtility.getMessageBody(fullMessage.data);

      // Classify
      const structuredHeaders = SmartClassifier.extractHeaders(headers);
      const classification = SmartClassifier.classify({
        headers: structuredHeaders,
        subject,
        body: body.plain || '',
        bodyHtml: body.html || ''
      }, rawKeywords);

      const statusMap = {
        'hard_bounce': 'hard_bounce', 'soft_bounce': 'soft_bounce',
        'ratelimit': 'ratelimit', 'spam_block': 'spam_block',
        'auto_reply': 'automatic_reply', 'spam_complaint': 'spam_complaint',
        'unsubscribe': 'unsubscribe', 'human_reply': classification.subType || 'other'
      };

      const labelIds = fullMessage.data.labelIds || [];
      const isRead = !labelIds.includes('UNREAD');

      documents.push({
        id: msgId,
        email_account_id: account.id,
        account_email: account.email,
        message_id: msgId,
        thread_id: fullMessage.data.threadId,
        subject, from_email: from, from_name: from,
        snippet: fullMessage.data.snippet,
        body: body.html, body_plain: body.plain,
        in_reply_to: inReplyTo || null, references: references || null,
        received_at: date, category: 'inbox',
        status: statusMap[classification.type] || 'other',
        status_reasons: [],
        classification: classification.type,
        classification_sub_type: classification.subType,
        classification_step: classification.step,
        classified_by: classification.classifiedBy,
        classification_confidence: classification.confidence,
        dsn_code: classification.dsnCode || null,
        dsn_status: classification.dsnStatus || null,
        dsn_diagnostic: classification.diagnostic || null,
        original_message_id: classification.originalMessageId || null,
        bounce_recipient: classification.recipient || null,
        classified_at: new Date(),
        sync_source: 'pubsub_pull',
        read: isRead ? 1 : 0,
        created_at: new Date(), updated_at: new Date()
      });
    } catch (fetchErr) {
      console.warn(`[gmail-pubsub] Failed to fetch message ${msgId}:`, fetchErr.message);
    }
  }

  // Step 5: Batch insert
  if (documents.length > 0) {
    try {
      await emailsCollection.insertMany(documents, { ordered: false });
    } catch (insertErr) {
      if (insertErr.code !== 11000) throw insertErr;
    }

    // Step 6: Enqueue actions
    const actionableTypes = [
      'hard_bounce', 'soft_bounce', 'ratelimit', 'spam_block',
      'auto_reply', 'spam_complaint', 'unsubscribe'
    ];

    for (const doc of documents) {
      const isActionable = actionableTypes.includes(doc.classification) ||
        (doc.classification === 'human_reply' && 
         (doc.classification_sub_type === 'no_longer' || doc.classification_sub_type === 'not_interested'));

      if (!isActionable) continue;

      try {
        await syncActionQueue.add({
          classification: {
            type: doc.classification, subType: doc.classification_sub_type,
            dsnCode: doc.dsn_code, dsnStatus: doc.dsn_status,
            diagnostic: doc.dsn_diagnostic, originalMessageId: doc.original_message_id,
            recipient: doc.bounce_recipient, classifiedBy: doc.classified_by
          },
          recipientEmail: doc.bounce_recipient || doc.from_email,
          campaignId: null, subscriberId: null,
          accountEmail: doc.account_email
        });
      } catch (err) {
        console.warn(`[gmail-pubsub] Action enqueue failed:`, err.message);
      }
    }
  }

  console.log(`[gmail-pubsub] ✅ ${emailAddress}: ${documents.length} new emails processed`);
}

// Start
start().catch(err => {
  console.error('❌ Gmail PubSub Worker failed:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
