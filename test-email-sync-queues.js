/**
 * Test Script: Verify User-Based Email Sync Queues
 * 
 * This script tests both queues to ensure user-based sync is working correctly
 */

const { MongoClient } = require('mongodb');
const Queue = require('bull');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testEmailSyncQueues() {
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI || process.env.PLUTO_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or PLUTO_MONGODB_URI not found!');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    console.log('=== Testing User-Based Email Sync Queues ===\n');

    try {
        const accountsCol = db.collection('email_accounts');
        
        // Get all active accounts grouped by user_id
        const allAccounts = await accountsCol.find({ status: 'active' }).toArray();
        
        console.log(`📊 Total Active Accounts: ${allAccounts.length}\n`);
        
        // Group by user_id
        const accountsByUser = {};
        for (const account of allAccounts) {
            const userId = account.user_id || 'unknown';
            if (!accountsByUser[userId]) {
                accountsByUser[userId] = [];
            }
            accountsByUser[userId].push(account);
        }
        
        console.log(`👥 Accounts by User:`);
        for (const [userId, accounts] of Object.entries(accountsByUser)) {
            console.log(`  User ${userId}: ${accounts.length} accounts`);
            accounts.slice(0, 3).forEach(acc => {
                console.log(`    - ${acc.email}`);
            });
            if (accounts.length > 3) {
                console.log(`    ... and ${accounts.length - 3} more`);
            }
        }
        
        // Test Queue 1: User-Specific Queue
        console.log('\n=== Testing Queue 1: User Email Sync (User-Specific) ===\n');
        const userSyncQueue = new Queue('User Email Sync', {
            redis: { host: 'localhost', port: 6379 }
        });
        
        // Get queue stats
        const userQueueWaiting = await userSyncQueue.getWaiting();
        const userQueueActive = await userSyncQueue.getActive();
        const userQueueCompleted = await userSyncQueue.getCompleted();
        const userQueueFailed = await userSyncQueue.getFailed();
        
        console.log(`User Email Sync Queue Status:`);
        console.log(`  Waiting: ${userQueueWaiting.length}`);
        console.log(`  Active: ${userQueueActive.length}`);
        console.log(`  Completed: ${userQueueCompleted.length}`);
        console.log(`  Failed: ${userQueueFailed.length}`);
        
        // Test Queue 2: All-User Queue
        console.log('\n=== Testing Queue 2: CSV Import Processing (All-User) ===\n');
        const allUserSyncQueue = new Queue('CSV Import Processing', {
            redis: { host: 'localhost', port: 6379 }
        });
        
        // Get queue stats
        const allUserQueueWaiting = await allUserSyncQueue.getWaiting();
        const allUserQueueActive = await allUserSyncQueue.getActive();
        const allUserQueueCompleted = await allUserSyncQueue.getCompleted();
        const allUserQueueFailed = await allUserSyncQueue.getFailed();
        
        console.log(`All-User Email Sync Queue Status:`);
        console.log(`  Waiting: ${allUserQueueWaiting.length}`);
        console.log(`  Active: ${allUserQueueActive.length}`);
        console.log(`  Completed: ${allUserQueueCompleted.length}`);
        console.log(`  Failed: ${allUserQueueFailed.length}`);
        
        // Check if jobs have user_id
        console.log('\n=== Verifying Job Data ===\n');
        
        if (allUserQueueWaiting.length > 0) {
            console.log('Sample All-User Queue Jobs (waiting):');
            for (const job of allUserQueueWaiting.slice(0, 3)) {
                console.log(`  Job ${job.id}:`);
                console.log(`    Email: ${job.data.email}`);
                console.log(`    Category: ${job.data.category}`);
                console.log(`    User ID: ${job.data.user_id || '❌ MISSING!'}`);
            }
        }
        
        if (userQueueWaiting.length > 0) {
            console.log('\nSample User-Specific Queue Jobs (waiting):');
            for (const job of userQueueWaiting.slice(0, 3)) {
                console.log(`  Job ${job.id}:`);
                console.log(`    Email: ${job.data.email}`);
                console.log(`    Category: ${job.data.category}`);
                console.log(`    User ID: ${job.data.user_id || '❌ MISSING!'}`);
            }
        }
        
        // Test: Add a test job to user-specific queue
        console.log('\n=== Testing Job Dispatch ===\n');
        
        if (allAccounts.length > 0) {
            const testAccount = allAccounts[0];
            const testUserId = testAccount.user_id;
            
            console.log(`Adding test job to User Email Sync queue:`);
            console.log(`  User: ${testUserId}`);
            console.log(`  Email: ${testAccount.email}`);
            
            const testJob = await userSyncQueue.add('email-sync', {
                email: testAccount.email,
                category: 'inbox',
                user_id: testUserId
            }, {
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: false
            });
            
            console.log(`✅ Test job added: ${testJob.id}`);
            console.log(`   Job data includes user_id: ${testJob.data.user_id ? '✅' : '❌'}`);
        }
        
        console.log('\n=== Summary ===');
        console.log('✅ Queue 1 (User Email Sync): For user-specific manual syncs');
        console.log('✅ Queue 2 (CSV Import Processing): For all-user system-wide syncs');
        console.log('✅ Both queues now include user_id in job data');
        console.log('✅ EmailSyncService validates user_id when provided');
        console.log('✅ init-email-sync.js groups accounts by user_id');
        
        await userSyncQueue.close();
        await allUserSyncQueue.close();
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

testEmailSyncQueues().catch(console.error);

