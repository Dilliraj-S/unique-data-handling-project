/**
 * DELETE /api/central/emailsystem/drift/deleteSequence
 * Delete a single sequence
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sequence_id } = req.body || req.query;

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

    // Check if sequence exists
    const sequence = await sequencesCollection.findOne({ _id: seqObjectId, deleted_at: null });
    if (!sequence) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    // Check if sequence is running
    if (['running', 'sending'].includes(sequence.status)) {
      return res.status(422).json({ 
        error: 'Cannot delete a running sequence. Please pause it first.' 
      });
    }

    const now = new Date();

    // Soft delete associated logs
    await logsCollection.updateMany(
      { sequence_id: seqObjectId },
      { $set: { deleted_at: now, updated_at: now } }
    );

    // Soft delete the sequence
    await sequencesCollection.updateOne(
      { _id: seqObjectId },
      { $set: { deleted_at: now, updated_at: now } }
    );

    // Update next sequence to point to previous sequence
    // Handle both ObjectId (legacy) and String (new schema) formats for previous_sequence_id
    const prevIdValue = sequence.previous_sequence_id ? sequence.previous_sequence_id.toString() : null;
    
    // Find next sequence (the one that points to THIS sequence as previous)
    // Query for both ObjectId and String version of ID to be safe
    await sequencesCollection.updateOne(
      { 
          previous_sequence_id: { $in: [seqObjectId, seqObjectId.toString()] }, 
          deleted_at: null 
      },
      { $set: { previous_sequence_id: prevIdValue, updated_at: now } }
    );

    // Renumber remaining sequences in the set
    // This query automatically uses the set_id type (Long or ObjectId) from the found sequence, so it works for both
    const remainingSequences = await sequencesCollection
      .find({ set_id: sequence.set_id, deleted_at: null })
      .sort({ sequence_number: 1 })
      .toArray();

    for (let i = 0; i < remainingSequences.length; i++) {
      if (remainingSequences[i].sequence_number !== i + 1) {
        await sequencesCollection.updateOne(
          { _id: remainingSequences[i]._id },
          { $set: { sequence_number: i + 1, updated_at: now } }
        );
      }
    }

    console.log(`[Drift] Deleted sequence ${sequence_id}`);

    return res.status(200).json({
      success: true,
      message: 'Sequence deleted successfully'
    });
  } catch (error) {
    console.error('[Drift] Error deleting sequence:', error);
    return res.status(500).json({ error: 'Failed to delete sequence: ' + error.message });
  }
}
