import { MongoClient } from 'mongodb';

function getMongoUri(database) {
  const key = `${database.toUpperCase()}_MONGODB_URI`;
  if (!process.env[key]) {
    throw new Error(`Missing ${key}`);
  }
  return process.env[key];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false });
  }

  let client;

  try {
    const { database, collection } = req.query;

    if (!database || !collection) {
      return res.status(400).json({
        success: false,
        message: 'Database and collection required'
      });
    }

    client = new MongoClient(getMongoUri(database));
    await client.connect();

    const db = client.db(database);
    const col = db.collection(collection);

    /* ================================
       1️⃣ READ JSON SCHEMA (SAFE)
    ================================= */
    const info = await db
      .listCollections({ name: collection })
      .toArray();

    const schema = info[0]?.options?.validator?.$jsonSchema || {};
    const properties = schema.properties || {};

    /* ================================
       2️⃣ READ INDEXES
    ================================= */
    const indexes = await col.indexes();
    const indexMap = {};

    indexes.forEach(idx => {
      const field = Object.keys(idx.key)[0];
      if (idx.name === '_id_') return;

      if (idx.unique) indexMap[field] = 'unique';
      else indexMap[field] = 'index';
    });

    /* ================================
       3️⃣ BUILD COLUMNS FROM SCHEMA
    ================================= */
    let columns = Object.keys(properties).map(field => {
      let type = properties[field].bsonType || 'string';

      if (Array.isArray(type)) type = type[0];
      if (type === 'bool') type = 'boolean';

      return {
        name: field,
        dbName: field, // 🔥 important for rename
        type,
        index: indexMap[field] || 'none'
      };
    });

    /* ================================
       4️⃣ ALWAYS SAMPLE A REAL DOCUMENT
       to discover actual field names
       (schema validator is NOT updated by $rename)
    ================================= */
    const sample = await col.findOne({}, { projection: { _id: 0 } });

    if (sample) {
      const schemaFieldSet = new Set(columns.map(c => c.name));
      const sampleKeys = Object.keys(sample);

      // Add any fields found in the document that aren't in the schema
      sampleKeys.forEach(key => {
        if (!schemaFieldSet.has(key)) {
          const val = sample[key];
          let type = 'string';
          if (typeof val === 'number') type = 'number';
          else if (typeof val === 'boolean') type = 'boolean';
          else if (val instanceof Date) type = 'date';

          columns.push({
            name: key,
            dbName: key,
            type,
            index: indexMap[key] || 'none'
          });
        }
      });

      // Remove schema columns that no longer exist in actual documents
      // (i.e., columns that were renamed away)
      const actualFieldSet = new Set(sampleKeys);
      columns = columns.filter(col => actualFieldSet.has(col.name) || col.name === '_id');
    } else if (!columns.length) {
      // No schema AND no documents — nothing to show
      columns = [];
    }

    await client.close();

    return res.json({
      success: true,
      columns
    });

  } catch (err) {
    console.error('getSchema error:', err);
    if (client) await client.close();

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}
