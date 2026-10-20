import { useQuery } from '@tanstack/react-query';
import { getDashboardToday } from '../services/dashboardService';

// The dashboard is not a live screen: no polling. Fresh for 60s, then refetch when the window regains focus.
// Mutations in useInterventions / useParentCommunications invalidate 'dashboard-today'.
export const useDashboardToday = () =>
  useQuery({
    queryKey: ['dashboard-today'],
    queryFn: getDashboardToday,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });