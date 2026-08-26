/**
 * Utility Script: Rebuild Sequence Filters
 * 
 * This script rebuilds filters for a completed sequence that may be missing filters.
 * Useful for fixing sequences that completed before the filter building logic was fixed.
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function rebuildFilters(sequenceId) {
    const uri = process.env.MONGODB_URI || process.env.AUTOMATION_MONGODB_URI;
    
    if (!uri) {
        console.error('❌ MONGODB_URI or AUTOMATION_MONGODB_URI not found in environment variables!');
        process.exit(1);
    }
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('pluto');
    
    console.log(`=== Rebuilding Filters for Sequence ${sequenceId} ===\n`);

    try {
        const sequencesCol = db.collection('drift_sequences');
        const logsCol = db.collection('drift_sequence_logs');
        const emailsCol = db.collection('emails');
        const subscribersCol = db.collection('subscribers');

        const seqObjectId = new ObjectId(sequenceId);
        const sequence = await sequencesCol.findOne({ _id: seqObjectId, deleted_at: null });

        if (!sequence) {
            console.error(`❌ Sequence ${sequenceId} not found!`);
            client.close();
            return;
        }

        console.log(`✅ Found Sequence: ${sequence.name} (Status: ${sequence.status})\n`);

        // Get all logs
        const allLogs = await logsCol.find({
            sequence_id: seqObjectId,
            deleted_at: null
        }).toArray();

        console.log(`Found ${allLogs.length} logs for this sequence`);

        if (allLogs.length === 0) {
            console.log('⚠️  No logs found. Cannot build filters.');
            client.close();
            return;
        }

        // Extract Message IDs from sent logs
        const messageIds = allLogs
            .map(log => log.message_id)
            .filter(id => id);

        console.log(`Found ${messageIds.length} logs with message IDs`);

        // Find incoming events (Bounces/Replies) in Emails Collection
        let incomingEvents = [];
        if (messageIds.length > 0) {
            const cleanMessageIds = messageIds.map(id => id.replace(/[<>]/g, '').trim());
            const allPotentialIds = [...messageIds, ...cleanMessageIds];
            
            incomingEvents = await emailsCol.find({
                in_reply_to: { $in: allPotentialIds },
                category: { $in: ['soft_bounce', 'hard_bounce', 'replied', 'unsubscribed', 'automatic_reply'] }
            }).toArray();
        }

        console.log(`Found ${incomingEvents.length} incoming events (bounces/replies)\n`);

        // Create status map
        const statusMap = new Map();
        incomingEvents.forEach(email => {
            if (email.in_reply_to) {
                const key = email.in_reply_to;
                statusMap.set(key, email.status || email.category);
                
                if (key.includes('<')) {
                    statusMap.set(key.replace(/[<>]/g, '').trim(), email.status || email.category);
                }
            }
        });

        // Build filters
        const filters = [];
        for (const log of allLogs) {
            const subscriber = await subscribersCol.findOne({ _id: log.subscriber_id });
            if (!subscriber) continue;

            // Check for incoming event
            let mappedStatus = statusMap.get(log.message_id);
            if (!mappedStatus && log.message_id) {
                mappedStatus = statusMap.get(log.message_id.replace(/[<>]/g, '').trim());
            }

            // Determine final status with proper normalization
            let finalStatus = mappedStatus || log.status;

            // Normalize status
            if (!mappedStatus && (log.status === 'sent' || log.status === 'delivered')) {
                finalStatus = 'unopened';
            } else if (finalStatus === 'hard_bounce') {
                finalStatus = 'hardbounce';
            } else if (finalStatus === 'soft_bounce') {
                finalStatus = 'softbounce';
            } else if (finalStatus === 'unsubscribe') {
                finalStatus = 'unsubscribed';
            }

            filters.push({
                email: subscriber.email,
                status: finalStatus,
                sequence_id: seqObjectId,
                created_at: new Date(),
                updated_at: new Date()
            });
        }

        console.log(`Built ${filters.length} filters`);

        // Show filter breakdown
        const filterStatusCounts = {};
        filters.forEach(filter => {
            filterStatusCounts[filter.status] = (filterStatusCounts[filter.status] || 0) + 1;
        });
        console.log('\nFilter Status Breakdown:');
        Object.entries(filterStatusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        // Update sequence
        await sequencesCol.updateOne(
            { _id: seqObjectId },
            {
                $set: {
                    filters: filters,
                    updated_at: new Date()
                }
            }
        );

        console.log('\n✅ Filters rebuilt and saved to sequence!');

        // If sequence is completed, try to dispatch next sequence
        if (sequence.status === 'completed') {
            console.log('\n=== Attempting to Dispatch Next Sequence ===');
            const DispatchDriftSequenceJob = require('./services/DriftEmail/DispatchDriftSequenceJob');
            const dispatcher = new DispatchDriftSequenceJob();
            try {
                const result = await dispatcher.dispatch(sequenceId);
                console.log('Dispatch Result:', result);
            } catch (error) {
                console.error('Dispatch Error:', error.message);
            } finally {
                await dispatcher.close();
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.close();
    }
}

// Export for use in other scripts
module.exports = { rebuildFilters };

// Run if called directly
if (require.main === module) {
    const sequenceId = process.argv[2];
    
    if (!sequenceId) {
        console.error('Usage: node rebuild-sequence-filters.js <sequence_id>');
        console.error('Example: node rebuild-sequence-filters.js 507f1f77bcf86cd799439011');
        process.exit(1);
    }
    
    rebuildFilters(sequenceId).catch(console.error);
}

