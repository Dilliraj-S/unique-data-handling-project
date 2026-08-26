#!/usr/bin/env node

/**
 * Sync User Accounts Script
 * 
 * This script automatically finds the logged-in user's accounts and syncs them
 * It reads the user_id from environment or gets it from the database
 * 
 * Usage:
 *   node sync-user-accounts.js --user=USR_USER_004
 *   Or set SYNC_USER_ID environment variable
 */

const { MongoClient } = require('mongodb');
const Queue = require('bull');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function syncUserAccounts() {
    const targetUserId = process.env.SYNC_USER_ID || process.argv.find(arg => arg.startsWith('--user='))?.split('=')[1];
    
    if (!targetUserId) {
        console.error('❌ ERROR: SYNC_USER_ID or --user=USER_ID is required!');
        console.error('   Usage: node sync-user-accounts.js --user=USR_USER_004');
        console.error('   Or:    SYNC_USER_ID=USR_USER_004 node sync-user-accounts.js');
        process.exit(1);
    }
    
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI || process.env.PLUTO_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or PLUTO_MONGODB_URI not found!');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    console.log(`=== Syncing Accounts for User: ${targetUserId} ===\n`);

    try {
        const accountsCol = db.collection('email_accounts');
        
        // Get all active accounts for this user
        const accounts = await accountsCol.find({
            user_id: targetUserId,
            status: 'active'
        }).toArray();
        
        if (accounts.length === 0) {
            console.log(`⚠️  No active accounts found for user ${targetUserId}`);
            client.close();
            return;
        }
        
        console.log(`✅ Found ${accounts.length} active accounts for user ${targetUserId}:`);
        accounts.forEach(acc => {
            console.log(`  - ${acc.email}`);
        });
        
        // Create user-specific queue
        const userSyncQueue = new Queue('User Email Sync', {
            redis: { host: 'localhost', port: 6379 }
        });
        
        const categories = ['inbox', 'spam'];
        let totalJobs = 0;
        
        console.log(`\n=== Dispatching Sync Jobs ===\n`);
        
        for (const account of accounts) {
            for (const category of categories) {
                const job = await userSyncQueue.add('email-sync', {
                    email: account.email,
                    category: category,
                    user_id: targetUserId
                }, {
                    attempts: 2,
                    backoff: { type: 'exponential', delay: 10000 },
                    removeOnComplete: true,
                    removeOnFail: false
                });
                
                totalJobs++;
                console.log(`✅ Dispatched job ${job.id} for ${account.email} (${category})`);
            }
        }
        
        console.log(`\n✅ Total jobs dispatched: ${totalJobs}`);
        console.log(`\n💡 Now run: SYNC_USER_ID=${targetUserId} npm run queue:user-email-sync`);
        console.log(`   Or:      npm run queue:user-email-sync -- --user=${targetUserId}`);
        
        await userSyncQueue.close();
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

syncUserAccounts().catch(console.error);

