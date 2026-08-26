
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearDriftQueue() {
  const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
  if (!uri) {
      console.error('❌ MONGODB_URI or AUTOMATION_MONGODB_URI is not defined in .env');
      process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    // Default to 'pluto' as established in previous debugging
    const db = client.db('pluto');
    console.log('✅ Connected to MongoDB (pluto)');

    const logsCol = db.collection('drift_sequence_logs');
    const sequencesCol = db.collection('drift_sequences');

    // 1. Delete all PENDING logs
    // We do NOT delete 'sent' or 'failed' logs to preserve history/stats.
    const deleteResult = await logsCol.deleteMany({ status: 'pending' });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} pending logs.`);

    // 2. Reset RUNNING sequences to DRAFT
    // If we delete the pending logs, the sequences will effectively be stuck or finished.
    // Resetting them to 'draft' allows the user to click "Send" again later.
    const updateResult = await sequencesCol.updateMany(
        { status: 'running' },
        { 
            $set: { 
                status: 'draft',
                updated_at: new Date()
            } 
        }
    );
    console.log(`🔄 Reset ${updateResult.modifiedCount} running sequences to 'draft'.`);

    console.log('✅ Drift Queue Cleared Successfully.');

  } catch (error) {
    console.error('❌ Error clearing queue:', error);
  } finally {
    await client.close();
  }
}

clearDriftQueue();
