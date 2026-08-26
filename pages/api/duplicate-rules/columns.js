import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../src/config/database.js';

/**
 * API: Get collection columns dynamically
 * Used for populating the "Add Rule" modal column selector
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let client;
  try {
    const { database, collection } = req.query;

    if (!database || !collection) {
      return res.status(400).json({
        success: false,
        message: 'database and collection query parameters are required'
      });
    }

    // Get MongoDB URI for the specified database
    const config = getConnectionConfig(database);
    client = new MongoClient(config.uri);
    await client.connect();

    const db = client.db(database);
    const col = db.collection(collection);

    // Method 1: Try to get collection validator schema
    let fields = new Set();
    try {
      const collectionInfo = await db.listCollections({ name: collection }).toArray();
      if (collectionInfo.length > 0 && collectionInfo[0].options?.validator?.$jsonSchema?.properties) {
        const properties = collectionInfo[0].options.validator.$jsonSchema.properties;
        Object.keys(properties)
          .filter(field => field !== '_id' && field !== 'id')
          .forEach(field => fields.add(field));
      }
    } catch (schemaError) {
      console.log(`⚠️  No validator schema found for ${database}.${collection}`);
    }

    // Method 2: Sample documents to capture all fields (schemaless DB support)
    const sampleSize = 100;
    const sampleDocs = await col.find({}).limit(sampleSize).toArray();

    if (sampleDocs.length > 0) {
      sampleDocs.forEach(doc => {
        Object.keys(doc)
          .filter(field => field !== '_id' && field !== 'id')
          .forEach(field => fields.add(field));
      });
    }

    // Convert Set to sorted array
    const columns = Array.from(fields).sort();

    return res.status(200).json({
      success: true,
      columns: columns.map(col => ({
        name: col,
        displayName: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
    });

  } catch (error) {
    console.error('Error fetching collection columns:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch collection columns'
    });
  } finally {
    if (client) await client.close();
  }
}

