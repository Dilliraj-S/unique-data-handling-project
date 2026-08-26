import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getCollection } from '../../../lib/mongodb';

/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and session management
 */
class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Login user with email/username and password
   * @param {string} identifier - Email or username
   * @param {string} password - User password
   * @returns {Promise<object>} Login result with user data and tokens
   */
  async login(identifier, password) {
    // Find user by email or username
    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ],
      deleted_at: null
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (user.account_status !== 'active') {
      throw new Error(`Account is ${user.account_status}. Please contact support.`);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Get user roles
    const userRolesCollection = await getCollection('user_roles');
    const userRoles = await userRolesCollection.find({
      user_id: user.user_id,
      is_active: true
    }).toArray();

    const roleIds = userRoles.map(ur => ur.role_id);
    const rolesCollection = await getCollection('roles');
    const roles = roleIds.length > 0 ? await rolesCollection.find({
      role_id: { $in: roleIds }
    }).toArray() : [];

    // Get user permissions
    const userPermissionsCollection = await getCollection('user_permissions');
    const userPermissions = await userPermissionsCollection.find({
      user_id: user.user_id,
      is_active: true
    }).toArray();

    const permissionIds = userPermissions.map(up => up.permission_id);
    const permissionsCollection = await getCollection('permissions');
    const permissions = permissionIds.length > 0 ? await permissionsCollection.find({
      permission_id: { $in: permissionIds }
    }).toArray() : [];

    // Update last login
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          last_login_at: new Date()
        }
      }
    );

    // Attach relations to user object
    user.user_roles = userRoles.map(ur => ({
      ...ur,
      roles: roles.find(r => r.role_id === ur.role_id)
    })).filter(ur => ur.roles);

    user.user_permissions = userPermissions.map(up => ({
      ...up,
      permissions: permissions.find(p => p.permission_id === up.permission_id)
    })).filter(up => up.permissions);

    // Generate session data
    const sessionData = await this.initializeUserSession(user);

    return sessionData;
  }

  /**
   * Initialize user session with permissions and navigation
   * @param {object} user - User object from database
   * @returns {Promise<object>} Session data
   */
  async initializeUserSession(user) {
    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.user_id,
        username: user.username,
        role: user.role
      },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.user_id },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiresIn }
    );

    // Extract permissions
    const permissions = user.user_permissions?.map(up => up.permissions?.name).filter(Boolean) || [];
    
    // Extract roles
    const roles = user.user_roles?.map(ur => ({
      role_id: ur.roles?.role_id,
      name: ur.roles?.name,
      description: ur.roles?.description
    })).filter(r => r.role_id) || [];

    // Get active role (first role)
    const activeRole = roles[0] || null;

    // TODO: Generate navigation based on permissions and tokens
    const navigation = await this.generateNavigation(user);

    // Prepare user data (remove sensitive fields)
    const userData = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      profile: user.profile,
      cover: user.cover,
      business_id: user.business_id
    };

    return {
      tokens: {
        accessToken,
        refreshToken
      },
      user: userData,
      permissions,
      roles,
      activeRole,
      navigation
    };
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT access token
   * @returns {Promise<object>} User data
   */
  async verifyToken(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, this.jwtSecret);

      // Get user from database
      const usersCollection = await getCollection('users');
      const user = await usersCollection.findOne({
        user_id: decoded.userId,
        deleted_at: null
      });

      if (!user || user.account_status !== 'active') {
        throw new Error('User not found or inactive');
      }

      // Get user roles
      const userRolesCollection = await getCollection('user_roles');
      const userRoles = await userRolesCollection.find({
        user_id: user.user_id,
        is_active: true
      }).toArray();

      const roleIds = userRoles.map(ur => ur.role_id);
      const rolesCollection = await getCollection('roles');
      const roles = roleIds.length > 0 ? await rolesCollection.find({
        role_id: { $in: roleIds }
      }).toArray() : [];

      // Get user permissions
      const userPermissionsCollection = await getCollection('user_permissions');
      const userPermissions = await userPermissionsCollection.find({
        user_id: user.user_id,
        is_active: true
      }).toArray();

      const permissionIds = userPermissions.map(up => up.permission_id);
      const permissionsCollection = await getCollection('permissions');
      const permissions = permissionIds.length > 0 ? await permissionsCollection.find({
        permission_id: { $in: permissionIds }
      }).toArray() : [];

      // Return user data
      return {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          profile: user.profile,
          cover: user.cover,
          account_status: user.account_status,
          business_id: user.business_id
        },
        permissions: permissions.map(p => p.name),
        roles: roles,
        navigation: await this.generateNavigation(user)
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Generate navigation based on user permissions
   * @param {object} user - User object
   * @returns {Promise<array>} Navigation array
   */
  async generateNavigation(user) {
    // TODO: Implement token-based navigation generation
    // For now, return empty array - frontend uses static navigation config
    // When dynamic navigation is needed, return format compatible with frontend:
    // { name, to, icon, component, items, badge }
    return [];
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);

      const usersCollection = await getCollection('users');
      const user = await usersCollection.findOne({
        user_id: decoded.userId,
        deleted_at: null
      });

      if (!user || user.account_status !== 'active') {
        throw new Error('User not found or inactive');
      }

      const accessToken = jwt.sign(
        { 
          userId: user.user_id,
          username: user.username,
          role: user.role
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

export default new AuthService();
