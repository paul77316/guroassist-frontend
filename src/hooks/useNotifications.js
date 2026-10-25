import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationSummary, getNotificationPreferences, saveNotificationPreferences, markAttendanceSyncRead,
} from '../services/notificationService';

// The bell asks the server again every minute while the tab is visible, and when the teacher comes back to it.
// It only keeps polling when reminders are switched on. Changes to follow-ups refresh it straight away
// because 'notification-summary' is in the REFRESH lists of the intervention and communication hooks.
export const useNotificationSummary = () =>
  useQuery({
    queryKey: ['notification-summary'],
    queryFn: getNotificationSummary,
    staleTime: 30 * 1000,
    refetchInterval: (query) => (query.state.data?.enabled ? 60 * 1000 : false),
    refetchIntervalInBackground: false,
  });

export const useNotificationPreferences = () =>
  useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getNotificationPreferences,
  });

export function useSaveNotificationPreferences() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: saveNotificationPreferences,
    onSuccess: (data) => {
      qc.setQueryData(['notification-preferences'], data);
      qc.invalidateQueries({ queryKey: ['notification-summary'] });
    },
  });
}

export function useMarkAttendanceSyncRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: markAttendanceSyncRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-summary'] }),
  });
}
