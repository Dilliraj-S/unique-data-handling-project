import bcrypt from 'bcrypt';
import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';

/**
 * POST /api/profile/change-password
 * Body: { currentPassword, newPassword }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  let userSession;
  try {
    userSession = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      status: false,
      message: 'Current password and new password are required'
    });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({
      status: false,
      message: 'New password must be at least 8 characters'
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      status: false,
      message: 'New password must be different from current password'
    });
  }

  try {
    const usersCollection = await getCollection('users', 'central');
    const user = await usersCollection.findOne({ user_id: userSession.user_id });

    if (!user || !user.password) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(400).json({
        status: false,
        message: 'Current password is incorrect'
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
      { user_id: userSession.user_id },
      {
        $set: {
          password: hashed,
          last_password_changed_at: new Date(),
          updated_at: new Date(),
          updated_by: userSession.username || userSession.user_id || 'system'
        }
      }
    );

    return res.status(200).json({
      status: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      status: false,
      message: 'Failed to update password'
    });
  }
}

