const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function debug() {
    const uri = process.env.PLUTO_MONGODB_URI || 'mongodb://localhost:27017/pluto';
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('pluto');

    try {
        const usersCol = db.collection('users');

        // Check raw counts
        const totalUsers = await usersCol.countDocuments({});
        console.log(`Total Users: ${totalUsers}`);
        
        const activeUsers = await usersCol.countDocuments({ account_status: 'active', deleted_at: null });
        console.log(`Active Users (raw): ${activeUsers}`);

        // Run Aggregation Step-by-Step
        console.log('\n--- AGGREGATION PIPELINE TRACE ---');
        
        const p1 = await usersCol.aggregate([
            {
                $lookup: {
                    from: 'email_accounts',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'accounts'
                }
            },
            { $project: { user_id: 1, account_count: { $size: '$accounts' } } }
        ]).toArray();
        console.log(`Step 1 (Lookup): Found ${p1.length} users. Sample counts:`, p1.slice(0, 3));

        const p2 = await usersCol.aggregate([
            {
                $lookup: {
                    from: 'email_accounts',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'accounts'
                }
            },
            {
                $match: {
                    'accounts.status': 'active',
                    account_status: 'active'
                }
            },
            { $project: { user_id: 1, active_accounts: { $size: '$accounts' } } }
        ]).toArray();
        console.log(`Step 2 (Match): Found ${p2.length} users with active accounts.`);
        if(p2.length === 0) {
             console.log("DEBUG: No users matched. Checking sample user...");
             const sample = await usersCol.findOne({account_status: 'active'});
             if(sample) {
                 console.log("Sample Active User:", sample.user_id);
                 const accs = await db.collection('email_accounts').find({user_id: sample.user_id}).toArray();
                 console.log("Their Accounts:", accs);
             }
        }

    } finally {
        await client.close();
    }
}

debug().catch(console.error);
