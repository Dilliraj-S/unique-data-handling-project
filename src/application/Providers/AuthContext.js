import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../Services/AuthService';

const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Manages global authentication state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [navigation, setNavigation] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      if (AuthService.isAuthenticated()) {
        const userData = await AuthService.getCurrentUser();
        
        if (userData) {
          setUser(userData.user);
          setPermissions(userData.permissions || []);
          setNavigation(userData.navigation || []);
          setRoles(userData.roles || []);
          setActiveRole(userData.activeRole || null);
          setIsAuthenticated(true);
        } else {
          // Token is invalid or expired, clear auth silently
          AuthService.clearAuth();
          setIsAuthenticated(false);
        }
      } else {
        // No token found, user needs to login
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Silently handle auth initialization errors
      // This is expected on first load or when token is expired
      console.log('Auth initialization: No valid session found');
      AuthService.clearAuth();
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (identifier, password) => {
    try {
      const result = await AuthService.login(identifier, password);
      
      if (result.success) {
        const { user, permissions, navigation, roles, activeRole } = result.data;
        setUser(user);
        setPermissions(permissions || []);
        setNavigation(navigation || []);
        setRoles(roles || []);
        setActiveRole(activeRole || null);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  };

  /**
   * Register user
   */
  const register = async (userData) => {
    try {
      const result = await AuthService.register(userData);
      
      if (result.success) {
        const { user, permissions, navigation, roles, activeRole } = result.data;
        setUser(user);
        setPermissions(permissions || []);
        setNavigation(navigation || []);
        setRoles(roles || []);
        setActiveRole(activeRole || null);
        setIsAuthenticated(true);
        return { success: true };
      }
      
      return { success: false, message: result.message };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Registration failed' };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await AuthService.logout();
      setUser(null);
      setPermissions([]);
      setNavigation([]);
      setRoles([]);
      setActiveRole(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  };

  /**
   * Refresh user data
   */
  const refreshUserData = async () => {
    try {
      const userData = await AuthService.getCurrentUser();
      
      if (userData) {
        setUser(userData.user);
        setPermissions(userData.permissions || []);
        setNavigation(userData.navigation || []);
        setRoles(userData.roles || []);
        setActiveRole(userData.activeRole || null);
        return { success: true };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Refresh user data error:', error);
      return { success: false };
    }
  };

  /**
   * Check if user has permission
   */
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  /**
   * Check if user has any of the permissions
   */
  const hasAnyPermission = (permissionList) => {
    return permissionList.some(perm => permissions.includes(perm));
  };

  /**
   * Check if user has all permissions
   */
  const hasAllPermissions = (permissionList) => {
    return permissionList.every(perm => permissions.includes(perm));
  };

  /**
   * Check hierarchical permission
   */
  const hasHierarchicalPermission = (action, module, section = null, item = null) => {
    const permissionChecks = [];
    
    if (item) {
      permissionChecks.push(`${action}:${module}::${section}::${item}`);
    }
    if (section) {
      permissionChecks.push(`${action}:${module}::${section}`);
    }
    permissionChecks.push(`${action}:${module}`);
    permissionChecks.push(action);
    
    return permissionChecks.some(perm => permissions.includes(perm));
  };

  const value = {
    // State
    user,
    permissions,
    navigation,
    roles,
    activeRole,
    loading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    refreshUserData,
    
    // Permission checks
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasHierarchicalPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;

