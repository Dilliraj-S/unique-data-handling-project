import React, { createContext, useContext } from 'react';
import useAuth from '../Hooks/useAuth';

/**
 * Auth Context
 */
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Provides authentication context to the application
 */
export const AuthProvider = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuthContext Hook
 * Access authentication context
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
};

export default AuthProvider;

