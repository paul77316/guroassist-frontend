import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { correctAttendance, getAttendance, getSeatingLayout, saveSeatingLayout } from '../services/attendanceService';

export function useAttendance(classId, date, { poll = false } = {}) {
  return useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: () => getAttendance({ classId, date }),
    enabled: !!classId && !!date,
    refetchInterval: poll ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useCorrectAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: correctAttendance,
    onSettled: (_data, _error, vars) => {
      // Also after a stale-version refusal, so the admin sees what changed.
      qc.invalidateQueries({ queryKey: ['attendance', vars.classId, vars.date] });
      qc.invalidateQueries({ queryKey: ['attendance-report'] });
    },
  });
}

export function useSeatingLayout(classId) {
  return useQuery({
    queryKey: ['seating', classId],
    queryFn: () => getSeatingLayout(classId),
    enabled: !!classId,
  });
}

export function useSaveSeatingLayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSeatingLayout,
    onSettled: (_data, _error, vars) => qc.invalidateQueries({ queryKey: ['seating', vars.classId] }),
  });
}
