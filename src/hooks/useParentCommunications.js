import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listCommunications, getCommunication, createCommunication, updateCommunication,
  deleteCommunication, restoreCommunication,
  markCommunicationFollowUpDone, undoCommunicationFollowUpDone,
} from '../services/communicationService';

export const useParentCommunications = (studentId, classId, trashed) =>
  useQuery({
    queryKey: ['parent-communications', studentId, classId || '', !!trashed],
    queryFn: () => listCommunications({ studentId, classId, trashed }),
    enabled: !!studentId,
  });

export const useParentCommunication = (id) =>
  useQuery({
    queryKey: ['parent-communication', String(id)],
    queryFn: () => getCommunication(id),
    enabled: !!id,
  });

// Their own keys, plus the due list, the bell and the dashboard Today panel.
const REFRESH = ['parent-communications', 'parent-communication', 'follow-ups-due', 'notification-summary', 'dashboard-today'];

function useRefreshingMutation(mutationFn, { refreshOnError = false } = {}) {
  const qc = useQueryClient();
  const refresh = () => Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  return useMutation({
    mutationFn,
    onSuccess: refresh,
    // A rejected Mark done or Undo usually means the screen was stale (another tab): show the truth.
    onError: refreshOnError ? refresh : undefined,
  });
}

export const useCreateCommunication = () => useRefreshingMutation(createCommunication);
export const useUpdateCommunication = () => useRefreshingMutation(updateCommunication);
export const useDeleteCommunication = () => useRefreshingMutation(deleteCommunication);
export const useRestoreCommunication = () => useRefreshingMutation(restoreCommunication);
export const useMarkFollowUpDone = () => useRefreshingMutation(markCommunicationFollowUpDone, { refreshOnError: true });
export const useUndoFollowUpDone = () => useRefreshingMutation(undoCommunicationFollowUpDone, { refreshOnError: true });