#!/usr/bin/env node

/**
 * Get Logged-In User Script
 * 
 * This script reads the current logged-in user from:
 * 1. .current-user file (set by login process)
 * 2. Environment variable
 * 3. Database (most recently active user)
 * 4. Command line argument
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const CURRENT_USER_FILE = path.join(__dirname, '.current-user');

async function getLoggedInUser() {
    // Helper: Check if a user_id has active email accounts
    async function userHasActiveAccounts(userId) {
        const plutoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;
        if (!plutoUri) return false;
        
        let client;
        try {
            client = new MongoClient(plutoUri);
            await client.connect();
            const db = client.db('pluto');
            const count = await db.collection('email_accounts').countDocuments({
                user_id: userId,
                status: 'active'
            });
            return count > 0;
        } catch (error) {
            console.warn(`⚠️  Could not validate accounts for ${userId}:`, error.message);
            return false;
        } finally {
            if (client) await client.close().catch(() => {});
        }
    }

    // Method 1: Command line argument (highest priority - explicit user choice)
    const userArg = process.argv.find(arg => arg.startsWith('--user='));
    if (userArg) {
        const userId = userArg.split('=')[1];
        console.log(`✅ Found user_id from argument: ${userId}`);
        return userId;
    }

    // Method 2: Environment variable
    const envUserId = process.env.CURRENT_USER_ID || process.env.SYNC_USER_ID;
    if (envUserId) {
        console.log(`✅ Found user_id from environment: ${envUserId}`);
        return envUserId;
    }

    // Method 3: Read from .current-user file (set by login) — WITH VALIDATION
    if (fs.existsSync(CURRENT_USER_FILE)) {
        try {
            let userId = fs.readFileSync(CURRENT_USER_FILE, 'utf8').trim();
            // Remove any BOM or encoding artifacts
            userId = userId.replace(/^\uFEFF/, '').replace(/[\r\n]/g, '').trim();
            if (userId && userId.length > 0) {
                // Validate: does this user actually have active email accounts?
                const hasAccounts = await userHasActiveAccounts(userId);
                if (hasAccounts) {
                    console.log(`✅ Found logged-in user from .current-user file: ${userId} (validated: has active accounts)`);
                    return userId;
                } else {
                    console.warn(`⚠️  .current-user has "${userId}" but this user has NO active email accounts. Falling through to auto-detection...`);
                }
            }
        } catch (error) {
            console.warn('⚠️  Could not read .current-user file:', error.message);
        }
    }
    
    // Method 4: Auto-detect from database — find user with active email accounts
    // NOTE: Users are in 'nextjs_stu' (MONGODB_URI) and Accounts are in 'pluto' (PLUTO_MONGODB_URI)
    const userUri = process.env.MONGODB_URI;
    const plutoUri = process.env.PLUTO_MONGODB_URI || process.env.MONGODB_URI;

    if (userUri && plutoUri) {
        let clientUsers, clientPluto;
        try {
            // 1. Connect to Users DB
            console.log(`[AUTO-DETECT] Connecting to databases...`);
            clientUsers = new MongoClient(userUri);
            await clientUsers.connect();
            const usersDb = clientUsers.db();
            const usersCol = usersDb.collection('users');

            // 2. Connect to Pluto DB (Email Accounts)
            clientPluto = new MongoClient(plutoUri);
            await clientPluto.connect();
            const plutoDb = clientPluto.db('pluto');
            const accountsCol = plutoDb.collection('email_accounts');

            // 3. Find recently logged-in users with active accounts
            const candidateUsers = await usersCol.find(
                { account_status: 'active' }
            )
            .sort({ last_login_at: -1 })
            .limit(5)
            .toArray();

            console.log(`[AUTO-DETECT] Found ${candidateUsers.length} candidate users in Users DB.`);

            for (const user of candidateUsers) {
                const count = await accountsCol.countDocuments({ 
                    user_id: user.user_id, 
                    status: 'active' 
                });
                
                if (count > 0) {
                    console.log(`✅ Auto-detected active user: ${user.user_id} (${user.username})`);
                    console.log(`   Last login: ${user.last_login_at || 'Never'}`);
                    console.log(`   Active email accounts: ${count}`);
                    
                    // Update .current-user file so next run is faster
                    try {
                        fs.writeFileSync(CURRENT_USER_FILE, user.user_id.trim(), 'utf8');
                        console.log(`   💾 Updated .current-user file`);
                    } catch (e) { /* ignore */ }
                    
                    await clientUsers.close();
                    await clientPluto.close();
                    return user.user_id;
                }
            }

            console.log('⚠️  No recently logged-in users have active email accounts.');
            
            // Final fallback: ANY active account in Pluto
            console.log('[AUTO-DETECT] Fallback: Finding ANY user with active accounts...');
            const activeAccount = await accountsCol.findOne({ status: 'active' });
            if (activeAccount) {
                console.log(`✅ Found active account: ${activeAccount.email} (User: ${activeAccount.user_id})`);
                
                // Update .current-user file
                try {
                    fs.writeFileSync(CURRENT_USER_FILE, activeAccount.user_id.trim(), 'utf8');
                    console.log(`   💾 Updated .current-user file`);
                } catch (e) { /* ignore */ }
                
                await clientUsers.close();
                await clientPluto.close();
                return activeAccount.user_id;
            }

            await clientUsers.close();
            await clientPluto.close();

        } catch (error) {
            console.warn('⚠️  Could not query databases for active user:', error.message);
            if (clientUsers) await clientUsers.close().catch(() => {});
            if (clientPluto) await clientPluto.close().catch(() => {});
        }
    }
    
    return null;
}

// If called directly, get and display user
if (require.main === module) {
    getLoggedInUser().then(userId => {
        if (userId) {
            console.log(`\n✅ Current logged-in user: ${userId}`);
            // Save to file for future use
            try {
                fs.writeFileSync(CURRENT_USER_FILE, userId.trim(), 'utf8');
                console.log(`💾 Saved to .current-user file`);
            } catch (error) {
                console.warn('⚠️  Could not save to .current-user file:', error.message);
            }
            process.exit(0);
        } else {
            console.error('\n❌ No logged-in user found!');
            console.error('\n💡 Options:');
            console.error('   1. Set manually: echo USR_USER_004 > .current-user');
            console.error('   2. Use environment: $env:CURRENT_USER_ID="USR_USER_004" (PowerShell)');
            console.error('   3. Use argument: --user=USR_USER_004');
            process.exit(1);
        }
    });
}

module.exports = { getLoggedInUser, CURRENT_USER_FILE };

