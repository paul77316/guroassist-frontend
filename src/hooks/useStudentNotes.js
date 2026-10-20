import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNotes, getNote, createNote, updateNote, deleteNote, restoreNote,
} from '../services/noteService';

export const useStudentNotes = (studentId, classId, trashed) =>
  useQuery({
    queryKey: ['student-notes', studentId, classId || '', !!trashed],
    queryFn: () => listNotes({ studentId, classId, trashed }),
    enabled: !!studentId,
  });

export const useStudentNote = (id) =>
  useQuery({
    queryKey: ['student-note', String(id)],
    queryFn: () => getNote(id),
    enabled: !!id,
  });

// Notes feed no other list (not the due list, not students to review), so only their own keys refresh.
const REFRESH = ['student-notes', 'student-note'];

function useRefreshingMutation(mutationFn) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] }))),
  });
}

export const useCreateNote = () => useRefreshingMutation(createNote);
export const useUpdateNote = () => useRefreshingMutation(updateNote);
export const useDeleteNote = () => useRefreshingMutation(deleteNote);
export const useRestoreNote = () => useRefreshingMutation(restoreNote);
