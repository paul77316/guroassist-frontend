import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Guards nested routes behind authentication, and optionally a role.
 * Usage: <Route element={<ProtectedRoute role="admin" />}>...</Route>
 */
export default function ProtectedRoute({ role }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const isInitialPasswordPage = location.pathname === '/initial-password';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.must_change_password && !isInitialPasswordPage) {
    return <Navigate to="/initial-password" replace />;
  }

  if (!user?.must_change_password && isInitialPasswordPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
