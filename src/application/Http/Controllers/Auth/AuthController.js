import BaseController from '../BaseController';

/**
 * Authentication Controller
 * Handles authentication API calls
 */
class AuthController extends BaseController {
  /**
   * Login user
   * @param {object} credentials - Login credentials (email, password)
   * @returns {Promise} Login response
   */
  async login(credentials) {
    try {
      const response = await this.post('/auth/login', credentials);
      
      // Store token in localStorage
      if (response.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   * @param {object} userData - Registration data
   * @returns {Promise} Registration response
   */
  async register(userData) {
    try {
      const response = await this.post('/auth/register', userData);
      
      // Store token in localStorage
      if (response.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   * @returns {Promise} Logout response
   */
  async logout() {
    try {
      const response = await this.post('/auth/logout');
      
      // Clear token from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      // Clear localStorage even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  }

  /**
   * Get current user
   * @returns {Promise} User data
   */
  async getCurrentUser() {
    try {
      return await this.get('/auth/me');
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  /**
   * Get stored user data
   * @returns {object|null} User data
   */
  getStoredUser() {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  /**
   * Get stored token
   * @returns {string|null} Token
   */
  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  }
}

export default new AuthController();

