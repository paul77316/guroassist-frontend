import { useQuery } from '@tanstack/react-query';
import { fetchStudentProfile } from '../services/studentService';

export const useStudentProfile = (id) =>
  useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => fetchStudentProfile(id),
    enabled: !!id,
  });