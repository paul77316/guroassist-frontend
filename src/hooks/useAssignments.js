import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listAssignments, getAssignment, createAssignment, updateAssignment,
  deleteAssignment, restoreAssignment, saveSubmissions, getMissingWork,
} from '../services/assignmentService';

export const useAssignments = (classId, scope, trashed) =>
  useQuery({
    queryKey: ['assignments', classId, scope, !!trashed],
    queryFn: () => listAssignments({ classId, scope, trashed }),
    enabled: !!classId,
  });

export const useAssignment = (id) =>
  useQuery({
    queryKey: ['assignment', String(id)],
    queryFn: () => getAssignment(id),
    enabled: !!id,
  });

export const useMissingWork = (classId) =>
  useQuery({
    queryKey: ['missing-work', classId],
    queryFn: () => getMissingWork(classId),
    enabled: !!classId,
  });

// Any change to an assignment affects the lists, the grid, and the missing-work report.
const REFRESH = ['assignments', 'assignment', 'missing-work'];

function useRefreshingMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}

export const useCreateAssignment = () => useRefreshingMutation(createAssignment);
export const useUpdateAssignment = () => useRefreshingMutation(updateAssignment);
export const useDeleteAssignment = () => useRefreshingMutation(deleteAssignment);
export const useRestoreAssignment = () => useRefreshingMutation(restoreAssignment);

export function useSaveSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSubmissions,
    onSuccess: (res, vars) => {
      qc.setQueryData(['assignment', String(vars.id)], res.data); // the save already returns the fresh grid
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['missing-work'] });
    },
  });
}
