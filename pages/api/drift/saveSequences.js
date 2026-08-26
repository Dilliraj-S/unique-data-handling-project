/**
 * POST /api/central/emailsystem/drift/saveSequences
 * Bulk save/update sequences for a set
 */
import { getCollection } from '../../../src/lib/mongodb';
import { ObjectId, Long, Int32 } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { set_id, sequences } = req.body;

    if (!set_id) {
      return res.status(422).json({ error: 'Set ID is required' });
    }

    if (!sequences || !Array.isArray(sequences) || sequences.length === 0) {
      return res.status(422).json({ error: 'Sequences array is required' });
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

    // Ensure set has a Long ID
    const setLongId = set.id || Long.fromNumber(0); 
    const now = new Date();
    const updatedSequences = [];
    const baseId = Date.now(); 

    // Helper to safely create Int32
    const toInt32 = (val) => {
        const num = parseInt(val);
        if (isNaN(num)) return new Int32(0);
        return new Int32(num);
    };

    // Helper to convert to Long safety
    const toLong = (val) => {
        if (val === null || val === undefined) return null;
        try {
            return Long.fromString(String(val));
        } catch (e) {
            return Long.fromNumber(Number(val));
        }
    };

    // Process each sequence
    for (let i = 0; i < sequences.length; i++) {
        const seqData = sequences[i];
        const sequenceNumber = seqData.sequence_number || (i + 1);

        // Prepare ID for new sequences or lookup existing
        let sequenceId;
        
        if (seqData.sequence_id || seqData.id) {
             try {
                 if (seqData.sequence_id && ObjectId.isValid(seqData.sequence_id)) {
                      sequenceId = new ObjectId(seqData.sequence_id);
                 } else if (seqData.id && ObjectId.isValid(seqData.id)) {
                      sequenceId = new ObjectId(seqData.id);
                 }
             } catch(e) { }
        }
        
      // Build update document
      // NOTE: Using Int32 and Long for strict schema compliance
      const updateDoc = {
        set_id: setLongId, 
        name: (seqData.name || '').trim(),
        sequence_number: toInt32(sequenceNumber),
        subject: (seqData.subject || '').trim(), 
        template_id: toLong(seqData.template_id) || Long.fromNumber(0), 
        from_emails: JSON.stringify(seqData.from_emails || []), 
        wait_time: toInt32(seqData.wait_time || 0), 
        wait_unit: seqData.wait_unit || 'minutes', 
        assignment_mode: seqData.assignment_mode || 'batch_size', 
        updated_at: now
      };

      // Sequence 1 specific fields
      if (sequenceNumber === 1) {
        updateDoc.audience_id = toLong(seqData.audience_id) || Long.fromNumber(0); 
        updateDoc.time_gap = toInt32(seqData.time_gap || 60);
        updateDoc.categories = null; 
        updateDoc.previous_sequence_id = null; 
        
        if (updateDoc.assignment_mode === 'batch_size') {
          updateDoc.batch_size = toInt32(seqData.batch_size || 10);
          updateDoc.manual_assignments = null;
        } else {
          updateDoc.batch_size = null;
          updateDoc.manual_assignments = JSON.stringify(seqData.manual_assignments || {}); 
        }
      } else {
        // Sequence 2+ specific fields
        updateDoc.categories = JSON.stringify(seqData.categories || []); 
        updateDoc.audience_id = null; 
        updateDoc.time_gap = null;
        updateDoc.batch_size = null; 
        updateDoc.manual_assignments = null;
      }

      // Update previous_sequence_id chain for Seq 2+
      if (sequenceNumber > 1) {
          if (i > 0 && updatedSequences[i - 1]) {
             updateDoc.previous_sequence_id = updatedSequences[i - 1]._id; // Store as ObjectId
          } else {
            const prevSeq = await sequencesCollection.findOne({
              set_id: setLongId, 
              sequence_number: sequenceNumber - 1,
              deleted_at: null
            });
            if (prevSeq) {
              updateDoc.previous_sequence_id = prevSeq._id; // Store as ObjectId
            } else {
                updateDoc.previous_sequence_id = null; 
            }
          }
      }

      if (sequenceId) {
        // Update existing sequence
        const existingSeq = await sequencesCollection.findOne({ _id: sequenceId });
        
        if (existingSeq) {
            if (['running', 'sending'].includes(existingSeq.status)) {
                 return res.status(422).json({ 
                    error: `Sequence ${sequenceNumber}: Cannot update a ${existingSeq.status} sequence` 
                 });
            }
            
            // SANITIZATION: Ensure ALL fields match strict schema, even those not changing
            // This fixes "Document failed validation" caused by legacy fields (e.g. unopened=Double, created_at=String)
            
            // 1. Check ID
            if (!existingSeq.id || !(existingSeq.id instanceof Long)) {
                 updateDoc.id = Long.fromNumber(baseId + i);
                 console.log(`[Drift] Migrating legacy sequence ${sequenceId} to have Long ID: ${updateDoc.id}`);
            }

            // 2. Unopened: Must be Int or Null. If legacy has Number 0, convert to Int32(0)
            if (existingSeq.unopened !== undefined && existingSeq.unopened !== null) {
                updateDoc.unopened = toInt32(existingSeq.unopened);
            } else {
                 // Explicitly set null if missing/null to be safe? Schema allows null.
                 // updateDoc.unopened = null; 
            }

            // 3. Status: Required Enum. 
            // If existingSeq has status, preserve it (it should be valid enum 'draft', 'running' etc).
            // But if it's somehow weird, default to draft.
            updateDoc.status = existingSeq.status || 'draft';

            // 4. Timezone, Scheduled_at, Filters
            updateDoc.timezone = existingSeq.timezone || null;
            updateDoc.filters = existingSeq.filters || null;
            
            // 5. Scheduled_at: Must be Date or Null
            if (existingSeq.scheduled_at && existingSeq.scheduled_at instanceof Date) {
                updateDoc.scheduled_at = existingSeq.scheduled_at;
            } else {
                updateDoc.scheduled_at = null;
            }

            // 6. Created_at: Must be Date (or null? Schema says date or null)
            if (existingSeq.created_at && existingSeq.created_at instanceof Date) {
                updateDoc.created_at = existingSeq.created_at;
            } else {
                updateDoc.created_at = now; // Fixing invalid created_at
            }
        }
        
        await sequencesCollection.updateOne(
          { _id: sequenceId },
          { $set: updateDoc }
        );
      } else {
        // Create new sequence
        updateDoc.id = Long.fromNumber(baseId + i); 
        updateDoc.status = 'draft'; 
        updateDoc.scheduled_at = null;
        updateDoc.timezone = null;
        updateDoc.filters = null;
        updateDoc.created_at = now;
        updateDoc.deleted_at = null;
        updateDoc.unopened = new Int32(0); // Initialize as Int32

        const result = await sequencesCollection.insertOne(updateDoc);
        sequenceId = result.insertedId;
      }

      // Fetch the updated sequence
      const updatedSeq = await sequencesCollection.findOne({ _id: sequenceId });
      updatedSequences.push(updatedSeq);
    }

    console.log(`[Drift] Saved ${sequences.length} sequences for set ${set_id}`);

    return res.status(200).json({
      success: true,
      message: 'Sequences saved successfully',
      sequences: updatedSequences.map(s => ({
        id: s._id.toString(),
        sequence_id: s._id.toString(),
        set_id: set_id,
        name: s.name,
        sequence_number: s.sequence_number,
        status: s.status
      }))
    });
  } catch (error) {
    console.error('[Drift] Error saving sequences:', error);
    if (error.errInfo) {
        console.error('Validation Error Details:', JSON.stringify(error.errInfo, null, 2));
    }
    return res.status(500).json({ error: 'Failed to save sequences: ' + error.message });
  }
}
