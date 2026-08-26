import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Authentication Service
 * Handles all authentication operations
 */
class AuthService {
  constructor() {
    this.TOKEN_KEY = 'access_token';
    this.REFRESH_TOKEN_KEY = 'refresh_token';
    this.USER_KEY = 'user_data';
  }

  // ================================
  // Authentication Methods
  // ================================

  /**
   * Login user
   * @param {string} identifier - Email or username
   * @param {string} password - User password
   * @returns {Promise<object>} Login result
   */
  async login(identifier, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identifier,
        password
      });

      if (response.data.status) {
        const { tokens, user, permissions, roles, navigation, activeRole } = response.data.data;
        
        // Store tokens
        this.setToken(tokens.accessToken);
        this.setRefreshToken(tokens.refreshToken);
        
        // Store user data
        this.setUserData({
          user,
          permissions,
          roles,
          activeRole,
          navigation
        });

        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        message: response.data.message
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  }

  /**
   * Register new user
   * @param {object} userData - User registration data
   * @returns {Promise<object>} Registration result
   */
  async register(userData) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);

      if (response.data.status) {
        const { tokens, user, permissions, roles, navigation, activeRole } = response.data.data;
        
        // Store tokens
        this.setToken(tokens.accessToken);
        this.setRefreshToken(tokens.refreshToken);
        
        // Store user data
        this.setUserData({
          user,
          permissions,
          roles,
          activeRole,
          navigation
        });

        return {
          success: true,
          data: response.data.data
        };
      }

      return {
        success: false,
        message: response.data.message
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  }

  /**
   * Logout user
   * @returns {Promise<object>} Logout result
   */
  async logout() {
    try {
      const token = this.getToken();
      
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Clear all stored data
      this.clearAuth();

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      // Clear data even if API call fails
      this.clearAuth();
      
      console.error('Logout error:', error);
      return {
        success: true, // Still return success since we cleared local data
        message: 'Logged out'
      };
    }
  }

  /**
   * Refresh access token
   * @returns {Promise<boolean>} Success status
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      
      if (!refreshToken) {
        console.log('No refresh token available');
        return false;
      }

      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refreshToken
      });

      if (response.data.status) {
        this.setToken(response.data.data.accessToken);
        console.log('Token refreshed successfully');
        return true;
      }

      return false;
    } catch (error) {
      // Silently handle refresh errors - this is expected when token expires
      console.log('Token refresh failed: Session expired');
      this.clearAuth();
      return false;
    }
  }

  /**
   * Get current user data
   * @returns {Promise<object>} User data
   */
  async getCurrentUser() {
    try {
      const token = this.getToken();
      
      if (!token) {
        console.log('No access token available');
        return null;
      }

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status) {
        const { user, permissions, roles, navigation, activeRole } = response.data.data;
        
        // Update stored user data
        this.setUserData({
          user,
          permissions,
          roles,
          activeRole,
          navigation
        });

        console.log('Current user loaded successfully');
        return response.data.data;
      }

      return null;
    } catch (error) {
      // Handle authentication errors gracefully
      console.log('Get current user: Authentication check failed');
      
      // If unauthorized, try to refresh token
      if (error.response?.status === 401) {
        console.log('Access token expired, attempting refresh...');
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.getCurrentUser(); // Retry with new token
        }
        this.clearAuth();
      }
      
      return null;
    }
  }

  /**
   * Change password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Result
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const token = this.getToken();
      
      const response = await axios.post(`${API_URL}/auth/change-password`, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return {
        success: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to change password'
      };
    }
  }

  // ================================
  // Storage Methods
  // ================================

  /**
   * Set access token
   * @param {string} token - Access token
   */
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get access token
   * @returns {string|null} Access token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set refresh token
   * @param {string} token - Refresh token
   */
  setRefreshToken(token) {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  /**
   * Get refresh token
   * @returns {string|null} Refresh token
   */
  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Set user data
   * @param {object} data - User data
   */
  setUserData(data) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(data));
  }

  /**
   * Get user data
   * @returns {object|null} User data
   */
  getUserData() {
    const data = localStorage.getItem(this.USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clear all authentication data
   */
  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * Get user permissions
   * @returns {string[]} Array of permission names
   */
  getUserPermissions() {
    const userData = this.getUserData();
    return userData?.permissions || [];
  }

  /**
   * Check if user has permission
   * @param {string} permission - Permission name
   * @returns {boolean} Permission status
   */
  hasPermission(permission) {
    const permissions = this.getUserPermissions();
    return permissions.includes(permission);
  }

  /**
   * Get user navigation
   * @returns {object[]} Navigation structure
   */
  getNavigation() {
    const userData = this.getUserData();
    return userData?.navigation || [];
  }

  /**
   * Get axios instance with auth header
   * @returns {object} Axios instance
   */
  getAxiosInstance() {
    const token = this.getToken();
    return axios.create({
      baseURL: API_URL,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  }
}

export default new AuthService();
