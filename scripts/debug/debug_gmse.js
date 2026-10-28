require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');

async function checkGmse() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('mars');
    const collection = db.collection('gmse_company_info');

    // List first 5 documents to see what data looks like
    console.log('\n--- Sample Documents from mars.gmse_company_info ---');
    const samples = await collection.find({}).limit(5).toArray();
    
    fs.writeFileSync('gmse_debug_output.json', JSON.stringify(samples, null, 2));
    console.log('✅ Wrote samples to gmse_debug_output.json');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkGmse();
