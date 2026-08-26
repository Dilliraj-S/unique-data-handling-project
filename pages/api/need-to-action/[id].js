import NeedToActionService from '../../../src/services/NeedToActionService';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    req.user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  const recordId = req.query?.id;

  if (!recordId) {
    return res.status(400).json({
      status: false,
      message: 'Record identifier is required'
    });
  }

  try {
    const { data } = req.body || {};

    const response = await NeedToActionService.updateRecord({
      recordId,
      data,
      user: req.user
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error(`NeedToAction update error for ${recordId}:`, error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to update Need-To-Action record'
    });
  }
}

