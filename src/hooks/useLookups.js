import { useQuery } from '@tanstack/react-query';
import { getGradeLevels, getSubjects, getAcademicYears, getTerms } from '../services/lookupService';

// Reference data changes infrequently, but stale/empty dropdowns are confusing.
// Revalidate after 30 seconds and when the user returns to the browser tab.
const opts = { staleTime: 30 * 1000, refetchOnWindowFocus: true };

export const useGradeLevels = () => useQuery({ queryKey: ['grade-levels'], queryFn: getGradeLevels, ...opts });
export const useSubjects = () => useQuery({ queryKey: ['subjects'], queryFn: getSubjects, ...opts });
export const useAcademicYears = () => useQuery({ queryKey: ['academic-years'], queryFn: getAcademicYears, ...opts });
export const useTerms = () => useQuery({ queryKey: ['terms'], queryFn: getTerms, ...opts });
