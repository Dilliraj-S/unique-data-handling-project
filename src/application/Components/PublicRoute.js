import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Providers/AuthContext';
import { CSpinner } from '@coreui/react';

/**
 * Public Route Component
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if not authenticated
  return children;
};

export default PublicRoute;

