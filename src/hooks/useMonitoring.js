import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAttendanceSummary,
  getStudentAttendance,
  getMonitoringSettings,
  saveMonitoringSettings,
} from '../services/monitoringService';

export const useAttendanceSummary = (classId, from, to) =>
  useQuery({
    queryKey: ['attendance-summary', classId, from, to],
    queryFn: () => getAttendanceSummary({ classId, from, to }),
    enabled: !!classId && !!from && !!to && from <= to,
  });

export const useStudentAttendance = (classId, studentId, from, to) =>
  useQuery({
    queryKey: ['attendance-student', classId, studentId, from, to],
    queryFn: () => getStudentAttendance({ classId, studentId, from, to }),
    enabled: !!classId && !!studentId && !!from && !!to && from <= to,
  });

export const useMonitoringSettings = () =>
  useQuery({ queryKey: ['monitoring-settings'], queryFn: getMonitoringSettings, retry: false });

export function useSaveMonitoringSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveMonitoringSettings,
    onSuccess: (data) => {
      qc.setQueryData(['monitoring-settings'], data);
      // review flags depend on the thresholds
      qc.invalidateQueries({ queryKey: ['attendance-summary'] });
      qc.invalidateQueries({ queryKey: ['attendance-student'] });
    },
  });
}