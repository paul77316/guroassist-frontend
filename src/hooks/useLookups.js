import { useQuery } from '@tanstack/react-query';
import { getGradeLevels, getSubjects, getAcademicYears, getTerms } from '../services/lookupService';

const opts = { staleTime: 5 * 60 * 1000 };

export const useGradeLevels = () => useQuery({ queryKey: ['grade-levels'], queryFn: getGradeLevels, ...opts });
export const useSubjects = () => useQuery({ queryKey: ['subjects'], queryFn: getSubjects, ...opts });
export const useAcademicYears = () => useQuery({ queryKey: ['academic-years'], queryFn: getAcademicYears, ...opts });
export const useTerms = () => useQuery({ queryKey: ['terms'], queryFn: getTerms, ...opts });