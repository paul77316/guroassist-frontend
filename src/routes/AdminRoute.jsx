import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function AdminRoute() {
  const { user, isLoading } = useContext(AuthContext);
  if (isLoading) return null; // wait for the session check so a page refresh doesn't bounce admins
  return user?.role === 'admin' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}