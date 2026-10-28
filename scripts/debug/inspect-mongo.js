const { MongoClient } = require('mongodb');

async function removeValidation() {
  const uri = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db('pluto');
    
    // Remove validation
    await db.command({
      collMod: 'emails',
      validator: {},
      validationLevel: 'off'
    });
    
    console.log('✅ Successfully removed validation from emails collection');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

removeValidation();
