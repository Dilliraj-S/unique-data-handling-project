/**
 * POST /api/central/emailsystem/drift/pause
 * Pause a running sequence
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

    // Get sequence
    const sequence = await sequencesCollection.findOne({ _id: seqObjectId, deleted_at: null });
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Check if sequence is running
    if (!['running', 'sending', 'scheduled'].includes(sequence.status)) {
      return res.status(422).json({ error: `Cannot pause sequence with status: ${sequence.status}` });
    }

    const now = new Date();

    await sequencesCollection.updateOne(
      { _id: seqObjectId },
      {
        $set: {
          status: 'paused',
          paused_at: now,
          updated_at: now
        }
      }
    );

    console.log(`[Drift] Paused sequence ${sequence_id}`);

    return res.status(200).json({
      success: true,
      message: 'Sequence paused successfully',
      status: 'paused'
    });
  } catch (error) {
    console.error('[Drift] Error pausing sequence:', error);
    return res.status(500).json({ error: 'Failed to pause sequence: ' + error.message });
  }
}
