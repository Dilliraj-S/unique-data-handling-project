const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function debugCrossDB() {
    // URI for 'users'
    const userUri = process.env.MONGODB_URI; 
    // URI for 'email_accounts'
    const plutoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;

    console.log(`[DEBUG] User URI defined: ${!!userUri}`);
    console.log(`[DEBUG] Pluto URI defined: ${!!plutoUri}`);

    try {
        // Connect to 'nextjs_stu' (or whatever main DB is)
        if (userUri) {
            const client1 = new MongoClient(userUri);
            await client1.connect();
            const db1 = client1.db(); // Default DB from string
            console.log(`[DEBUG] User DB Name: ${db1.databaseName}`);
            
            const user = await db1.collection('users').findOne({ user_id: 'USR4988' });
            console.log(`[DEBUG] Found USR4988 in User DB: ${!!user}`);
            if(user) console.log(`       Last Login: ${user.last_login_at}`);
            
            await client1.close();
        }

        // Connect to 'pluto'
        if (plutoUri) {
            const client2 = new MongoClient(plutoUri);
            await client2.connect();
            const db2 = client2.db('pluto'); // Explicitly Pluto
            console.log(`[DEBUG] Pluto DB Name: ${db2.databaseName}`);

            const accounts = await db2.collection('email_accounts').countDocuments({ user_id: 'USR4988', status: 'active' });
            console.log(`[DEBUG] Active accounts for USR4988 in Pluto: ${accounts}`);

            await client2.close();
        }

    } catch (e) {
        console.error(e);
    }
}

debugCrossDB();
