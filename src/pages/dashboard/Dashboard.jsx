import { useAuth } from '../../hooks/useAuth';
import TodayPanel from '../../components/ui/TodayPanel';

// Phase 1 placeholder: confirms the authenticated shell renders.
// The Today panel (counts only) sits under the heading. Charts (see spec section 4)
// come in a later phase once attendance and grade data are available.
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your classes today.
        </p>
      </div>

      <TodayPanel />

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Dashboard summary cards and charts will appear here once attendance and grade data are available.
        </p>
      </div>
    </div>
  );
}
