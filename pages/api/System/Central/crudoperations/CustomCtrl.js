import { MongoClient } from 'mongodb';

/* =====================================================
   Mongo URI Resolver (Dynamic DBs — matches database.js)
===================================================== */
function getMongoUri(databaseName) {
  // Map connection names to env vars (mirrors src/config/database.js)
  const dbEnvMap = {
    central: process.env.MONGODB_URI,
    sun: process.env.SUN_MONGODB_URI,
    pluto: process.env.PLUTO_MONGODB_URI,
    moon: process.env.MOON_MONGODB_URI,
    mars: process.env.MARS_MONGODB_URI,
    jupiter: process.env.JUPITER_MONGODB_URI,
    earth: process.env.EARTH_MONGODB_URI,
    mercury: process.env.MERCURY_MONGODB_URI,
    saturn: process.env.SATURN_MONGODB_URI,
    neptune: process.env.NEPTUNE_MONGODB_URI,
    automation: process.env.AUTOMATION_MONGODB_URI,
  };

  // Try specific env var first, then fall back to base URI with db switch
  let uri = dbEnvMap[databaseName];
  if (!uri) {
    const baseUri = process.env.MONGODB_URI;
    if (!baseUri) throw new Error('Missing MONGODB_URI');
    // Replace DB name in URI to switch database
    uri = baseUri.replace(/\/[^\/\?]+(\?|$)/, `/${databaseName}$1`);
  }
  return uri;
}

async function getClient(databaseName) {
  const uri = getMongoUri(databaseName);
  const client = new MongoClient(uri, {
    socketTimeoutMS: 0,       // No timeout for long ops (1Cr+ deletes)
    serverSelectionTimeoutMS: 30000,
  });
  await client.connect();
  // Extract actual DB name from URI
  const dbName = uri.split('/').pop().split('?')[0] || databaseName;
  return { client, db: client.db(dbName) };
}

/* =====================================================
   FIELD NAME VALIDATION (Mongo Safe)
===================================================== */
function isValidFieldName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    !name.includes('.') &&
    !name.startsWith('$') &&
    /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  );
}

/* =====================================================
   ESTIMATE TIME
===================================================== */
function estimateTime(count) {
  if (count <= 1000) return 'Instant';
  if (count <= 10000) return '1–2 seconds';
  if (count <= 50000) return '5–10 seconds';
  if (count <= 100000) return '10–30 seconds';
  if (count <= 1000000) return '30–60 seconds';
  return 'Instant (drop + recreate)';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  let client;

  try {
    const { action } = req.body;

    /* =====================================================
       🔍 PREVIEW (COUNT + ESTIMATE)
    ===================================================== */
    if (action === 'preview') {
      const { type, database, collection, column, values } = req.body;

      if (!database || !collection) {
        return res.status(400).json({ success: false, message: 'Invalid preview payload' });
      }

      const conn = await getClient(database);
      client = conn.client;

      const col = conn.db.collection(collection);
      let count = 0;

      if (type === 'delete_column') {
        count = await col.countDocuments({ [column]: { $exists: true } });
      }

      if (type === 'delete_value' && Array.isArray(values)) {
        count = await col.countDocuments({
          [column]: { $in: values }
        });
      }

      if (type === 'delete_duplicate') {
        const dup = await col.aggregate([
          { $group: { _id: `$${column}`, c: { $sum: 1 } } },
          { $match: { c: { $gt: 1 } } }
        ]).toArray();

        count = dup.reduce((a, b) => a + (b.c - 1), 0);
      }

      if (type === 'empty_collection' || type === 'drop_collection') {
        count = await col.estimatedDocumentCount();
      }

      return res.json({
        success: true,
        count,
        estimate: estimateTime(count)
      });
    }

    /* =====================================================
       🗑️ EMPTY COLLECTION (Scalable — Drop + Recreate)
       Works instantly even for 1 Crore+ records
    ===================================================== */
    if (action === 'empty_collection') {
      const { database, collection } = req.body;

      if (!database || !collection) {
        return res.status(400).json({ success: false, message: 'Database and collection are required' });
      }

      const conn = await getClient(database);
      client = conn.client;
      const col = conn.db.collection(collection);

      // Get document count before dropping
      const docCount = await col.estimatedDocumentCount();

      // Save existing indexes (so we can recreate them)
      const existingIndexes = await col.indexes();
      const userIndexes = existingIndexes.filter(idx => idx.name !== '_id_');

      // Drop the collection (instant, regardless of size)
      await conn.db.dropCollection(collection);

      // Recreate the empty collection
      await conn.db.createCollection(collection);

      // Recreate user indexes
      if (userIndexes.length > 0) {
        const newCol = conn.db.collection(collection);
        for (const idx of userIndexes) {
          try {
            const { key, name, ...options } = idx;
            // Remove internal fields
            delete options.v;
            delete options.ns;
            await newCol.createIndex(key, { name, ...options });
          } catch (e) {
            console.warn(`Failed to recreate index "${idx.name}":`, e.message);
          }
        }
      }

      return res.json({
        success: true,
        message: `Collection "${collection}" emptied successfully. ${docCount.toLocaleString()} documents removed. ${userIndexes.length} indexes preserved.`
      });
    }

    /* =====================================================
       🗑️ DROP COLLECTION (Instant)
    ===================================================== */
    if (action === 'drop_collection') {
      const { database, collection } = req.body;

      if (!database || !collection) {
        return res.status(400).json({ success: false, message: 'Database and collection are required' });
      }

      const conn = await getClient(database);
      client = conn.client;

      await conn.db.dropCollection(collection);

      return res.json({
        success: true,
        message: `Collection "${collection}" dropped successfully`
      });
    }

    /* =====================================================
       🗑️ DELETE DOCUMENTS WHERE COLUMN EXISTS
    ===================================================== */
    if (action === 'delete_column') {
      const { database, collection, column } = req.body;

      if (!isValidFieldName(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }

      const conn = await getClient(database);
      client = conn.client;

      const col = conn.db.collection(collection);
      const result = await col.deleteMany({ [column]: { $exists: true } });

      return res.json({
        success: true,
        message: `${result.deletedCount.toLocaleString()} documents deleted where "${column}" exists`
      });
    }

    /* =====================================================
       🗑️ DELETE BY VALUE (MULTI VALUES)
    ===================================================== */
    if (action === 'delete_value') {
      const { database, collection, column, values } = req.body;

      if (!Array.isArray(values) || !values.length) {
        return res.status(400).json({
          success: false,
          message: 'Values must be a non-empty array'
        });
      }

      if (!isValidFieldName(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }

      const conn = await getClient(database);
      client = conn.client;

      const col = conn.db.collection(collection);
      const result = await col.deleteMany({ [column]: { $in: values } });

      return res.json({
        success: true,
        message: `${result.deletedCount.toLocaleString()} records deleted`
      });
    }

    /* =====================================================
       🗑️ DELETE DUPLICATES (Batched for large collections)
    ===================================================== */
    if (action === 'delete_duplicate') {
      const { database, collection, column } = req.body;

      if (!isValidFieldName(column)) {
        throw new Error(`Invalid column name: ${column}`);
      }

      const conn = await getClient(database);
      client = conn.client;

      const col = conn.db.collection(collection);

      // Use allowDiskUse for large collections
      const duplicates = await col.aggregate([
        { $group: { _id: `$${column}`, ids: { $push: '$_id' }, c: { $sum: 1 } } },
        { $match: { c: { $gt: 1 } } }
      ], { allowDiskUse: true }).toArray();

      let deletedCount = 0;
      const BATCH_SIZE = 5000;

      // Collect all IDs to delete, then batch delete
      const allIdsToDelete = [];
      for (const d of duplicates) {
        const [, ...toDelete] = d.ids;
        allIdsToDelete.push(...toDelete);
      }

      // Delete in batches for scalability
      for (let i = 0; i < allIdsToDelete.length; i += BATCH_SIZE) {
        const batch = allIdsToDelete.slice(i, i + BATCH_SIZE);
        const r = await col.deleteMany({ _id: { $in: batch } });
        deletedCount += r.deletedCount;
      }

      return res.json({
        success: true,
        message: `${deletedCount.toLocaleString()} duplicate records removed`
      });
    }

    /* =====================================================
       ⚠️ CREATE / UPDATE COLLECTION
    ===================================================== */
    if (!action) {
      const { database, collection, columns } = req.body;

      if (!database || !collection || !Array.isArray(columns)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payload'
        });
      }

      // 🔒 validate fields
      for (const c of columns) {
        if (!isValidFieldName(c.name)) {
          throw new Error(`Invalid field name: ${c.name}`);
        }
      }

      const conn = await getClient(database);
      client = conn.client;

      const db = conn.db;
      const col = db.collection(collection);

      /* ================= CREATE COLLECTION ================= */
      const exists = await db.listCollections({ name: collection }).toArray();
      if (!exists.length) await db.createCollection(collection);

      /* ================= INSERT SAMPLE ================= */
      const count = await col.countDocuments();
      if (count === 0) {
        const sample = {};
        columns.forEach(c => {
          if (c.type === 'number') sample[c.name] = 1;
          else if (c.type === 'boolean') sample[c.name] = true;
          else if (c.type === 'date') sample[c.name] = new Date();
          else sample[c.name] = `sample_${c.name}`;
        });

        await col.insertOne(sample, { bypassDocumentValidation: true });
      }

      return res.json({
        success: true,
        message: 'Collection schema updated successfully'
      });
    }

  } catch (err) {
    console.error('CustomCtrl error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  } finally {
    if (client) await client.close();
  }
}
