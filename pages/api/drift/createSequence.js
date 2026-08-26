/**
 * POST /api/central/emailsystem/drift/createSequence
 * Create a new sequence within a set
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId, Long, Int32 } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { set_id, name } = req.body;

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

    // Verify set exists
    const set = await setsCollection.findOne({ _id: setObjectId, deleted_at: null });
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Use Set's Long ID
    const setLongId = set.id || Long.fromNumber(0); // Fallback if missing

    // Get last sequence in this set
    const lastSequence = await sequencesCollection
      .find({ set_id: setLongId, deleted_at: null })
      .sort({ sequence_number: -1 })
      .limit(1)
      .toArray();

    const sequenceNumber = lastSequence.length > 0 ? (lastSequence[0].sequence_number || 0) + 1 : 1;
    const previousSequenceId = lastSequence.length > 0 ? lastSequence[0]._id : null;

    const now = new Date();
    const sequenceLongId = Long.fromNumber(Date.now()); // Generate unique Long ID

    const sequenceDoc = {
      id: sequenceLongId, // REQUIRED Long
      set_id: setLongId, // REQUIRED Long
      name: name || `Sequence ${sequenceNumber}`,
      sequence_number: new Int32(sequenceNumber), // REQUIRED Int
      subject: ' ', // REQUIRED String
      template_id: Long.fromNumber(0), // REQUIRED Long, use 0 for draft
      audience_id: sequenceNumber === 1 ? Long.fromNumber(0) : null,
      from_emails: JSON.stringify([]), // REQUIRED String representing array
      time_gap: sequenceNumber === 1 ? new Int32(60) : null,
      batch_size: sequenceNumber === 1 ? new Int32(10) : null,
      assignment_mode: 'batch_size', // REQUIRED Enum. Default value to satisfy schema.
      manual_assignments: null,
      wait_time: new Int32(0), // REQUIRED Int
      wait_unit: 'minutes', // REQUIRED Enum
      categories: sequenceNumber > 1 ? JSON.stringify([]) : null, // Optional String
      previous_sequence_id: previousSequenceId ? previousSequenceId.toString() : null, // Optional String
      status: 'draft', // REQUIRED Enum
      scheduled_at: null,
      timezone: null,
      filters: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };

    const result = await sequencesCollection.insertOne(sequenceDoc);

    console.log(`[Drift] Created sequence ${result.insertedId} in set ${set_id} (Long: ${setLongId})`);

    return res.status(200).json({
      success: true,
      message: 'Sequence created successfully',
      sequence: {
        id: result.insertedId.toString(),
        long_id: sequenceLongId.toString(),
        sequence_id: result.insertedId.toString(),
        set_id: set_id,
        name: sequenceDoc.name,
        sequence_number: sequenceNumber,
        status: 'draft',
      }
    });
  } catch (error) {
    console.error('[Drift] Error creating sequence:', error);
    return res.status(500).json({ error: 'Failed to create sequence: ' + error.message });
  }
}
