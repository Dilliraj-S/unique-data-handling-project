
const { MongoClient, ObjectId, Long, Int32 } = require('mongodb');
require('dotenv').config();

async function simulateSend() {
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
    const client = new MongoClient(uri);
    await client.connect();
    
    // We expect PLUTO for drift stuff
    const db = client.db('pluto');
    
    console.log('--- Simulating Send Flow for Sequence L1 ---');

    // 1. Find Sequence L1 (Backtracked target)
    // User said L1 ID is 694c13b4aa202191b9470d99 or ID 1766593495294
    // Let's search by name "l1" to be dynamic
    const sequence = await db.collection('drift_sequences').findOne({ name: 'l1' });
    if (!sequence) {
        console.error('❌ Sequence "l1" not found!');
        client.close(); return;
    }
    console.log(`✅ Found Sequence: ${sequence.name} (DB ID: ${sequence._id})`);
    console.log('Sequence Data:', JSON.stringify(sequence));

    // 2. Resolve Audience ID
    // Logic from send.js
    const targetAudienceId = sequence.audience_id;
    console.log(`Audience ID from Sequence: ${targetAudienceId} (Type: ${typeof targetAudienceId})`);

    // 3. Find Subscribers
    // Logic: Try exact, String, Long, Int
    // Note: Subscribers are in PLUTO (as fixed previously)
    let subscribers = await db.collection('subscribers').find({ audience_id: targetAudienceId }).toArray();
    console.log(`Attempt 1 (Exact Match): Found ${subscribers.length}`);

    if (subscribers.length === 0) {
        console.log('Retry Logic Engaged...');
        subscribers = await db.collection('subscribers').find({ 
            $or: [
                { audience_id: String(targetAudienceId) }, 
                { audience_id: Long.fromNumber(Number(targetAudienceId)) }, 
                { audience_id: parseInt(targetAudienceId) }
            ]
        }).toArray();
        console.log(`Attempt 2 (Retry Match): Found ${subscribers.length}`);
    }

    if (subscribers.length === 0) {
        console.error('❌ No subscribers found via any method.');
        client.close(); return;
    }

    // 4. Resolve Template
    const rawTemplateId = sequence.template_id;
    console.log(`Template ID from Sequence: ${rawTemplateId} (Type: ${typeof rawTemplateId})`);
    
    let templateDoc = await db.collection('templates').findOne({ id: rawTemplateId });
    if (!templateDoc) {
         // Try variants
         templateDoc = await db.collection('templates').findOne({ 
             $or: [
                 { id: parseInt(rawTemplateId) },
                 { id: Long.fromNumber(Number(rawTemplateId)) }
             ]
         });
    }

    if (!templateDoc) {
        console.error('❌ Template not found.');
        client.close(); return;
    }
    console.log(`✅ Found Template: ${templateDoc.title} (_id: ${templateDoc._id})`);

    // 5. Simulate Log Insertion
    // Need an email account
    const account = await db.collection('email_accounts').findOne({ status: 'active' });
    if (!account) {
        console.error('❌ No active email account.');
        client.close(); return;
    }

    const logDoc = {
        sequence_id: sequence._id,
        set_id: sequence.set_id,
        subscriber_id: subscribers[0]._id, // Use first subscriber
        email_account_id: account._id,
        template_id: templateDoc._id,
        status: 'pending',
        batch_size: sequence.batch_size || 10,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        simulated: true
    };

    console.log('Attempting Insert of:', logDoc);

    const result = await db.collection('drift_sequence_logs').insertOne(logDoc);
    console.log(`✅ Insert Result:`, result);

    client.close();
}

simulateSend().catch(console.error);
