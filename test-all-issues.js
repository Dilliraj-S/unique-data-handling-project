/**
 * Comprehensive Test Script for All Three Issues
 * 
 * Issue 1: Email account assignment - same account showing twice
 * Issue 2: Automatic replies not being detected
 * Issue 3: Sequence 2 skipping - test with dummy bounce data
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testAllIssues() {
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or AUTOMATION_MONGODB_URI not found!');
        process.exit(1);
    }
    
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    console.log('=== Testing All Issues ===\n');

    try {
        // Find the sequence
        const sequencesCol = db.collection('drift_sequences');
        const seq1 = await sequencesCol.findOne({ 
            name: 't1',
            sequence_number: 1,
            deleted_at: null 
        });
        
        if (!seq1) {
            console.error('❌ Sequence t1 not found!');
            client.close();
            return;
        }
        
        console.log(`✅ Found Sequence 1: ${seq1.name} (ID: ${seq1._id})\n`);

        // ========== ISSUE 1: Email Account Assignment ==========
        console.log('=== ISSUE 1: Email Account Assignment Analysis ===\n');
        
        const logsCol = db.collection('drift_sequence_logs');
        const emailAccountsCol = db.collection('email_accounts');
        
        // Get all logs for sequence 1
        const allLogs = await logsCol.find({
            sequence_id: seq1._id,
            deleted_at: null
        }).toArray();
        
        console.log(`Total logs: ${allLogs.length}`);
        
        // Group by email_account_id
        const accountStats = {};
        for (const log of allLogs) {
            const accountId = log.email_account_id.toString();
            if (!accountStats[accountId]) {
                accountStats[accountId] = {
                    count: 0,
                    sent: 0,
                    failed: 0,
                    pending: 0
                };
            }
            accountStats[accountId].count++;
            if (log.status === 'sent') accountStats[accountId].sent++;
            if (log.status === 'failed') accountStats[accountId].failed++;
            if (log.status === 'pending') accountStats[accountId].pending++;
        }
        
        console.log('\nAccount Assignment Breakdown:');
        for (const [accountId, stats] of Object.entries(accountStats)) {
            const account = await emailAccountsCol.findOne({ _id: new ObjectId(accountId) });
            console.log(`  ${account ? account.email : 'Unknown'} (ID: ${accountId}):`);
            console.log(`    Total: ${stats.count}, Sent: ${stats.sent}, Failed: ${stats.failed}, Pending: ${stats.pending}`);
        }
        
        // Check for duplicate email accounts
        console.log('\nChecking for duplicate email accounts...');
        const fromEmails = typeof seq1.from_emails === 'string' 
            ? JSON.parse(seq1.from_emails) 
            : seq1.from_emails || [];
        
        console.log(`Sequence from_emails: ${fromEmails.join(', ')}`);
        
        const accountsByEmail = {};
        for (const email of fromEmails) {
            const accounts = await emailAccountsCol.find({ 
                email: email, 
                status: 'active',
                deleted_at: null 
            }).toArray();
            
            if (accounts.length > 1) {
                console.log(`⚠️  WARNING: Found ${accounts.length} accounts with email ${email}:`);
                accounts.forEach(acc => {
                    console.log(`    - ID: ${acc._id}, Email: ${acc.email}`);
                });
            }
            accountsByEmail[email] = accounts;
        }
        
        // ========== ISSUE 2: Automatic Replies Detection ==========
        console.log('\n=== ISSUE 2: Automatic Replies Detection ===\n');
        
        const emailsCol = db.collection('emails');
        
        // Get message IDs from sent logs
        const messageIds = allLogs
            .filter(log => log.message_id)
            .map(log => log.message_id);
        
        console.log(`Checking ${messageIds.length} sent message IDs for automatic replies...`);
        
        if (messageIds.length > 0) {
            const cleanMessageIds = messageIds.map(id => id.replace(/[<>]/g, '').trim());
            const allPotentialIds = [...messageIds, ...cleanMessageIds];
            
            // Find automatic replies
            const autoReplies = await emailsCol.find({
                $or: [
                    { in_reply_to: { $in: allPotentialIds } },
                    { message_id: { $in: allPotentialIds } }
                ],
                $or: [
                    { category: 'automatic_reply' },
                    { subject: /automatic reply/i },
                    { subject: /out of office/i },
                    { subject: /out of email/i },
                    { from_name: /automatic/i }
                ]
            }).toArray();
            
            console.log(`Found ${autoReplies.length} potential automatic replies in emails collection`);
            
            if (autoReplies.length > 0) {
                console.log('\nSample automatic replies:');
                autoReplies.slice(0, 5).forEach((email, idx) => {
                    console.log(`  ${idx + 1}. From: ${email.from_email || email.from}, Subject: ${email.subject?.substring(0, 50)}`);
                    console.log(`     Category: ${email.category}, In-Reply-To: ${email.in_reply_to}`);
                });
            } else {
                console.log('⚠️  No automatic replies found in emails collection');
                console.log('   This could mean:');
                console.log('   1. Automatic replies are not being synced to emails collection');
                console.log('   2. in_reply_to header is not matching');
                console.log('   3. Category is not set to "automatic_reply"');
            }
        }
        
        // Check filters for automatic_reply status
        if (Array.isArray(seq1.filters) && seq1.filters.length > 0) {
            const autoReplyFilters = seq1.filters.filter(f => 
                f && f.status && f.status.toLowerCase().includes('automatic')
            );
            console.log(`\nFilters with automatic_reply status: ${autoReplyFilters.length}`);
        }
        
        // ========== ISSUE 3: Sequence 2 Skipping Test ==========
        console.log('\n=== ISSUE 3: Sequence 2 Skipping Test ===\n');
        
        const seq2 = await sequencesCol.findOne({ 
            name: 't2',
            sequence_number: 2,
            deleted_at: null 
        });
        
        if (!seq2) {
            console.log('⚠️  Sequence 2 not found');
        } else {
            console.log(`✅ Found Sequence 2: ${seq2.name} (ID: ${seq2._id})`);
            console.log(`   Status: ${seq2.status}`);
            console.log(`   Categories: ${typeof seq2.categories === 'string' ? seq2.categories : JSON.stringify(seq2.categories)}`);
            
            // Check filters
            if (!Array.isArray(seq1.filters) || seq1.filters.length === 0) {
                console.log('\n❌ Sequence 1 has no filters!');
            } else {
                const filterStatusCounts = {};
                seq1.filters.forEach(filter => {
                    if (filter && filter.status) {
                        filterStatusCounts[filter.status] = (filterStatusCounts[filter.status] || 0) + 1;
                    }
                });
                
                console.log('\nFilter Status Breakdown:');
                Object.entries(filterStatusCounts).forEach(([status, count]) => {
                    console.log(`  ${status}: ${count}`);
                });
                
                // Parse categories
                let categories = seq2.categories || [];
                if (typeof categories === 'string') {
                    try {
                        categories = JSON.parse(categories);
                    } catch (e) {
                        categories = [];
                    }
                }
                
                console.log(`\nSequence 2 is looking for: ${categories.join(', ')}`);
                console.log(`Available in filters: ${Object.keys(filterStatusCounts).join(', ')}`);
                
                // Test matching
                const categoryMappings = {
                    'unsubscribed': ['unsubscribe', 'unsubscribed'],
                    'hardbounce': ['hardbounce', 'hard_bounce'],
                    'softbounce': ['softbounce', 'soft_bounce'],
                    'replied': ['replied'],
                    'automatic_reply': ['automatic_reply'],
                    'no_longer': ['no_longer', 'nolonger'],
                    'opened': ['opened'],
                    'unopened': ['unopened', 'sent', 'delivered']
                };
                
                const normalizedCategories = [];
                for (const cat of categories) {
                    const mapping = categoryMappings[cat.toLowerCase()];
                    if (mapping) {
                        normalizedCategories.push(...mapping);
                    }
                }
                
                const matchingEmails = [];
                for (const filterEntry of seq1.filters) {
                    if (!filterEntry || !filterEntry.status || !filterEntry.email) continue;
                    
                    const filterStatus = filterEntry.status.toLowerCase().trim();
                    
                    for (const cat of normalizedCategories) {
                        const normalizedCat = cat.toLowerCase().trim();
                        
                        if (filterStatus === normalizedCat) {
                            matchingEmails.push(filterEntry.email);
                            break;
                        }
                        
                        if (
                            (filterStatus === 'sent' && normalizedCat === 'unopened') ||
                            (filterStatus === 'delivered' && normalizedCat === 'unopened') ||
                            (filterStatus === 'hard_bounce' && normalizedCat === 'hardbounce') ||
                            (filterStatus === 'soft_bounce' && normalizedCat === 'softbounce') ||
                            (filterStatus === 'unsubscribe' && normalizedCat === 'unsubscribed')
                        ) {
                            matchingEmails.push(filterEntry.email);
                            break;
                        }
                    }
                }
                
                console.log(`\nMatching emails for Sequence 2: ${matchingEmails.length}`);
                
                if (matchingEmails.length === 0) {
                    console.log('❌ No matches found - Sequence 2 will be skipped');
                    console.log('\n💡 To test Sequence 2, we can insert dummy bounce data');
                } else {
                    console.log('✅ Matches found - Sequence 2 should dispatch');
                }
            }
        }
        
        console.log('\n=== Summary ===');
        console.log('Issue 1: Check account assignment breakdown above');
        console.log('Issue 2: Check automatic replies detection above');
        console.log('Issue 3: Check filter matching above');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

testAllIssues().catch(console.error);

