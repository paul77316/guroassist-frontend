import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAttendance, saveAttendance } from '../services/attendanceService';

export function useAttendance(classId, date) {
  return useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => getAttendance({ classId, date }),
    enabled: !!classId && !!date,
  });
}

export function useSaveAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveAttendance,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['attendance', vars.classId, vars.date] });
    },
  });
}