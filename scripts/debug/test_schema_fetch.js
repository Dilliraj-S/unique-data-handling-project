
const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb://localhost:27017/moon';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('moon');
    
    const collections = await db.listCollections({ name: 'master_copy' }).toArray();
    
    if (collections.length > 0) {
      const colInfo = collections[0];
      console.log('Collection found:', colInfo.name);
      
      if (colInfo.options && colInfo.options.validator && colInfo.options.validator.$jsonSchema) {
        const properties = colInfo.options.validator.$jsonSchema.properties;
        const columns = Object.keys(properties);
        console.log(`Found ${columns.length} columns in schema validator:`);
        console.log(columns.join(', '));
      } else {
        console.log('No schema validator found in options:', JSON.stringify(colInfo.options, null, 2));
      }
    } else {
      console.log('master_copy collection not found');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

run();
