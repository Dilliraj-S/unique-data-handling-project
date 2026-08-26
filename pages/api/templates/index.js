import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';

const normalizeId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  if (value instanceof Long) {
    return value.toNumber();
  }
  return value;
};

export default async function handler(req, res) {
  try {
    await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method === 'GET') {
    try {
      const templatesCollection = await getCollection('templates', 'pluto');

      const templates = await templatesCollection
        .find({
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        })
        .sort({ updated_at: -1, created_at: -1 })
        .toArray();

      return res.status(200).json(
        templates.map((template) => ({
          id: normalizeId(template.id),
          _id: template._id?.toString(),
          title: template.title,
          subject: template.subject || '',
          content: template.content || '',
          last_modified: template.updated_at || template.created_at,
          created_at: template.created_at,
          updated_at: template.updated_at
        }))
      );
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch templates'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { title, subject, content } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          status: false,
          message: 'Template title is required.'
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          status: false,
          message: 'Template content is required.'
        });
      }

      const templatesCollection = await getCollection('templates', 'pluto');

      // Get next ID
      const lastDoc = await templatesCollection.findOne(
        {},
        { sort: { id: -1 }, projection: { id: 1 } }
      );

      let nextId = Long.fromNumber(1);
      if (lastDoc && lastDoc.id) {
        const maxId = lastDoc.id instanceof Long ? lastDoc.id : Long.fromNumber(Number(lastDoc.id));
        nextId = Long.fromNumber(maxId.toNumber() + 1);
      }

      const userId = req.user?.user_id || req.user?.id || null;
      const userIdLong = userId ? Long.fromNumber(Number(userId)) : Long.fromNumber(0);

      const now = new Date();

      const newTemplate = {
        id: nextId,
        title: title.trim(),
        subject: (subject || '').trim(),
        content: content.trim(),
        last_modified: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        created_by: userIdLong,
        updated_by: userIdLong
      };

      const result = await templatesCollection.insertOne(newTemplate);

      return res.status(200).json({
        status: true,
        id: normalizeId(nextId),
        _id: result.insertedId.toString(),
        message: 'Template created successfully.'
      });
    } catch (error) {
      console.error('Failed to create template:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to create template'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}

