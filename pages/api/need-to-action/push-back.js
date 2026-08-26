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

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { recordIds = [] } = req.body || {};

    const response = await NeedToActionService.pushBack({
      recordIds,
      user: req.user
    });

    const statusCode = response.status ? 200 : 207; // 207: multi-status when partial failures
    return res.status(statusCode).json(response);
  } catch (error) {
    console.error('NeedToAction push-back error:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to push records back to original collection'
    });
  }
}

