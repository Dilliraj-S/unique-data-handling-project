#!/usr/bin/env node

/**
 * Get Current User Script
 * 
 * This script helps identify the current logged-in user
 * It can read from JWT token, session, or environment variable
 */

const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function getCurrentUser() {
    // Try to get user_id from environment variable first
    let userId = process.env.CURRENT_USER_ID || process.env.SYNC_USER_ID;
    
    if (userId) {
        console.log(`✅ Found user_id from environment: ${userId}`);
        return userId;
    }
    
    // Try to get from command line argument
    const userArg = process.argv.find(arg => arg.startsWith('--user='));
    if (userArg) {
        userId = userArg.split('=')[1];
        console.log(`✅ Found user_id from argument: ${userId}`);
        return userId;
    }
    
    // If no user_id found, list all users with accounts
    console.log('⚠️  No user_id specified. Listing all users with email accounts...\n');
    
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI || process.env.PLUTO_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI not found!');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    try {
        const accountsCol = db.collection('email_accounts');
        const usersCol = db.collection('users');
        
        // Get all users with active email accounts
        const accounts = await accountsCol.find({ status: 'active' }).toArray();
        
        const usersWithAccounts = {};
        for (const account of accounts) {
            if (account.user_id) {
                if (!usersWithAccounts[account.user_id]) {
                    usersWithAccounts[account.user_id] = [];
                }
                usersWithAccounts[account.user_id].push(account.email);
            }
        }
        
        console.log('Users with email accounts:');
        for (const [uid, emails] of Object.entries(usersWithAccounts)) {
            console.log(`  ${uid}: ${emails.length} accounts`);
            console.log(`    Accounts: ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}`);
        }
        
        console.log('\n💡 To sync a specific user, run:');
        console.log(`   SYNC_USER_ID=USR_USER_004 npm run queue:user-email-sync`);
        console.log(`   Or: npm run queue:user-email-sync -- --user=USR_USER_004`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
    
    return null;
}

if (require.main === module) {
    getCurrentUser().then(userId => {
        if (userId) {
            console.log(`\n✅ Current user: ${userId}`);
            console.log(`\n💡 To sync this user's accounts, run:`);
            console.log(`   SYNC_USER_ID=${userId} npm run queue:user-email-sync`);
        }
    });
}

module.exports = { getCurrentUser };

