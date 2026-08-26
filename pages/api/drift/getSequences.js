/**
 * GET /api/central/emailsystem/drift/getSequences
 * Get all sequences for a set
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId, Long } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { set_id } = req.query;

    const setsCollection = await getCollection('sets', 'pluto');
    const sequencesCollection = await getCollection('drift_sequences', 'pluto');

    // If no set_id provided, get the latest set
    if (!set_id) {
      const latestSet = await setsCollection
        .find({ deleted_at: null })
        .sort({ created_at: -1 })
        .limit(1)
        .toArray();

      if (latestSet.length === 0) {
        return res.status(200).json({
          success: true,
          set_id: null,
          set_name: null,
          sequences: []
        });
      }

      set_id = latestSet[0]._id.toString();
    }

    let setObjectId;
    try {
      setObjectId = new ObjectId(set_id);
    } catch (e) {
      return res.status(422).json({ error: 'Invalid set ID format' });
    }

    // Get set info
    const set = await setsCollection.findOne({ _id: setObjectId, deleted_at: null });
    if (!set) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Determine how to query sequences (Long ID vs ObjectId based on schema evolution)
    // New schema requires Long set_id. Old data might use ObjectId.
    let query = { deleted_at: null };
    if (set.id && set.id instanceof Long) {
        // Query by Long ID if available
        query.set_id = set.id;
    } else if (typeof set.id === 'number') {
         query.set_id = Long.fromNumber(set.id);
    } else {
        // Fallback for logic where set might not have Long ID yet or using ObjectId link
        query.set_id = setObjectId;
    }

    // Get sequences for this set
    const sequences = await sequencesCollection
      .find(query)
      .sort({ sequence_number: 1, created_at: 1 })
      .toArray();
      
    // If no sequences found with Long ID, try ObjectId fallback (migration support)
    if (sequences.length === 0 && set.id) {
         const fallbackSequences = await sequencesCollection
            .find({ set_id: setObjectId, deleted_at: null })
            .sort({ sequence_number: 1, created_at: 1 })
            .toArray();
         if (fallbackSequences.length > 0) {
             // We found sequences using the OLD ObjectId link. Return them.
             // (Ideally we should migrate them, but read-only for now)
             sequences.push(...fallbackSequences);
         }
    }

    // Helper to safely parse JSON if it's a string
    const parseIfString = (val, defaultVal) => {
        if (!val) return defaultVal;
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return defaultVal; }
        }
        return val; // Already object/array
    };
    
    // Helper for Long to String
    const longToString = (val) => {
        if (!val) return null;
        return val.toString();
    };

    return res.status(200).json({
      success: true,
      set_id: set._id.toString(),
      set_name: set.set_name,
      sequences: sequences.map(s => ({
        id: s._id.toString(),
        sequence_id: s._id.toString(),
        set_id: longToString(s.set_id) || s.set_id.toString(), // Handle Long or ObjectId
        name: s.name,
        sequence_number: s.sequence_number,
        subject: s.subject || '',
        template_id: longToString(s.template_id),
        audience_id: longToString(s.audience_id),
        from_emails: parseIfString(s.from_emails, []),
        time_gap: s.time_gap,
        batch_size: s.batch_size,
        assignment_mode: s.assignment_mode || 'batch_size',
        manual_assignments: parseIfString(s.manual_assignments, {}),
        wait_time: s.wait_time || 0,
        wait_unit: s.wait_unit || 'minutes',
        categories: parseIfString(s.categories, []),
        previous_sequence_id: s.previous_sequence_id ? s.previous_sequence_id.toString() : null,
        status: s.status,
        scheduled_at: s.scheduled_at,
        timezone: s.timezone,
        filters: s.filters,
        created_at: s.created_at,
        updated_at: s.updated_at
      }))
    });
  } catch (error) {
    console.error('[Drift] Error fetching sequences:', error);
    return res.status(500).json({ error: 'Failed to fetch sequences: ' + error.message });
  }
}
