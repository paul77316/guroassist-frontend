import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from './NotificationBell';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name) => {
    if (!name) return 'T';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white shadow-sm">
          {getInitials(user?.name)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{user?.name ?? 'Teacher'}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role ?? 'Teacher'}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <button
          onClick={handleLogout}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Log out
        </button>
      </div>
    </header>
  );
}