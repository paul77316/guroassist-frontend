import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClassStudents,
  getCandidates,
  enrollStudents,
  removeStudent,
  importStudents,
} from '../services/classService';

export const useClassStudents = (classId) =>
  useQuery({
    queryKey: ['class-students', classId],
    queryFn: () => getClassStudents(classId),
    enabled: !!classId,
  });

export const useCandidates = (classId, search) =>
  useQuery({
    queryKey: ['class-candidates', classId, search],
    queryFn: () => getCandidates(classId, search),
    enabled: !!classId,
  });

// A roster change affects the roster, add-candidates, class cards, students list and attendance grid.
const ROSTER_KEYS = ['class-students', 'class-candidates', 'classes', 'students', 'attendance'];

function useRosterMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => ROSTER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  });
}

export const useEnrollStudents = (classId) => useRosterMutation((payload) => enrollStudents(classId, payload));
export const useRemoveStudent = (classId) => useRosterMutation((studentId) => removeStudent(classId, studentId));

export function useImportStudents(classId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, confirm }) => importStudents(classId, file, confirm),
    onSuccess: (_data, vars) => {
      if (!vars.confirm) return; // a preview changes nothing
      ROSTER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
}