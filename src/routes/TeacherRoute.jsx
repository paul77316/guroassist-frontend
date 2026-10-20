import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function TeacherRoute() {
  const { user, isLoading } = useContext(AuthContext);
  if (isLoading) return null; // wait for the session check
  return user?.role === 'teacher' ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
