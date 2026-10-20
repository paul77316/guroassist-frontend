import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getInterventionOptions, listInterventions, getIntervention, createIntervention,
  updateIntervention, deleteIntervention, restoreIntervention, addFollowup, listDueFollowUps,
  getStudentsToReview, getActiveInterventions, listAllInterventions,
} from '../services/interventionService';

export const useInterventionOptions = () =>
  useQuery({
    queryKey: ['intervention-options'],
    queryFn: getInterventionOptions,
    staleTime: Infinity, // fixed lists
  });

export const useInterventions = (studentId, classId, trashed) =>
  useQuery({
    queryKey: ['interventions', studentId, classId || '', !!trashed],
    queryFn: () => listInterventions({ studentId, classId, trashed }),
    enabled: !!studentId,
  });

// All of the teacher's interventions across students. The key starts with 'interventions', so every
// intervention change refreshes it. Keeps the previous page on screen while the next one loads.
export const useAllInterventions = (filters) =>
  useQuery({
    queryKey: ['interventions', 'all', filters],
    queryFn: () => listAllInterventions(filters),
    placeholderData: keepPreviousData,
  });

export const useIntervention = (id) =>
  useQuery({
    queryKey: ['intervention', String(id)],
    queryFn: () => getIntervention(id),
    enabled: !!id,
  });

export const useDueFollowUps = () =>
  useQuery({
    queryKey: ['follow-ups-due'],
    queryFn: listDueFollowUps,
  });

// Used by the two report pages for the "Intervention active" indicator.
export const useActiveInterventions = () =>
  useQuery({
    queryKey: ['active-interventions'],
    queryFn: getActiveInterventions,
  });

export const useStudentsToReview = () =>
  useQuery({
    queryKey: ['students-to-review'],
    queryFn: getStudentsToReview,
  });

// Any change to an intervention affects the student lists, the detail, the due list, the review list,
// the bell and the dashboard Today panel.
const REFRESH = ['interventions', 'intervention', 'follow-ups-due', 'students-to-review', 'active-interventions', 'notification-summary', 'dashboard-today'];

function useRefreshingMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}

export const useCreateIntervention = () => useRefreshingMutation(createIntervention);
export const useUpdateIntervention = () => useRefreshingMutation(updateIntervention);
export const useDeleteIntervention = () => useRefreshingMutation(deleteIntervention);
export const useRestoreIntervention = () => useRefreshingMutation(restoreIntervention);

export function useAddFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addFollowup,
    onSuccess: (data, vars) => {
      qc.setQueryData(['intervention', String(vars.id)], data); // the response is the fresh detail
      qc.invalidateQueries({ queryKey: ['interventions'] });
      qc.invalidateQueries({ queryKey: ['follow-ups-due'] });
      qc.invalidateQueries({ queryKey: ['students-to-review'] });
      qc.invalidateQueries({ queryKey: ['notification-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard-today'] });
    },
  });
}