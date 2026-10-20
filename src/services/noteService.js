import api from './api';

// List rows carry only a short preview. trashed => only deleted ones.
export const listNotes = ({ studentId, classId, trashed }) =>
  api
    .get(`/students/${studentId}/notes`, {
      params: {
        class_assignment_id: classId || undefined,
        trashed: trashed ? 'only' : undefined,
      },
    })
    .then((r) => r.data.data);

// The detail has the full text.
export const getNote = (id) => api.get(`/notes/${id}`).then((r) => r.data.data);

export const createNote = ({ studentId, ...payload }) =>
  api.post(`/students/${studentId}/notes`, payload).then((r) => r.data.data);

export const updateNote = ({ id, ...payload }) =>
  api.put(`/notes/${id}`, payload).then((r) => r.data.data);

export const deleteNote = (id) => api.delete(`/notes/${id}`);

export const restoreNote = (id) => api.post(`/notes/${id}/restore`).then((r) => r.data.data);
