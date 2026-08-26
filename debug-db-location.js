
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    await client.connect();
    
    console.log('--- Default DB ---');
    const defaultDb = client.db();
    console.log('--- Default DB (' + defaultDb.databaseName + ') ---');
    const count = await defaultDb.collection('email_accounts').countDocuments();
    console.log('email_accounts count:', count);

    console.log('\n--- Pluto DB (pluto) ---');
    const plutoDb = client.db('pluto');
    const plutoCount = await plutoDb.collection('email_accounts').countDocuments();
    console.log('email_accounts count:', plutoCount);
    
    await client.close();
}

check().catch(console.error);
