/**
 * POST /api/central/emailsystem/drift/schedule
 * Schedule a sequence for future execution
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequence_id, scheduled_at, timezone } = req.body;

    if (!sequence_id) {
      return res.status(422).json({ error: 'Sequence ID is required' });
    }

    if (!scheduled_at) {
      return res.status(422).json({ error: 'Schedule time is required' });
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

    // Check if sequence is in schedulable state
    if (!['draft', 'paused', 'completed', 'failed'].includes(sequence.status)) {
      return res.status(422).json({ error: `Cannot schedule sequence with status: ${sequence.status}` });
    }

    // Validate schedule time is in the future
    const scheduleDate = new Date(scheduled_at);
    if (scheduleDate <= new Date()) {
      return res.status(422).json({ error: 'Schedule time must be in the future' });
    }

    const now = new Date();

    await sequencesCollection.updateOne(
      { _id: seqObjectId },
      {
        $set: {
          status: 'scheduled',
          scheduled_at: scheduleDate,
          timezone: timezone || 'UTC',
          updated_at: now
        }
      }
    );

    console.log(`[Drift] Scheduled sequence ${sequence_id} for ${scheduleDate.toISOString()}`);

    return res.status(200).json({
      success: true,
      message: `Sequence scheduled for ${scheduleDate.toISOString()}`,
      status: 'scheduled',
      scheduled_at: scheduleDate,
      timezone: timezone || 'UTC'
    });
  } catch (error) {
    console.error('[Drift] Error scheduling sequence:', error);
    return res.status(500).json({ error: 'Failed to schedule sequence: ' + error.message });
  }
}
