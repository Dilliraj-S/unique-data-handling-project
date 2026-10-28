const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugShort() {
    const uri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;
    console.log('URI:', uri ? 'Found' : 'Missing');
    if (!uri) return;

    try {
        const client = new MongoClient(uri);
        await client.connect();
        const db = client.db('pluto');
        
        const user = await db.collection('users').findOne({});
        console.log('User:', user ? user.user_id : 'NONE');
        
        await client.close();
    } catch (e) {
        console.error(e);
    }
}

debugShort();
