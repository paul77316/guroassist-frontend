import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClasses, createClass, updateClass, archiveClass } from '../services/classService';

export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: getClasses,
  });
}

function useClassMutation(fn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['sections'] }); // student form dropdown
    },
  });
}

export const useCreateClass = () => useClassMutation(createClass);
export const useUpdateClass = () => useClassMutation(updateClass);
export const useArchiveClass = () => useClassMutation(archiveClass);