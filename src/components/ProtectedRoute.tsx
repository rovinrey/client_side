import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRole: 'admin' | 'beneficiary' | 'staff';
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  // 1. Get the stored user data and role
  const userRole = localStorage.getItem('role');
  
  // 2. If no role exists, the user isn't logged in
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // 3. If the user's role doesn't match the required role for this page
  if (userRole !== allowedRole) {
    // Determine the redirect path based on their actual role
    let redirectPath = '/beneficiary'; // Default fallback
    
    if (userRole === 'admin') {
      redirectPath = '/admin';
    } else if (userRole === 'staff') {
      redirectPath = '/staff'; // Added staff redirect path
    }

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;