/**
 * Bull Board Dashboard API
 * Provides web interface for monitoring Bull Queue jobs
 */

import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Import the queue
const importQueue = require('../../../queues/importQueue');

// Create Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(importQueue)],
  serverAdapter: serverAdapter,
});

export default function handler(req, res) {
  // Get the Express app from the server adapter
  const app = serverAdapter.getRouter();
  
  // Handle the request
  app(req, res, (err) => {
    if (err) {
      console.error('Bull Board error:', err);
      res.status(500).json({ error: 'Bull Board error' });
    }
  });
}
