/**
 * Debug Script: Test Sequence Chaining Flow
 * 
 * This script tests the complete flow from Sequence 1 completion to Sequence 2 dispatch
 * to verify filter-based sequence chaining works correctly.
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function debugSequenceChaining() {
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or AUTOMATION_MONGODB_URI not found in environment variables!');
        process.exit(1);
    }
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    console.log('=== Debugging Sequence Chaining Flow ===\n');

    try {
        // 1. Find sets - try test2 first, then list all sets
        const setsCol = db.collection('sets');
        let set = await setsCol.findOne({ name: 'test2', deleted_at: null });
        
        if (!set) {
            console.log('⚠️  Set "test2" not found. Listing all sets...\n');
            const allSets = await setsCol.find({ deleted_at: null }).limit(10).toArray();
            if (allSets.length === 0) {
                console.error('❌ No sets found in database!');
                client.close();
                return;
            }
            console.log('Available sets:');
            allSets.forEach((s, idx) => {
                console.log(`  ${idx + 1}. ${s.name} (ID: ${s._id})`);
            });
            // Use first set found
            set = allSets[0];
            console.log(`\nUsing set: ${set.name}\n`);
        }
        
        console.log(`✅ Found Set: ${set.name} (ID: ${set._id})\n`);

        // 2. Find sequences in the set
        const sequencesCol = db.collection('drift_sequences');
        const sequences = await sequencesCol.find({
            set_id: set.id || set._id,
            deleted_at: null
        }).sort({ sequence_number: 1 }).toArray();

        console.log(`Found ${sequences.length} sequences in set:\n`);
        sequences.forEach(seq => {
            console.log(`  Sequence ${seq.sequence_number}: ${seq.name}`);
            console.log(`    Status: ${seq.status}`);
            console.log(`    Previous Sequence ID: ${seq.previous_sequence_id || 'None (Sequence 1)'}`);
            console.log(`    Categories: ${typeof seq.categories === 'string' ? seq.categories : JSON.stringify(seq.categories)}`);
            console.log(`    Filters Count: ${Array.isArray(seq.filters) ? seq.filters.length : 'N/A'}`);
            console.log('');
        });

        // 3. Check Sequence 1 (seq1)
        const seq1 = sequences.find(s => s.name === 'seq1' || s.sequence_number === 1);
        if (!seq1) {
            console.error('❌ Sequence 1 (seq1) not found!');
            client.close();
            return;
        }

        console.log('=== Sequence 1 Analysis ===');
        console.log(`Status: ${seq1.status}`);
        console.log(`Completed At: ${seq1.completed_at || 'Not completed'}`);
        console.log(`Filters: ${Array.isArray(seq1.filters) ? seq1.filters.length : 'None/Invalid'}`);

        // Check logs
        const logsCol = db.collection('drift_sequence_logs');
        const seq1Logs = await logsCol.find({
            sequence_id: seq1._id,
            deleted_at: null
        }).toArray();

        console.log(`\nSequence 1 Logs: ${seq1Logs.length} total`);
        
        const logStatusCounts = {};
        seq1Logs.forEach(log => {
            logStatusCounts[log.status] = (logStatusCounts[log.status] || 0) + 1;
        });
        console.log('Status Breakdown:', logStatusCounts);

        // Check filters structure
        if (Array.isArray(seq1.filters) && seq1.filters.length > 0) {
            console.log('\n=== Filter Analysis ===');
            const filterStatusCounts = {};
            seq1.filters.forEach(filter => {
                if (filter && filter.status) {
                    filterStatusCounts[filter.status] = (filterStatusCounts[filter.status] || 0) + 1;
                }
            });
            console.log('Filter Status Breakdown:', filterStatusCounts);
            
            // Show sample filters
            console.log('\nSample Filters (first 5):');
            seq1.filters.slice(0, 5).forEach((filter, idx) => {
                console.log(`  ${idx + 1}. Email: ${filter.email}, Status: ${filter.status}`);
            });
        } else {
            console.log('\n⚠️  WARNING: Sequence 1 has no filters or filters are invalid!');
            console.log('   This is the root cause - filters must be created when sequence completes.');
        }

        // 4. Check Sequence 2 (seq2)
        const seq2 = sequences.find(s => s.name === 'seq2' || s.sequence_number === 2);
        if (!seq2) {
            console.error('❌ Sequence 2 (seq2) not found!');
            client.close();
            return;
        }

        console.log('\n=== Sequence 2 Analysis ===');
        console.log(`Status: ${seq2.status}`);
        console.log(`Previous Sequence ID: ${seq2.previous_sequence_id}`);
        console.log(`Categories: ${typeof seq2.categories === 'string' ? seq2.categories : JSON.stringify(seq2.categories)}`);
        
        // Parse categories
        let categories = seq2.categories || [];
        if (typeof categories === 'string') {
            try {
                categories = JSON.parse(categories);
            } catch (e) {
                console.warn('⚠️  Failed to parse categories JSON');
                categories = [];
            }
        }
        console.log(`Parsed Categories: ${Array.isArray(categories) ? categories.join(', ') : 'Invalid'}`);

        // 5. Simulate DispatchDriftSequenceJob logic
        console.log('\n=== Simulating Dispatch Logic ===');
        
        if (!Array.isArray(seq1.filters) || seq1.filters.length === 0) {
            console.log('❌ Cannot dispatch: Sequence 1 has no filters');
        } else if (!Array.isArray(categories) || categories.length === 0) {
            console.log('❌ Cannot dispatch: Sequence 2 has no categories');
        } else {
            // Category mappings
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

            console.log(`Normalized Categories: ${normalizedCategories.join(', ')}`);

            // Find matching emails
            const subscriberEmails = [];
            for (const filterEntry of seq1.filters) {
                if (!filterEntry || !filterEntry.status || !filterEntry.email) continue;
                
                const filterStatus = filterEntry.status.toLowerCase().trim();
                
                for (const cat of normalizedCategories) {
                    const normalizedCat = cat.toLowerCase().trim();
                    
                    if (filterStatus === normalizedCat) {
                        subscriberEmails.push(filterEntry.email);
                        break;
                    }
                    
                    // Handle variations
                    if (
                        (filterStatus === 'sent' && normalizedCat === 'unopened') ||
                        (filterStatus === 'delivered' && normalizedCat === 'unopened') ||
                        (filterStatus === 'hard_bounce' && normalizedCat === 'hardbounce') ||
                        (filterStatus === 'soft_bounce' && normalizedCat === 'softbounce') ||
                        (filterStatus === 'unsubscribe' && normalizedCat === 'unsubscribed')
                    ) {
                        subscriberEmails.push(filterEntry.email);
                        break;
                    }
                }
            }

            console.log(`\nMatching Subscriber Emails: ${subscriberEmails.length}`);
            if (subscriberEmails.length > 0) {
                console.log('Sample emails (first 5):', subscriberEmails.slice(0, 5));
                
                // Check if subscribers exist
                const subscribersCol = db.collection('subscribers');
                const subscribers = await subscribersCol.find({
                    email: { $in: [...new Set(subscriberEmails)] },
                    status: 'subscribed',
                    deleted_at: null
                }).toArray();
                
                console.log(`\n✅ Found ${subscribers.length} valid subscribers that match filters`);
                console.log(`   Sequence 2 should dispatch with ${subscribers.length} subscribers`);
            } else {
                console.log('❌ No matching subscribers found!');
                console.log('   This explains why Sequence 2 is skipped.');
            }
        }

        // 6. Check wait time configuration
        console.log('\n=== Wait Time Configuration ===');
        console.log(`Sequence 1 Wait Time: ${seq1.wait_time || 0} ${seq1.wait_unit || 'minutes'}`);
        if (seq1.wait_time && seq1.wait_time > 0) {
            const unit = seq1.wait_unit || 'minutes';
            let multiplier = 60 * 1000; // minutes
            if (unit === 'hours') multiplier = 60 * 60 * 1000;
            if (unit === 'days') multiplier = 24 * 60 * 60 * 1000;
            if (unit === 'seconds') multiplier = 1000;
            
            const delayMs = seq1.wait_time * multiplier;
            console.log(`   Delay: ${delayMs / 1000} seconds (${delayMs / 60000} minutes)`);
        }

        console.log('\n=== Summary ===');
        if (seq1.status === 'completed' && Array.isArray(seq1.filters) && seq1.filters.length > 0) {
            console.log('✅ Sequence 1 is completed with filters');
        } else {
            console.log('❌ Sequence 1 is not properly completed or has no filters');
        }

        if (seq2.status === 'skipped') {
            console.log('⚠️  Sequence 2 is skipped - check categories and filter matching above');
        } else if (seq2.status === 'running') {
            console.log('✅ Sequence 2 is running');
        } else if (seq2.status === 'draft' || seq2.status === 'scheduled') {
            console.log(`ℹ️  Sequence 2 is in ${seq2.status} status - waiting for dispatch`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

debugSequenceChaining().catch(console.error);

