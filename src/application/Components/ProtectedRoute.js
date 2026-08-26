import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Providers/AuthContext';
import { CSpinner } from '@coreui/react';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;

