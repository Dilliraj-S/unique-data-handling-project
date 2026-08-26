/**
 * GET /api/central/emailsystem/drift/getSets
 * List all drift email sets
 */
import { getCollection } from '../../../src/lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const setsCollection = await getCollection('sets', 'pluto');
    
    const sets = await setsCollection
      .find({ deleted_at: null })
      .sort({ created_at: -1 })
      .project({ _id: 1, set_name: 1, description: 1, created_at: 1, updated_at: 1 })
      .toArray();

    return res.status(200).json({ 
      success: true,
      sets: sets.map(s => ({
        id: s._id.toString(),
        set_name: s.set_name,
        description: s.description || '',
        created_at: s.created_at,
        updated_at: s.updated_at
      }))
    });
  } catch (error) {
    console.error('[Drift] Error fetching sets:', error);
    return res.status(500).json({ error: 'Failed to fetch sets: ' + error.message });
  }
}
