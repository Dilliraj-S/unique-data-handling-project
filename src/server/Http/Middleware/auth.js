import jwt from 'jsonwebtoken';
import { getCollection } from '../../../lib/mongodb';

/**
 * Authentication Middleware for Next.js API Routes
 * Verifies JWT token and attaches user data to request
 */
export async function authMiddleware(req) {
  const authHeader = req.headers.authorization;

  let token;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.auth_token) {
    token = req.query.auth_token;
  }

  if (!token) {
    throw new Error('No token provided');
  }

  try {
    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, jwtSecret);

    // Log decoded token for debugging (remove in production)
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = decoded.exp && decoded.exp < currentTime;
    
    console.log('🔍 Decoded JWT token:', {
      userId: decoded.userId,
      user_id: decoded.user_id,
      username: decoded.username,
      role: decoded.role,
      exp: decoded.exp,
      iat: decoded.iat,
      currentTime,
      isExpired,
      tokenKeys: Object.keys(decoded || {})
    });
    
    if (isExpired) {
      throw new Error('Token expired');
    }

    // Get user from database - try both userId and user_id fields
    const usersCollection = await getCollection('users');
    const userId = decoded.userId || decoded.user_id;
    
    if (!userId) {
      console.error('❌ No userId found in token:', decoded);
      throw new Error('Invalid token: missing user identifier');
    }

    const user = await usersCollection.findOne({
      user_id: userId,
      deleted_at: null
    }, {
      projection: {
        user_id: 1, // String ID (e.g., "USR_ADMIN_001")
        username: 1,
        email: 1,
        role: 1,
        account_status: 1
      }
    });

    if (!user) {
      console.error('❌ User not found in database:', userId);
      throw new Error('User not found');
    }

    if (user.account_status !== 'active') {
      console.error('❌ User account is not active:', user.account_status);
      throw new Error('Account is not active');
    }

    // Return user data to attach to request
    // email_accounts.user_id is now string (matches users.user_id)
    return {
      user_id: user.user_id, // String ID (e.g., "USR_ADMIN_001")
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Permission Middleware
 * Checks if user has required permission
 */
export async function permissionMiddleware(req, requiredPermission) {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Get user permissions
  const userPermissionsCollection = await getCollection('user_permissions');
  const userPermissions = await userPermissionsCollection.find({
    user_id: req.user.user_id,
    is_active: true
  }).toArray();

  const permissionIds = userPermissions.map(up => up.permission_id);
  
  if (permissionIds.length === 0) {
    throw new Error('Insufficient permissions');
  }

  const permissionsCollection = await getCollection('permissions');
  const permissions = await permissionsCollection.find({
    permission_id: { $in: permissionIds }
  }).toArray();

  const permissionNames = permissions.map(p => p.name);

  if (!permissionNames.includes(requiredPermission)) {
    throw new Error('Insufficient permissions');
  }

  return true;
}
