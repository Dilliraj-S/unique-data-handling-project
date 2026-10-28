#!/usr/bin/env node

/**
 * User Email Sync - Auto Mode
 * 
 * This script automatically:
 * 1. Gets the current user_id from environment, argument, or AUTO-DETECTS via DB
 * 2. Finds all accounts for that user
 * 3. Dispatches sync jobs for those accounts
 * 4. Starts the worker to process only that user's jobs
 * 
 * Usage:
 *   node user-email-sync-auto.js               (Auto-detects active user)
 *   node user-email-sync-auto.js --user=ID     (Specific user)
 */

const { MongoClient } = require('mongodb');
const Queue = require('bull');
const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getLoggedInUser } = require('./get-logged-in-user');

async function autoSyncUserAccounts() {
    console.log('🔍 Auto-detecting user for email sync...');

    // STEP 1: Get Target User ID (including auto-detection)
    const targetUserId = await getLoggedInUser();
    
    if (!targetUserId) {
        console.error('❌ ERROR: Could not identify a logged-in user.');
        console.error('   Please ensure you have logged in recently or provide --user=ID');
        process.exit(1);
    }
    
    console.log(`\n🎯 Target User: ${targetUserId}\n`);

    const uri = process.env.MONGODB_URI || process.env.PLUTO_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or PLUTO_MONGODB_URI not found!');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    try {
        const accountsCol = db.collection('email_accounts');
        
        // Get all active accounts for this user ONLY
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
        
        // Clear any old jobs for this user
        console.log('\n🧹 Cleaning up old jobs...');
        const allJobs = await userSyncQueue.getJobs(['waiting', 'active', 'delayed']);
        let cleanedCount = 0;
        for (const job of allJobs) {
            if (job.data.user_id !== targetUserId) {
                // Determine if we should clear others? For now, safer to only clear ours or stale
                // Actually, for user-specific worker, we might want a clean slate
            }
        }
        // Ideally we don't clear *other* users' jobs if sharing a queue, 
        // but 'User Email Sync' queue might be shared.
        // Let's just add new jobs.
        
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
        console.log(`\n🚀 Starting worker to process jobs for user ${targetUserId}...\n`);
        
        await userSyncQueue.close();
        client.close();
        
        // Start the worker with the user_id
        console.log('='.repeat(60));
        console.log(`Worker will process jobs for user: ${targetUserId}`);
        console.log('='.repeat(60));
        console.log('');
        
        // Spawn the worker process with user_id
        const workerProcess = spawn('node', ['user-email-sync-worker.js'], {
            cwd: __dirname,
            env: { ...process.env, SYNC_USER_ID: targetUserId },
            stdio: 'inherit'
        });
        
        workerProcess.on('exit', (code) => {
            console.log(`\n🛑 Worker exited with code ${code}`);
            process.exit(code);
        });
        
        // Handle Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down...');
            workerProcess.kill('SIGINT');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        client.close();
        process.exit(1);
    }
}

autoSyncUserAccounts().catch(console.error);

