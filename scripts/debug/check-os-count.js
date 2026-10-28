const { Client } = require('@opensearch-project/opensearch');
require('dotenv').config();

async function run() {
  const client = new Client({
    node: process.env.OPENSEARCH_URL || 'http://localhost:9200',
    requestTimeout: 30000
  });

  try {
    const indexName = 'sun_master_leads';
    
    // Total count
    const totalCount = await client.count({ index: indexName });
    console.log('Total Documents in OpenSearch index:', totalCount.body.count);

    // Count where deleted_at exists
    const deletedCount = await client.count({
      index: indexName,
      body: {
        query: { exists: { field: 'deleted_at' } }
      }
    });
    console.log('Documents where deleted_at EXISTS:', deletedCount.body.count);

    // Count missing deleted_at
    const notDeletedCount = await client.count({
      index: indexName,
      body: {
        query: { bool: { must_not: { exists: { field: 'deleted_at' } } } }
      }
    });
    console.log('Documents missing deleted_at:', notDeletedCount.body.count);

  } catch (err) {
    console.error('OpenSearch query failed:', err.message);
  }
}

run();
