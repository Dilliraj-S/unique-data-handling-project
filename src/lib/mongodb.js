import { MongoClient } from 'mongodb';
import { getConnectionConfig, defaultConnection } from '../config/database.js';

/**
 * MongoDB Multi-Database Connection Manager
 * Supports multiple database connections similar to Laravel's DB::connection()
 * 
 * Usage:
 *   - getDb() - Get default database
 *   - getDb('pluto') - Get pluto database
 *   - getCollection('users') - Get collection from default database
 *   - getCollection('users', 'pluto') - Get collection from pluto database
 *   - connection('sun').getCollection('items') - Get collection from sun database
 */

const globalForMongo = global;

// Store clients and databases for each connection
const clients = {};
const databases = {};

/**
 * Connect to a specific database
 * @param {string} connectionName - Name of the connection (default: 'central')
 * @returns {Promise<{client: MongoClient, db: Db}>} MongoDB client and database
 */
export async function connectToDatabase(connectionName = defaultConnection) {
  // Return existing connection if available
  if (globalForMongo.mongoClients && globalForMongo.mongoClients[connectionName]) {
    const client = globalForMongo.mongoClients[connectionName];
    const db = globalForMongo.mongoDatabases[connectionName];
    return { client, db };
  }

  // Get connection configuration
  const config = getConnectionConfig(connectionName);
  
  // Create new client
  const client = new MongoClient(config.uri, config.options);
  await client.connect();
  
  // Get database name from URI or config
  const dbName = config.uri.split('/').pop().split('?')[0] || config.database;
  const db = client.db(dbName);
  
  // Store in global for hot-reload prevention
  if (!globalForMongo.mongoClients) {
    globalForMongo.mongoClients = {};
    globalForMongo.mongoDatabases = {};
  }
  
  globalForMongo.mongoClients[connectionName] = client;
  globalForMongo.mongoDatabases[connectionName] = db;
  
  // Also store in local cache
  clients[connectionName] = client;
  databases[connectionName] = db;
  
  console.log(`✅ Connected to MongoDB database: ${connectionName} (${dbName})`);
  
  return { client, db };
}

/**
 * Get database instance (connect if needed)
 * @param {string} connectionName - Name of the connection (default: 'central')
 * @returns {Promise<Db>} MongoDB database instance
 */
export async function getDb(connectionName = defaultConnection) {
  if (globalForMongo.mongoDatabases && globalForMongo.mongoDatabases[connectionName]) {
    return globalForMongo.mongoDatabases[connectionName];
  }
  
  const { db } = await connectToDatabase(connectionName);
  return db;
}

/**
 * Get collection from a specific database
 * @param {string} collectionName - Name of the collection
 * @param {string} connectionName - Name of the connection (default: 'central')
 * @returns {Promise<Collection>} MongoDB collection
 */
export async function getCollection(collectionName, connectionName = defaultConnection) {
  const database = await getDb(connectionName);
  return database.collection(collectionName);
}

/**
 * Get a connection object (similar to Laravel's DB::connection())
 * Allows method chaining like: connection('pluto').getCollection('users')
 * @param {string} connectionName - Name of the connection
 * @returns {Object} Connection object with helper methods
 */
export function connection(connectionName = defaultConnection) {
  return {
    /**
     * Get database instance
     * @returns {Promise<Db>} MongoDB database instance
     */
    async getDb() {
      return await getDb(connectionName);
    },
    
    /**
     * Get collection
     * @param {string} collectionName - Name of the collection
     * @returns {Promise<Collection>} MongoDB collection
     */
    async getCollection(collectionName) {
      return await getCollection(collectionName, connectionName);
    },
    
    /**
     * Get client instance
     * @returns {Promise<MongoClient>} MongoDB client
     */
    async getClient() {
      const { client } = await connectToDatabase(connectionName);
      return client;
    },
    
    /**
     * Get connection name
     * @returns {string} Connection name
     */
    getName() {
      return connectionName;
    },
  };
}

/**
 * Close a specific database connection
 * @param {string} connectionName - Name of the connection (default: 'central')
 */
export async function closeConnection(connectionName = defaultConnection) {
  if (globalForMongo.mongoClients && globalForMongo.mongoClients[connectionName]) {
    const client = globalForMongo.mongoClients[connectionName];
    await client.close();
    delete globalForMongo.mongoClients[connectionName];
    delete globalForMongo.mongoDatabases[connectionName];
    delete clients[connectionName];
    delete databases[connectionName];
    console.log(`✅ Closed MongoDB connection: ${connectionName}`);
  }
}

/**
 * Close all database connections
 */
export async function closeAllConnections() {
  const connectionNames = Object.keys(globalForMongo.mongoClients || {});
  
  await Promise.all(
    connectionNames.map(connectionName => closeConnection(connectionName))
  );
  
  console.log('✅ Closed all MongoDB connections');
}

/**
 * Check if a connection is active
 * @param {string} connectionName - Name of the connection
 * @returns {boolean} True if connection is active
 */
export function isConnected(connectionName = defaultConnection) {
  return !!(
    globalForMongo.mongoClients && 
    globalForMongo.mongoClients[connectionName]
  );
}

// Export default for backward compatibility
export default {
  connectToDatabase,
  getDb,
  getCollection,
  connection,
  closeConnection,
  closeAllConnections,
  isConnected,
};
