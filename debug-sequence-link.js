
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function check() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    const seqs = await db.collection('drift_sequences').find({}).toArray();
    
    console.log('--- Sequences Inspection ---');
    seqs.forEach(s => {
        console.log(`ID: ${s._id} (Type: ${s._id.constructor.name})`);
        console.log(`Name: ${s.name}`);
        console.log(`PreSeqID: ${s.previous_sequence_id} (Type: ${typeof s.previous_sequence_id})`);
        console.log('---');
    });
    
    await client.close();
}

check().catch(console.error);
