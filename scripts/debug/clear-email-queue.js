/**
 * Clear Email Delivery Queue
 * Usage: node clear-email-queue.js
 */

require('dotenv').config();
const Queue = require('bull');

const emailDeliveryQueue = new Queue('Email Delivery', {
  redis: { 
    host: process.env.REDIS_HOST || 'localhost', 
    port: process.env.REDIS_PORT || 6379 
  }
});

async function clearQueue() {
  console.log('🗑️  OBLITERATING Email Delivery Queue...');
  
  try {
    // Get counts before clearing
    const counts = await emailDeliveryQueue.getJobCounts();
    console.log('📊 Current Job Counts:', counts);
    
    // Forcefully obliterate the queue (removes everything: active, waiting, delayed, etc.)
    await emailDeliveryQueue.obliterate({ force: true });
    console.log('✅ Queue OBLITERATED successfully (All jobs removed)');
    
    // Verify (should be error or 0)
    try {
      const newCounts = await emailDeliveryQueue.getJobCounts();
      console.log('📊 New Job Counts:', newCounts);
    } catch (e) {
      console.log('📊 Queue is gone (as expected)');
    }
    
  } catch (error) {
    console.error('❌ Failed to clear queue:', error);
  } finally {
    await emailDeliveryQueue.close();
    process.exit(0);
  }
}

clearQueue();
