import { useState, useEffect, useCallback } from 'react';
import AuthService from '../Services/AuthService';

/**
 * useAuth Hook
 * Custom hook for authentication
 */
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication state
  useEffect(() => {
    const initAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      const currentUser = AuthService.getCurrentUser();

      setIsAuthenticated(authenticated);
      setUser(currentUser);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Login user
   * @param {object} credentials - Login credentials
   * @returns {Promise} Login result
   */
  const login = useCallback(async (credentials) => {
    setIsLoading(true);

    try {
      const result = await AuthService.login(credentials);

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }

      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }, []);

  /**
   * Register user
   * @param {object} userData - Registration data
   * @returns {Promise} Registration result
   */
  const register = useCallback(async (userData) => {
    setIsLoading(true);

    try {
      const result = await AuthService.register(userData);

      if (result.success) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }

      setIsLoading(false);
      return result;
    } catch (error) {
      setIsLoading(false);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  }, []);

  /**
   * Logout user
   * @returns {Promise} Logout result
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await AuthService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);

      return { success: true };
    } catch (error) {
      setIsLoading(false);
      return {
        success: false,
        message: error.message || 'Logout failed'
      };
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout
  };
};

export default useAuth;

