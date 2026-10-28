/**
 * Multi-Database Configuration
 * Similar to Laravel's config/database.php
 * Supports multiple MongoDB database connections
 */

const defaultConnection = process.env.DB_CONNECTION || 'central';

/**
 * Database Connection Configurations
 * Each connection has its own URI and can be used independently
 */
function switchDatabase(uri, dbName) {
  if (!uri) return null;
  return uri.replace(/(\/[^/?]+)(\?.*)?$/, (match, p1, p2) => "/" + dbName + (p2 || ""));
}

const connections = {
  // Default/Central database (main application database)
  central: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/nextjs_stu',
    database: process.env.CENTRAL_DATABASE || 'nextjs_stu',
    options: {
      maxPoolSize: 20, // Increased for concurrent operations
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000, // 30 seconds
      connectTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 0, // NO TIMEOUT - critical for long-running imports
      maxIdleTimeMS: 300000, // 5 minutes before closing idle connections
      heartbeatFrequencyMS: 10000, // Keep connection alive with heartbeats
      retryWrites: true,
      retryReads: true,
    },
  },

  // Pluto database
  pluto: {
    uri: process.env.PLUTO_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "pluto") || 'mongodb://localhost:27017/pluto',
    database: process.env.PLUTO_DATABASE || 'pluto',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Sun database
  sun: {
    uri: process.env.SUN_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "sun") || 'mongodb://localhost:27017/sun',
    database: process.env.SUN_DATABASE || 'sun',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Moon database
  moon: {
    uri: process.env.MOON_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "moon") || 'mongodb://localhost:27017/moon',
    database: process.env.MOON_DATABASE || 'moon',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Mars database
  mars: {
    uri: process.env.MARS_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "mars") || 'mongodb://localhost:27017/mars',
    database: process.env.MARS_DATABASE || 'mars',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Jupiter database
  jupiter: {
    uri: process.env.JUPITER_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "jupiter") || 'mongodb://localhost:27017/jupiter',
    database: process.env.JUPITER_DATABASE || 'jupiter',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Earth database
  earth: {
    uri: process.env.EARTH_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "earth") || 'mongodb://localhost:27017/earth',
    database: process.env.EARTH_DATABASE || 'earth',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Mercury database
  mercury: {
    uri: process.env.MERCURY_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "mercury") || 'mongodb://localhost:27017/mercury',
    database: process.env.MERCURY_DATABASE || 'mercury',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Saturn database
  saturn: {
    uri: process.env.SATURN_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "saturn") || 'mongodb://localhost:27017/saturn',
    database: process.env.SATURN_DATABASE || 'saturn',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Neptune database
  neptune: {
    uri: process.env.NEPTUNE_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "neptune") || 'mongodb://localhost:27017/neptune',
    database: process.env.NEPTUNE_DATABASE || 'neptune',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Automation database (for domain enrichment and similar agents)
  automation: {
    uri:
      process.env.AUTOMATION_MONGODB_URI ||
      switchDatabase(process.env.MONGODB_URI, "automation") ||
      'mongodb://localhost:27017/automation',
    database: process.env.AUTOMATION_DATABASE || 'automation',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Business database (optional, for future use)
  business: {
    uri: process.env.BUSINESS_MONGODB_URI || switchDatabase(process.env.MONGODB_URI, "business") || 'mongodb://localhost:27017/business',
    database: process.env.BUSINESS_DATABASE || 'business',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 0, // NO TIMEOUT for long operations
      maxIdleTimeMS: 300000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    },
  },
};

/**
 * Get connection configuration by name
 * @param {string} connectionName - Name of the connection (default: 'central')
 * @returns {Object} Connection configuration
 */
function getConnectionConfig(connectionName = defaultConnection) {
  const config = connections[connectionName];
  
  if (!config) {
    throw new Error(`Database connection "${connectionName}" not found. Available connections: ${Object.keys(connections).join(', ')}`);
  }
  
  return config;
}

/**
 * Get all available connection names
 * @returns {string[]} Array of connection names
 */
function getAvailableConnections() {
  return Object.keys(connections);
}

/**
 * Check if a connection exists
 * @param {string} connectionName - Name of the connection
 * @returns {boolean} True if connection exists
 */
function connectionExists(connectionName) {
  return connections.hasOwnProperty(connectionName);
}

export {
  defaultConnection,
  connections,
  getConnectionConfig,
  getAvailableConnections,
  connectionExists,
};

