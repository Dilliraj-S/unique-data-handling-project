import AuthService from 'src/server/Services/Auth/AuthService';
import { serializeBigInt } from 'src/utils/bigint-serializer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        status: false,
        message: 'No token provided'
      });
    }

    // Verify token using server-side AuthService
    const userData = await AuthService.verifyToken(token);
    
    // Serialize BigInt values before sending response
    const serializedData = serializeBigInt(userData);

    return res.status(200).json({
      status: true,
      data: serializedData
    });
  } catch (error) {
    console.error('Get current user error:', error.message);

    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }
}

