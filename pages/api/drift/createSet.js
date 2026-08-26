/**
 * POST /api/central/emailsystem/drift/createSet
 * Create a new drift email set with initial sequences
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId, Long, Int32 } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { set_name, description, sequence_count = 1 } = req.body;

    // Validation
    if (!set_name || typeof set_name !== 'string' || set_name.trim().length === 0) {
      return res.status(422).json({ error: 'Set name is required' });
    }

    if (sequence_count < 1 || sequence_count > 20) {
      return res.status(422).json({ error: 'Sequence count must be between 1 and 20' });
    }

    const setsCollection = await getCollection('sets', 'pluto');
    const sequencesCollection = await getCollection('drift_sequences', 'pluto');

    const now = new Date();
    const baseId = Date.now();

    // Create the set
    const setLongId = Long.fromNumber(baseId);
    const setResult = await setsCollection.insertOne({
      id: setLongId, // Unique Long ID for validation schema
      set_name: set_name.trim(),
      description: description || null, // Allow null per schema
      created_at: now,
      updated_at: now,
      deleted_at: null
    });

    const setId = setResult.insertedId; // This is the ObjectId

    // Create initial sequences
    const sequences = [];
    let previousSequenceId = null;

    for (let i = 1; i <= sequence_count; i++) {
      // Ensure unique ID for each sequence in the loop
      const sequenceLongId = Long.fromNumber(baseId + i);

      const sequenceDoc = {
        id: sequenceLongId, // REQUIRED Long
        set_id: setLongId,  // REQUIRED Long/Null
        name: `Sequence ${i}`,
        sequence_number: new Int32(i), // REQUIRED Int
        subject: ' ', // REQUIRED String
        template_id: Long.fromNumber(0), // REQUIRED Long. 0 as placeholder.
        audience_id: i === 1 ? Long.fromNumber(0) : null, // Optional Long
        from_emails: JSON.stringify([]), // REQUIRED String representing array
        time_gap: i === 1 ? new Int32(60) : null,
        batch_size: i === 1 ? new Int32(10) : null,
        assignment_mode: 'batch_size', // REQUIRED Enum. Cannot be null.
        manual_assignments: null,
        wait_time: new Int32(0), // REQUIRED Int
        wait_unit: 'minutes', // REQUIRED Enum
        categories: i > 1 ? JSON.stringify([]) : null, // Optional String
        previous_sequence_id: previousSequenceId ? previousSequenceId.toString() : null, // Optional String
        status: 'draft', // REQUIRED Enum
        scheduled_at: null,
        timezone: null,
        filters: null,
        created_at: now,
        updated_at: now,
        deleted_at: null
      };

      const seqResult = await sequencesCollection.insertOne(sequenceDoc);
      sequenceDoc._id = seqResult.insertedId; // ObjectId
      sequences.push(sequenceDoc);
      previousSequenceId = seqResult.insertedId;
    }

    console.log(`[Drift] Created set ${setId} (Long: ${setLongId}) with ${sequence_count} sequences`);

    return res.status(200).json({
      success: true,
      message: 'Set created successfully',
      set_id: setId.toString(), // Return ObjectId for frontend
      sequences: sequences.map(s => ({
        id: s._id.toString(), // Return ObjectId as 'id' for frontend compatibility
        long_id: s.id.toString(), // Also return the Long ID if needed
        name: s.name,
        sequence_number: s.sequence_number,
        status: s.status
      }))
    });
  } catch (error) {
    console.error('[Drift] Error creating set:', error);
    return res.status(500).json({ error: 'Failed to create set: ' + error.message });
  }
}
