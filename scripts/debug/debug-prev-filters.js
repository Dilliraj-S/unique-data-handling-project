
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function check() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    // Using the ID from the logs: 694bec9c4b3bb2a938e0c15f (this is likely the string legacy ID?) 
    // Wait, the logs say Look for Previous Sequence ID: ... which is the _id.
    // The legacy ID migration logs show: Migrating legacy sequence 694bec9c4b3bb2a938e0c15f to have Long ID: ...
    // But the _id in MongoDB is likely the ObjectId version of that string if it was inserted that way, 
    // OR it's a new ObjectId. 
    
    // Let's find by querying the set_id or name if possible, or just list all to find it.
    // The user logs showed: "original: 694bec9c4b3bb2a938e0c15f"
    
    // Let's look for any sequence with that _id (try casting to ObjectId)
    let id = '694bec9c4b3bb2a938e0c15f';
    let query = {};
    try {
        query = { _id: new ObjectId(id) };
    } catch(e) {
        query = { _id: id };
    }

    const seq = await db.collection('drift_sequences').findOne(query);
    console.log('--- Previous Sequence ---');
    if (seq) {
        console.log(`ID: ${seq._id}`);
        console.log(`Name: ${seq.name}`);
        console.log(`Filters Found: ${seq.filters ? seq.filters.length : 0}`);
        console.log('Filters Sample:', JSON.stringify(seq.filters ? seq.filters.slice(0, 3) : []));
    } else {
        console.log('Sequence not found with ID:', id);
        // Fallback: list all sequences in the set to see what's there
        const all = await db.collection('drift_sequences').find().limit(5).toArray();
        console.log('Available Sequences:', all.map(s => ({ id: s._id, name: s.name })));
    }
    
    await client.close();
}

check().catch(console.error);
