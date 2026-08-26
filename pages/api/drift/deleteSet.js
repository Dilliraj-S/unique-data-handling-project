/**
 * DELETE /api/central/emailsystem/drift/deleteSet
 * Delete a set and all associated sequences and logs
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { set_id } = req.body || req.query;

    if (!set_id) {
      return res.status(422).json({ error: 'Set ID is required' });
    }

    let setObjectId;
    try {
      setObjectId = new ObjectId(set_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid set ID format' });
    }

    const setsCollection = await getCollection('sets', 'pluto');
    const sequencesCollection = await getCollection('drift_sequences', 'pluto');
    const logsCollection = await getCollection('drift_sequence_logs', 'pluto');

    // Check if set exists
    const set = await setsCollection.findOne({ _id: setObjectId, deleted_at: null });
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Check for running sequences
    const runningSequence = await sequencesCollection.findOne({
      set_id: setObjectId,
      status: { $in: ['running', 'sending'] },
      deleted_at: null
    });

    if (runningSequence) {
      return res.status(422).json({ 
        error: 'Cannot delete set with running sequences. Please pause all sequences first.' 
      });
    }

    const now = new Date();

    // Soft delete all sequences
    const seqResult = await sequencesCollection.updateMany(
      { set_id: setObjectId },
      { $set: { deleted_at: now, updated_at: now } }
    );

    // Soft delete all logs
    const logResult = await logsCollection.updateMany(
      { set_id: setObjectId },
      { $set: { deleted_at: now, updated_at: now } }
    );

    // Soft delete the set
    await setsCollection.updateOne(
      { _id: setObjectId },
      { $set: { deleted_at: now, updated_at: now } }
    );

    console.log(`[Drift] Deleted set ${set_id}, ${seqResult.modifiedCount} sequences, ${logResult.modifiedCount} logs`);

    return res.status(200).json({
      success: true,
      message: 'Set and all associated sequences deleted successfully',
      deleted_sequences: seqResult.modifiedCount,
      deleted_logs: logResult.modifiedCount
    });
  } catch (error) {
    console.error('[Drift] Error deleting set:', error);
    return res.status(500).json({ error: 'Failed to delete set: ' + error.message });
  }
}
