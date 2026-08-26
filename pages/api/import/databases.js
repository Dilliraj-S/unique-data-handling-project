import { MongoClient } from 'mongodb';
import { getConnectionConfig, connections } from '../../../src/config/database.js';

/**
 * Get available databases and their collections
 * GET /api/import/databases
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all databases from config
    const databaseNames = ['sun', 'moon', 'mars', 'jupiter', 'earth', 'mercury', 'saturn', 'neptune', 'pluto', 'nextjs_stu'];
    
    const databases = databaseNames.map(name => {
      try {
        // Handle nextjs_stu as central connection
        const connectionName = name === 'nextjs_stu' ? 'central' : name;
        const config = getConnectionConfig(connectionName);
        return {
          name: name,
          label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
          uri: config.uri
        };
      } catch (error) {
        // Fallback for databases not in config
        const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        return {
          name: name,
          label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
          uri: `${baseUri}/${name}`
        };
      }
    });

    const result = [];

    for (const db of databases) {
      try {
        const client = new MongoClient(db.uri);
        await client.connect();
        
        const database = client.db(db.name);
        const collections = await database.listCollections().toArray();
        
        const collectionNames = collections
          .map(col => col.name)
          .filter(name => !name.startsWith('system.')) // Filter out system collections
          .sort();

        result.push({
          name: db.name,
          label: db.label,
          collections: collectionNames.map(name => ({
            name,
            label: name.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')
          }))
        });

        await client.close();
      } catch (error) {
        console.error(`Error connecting to ${db.name}:`, error.message);
        // Add database even if connection fails, but with empty collections
        result.push({
          name: db.name,
          label: db.label,
          collections: [],
          error: `Connection failed: ${error.message}`
        });
      }
    }

    return res.status(200).json({
      success: true,
      databases: result
    });

  } catch (error) {
    console.error('Database listing error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch databases', 
      details: error.message 
    });
  }
}
