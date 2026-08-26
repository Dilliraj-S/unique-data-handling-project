/**
 * Atomic ID Counter Service
 * Provides thread-safe, atomic ID generation for concurrent imports
 * Uses MongoDB's findOneAndUpdate with $inc for atomicity
 * 
 * This solves the concurrent import ID collision problem where multiple
 * jobs importing to the same collection would get the same starting ID.
 */

const { MongoClient } = require('mongodb');
const { getConnectionConfig } = require('../src/config/database.js');

class IdCounterService {
  constructor() {
    this.client = null;
    this.db = null;
    this.countersCollection = null;
  }

  /**
   * Connect to the database
   * Uses the 'sun' database for counters (same as data collections)
   */
  async connect() {
    if (this.client && this.db) {
      return; // Already connected
    }

    try {
      const config = getConnectionConfig('sun');
      this.client = new MongoClient(config.uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      await this.client.connect();
      this.db = this.client.db(config.database || 'sun');
      this.countersCollection = this.db.collection('_id_counters');
      
      // CRITICAL FIX: Do NOT create index on _id - MongoDB auto-indexes _id as unique
      // Creating a manual index on _id causes: "The field 'unique' is not valid for an _id index specification"
      // Instead, create index on collection name field for fast lookups (if needed)
      // Note: MongoDB automatically indexes _id, so no manual index needed
    } catch (error) {
      console.error('IdCounterService connection error:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.countersCollection = null;
    }
  }

  /**
   * Reserve a range of IDs atomically
   * 
   * @param {string} collectionName - Name of the collection to reserve IDs for
   * @param {number} count - Number of IDs to reserve
   * @returns {Promise<{start: number, end: number}>} - Reserved ID range (inclusive)
   * 
   * Example:
   *   const { start, end } = await idCounter.reserveRange('temp_master_leads', 5000);
   *   // start = 1001, end = 6000 (if counter was at 1000)
   *   // Next call would get start = 6001
   */
  async reserveRange(collectionName, count) {
    await this.connect();

    if (!count || count <= 0) {
      throw new Error('Count must be a positive integer');
    }

    try {
      // Atomic increment - this is the key to concurrency safety
      // findOneAndUpdate with $inc is atomic in MongoDB
      const result = await this.countersCollection.findOneAndUpdate(
        { _id: collectionName },
        { $inc: { seq: count } },
        { 
          upsert: true, 
          returnDocument: 'after'
        }
      );

      const endId = result.seq;
      const startId = endId - count + 1;

      console.log(`🔢 [${collectionName}] Reserved ID range: ${startId} - ${endId} (${count} IDs)`);

      return {
        start: startId,
        end: endId
      };
    } catch (error) {
      console.error(`IdCounterService.reserveRange error for ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Get the current counter value without incrementing
   * Useful for debugging or UI display
   * 
   * @param {string} collectionName - Name of the collection
   * @returns {Promise<number>} - Current counter value (0 if not found)
   */
  async getCurrentValue(collectionName) {
    await this.connect();

    try {
      const doc = await this.countersCollection.findOne({ _id: collectionName });
      return doc ? doc.seq : 0;
    } catch (error) {
      console.error(`IdCounterService.getCurrentValue error for ${collectionName}:`, error.message);
      return 0;
    }
  }

  /**
   * Initialize counter from existing collection data
   * Call this once when setting up a new collection or migrating
   * 
   * @param {string} collectionName - Name of the collection
   * @param {object} db - MongoDB database instance (to query the actual collection)
   * @returns {Promise<number>} - The initialized counter value
   */
  async initializeFromCollection(collectionName, db) {
    await this.connect();

    try {
      // Find the maximum ID in the actual collection
      const collection = db.collection(collectionName);
      const result = await collection.find({})
        .sort({ id: -1 })
        .limit(1)
        .project({ id: 1 })
        .toArray();

      let maxId = 0;
      if (result.length > 0 && result[0].id) {
        const existingMaxId = result[0].id;
        if (typeof existingMaxId === 'number') {
          maxId = existingMaxId;
        } else if (typeof existingMaxId === 'string' && !isNaN(parseInt(existingMaxId, 10))) {
          maxId = parseInt(existingMaxId, 10);
        }
      }

      // Set the counter to the max ID found (or 0 if empty)
      // Use $set to always reflect actual collection state
      // This allows the counter to decrease if the collection was cleared/reduced
      await this.countersCollection.updateOne(
        { _id: collectionName },
        { $set: { seq: maxId } },
        { upsert: true }
      );

      console.log(`🔢 [${collectionName}] Initialized counter to ${maxId} from existing data`);
      return maxId;
    } catch (error) {
      console.error(`IdCounterService.initializeFromCollection error for ${collectionName}:`, error.message);
      throw error;
    }
  }

  /**
   * Reset counter to a specific value
   * USE WITH CAUTION - only for testing or recovery
   * 
   * @param {string} collectionName - Name of the collection
   * @param {number} value - Value to set the counter to
   */
  async resetCounter(collectionName, value) {
    await this.connect();

    await this.countersCollection.updateOne(
      { _id: collectionName },
      { $set: { seq: value } },
      { upsert: true }
    );

    console.log(`🔢 [${collectionName}] Counter reset to ${value}`);
  }
}

// Export singleton instance for shared use
const idCounterService = new IdCounterService();

module.exports = {
  IdCounterService,
  idCounterService
};
