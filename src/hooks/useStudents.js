import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { fetchStudents, createStudent, updateStudent, archiveStudent, } 
from '../services/studentService'; 
const STUDENTS_KEY = 'students'; 
export function useStudents(filters = {}) { 
    return useQuery({ queryKey: [STUDENTS_KEY, filters], 
        queryFn: () => fetchStudents(filters),
        placeholderData: (previousData) => previousData, 
    }); 
}
export function useCreateStudent() { 
    const queryClient = useQueryClient(); 
    return useMutation({ mutationFn: createStudent, onSuccess: () => { queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] }); }, }); 
} 

export function useUpdateStudent() { 
    const queryClient = useQueryClient(); 
    return useMutation({ mutationFn: ({ id, payload }) => updateStudent(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] }); }, }); 
} 

export function useArchiveStudent() { 
    const queryClient = useQueryClient(); 
    return useMutation({ mutationFn: archiveStudent, onSuccess: () => { queryClient.invalidateQueries({ queryKey: [STUDENTS_KEY] }); }, }); 
}