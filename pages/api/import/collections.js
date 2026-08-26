import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';
import { getCollectionSchema } from '../../../src/config/collectionSchemas.js';

/**
 * Get collections for a specific database with their field schemas
 * GET /api/import/collections?database=sun
 * 
 * Field Discovery Priority (3-tier fallback):
 * 1. MongoDB validator schema (if exists)
 * 2. Predefined schema registry (for known collections)
 * 3. Document sampling (for unknown collections)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { database } = req.query;

    if (!database) {
      return res.status(400).json({ 
        error: 'Database parameter is required' 
      });
    }

    // Get database URI from config
    let mongoUri;
    try {
      // Handle nextjs_stu as central connection
      const connectionName = database === 'nextjs_stu' ? 'central' : database;
      const config = getConnectionConfig(connectionName);
      mongoUri = config.uri;
    } catch (error) {
      // Fallback for databases not in config
      const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
      mongoUri = `${baseUri}/${database}`;
    }

    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(database);
    const collections = await db.listCollections().toArray();
    
    const result = [];

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        continue;
      }

      try {
        const collection = db.collection(collectionName);
        let fields = [];
        let fieldSource = 'none';
        
        // ============================================
        // TIER 1: Try MongoDB validator schema first
        // ============================================
        try {
          const collInfo = await db.listCollections({ name: collectionName }).toArray();
          if (collInfo.length > 0 && collInfo[0].options?.validator?.$jsonSchema?.properties) {
            const properties = collInfo[0].options.validator.$jsonSchema.properties;
            fields = Object.keys(properties).filter(key => key !== '_id');
            if (fields.length > 0) {
              fieldSource = 'validator';
              console.log(`📋 [${database}.${collectionName}] Got ${fields.length} fields from validator schema`);
            }
          }
        } catch (schemaErr) {
          // Validator not found, continue to next tier
        }
        
        // ============================================
        // TIER 2: Try predefined schema registry
        // ============================================
        if (fields.length === 0) {
          const predefinedSchema = getCollectionSchema(database, collectionName);
          if (predefinedSchema && predefinedSchema.length > 0) {
            fields = predefinedSchema.filter(f => f !== '_id');
            fieldSource = 'registry';
            console.log(`📋 [${database}.${collectionName}] Got ${fields.length} fields from schema registry`);
          }
        }
        
        // ============================================
        // TIER 3: Sample documents (fallback)
        // ============================================
        if (fields.length === 0) {
          const sampleSize = 100;
          const sampleDocs = await collection.find({}).limit(sampleSize).toArray();
          
          // Use Set to aggregate unique field names
          const fieldsSet = new Set();
          sampleDocs.forEach(doc => {
            Object.keys(doc).filter(key => key !== '_id').forEach(field => fieldsSet.add(field));
          });
          fields = Array.from(fieldsSet);
          
          if (fields.length > 0) {
            fieldSource = 'sampling';
            console.log(`📋 [${database}.${collectionName}] Got ${fields.length} fields from document sampling`);
          }
        }
        
        // Get collection stats
        let documentCount = 0;
        let size = 0;
        try {
          const stats = await db.command({ collStats: collectionName });
          documentCount = stats.count || 0;
          size = stats.size || 0;
        } catch (statsErr) {
          // Stats not available
        }
        
        result.push({
          name: collectionName,
          label: collectionName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          fields: fields.sort(),
          documentCount,
          size,
          fieldSource // Include source for debugging
        });
        
      } catch (error) {
        // If collection access fails, still try predefined schema
        const predefinedSchema = getCollectionSchema(database, collectionName);
        
        result.push({
          name: collectionName,
          label: collectionName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          fields: predefinedSchema || [],
          documentCount: 0,
          size: 0,
          fieldSource: predefinedSchema ? 'registry' : 'none',
          error: error.message
        });
      }
    }

    await client.close();

    return res.status(200).json({
      success: true,
      database,
      collections: result.sort((a, b) => a.name.localeCompare(b.name))
    });

  } catch (error) {
    console.error('Collections listing error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch collections', 
      details: error.message 
    });
  }
}

