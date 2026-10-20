import { useQuery } from '@tanstack/react-query'; 
import { fetchSections } from '../services/sectionService'; 
export function useSections() { 
    return useQuery({ 
        queryKey: ['sections'], 
        queryFn: fetchSections, 
        staleTime: 5 * 60 * 1000, 
    }); 
}