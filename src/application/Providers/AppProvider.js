import React from 'react';
import { AuthProvider } from './AuthProvider';

/**
 * App Provider
 * Combines all application providers
 */
export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

export default AppProvider;

