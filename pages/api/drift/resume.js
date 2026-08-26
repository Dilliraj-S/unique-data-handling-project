/**
 * POST /api/central/emailsystem/drift/resume
 * Resume a paused sequence
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequence_id } = req.body;

    if (!sequence_id) {
      return res.status(422).json({ error: 'Sequence ID is required' });
    }

    let seqObjectId;
    try {
      seqObjectId = new ObjectId(sequence_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid sequence ID format' });
    }

    const sequencesCollection = await getCollection('drift_sequences', 'pluto');
    const logsCollection = await getCollection('drift_sequence_logs', 'pluto');

    // Get sequence
    const sequence = await sequencesCollection.findOne({ _id: seqObjectId, deleted_at: null });
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Check if sequence is paused
    if (sequence.status !== 'paused') {
      return res.status(422).json({ error: `Cannot resume sequence with status: ${sequence.status}` });
    }

    const now = new Date();

    // Update sequence status
    await sequencesCollection.updateOne(
      { _id: seqObjectId },
      {
        $set: {
          status: 'running',
          resumed_at: now,
          updated_at: now
        }
      }
    );

    // Count pending logs that need to be processed
    const pendingCount = await logsCollection.countDocuments({
      sequence_id: seqObjectId,
      status: 'pending',
      deleted_at: null
    });

    console.log(`[Drift] Resumed sequence ${sequence_id} with ${pendingCount} pending emails`);

    return res.status(200).json({
      success: true,
      message: `Sequence resumed successfully. ${pendingCount} emails pending.`,
      status: 'running',
      pending_count: pendingCount
    });
  } catch (error) {
    console.error('[Drift] Error resuming sequence:', error);
    return res.status(500).json({ error: 'Failed to resume sequence: ' + error.message });
  }
}
