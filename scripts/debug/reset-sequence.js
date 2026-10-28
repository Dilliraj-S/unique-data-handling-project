
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function resetSequenceStatus() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('pluto');
  
  // Find Sequence L1 by name or just reset all 'running' ones that have no logs to be safe?
  // Let's target "l1" specifically as that's the one blocking.
  
  const seq = await db.collection('drift_sequences').findOne({ name: 'l1' });
  if (seq) {
      console.log(`Found sequence l1. Status: ${seq.status}`);
      
      await db.collection('drift_sequences').updateOne(
          { _id: seq._id },
          { $set: { status: 'draft' } }
      );
      console.log('✅ Reset status to "draft".');
  } else {
      console.log('❌ Sequence l1 not found.');
  }
  
  // Also clean up any partial logs if any exist (though likely 0)
  if (seq) {
    const deleted = await db.collection('drift_sequence_logs').deleteMany({ sequence_id: seq._id });
    console.log(`Cleaned up ${deleted.deletedCount} stray logs.`);
  }

  client.close();
}

resetSequenceStatus().catch(console.error);
