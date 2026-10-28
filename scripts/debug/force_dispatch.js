
const DispatchDriftSequenceJob = require('./services/DriftEmail/DispatchDriftSequenceJob');
const { MongoClient } = require('mongodb');

// USAGE: node force_dispatch.js <sequence_id>
// Example: node force_dispatch.js 694d477eebba2a6176175db8

// Fix: Ensure Env Var is set
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function forceDispatch() {
    // 1. Get ID from args or hardcode matching the User's failed sequence
    const args = process.argv.slice(2);
    const sequenceId = args[0] || '694d477eebba2a6176175db8'; // Default to the one in your issue

    console.log(`🚀 Force Dispatching Next Sequence for: ${sequenceId}`);

    const job = new DispatchDriftSequenceJob();
    
    try {
        await job.connect();
        const result = await job.dispatch(sequenceId);
        
        console.log('\n📊 Result:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('\n✅ SUCCESS: Next sequence dispatched successfully!');
        } else {
            console.log('\n❌ FAILED: ' + result.reason);
        }

    } catch (err) {
        console.error('Crash:', err);
    } finally {
        await job.close();
    }
}

forceDispatch();
