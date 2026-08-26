import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long, ObjectId } from 'mongodb';

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

const toLong = (value) => {
  if (value instanceof Long) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Long.fromNumber(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric identifier');
    }
    return Long.fromNumber(parsed);
  }
  throw new Error('Invalid identifier provided');
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

  const { templateId } = req.query;

  if (!templateId) {
    return res.status(400).json({
      status: false,
      message: 'Template ID is required.'
    });
  }

  const templatesCollection = await getCollection('templates', 'pluto');

  if (req.method === 'GET') {
    try {
      // Try to find by numeric ID first
      let template;
      try {
        const idLong = toLong(templateId);
        template = await templatesCollection.findOne({
          id: idLong,
          $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
        });
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(templateId)) {
          template = await templatesCollection.findOne({
            _id: new ObjectId(templateId),
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
          });
        }
      }

      if (!template) {
        return res.status(404).json({
          status: false,
          message: 'Template not found.'
        });
      }

      return res.status(200).json({
        id: normalizeId(template.id),
        _id: template._id?.toString(),
        title: template.title,
        subject: template.subject || '',
        content: template.content || '',
        last_modified: template.updated_at || template.created_at,
        created_at: template.created_at,
        updated_at: template.updated_at
      });
    } catch (error) {
      console.error('Failed to fetch template:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to fetch template'
      });
    }
  }

  if (req.method === 'PUT') {
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

      // Try to find by numeric ID first
      let query;
      try {
        const idLong = toLong(templateId);
        query = { id: idLong };
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(templateId)) {
          query = { _id: new ObjectId(templateId) };
        } else {
          return res.status(400).json({
            status: false,
            message: 'Invalid template ID format.'
          });
        }
      }

      const userId = req.user?.user_id || req.user?.id || null;
      const userIdLong = userId ? Long.fromNumber(Number(userId)) : Long.fromNumber(0);

      const now = new Date();

      const updateData = {
        title: title.trim(),
        subject: (subject || '').trim(),
        content: content.trim(),
        last_modified: now,
        updated_at: now,
        updated_by: userIdLong
      };

      const result = await templatesCollection.updateOne(
        query,
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          message: 'Template not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Template updated successfully.'
      });
    } catch (error) {
      console.error('Failed to update template:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to update template'
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Try to find by numeric ID first
      let query;
      try {
        const idLong = toLong(templateId);
        query = { id: idLong };
      } catch (e) {
        // If not numeric, try ObjectId
        if (ObjectId.isValid(templateId)) {
          query = { _id: new ObjectId(templateId) };
        } else {
          return res.status(400).json({
            status: false,
            message: 'Invalid template ID format.'
          });
        }
      }

      const result = await templatesCollection.updateOne(
        query,
        { $set: { deleted_at: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          message: 'Template not found.'
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Template deleted successfully.'
      });
    } catch (error) {
      console.error('Failed to delete template:', error);
      return res.status(500).json({
        status: false,
        message: error.message || 'Failed to delete template'
      });
    }
  }

  return res.status(405).json({
    status: false,
    message: 'Method not allowed'
  });
}

