import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '../services/adminService';

const TERMS = ['admin', 'terms'];

export const useAdminTerms = () => useQuery({ queryKey: TERMS, queryFn: svc.listTerms });

function useInvalidatingMutation(mutationFn, keys) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey })),
  });
}

// Terms also feed the shared ['terms'] lookup, so invalidate both.
export const useCreateTerm = () => useInvalidatingMutation(svc.createTerm, [TERMS, ['terms']]);
export const useUpdateTerm = () => useInvalidatingMutation(svc.updateTerm, [TERMS, ['terms']]);
export const useDeleteTerm = () => useInvalidatingMutation(svc.deleteTerm, [TERMS, ['terms']]);
// Reference lists feed many dropdowns and cards, so refresh all of them after a change.
const SETUP_REFRESH = {
  'academic-years': ['academic-years', 'classes', 'terms'],
  'grade-levels': ['grade-levels', 'classes', 'sections', 'students'],
  subjects: ['subjects', 'classes'],
};

export const useSetupList = (path) =>
  useQuery({ queryKey: ['admin', path], queryFn: () => svc.listSetup(path) });

function useSetupMutation(path, mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    // returned promise: callers' onSuccess runs after the lists have refetched
    onSuccess: () =>
      Promise.all(['admin-' + path, ...SETUP_REFRESH[path]].map((k) =>
        qc.invalidateQueries({ queryKey: k === 'admin-' + path ? ['admin', path] : [k] })
      )),
  });
}

export const useCreateSetup = (path) => useSetupMutation(path, (p) => svc.createSetup(path, p));
export const useUpdateSetup = (path) => useSetupMutation(path, (p) => svc.updateSetup(path, p));
export const useDeleteSetup = (path) => useSetupMutation(path, (id) => svc.deleteSetup(path, id));